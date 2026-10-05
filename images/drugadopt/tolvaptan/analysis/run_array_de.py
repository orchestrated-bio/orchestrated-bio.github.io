#!/usr/bin/env python3
"""Differential expression on a GEO expression-array series matrix: moderated t.

The runner of the `array-intensity-differential-expression` analysis unit
(`../unit.yaml`). It fits one declared contrast per probe by least squares and
moderates each probe's variance toward a prior fitted across all probes, the
empirical-Bayes t of Smyth (2004) that limma's `lmFit` + `eBayes` compute with
their defaults (no intensity trend, not robust). It is written in numpy and
scipy because the case runtime has no R; its numbers match limma 3.68.4 on the
fixtures under `tests/fixtures/array_de/`.

    python run_array_de.py --matrix <GSE>_series_matrix.txt.gz --plan <plan.json> --output <dir>

The design is the plan's, not the command line's, because GEO field names carry
spaces, parentheses, commas and `=`:

    {"question": "...", "biological_unit": "one tissue biopsy",
     "variable_that_differs": "...",
     "contrast": {"field": "<key>", "test": "<value>", "reference": "<value>"},
     "covariates": ["<key>"], "numeric_covariates": ["<key>"],
     "blocking": {"field": "<key>", "evidence": "<why this field names one subject>"},
     "subset": {"<key>": "<value>"},
     "exclusions": [{"sample": "GSM...", "reason": "..."}],
     "fixed_before_results": true, "cannot_test": ["..."]}

Every field is a record field read by its own `key: value` label (see
`series_matrix.py samples`), or a column of `--samples`, a table the caller
derives and joins by `gsm`, recorded as such. What every run guarantees:

- Values are compared as text, exactly as the record writes them. A covariate
  and a block are FACTORS whatever their values look like, so a whole-number
  subject ID gets one baseline per subject, never a slope; only a field listed
  under `numeric_covariates` is fitted as a trend, and it must be numeric.
- Blocking is a fixed subject effect, fitted only on a field the plan names
  with the evidence that it identifies one subject. A contrast between blocks
  cannot be estimated this way and stops the run (limma's duplicateCorrelation
  models that design; this unit does not).
- Checks before modeling: one channel; the table's columns are the record's
  samples; exclusions name samples and give reasons; each compared level has
  at least two samples; the design is full rank with residual degrees of
  freedom; the values are not integer counts. A refusal writes
  `qc/qc_summary.json` with the reason and exits 2.
- Scale: `--scale auto` log2-transforms values that are on a linear scale by
  GEO2R's rule and leaves log-scale or centered values alone; the decision and
  the quantiles behind it are in `qc/qc_summary.json`.
- Outputs: `array_de_results.csv` (every fitted probe: logFC, its 95% interval,
  AveExpr, moderated t, P.Value, adj.P.Val by Benjamini-Hochberg), the design
  line `design_table.json`, the fitted `design_matrix.csv` and `samples.csv`,
  `qc/`, `methods.json`, and `receipt_metadata.json` in the shape
  `computation-replay`'s `computation_receipt.py build --metadata` reads.
"""
from __future__ import annotations

import argparse
import csv
import json
import platform
import shlex
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import special, stats

from _common import RecordError, field_inventory, open_text, read_header, sample_table, split_row

#: Must equal `id` and `version` in `../unit.yaml`; the unit lint checks it.
UNIT_ID = "array-intensity-differential-expression"
UNIT_VERSION = "1.0.0"

#: Exit status of a run refused by a check before modeling; 1 stays an unexpected failure.
STOP_EXIT = 2

#: DOIs checked against Crossref on 2026-09-25.
CITATIONS = [
    {"use": "moderated t statistic and the empirical-Bayes prior on the probe variances",
     "reference": "Smyth GK. Stat Appl Genet Mol Biol 2004", "doi": "10.2202/1544-6115.1027"},
    {"use": "limma, whose lmFit/eBayes defaults this reproduces",
     "reference": "Ritchie ME, et al. Nucleic Acids Research 2015", "doi": "10.1093/nar/gkv007"},
    {"use": "false discovery rate",
     "reference": "Benjamini Y, Hochberg Y. J R Stat Soc B 1995", "doi": "10.1111/j.2517-6161.1995.tb02031.x"},
]

#: Platform-table columns read as the gene symbol, in order, when `--symbol-column` is not given.
#: `gene_assignment` is the Affymetrix gene and transcript arrays' column (HTA, Clariom, Gene ST)
#: on platforms GEO builds no `.annot.gz` for; `symbols_of` reads the symbol out of its records.
SYMBOL_COLUMNS = ("Gene symbol", "Gene Symbol", "GENE_SYMBOL", "Symbol", "gene_symbol", "ILMN_Gene",
                  "gene_assignment")


class AnalysisStopped(ValueError, SystemExit):
    """A check before modeling refused the input; `evidence` says what it saw."""

    def __init__(self, reason, message, **evidence):
        super().__init__(message)
        self.code = STOP_EXIT
        self.reason = reason
        self.evidence = evidence


def _jsonable(value):
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v) for v in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, (float, np.floating)):
        return float(value) if np.isfinite(value) else ("Inf" if value > 0 else None)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def _write_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(_jsonable(payload), indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# The moderated t (Smyth 2004), as limma computes it with its defaults
# ---------------------------------------------------------------------------

def trigamma_inverse(x):
    """y with trigamma(y) = x, by limma's Newton iteration (`trigammaInverse`)."""
    x = np.asarray(x, dtype=float)
    y = np.where(x > 1e7, 1 / np.sqrt(np.maximum(x, 1e-300)), np.where(x < 1e-6, 1 / np.maximum(x, 1e-300), 0.5 + 1 / x))
    iterate = (x <= 1e7) & (x >= 1e-6)
    for _ in range(50):
        if not iterate.any():
            break
        tri = special.polygamma(1, y)
        step = np.where(iterate, tri * (1 - tri / x) / special.polygamma(2, y), 0.0)
        y = y + step
        if np.max(-step[iterate] / y[iterate]) < 1e-8:
            break
    return y


def fit_f_dist(s2, df):
    """limma's `fitFDist` without a covariate: the prior `(s2_prior, df_prior)` of the probe variances.

    The residual variances are treated as a scaled F sample and its two
    parameters fitted by moments of log(s2). A variance of exactly zero is
    moved to 1e-5 of the median first, as limma does; an excess variance at or
    below zero means the probes agree more than sampling allows, and the prior
    degrees of freedom are infinite with the pooled variance as its scale
    (limma since January 2017; earlier versions returned a larger limit).
    """
    s2 = np.maximum(np.asarray(s2, dtype=float), 0.0)
    median = np.median(s2)
    if median == 0:
        median = 1.0
    s2 = np.maximum(s2, 1e-5 * median)
    df = np.broadcast_to(np.asarray(df, dtype=float), s2.shape)
    e = np.log(s2) - special.digamma(df / 2) + np.log(df / 2)
    emean = e.mean()
    evar = np.sum((e - emean) ** 2) / (len(e) - 1) - np.mean(special.polygamma(1, df / 2))
    if evar > 0:
        df_prior = 2 * float(trigamma_inverse(np.array([evar]))[0])
        s2_prior = float(np.exp(emean + special.digamma(df_prior / 2) - np.log(df_prior / 2)))
    else:
        df_prior = np.inf
        s2_prior = float(np.mean(s2))
    return s2_prior, df_prior


def moderated_t(values, design, contrast):
    """Fit every probe and test one contrast; the columns limma's `topTable(confint=TRUE)` reports.

    `values` is probes x samples, `design` samples x coefficients (full rank),
    `contrast` the weights over the coefficients.
    """
    y = np.asarray(values, dtype=float)
    x = np.asarray(design, dtype=float)
    c = np.asarray(contrast, dtype=float)
    n, p = x.shape
    df_residual = n - p
    q, r = np.linalg.qr(x)
    coefficients = np.linalg.solve(r, q.T @ y.T).T
    residuals = y - coefficients @ x.T
    s2 = np.sum(residuals ** 2, axis=1) / df_residual
    r_inv = np.linalg.inv(r)
    unscaled = float(np.sqrt(c @ (r_inv @ r_inv.T) @ c))
    s2_prior, df_prior = fit_f_dist(s2, df_residual)
    if np.isfinite(df_prior):
        s2_post = (df_residual * s2 + df_prior * s2_prior) / (df_residual + df_prior)
    else:
        s2_post = np.full_like(s2, s2_prior)
    df_total = np.minimum(df_residual + df_prior, df_residual * len(s2))
    estimate = coefficients @ c
    se = np.sqrt(s2_post) * unscaled
    t = estimate / se
    p_value = 2 * stats.t.sf(np.abs(t), df_total)
    margin = stats.t.ppf(0.975, df_total) * se
    return {
        "logFC": estimate, "CI.L": estimate - margin, "CI.R": estimate + margin,
        "AveExpr": y.mean(axis=1), "SE": se, "t": t, "P.Value": p_value,
        "adj.P.Val": benjamini_hochberg(p_value), "s2": s2, "s2.post": s2_post,
        "df.total": np.full_like(s2, df_total),
        "prior": {"s2_prior": s2_prior, "df_prior": df_prior, "df_residual": df_residual,
                  "unscaled_sd": unscaled},
    }


def benjamini_hochberg(p):
    p = np.asarray(p, dtype=float)
    order = np.argsort(p)[::-1]
    ranked = p[order] * len(p) / np.arange(len(p), 0, -1)
    adjusted = np.minimum(1.0, np.minimum.accumulate(ranked))
    out = np.empty_like(p)
    out[order] = adjusted
    return out


# ---------------------------------------------------------------------------
# Record, plan and design
# ---------------------------------------------------------------------------

def load_plan(path):
    try:
        plan = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AnalysisStopped("unreadable_plan", f"The plan {path} could not be read: {exc}") from exc
    if not isinstance(plan, dict):
        raise AnalysisStopped("malformed_plan", "The plan must be one JSON object.")
    required = ("question", "biological_unit", "variable_that_differs", "contrast",
                "fixed_before_results", "cannot_test")
    missing = [key for key in required if plan.get(key) in (None, "", [])]
    if missing:
        raise AnalysisStopped("incomplete_plan", f"The plan is missing {missing}.", missing=missing)
    contrast = plan["contrast"]
    if not isinstance(contrast, dict) or not all(str(contrast.get(k, "")).strip() for k in ("field", "test", "reference")):
        raise AnalysisStopped("malformed_plan", "contrast must be {field, test, reference}.", fields=["contrast"])
    for key, kind in (("covariates", list), ("numeric_covariates", list), ("subset", dict),
                      ("exclusions", list), ("cannot_test", list)):
        if key in plan and plan[key] is not None and not isinstance(plan[key], kind):
            raise AnalysisStopped("malformed_plan", f"{key} must be a {kind.__name__}.", fields=[key])
    blocking = plan.get("blocking")
    if blocking not in (None, {}, []):
        if isinstance(blocking, list):
            raise AnalysisStopped("malformed_plan", "blocking is one {field, evidence} object: this unit fits "
                                  "one blocking factor.", fields=["blocking"])
        if not isinstance(blocking, dict) or not str(blocking.get("field", "")).strip():
            raise AnalysisStopped("malformed_plan", "blocking must be {field, evidence}.", fields=["blocking"])
        if not str(blocking.get("evidence", "")).strip():
            raise AnalysisStopped(
                "blocking_without_evidence",
                f"blocking on {blocking['field']!r} needs `evidence`: what in the record shows that one value "
                "of this field is one subject (a donor, patient or animal), and not a group code or a count.",
                field=blocking["field"])
    return plan


def read_record(path):
    """The series matrix's header (parsed per cell) and its expression table, probes x samples."""
    try:
        with open_text(path) as handle:
            header = read_header(handle)
            names = split_row(handle.readline()) if header["table"] else []
            if len(names) < 2:
                raise AnalysisStopped("no_expression_table", f"{path} has no expression table: the values are not "
                                      "in the series matrix (look in the supplementary files).")
            # Typed as it is read: parsed as text first, a 554-sample table peaked at 2.6 GB, as floats 0.55 GB
            table = pd.read_csv(handle, sep="\t", header=None, names=names, index_col=0,
                                dtype={name: "float64" for name in names[1:]} | {names[0]: "str"},
                                na_values=["", "null", "NA", "NaN"], keep_default_na=False)
    except OSError as exc:
        raise AnalysisStopped("input_file_unreadable", f"{path}: {exc}") from exc
    except RecordError as exc:
        raise AnalysisStopped("not_a_series_matrix", f"{path}: {exc}") from exc
    except ValueError as exc:
        raise AnalysisStopped("non_numeric_values", f"The expression table holds non-numeric values: {exc}") from exc
    table = table[~table.index.str.startswith("!series_matrix_table_end")]
    accessions = [sample["gsm"] for sample in header["samples"]]
    if sorted(table.columns) != sorted(accessions):
        raise AnalysisStopped("table_columns_are_not_the_samples",
                              "The expression table's columns are not the record's sample accessions.",
                              only_in_table=sorted(set(table.columns) - set(accessions))[:20],
                              only_in_record=sorted(set(accessions) - set(table.columns))[:20])
    if table.index.duplicated().any():
        raise AnalysisStopped("duplicate_probe_ids", "The expression table repeats probe IDs.",
                              probes=table.index[table.index.duplicated()][:20].tolist())
    two_channel = sorted({s["gsm"] for s in header["samples"] if s.get("channel_count", "1") not in ("", "1")})
    if two_channel:
        raise AnalysisStopped("two_channel_array",
                              "Two-channel samples carry log-ratios against a reference; their design is not "
                              "this unit's.", samples=two_channel[:20])
    return header, table


def read_caller_table(path, record_rows):
    """`--samples`: extra columns keyed by `gsm`, as text. None when not given."""
    if not path:
        return None, []
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    if "gsm" not in frame.columns:
        raise AnalysisStopped("samples_table_without_gsm", f"{path} needs a `gsm` column naming each record sample.")
    unknown = sorted(set(frame["gsm"]) - {row["gsm"] for row in record_rows})
    if unknown:
        raise AnalysisStopped("samples_table_names_unknown_samples", f"{path} names samples the record does not have.",
                              samples=unknown[:20])
    if frame["gsm"].duplicated().any():
        raise AnalysisStopped("samples_table_repeats_a_sample", f"{path} lists a sample twice.",
                              samples=frame.loc[frame["gsm"].duplicated(), "gsm"].tolist()[:20])
    record_fields = {key for row in record_rows for key in row}
    shadowed = sorted(set(frame.columns) - {"gsm"} & record_fields)
    if shadowed:
        raise AnalysisStopped("samples_table_shadows_a_record_field",
                              "A --samples column has the name of a record field; rename it so the design says "
                              "which one it used.", columns=shadowed)
    columns = [c for c in frame.columns if c != "gsm"]
    return frame.set_index("gsm")[columns], columns


def design_frame(record_rows, caller, caller_columns):
    frame = pd.DataFrame(record_rows).set_index("gsm").astype(object)
    frame = frame.where(frame.notna(), "")
    if caller is not None:
        frame = frame.join(caller, how="left")
        frame[caller_columns] = frame[caller_columns].fillna("")
    return frame


def _need_field(frame, field, role):
    if field not in frame.columns:
        known = [c for c in frame.columns if c != "gsm"]
        raise AnalysisStopped("unknown_field", f"{role} {field!r} is not a record field or a --samples column. "
                              "Fields are matched as written (`series_matrix.py samples` lists them).",
                              field=field, fields=known[:60])


def select_samples(frame, plan):
    """The fitted samples, and why every other one is not fitted."""
    reasons: dict[str, str] = {}
    exclusions = {}
    for item in plan.get("exclusions") or []:
        if not isinstance(item, dict) or not str(item.get("sample", "")).strip():
            raise AnalysisStopped("malformed_plan", "Each exclusion must be {sample, reason}.", fields=["exclusions"])
        if not str(item.get("reason", "")).strip():
            raise AnalysisStopped("exclusion_without_reason", f"Exclusion {item['sample']!r} needs a reason.")
        exclusions[str(item["sample"])] = str(item["reason"]).strip()
    unknown = sorted(set(exclusions) - set(frame.index))
    if unknown:
        raise AnalysisStopped("unknown_exclusion", "Excluded samples are not in the record.", samples=unknown[:20])
    keep = pd.Series(True, index=frame.index)
    for sample in exclusions:
        keep[sample] = False
        reasons[sample] = "excluded: " + exclusions[sample]
    for field, value in (plan.get("subset") or {}).items():
        _need_field(frame, field, "subset field")
        matches = frame[field] == str(value)
        if not matches.any():
            raise AnalysisStopped("subset_matches_nothing", f"No sample has {field}: {value!r}.",
                                  field=field, levels=sorted(set(frame[field]) - {""})[:30])
        for sample in frame.index[keep & ~matches]:
            reasons[sample] = f"outside subset {field}: {value}"
        keep &= matches
    contrast = plan["contrast"]
    block = (plan.get("blocking") or {}).get("field")
    design_fields = [contrast["field"], *(plan.get("covariates") or []), *(plan.get("numeric_covariates") or [])]
    if block:
        design_fields.append(block)
    if len(set(design_fields)) != len(design_fields):
        raise AnalysisStopped("field_used_twice", "A field appears in more than one design role.",
                              fields=design_fields)
    for field in design_fields:
        _need_field(frame, field, "design field")
    for sample in frame.index[keep]:
        missing = [field for field in design_fields if frame.at[sample, field] == ""]
        if missing:
            reasons[sample] = "no value for " + ", ".join(missing)
            keep[sample] = False
    return frame.loc[keep], reasons


def build_design(samples, plan):
    """The design matrix (text factors, treatment coding) and the contrast over its columns."""
    contrast = plan["contrast"]
    field, test, reference = contrast["field"], str(contrast["test"]), str(contrast["reference"])
    levels = samples[field]
    if test == reference:
        raise AnalysisStopped("contrast_levels_equal", "The contrast compares a level with itself.")
    for level in (test, reference):
        if (levels == level).sum() < 2:
            raise AnalysisStopped("too_few_replicates" if (levels == level).any() else "contrast_level_absent",
                                  f"{field}: {level!r} has {(levels == level).sum()} fitted samples; each compared "
                                  "level needs at least two.",
                                  counts={str(k): int(v) for k, v in levels.value_counts().items()})
    columns = {"(Intercept)": np.ones(len(samples))}
    coding = []
    others = sorted(set(levels) - {reference, test})
    for level in [test, *others]:
        columns[f"{field}[{level}]"] = (levels == level).to_numpy(dtype=float)
    coding.append({"field": field, "role": "contrast", "coding": "factor", "baseline": reference,
                   "levels": [reference, test, *others]})
    factors = [(name, "covariate") for name in plan.get("covariates") or []]
    block = (plan.get("blocking") or {}).get("field")
    if block:
        factors.append((block, "block"))
    for name, role in factors:
        values = samples[name].astype(str)
        present = sorted(set(values))
        for level in present[1:]:
            columns[f"{name}[{level}]"] = (values == level).to_numpy(dtype=float)
        coding.append({"field": name, "role": role, "coding": "factor", "baseline": present[0],
                       "n_levels": len(present)})
    for name in plan.get("numeric_covariates") or []:
        numbers = pd.to_numeric(samples[name], errors="coerce")
        if numbers.isna().any():
            raise AnalysisStopped("numeric_covariate_not_numeric", f"numeric covariate {name!r} holds values that "
                                  "are not numbers.", values=sorted(set(samples[name][numbers.isna()]))[:20])
        center = float(numbers.mean())
        columns[name] = (numbers - center).to_numpy(dtype=float)
        coding.append({"field": name, "role": "numeric covariate", "coding": "trend", "centered_at": center})
    design = pd.DataFrame(columns, index=samples.index)
    vector = pd.Series(0.0, index=design.columns)
    vector[f"{field}[{test}]"] = 1.0
    rank = np.linalg.matrix_rank(design.to_numpy())
    if rank < design.shape[1]:
        message = (f"The design has rank {rank} for its {design.shape[1]} columns: some design fields are "
                   "confounded, so their effects cannot be separated.")
        if block and not _block_spans_contrast(samples, field, test, reference, block):
            message = (f"No level of the block {block!r} holds both {test!r} and {reference!r} samples, so a fixed "
                       "subject effect absorbs the contrast. A comparison BETWEEN subjects with repeated samples "
                       "needs a random subject effect (limma's duplicateCorrelation), which this unit does not "
                       "fit: fit one sample per subject instead, or say the design cannot be tested here.")
        raise AnalysisStopped("rank_deficient_design", message, rank=int(rank), columns=list(design.columns))
    if design.shape[0] - design.shape[1] < 1:
        raise AnalysisStopped("no_residual_df", f"{design.shape[0]} samples for {design.shape[1]} coefficients leave "
                              "no residual degrees of freedom to estimate a variance.")
    return design, vector, coding


def _block_spans_contrast(samples, field, test, reference, block):
    groups = samples.groupby(samples[block].astype(str))[field].agg(set)
    return any({test, reference} <= levels for levels in groups)


def block_summary(samples, plan):
    blocking = plan.get("blocking") or {}
    if not blocking:
        return None
    field, block = plan["contrast"]["field"], blocking["field"]
    test, reference = str(plan["contrast"]["test"]), str(plan["contrast"]["reference"])
    groups = samples.groupby(samples[block].astype(str))[field].agg(list)
    sizes = groups.map(len)
    return {
        "field": block, "evidence": blocking["evidence"],
        "n_blocks": int(len(groups)),
        "block_sizes": {str(k): int(v) for k, v in sizes.value_counts().sort_index().items()},
        "blocks_with_both_levels": int(sum({test, reference} <= set(levels) for levels in groups)),
        "blocks_repeating_a_level": sorted(str(k) for k, levels in groups.items() if len(levels) != len(set(levels)))[:50],
        "single_sample_blocks": int((sizes == 1).sum()),
    }


def crosstabs(samples, plan):
    field = plan["contrast"]["field"]
    out = {}
    for name in plan.get("covariates") or []:
        table = pd.crosstab(samples[name].astype(str), samples[field].astype(str))
        out[name] = {str(level): {str(k): int(v) for k, v in row.items()} for level, row in table.iterrows()}
    return out


# ---------------------------------------------------------------------------
# Scale, annotation and diagnostics
# ---------------------------------------------------------------------------

def decide_scale(values, requested):
    """GEO2R's rule for a linear scale, and what was done about it."""
    finite = values[np.isfinite(values)]
    q = np.quantile(finite, [0, 0.25, 0.5, 0.75, 0.99, 1.0]) if finite.size else np.zeros(6)
    linear = bool(q[4] > 100 or (q[5] - q[0] > 50 and q[1] > 0))
    integers = bool(finite.size and np.all(finite >= 0) and np.all(finite == np.round(finite)) and q[5] > 100)
    record = {"quantiles_0_25_50_75_99_100": [float(v) for v in q], "linear_by_geo2r_rule": linear,
              "requested": requested}
    if integers:
        raise AnalysisStopped("integer_counts", "The values are non-negative integers: these are counts, not "
                              "intensities. Fit them with the bulk-counts-differential-expression unit (pydeseq2).",
                              **record)
    transform = requested == "log2" or (requested == "auto" and linear)
    record["transform"] = "log2, values <= 0 set missing" if transform else "none"
    return transform, record


def centering(values):
    """Whether the deposit is centered per probe, as a baseline-to-median transform leaves it.

    On an intensity scale, probes differ in abundance by several log2 units, far
    more than one probe varies across samples; after centering, every probe's
    median sits near 0 and the spread of those medians across probes is smaller
    than a probe's own spread. Read on every deposited sample, since the
    submitter centered before any subset.
    """
    complete = values[np.isfinite(values).all(axis=1)]
    if len(complete) < 3:
        return {"centered_per_probe": False}
    medians = np.median(complete, axis=1)
    across = float(np.subtract(*np.quantile(medians, [0.75, 0.25])))
    within = float(np.median(np.subtract(*np.quantile(complete, [0.75, 0.25], axis=1))))
    return {"centered_per_probe": bool(across < within and abs(float(np.median(medians))) < within),
            "iqr_of_probe_medians": across, "median_within_probe_iqr": within}


def read_annotation(path, symbol_column=None):
    """probe ID -> gene symbol from a GEO platform table (an `.annot.gz` or the full GPL table)."""
    if not path:
        return None, None
    with open_text(path) as handle:
        lines = handle.read().splitlines()
    begin = next((i for i, line in enumerate(lines) if line.startswith("!platform_table_begin")), None)
    end = next((i for i, line in enumerate(lines) if line.startswith("!platform_table_end")), len(lines))
    body = lines[begin + 1:end] if begin is not None else [l for l in lines if not l.startswith(("!", "#", "^"))]
    rows = list(csv.reader(body, delimiter="\t"))
    if not rows:
        raise AnalysisStopped("annotation_unreadable", f"{path}: no platform table found.")
    header, rows = rows[0], rows[1:]
    column = symbol_column or next((c for c in SYMBOL_COLUMNS if c in header), None)
    if column not in header or "ID" not in header:
        raise AnalysisStopped("annotation_without_symbol_column",
                              f"{path}: no ID column or no symbol column; give --symbol-column.", columns=header[:40])
    i, j = header.index("ID"), header.index(column)
    return {row[i]: row[j] for row in rows if len(row) > max(i, j)}, column


def symbols_of(cell):
    """The distinct gene symbols in one platform-table cell, in the order written.

    GEO joins a probe's genes with `///` (`A///B`, `A /// B`) and repeats a symbol
    that has two gene IDs (`A///A`). A `gene_assignment` cell joins records of
    `accession // symbol // title // cytoband // gene ID` the same way. `---` is no gene.
    """
    symbols = []
    for record in cell.split("///"):
        fields = [field.strip() for field in record.split("//")]
        symbol = fields[1] if len(fields) > 1 else fields[0]
        if symbol and symbol != "---" and symbol not in symbols:
            symbols.append(symbol)
    return symbols


def pca_r_squared(values, samples, fields, top=500):
    """R-squared of the first two principal components with each design field (a paired
    design whose block explains nothing on PC1/PC2 is worth a second look)."""
    variable = values[np.argsort(values.var(axis=1))[::-1][:top]]
    centered = variable - variable.mean(axis=1, keepdims=True)
    u, s, vt = np.linalg.svd(centered, full_matrices=False)
    explained = (s ** 2 / np.sum(s ** 2))[:2]
    out = {"variance_explained": [float(v) for v in explained], "r_squared": {}}
    for field in fields:
        groups = samples[field].astype(str).to_numpy()
        row = []
        for pc in vt[:2]:
            total = np.sum((pc - pc.mean()) ** 2)
            within = sum(np.sum((pc[groups == g] - pc[groups == g].mean()) ** 2) for g in set(groups))
            row.append(float(1 - within / total) if total > 0 else None)
        out["r_squared"][field] = row
    return out


def _software():
    import scipy
    return {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
            "scipy": scipy.__version__}


def receipt_metadata(header, plan, samples, groups, design, coding, output, matrix, summary, reasons):
    series = header["series"]
    accession = (series.get("Series_geo_accession") or ["unknown"])[0]
    version = "last updated " + (series.get("Series_last_update_date") or ["unknown"])[0]
    contrast = plan["contrast"]
    rel = lambda name: (Path(output) / name).as_posix()  # noqa: E731
    return {
        "dataset": {"accession": accession, "version": version,
                    "platform": ", ".join(series.get("Series_platform_id") or []), "record": str(matrix)},
        "design": {
            "biological_unit": plan["biological_unit"],
            "sample_inclusion": "; ".join(f"{k}: {v}" for k, v in (plan.get("subset") or {}).items())
                                or "every record sample with a value for each design field",
            "sample_exclusion": (f"{len(reasons)} record samples not fitted; each with its reason in "
                                 f"{rel('design_table.json')}") if reasons else "none",
            "group_sizes": groups,
            "contrast": f"{contrast['field']}: {contrast['test']} versus {contrast['reference']}"
                        + (f", blocked on {plan['blocking']['field']}" if plan.get("blocking") else ""),
        },
        "analysis": {
            "preprocessing": f"{summary['scale']['transform']}; probes with a missing value in a fitted sample "
                             "dropped",
            "statistical_model": "per-probe least squares on " + " + ".join(c["field"] for c in coding)
                                 + "; empirical-Bayes moderated t (Smyth 2004; limma lmFit/eBayes defaults)",
            "multiple_testing": "Benjamini-Hochberg across the fitted probes",
            "gene_universe": f"{summary['probes']['fitted']} probes fitted",
            "pathway_collection": "not_applicable: no enrichment in this unit",
            "random_seed": "not_applicable: deterministic",
        },
        "lineage": {
            "sample_manifest": rel("samples.csv"),
            "qc_artifacts": [rel("qc/qc_summary.json"), rel("design_matrix.csv")],
            "contrast_registry": rel("design_table.json"),
            "result_registry": rel("array_de_results.csv"),
            "figure_registry": "not_applicable: the unit draws no figure",
        },
        "environment": {"runtime": f"Python {platform.python_version()}", "dependencies": "see environment_record",
                        "lockfile": "uv.lock"},
        "model_system_limits": [
            "A difference in a bulk tissue sample is a difference in a mixture; a change in composition reads as "
            "a change in expression.",
            "Probe intensity is relative and probe-specific; it is not an abundance comparable across probes.",
            "An observational contrast is an association with the labeled variable, not its effect.",
        ],
    }


# ---------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--matrix", required=True, help="the GEO series matrix as fetched (gzip, bzip2, xz or plain)")
    parser.add_argument("--plan", required=True, help="the design line as JSON (see above)")
    parser.add_argument("--output", required=True, help="output directory, under analysis/")
    parser.add_argument("--samples", help="optional CSV with a gsm column: fields the caller derived from the record")
    parser.add_argument("--annotation", help="optional GEO platform table (.annot.gz or full GPL table) for symbols")
    parser.add_argument("--symbol-column", help="the platform table's symbol column, when not a standard name")
    parser.add_argument("--scale", choices=("auto", "log2", "as-is"), default="auto",
                        help="auto (default): log2 only values GEO2R's rule calls linear; log2: always; as-is: never")
    parser.add_argument("--alpha", type=float, default=0.05, help="adjusted p threshold for the summary counts")
    args = parser.parse_args(argv)
    output = Path(args.output)
    summary = {"unit": {"id": UNIT_ID, "version": UNIT_VERSION}, "status": "stopped", "stop": None, "flags": []}
    flags = summary["flags"]

    try:
        plan = load_plan(args.plan)
        header, table = read_record(args.matrix)
        columns, record_rows = sample_table(header)
        caller, caller_columns = read_caller_table(args.samples, record_rows)
        frame = design_frame(record_rows, caller, caller_columns)
        inventory = field_inventory(header)
        if inventory["mixed_rows"]:
            flags.append({"code": "mixed_characteristics_rows",
                          "message": "characteristics rows carry different fields for different samples; every "
                                     "cell was read by its own label, never by its row",
                          "rows": inventory["mixed_rows"]})
        if inventory["repeated_fields"]:
            flags.append({"code": "repeated_field", "message": "a sample carries one field twice; its values are "
                          "joined with '; '", "fields": inventory["repeated_fields"]})
        samples, reasons = select_samples(frame, plan)
        design, vector, coding = build_design(samples, plan)
        used = [c["field"] for c in coding]
        from_caller = [f for f in used if f in caller_columns]
        if from_caller:
            flags.append({"code": "design_field_not_in_record",
                          "message": "design fields come from the caller's --samples table, not the record: "
                                     + ", ".join(from_caller), "fields": from_caller})
        blocks = block_summary(samples, plan)
        if blocks and blocks["blocks_repeating_a_level"]:
            flags.append({"code": "block_repeats_a_level",
                          "message": f"{len(blocks['blocks_repeating_a_level'])} blocks hold two samples at one "
                                     "contrast level; if the field names one subject, those are repeated measures",
                          "blocks": blocks["blocks_repeating_a_level"][:20]})
        tabs = crosstabs(samples, plan)
        contrast = plan["contrast"]
        for name, table_ in tabs.items():
            one_arm = [lvl for lvl, row in table_.items()
                       if not (row.get(str(contrast["test"]), 0) and row.get(str(contrast["reference"]), 0))]
            if one_arm:
                flags.append({"code": "covariate_level_in_one_arm",
                              "message": f"{name} levels {one_arm} hold samples of only one compared level; they "
                                         "inform that stratum's baseline, not the contrast", "field": name,
                              "levels": one_arm})

        values = table[samples.index].to_numpy(dtype=float)
        transform, scale = decide_scale(values, args.scale)
        if transform:
            with np.errstate(divide="ignore", invalid="ignore"):
                values = np.where(values > 0, np.log2(np.where(values > 0, values, 1.0)), np.nan)
            flags.append({"code": "log2_transformed", "message": "values were on a linear scale and were log2 "
                          "transformed; values at or below 0 became missing", **scale})
        summary["scale"] = scale
        complete = np.isfinite(values).all(axis=1)
        if (~complete).any():
            flags.append({"code": "probes_with_missing_values",
                          "message": f"{int((~complete).sum())} probes have a missing value in a fitted sample and "
                                     "were not fitted"})
        scale.update(centering(table.to_numpy(dtype=float)))
        if scale["centered_per_probe"]:
            flags.append({"code": "values_centered_per_probe",
                          "message": "the deposited values are centered per probe (a baseline transform): AveExpr "
                                     "is not abundance, and probes cannot be filtered or compared by intensity"})
        fitted = values[complete]
        probe_ids = table.index[complete]
        annotation, symbol_column = read_annotation(args.annotation, args.symbol_column)
        if annotation is not None:
            known = float(np.mean([probe in annotation for probe in table.index]))
            if known < 0.5:
                raise AnalysisStopped("annotation_does_not_match_probes",
                                      f"{args.annotation} names {known:.0%} of the matrix's probe IDs: it is another "
                                      "platform's table. Fetch the annotation of the platform the matrix names.",
                                      platform=header["series"].get("Series_platform_id"))
        if len(probe_ids) < 3:
            raise AnalysisStopped("too_few_probes", f"{len(probe_ids)} complete probes: the variance prior cannot "
                                  "be fitted.")
        groups = {str(level): int(n) for level, n in samples[contrast["field"]].value_counts().items()}
        summary["samples"] = {"record": len(frame), "fitted": len(samples),
                              "not_fitted": len(reasons), "not_fitted_by_reason": _count_reasons(reasons)}
        summary["probes"] = {"record": int(len(table)), "fitted": int(len(probe_ids))}
        summary["groups"] = groups
        design_table = {
            "unit": {"id": UNIT_ID, "version": UNIT_VERSION},
            "question": plan["question"],
            "source_record": {"path": str(args.matrix),
                              "accession": (header["series"].get("Series_geo_accession") or [None])[0],
                              "platform": header["series"].get("Series_platform_id")},
            "contrast": {**contrast, "sign": f"positive logFC means higher in {contrast['test']} than in "
                                               f"{contrast['reference']}"},
            "groups": [{"label": str(level), "role": role, "n": groups.get(str(level), 0),
                        "defining_text": f"{contrast['field']}: {level}",
                        "defining_text_verified_in_source": contrast["field"] not in caller_columns}
                       for level, role in ((contrast["test"], "test"), (contrast["reference"], "reference"))],
            "variable_that_differs": plan["variable_that_differs"],
            "biological_unit": plan["biological_unit"],
            "design_terms": coding,
            "blocking": blocks,
            "covariate_by_contrast": tabs,
            "subset": plan.get("subset") or {},
            "not_fitted": [{"sample": s, "reason": r} for s, r in sorted(reasons.items())],
            "fixed_before_results": plan["fixed_before_results"],
            "cannot_test": plan["cannot_test"],
        }
        output.mkdir(parents=True, exist_ok=True)
        _write_json(output / "design_table.json", design_table)
        design.to_csv(output / "design_matrix.csv", index_label="gsm")
        samples[[c for c in columns[1:] if c in samples.columns and c in {*used, "Sample_title"}]
                + [c for c in caller_columns if c in used]].to_csv(output / "samples.csv", index_label="gsm")
    except AnalysisStopped as stop:
        summary["stop"] = {"code": stop.reason, "message": str(stop), "evidence": stop.evidence}
        _write_json(output / "qc" / "qc_summary.json", summary)
        print(f"STOPPED before modeling ({stop.reason}): {stop}")
        print(f"The reason is retained in {output / 'qc' / 'qc_summary.json'}.")
        raise

    fit = moderated_t(fitted, design.to_numpy(), vector.to_numpy())
    results = pd.DataFrame({k: v for k, v in fit.items() if k != "prior"}, index=pd.Index(probe_ids, name="probe"))
    if annotation is not None:
        cells = [annotation.get(p, "") for p in results.index]
        symbols = [symbols_of(cell) for cell in cells]
        results.insert(0, "symbol", ["///".join(each) for each in symbols])
        results["symbol_as_annotated"] = cells
        summary["annotation"] = {"path": args.annotation, "symbol_column": symbol_column,
                                 "fitted_probes_with_symbol": sum(1 for each in symbols if each),
                                 "fitted_probes_with_several_symbols": sum(1 for each in symbols if len(each) > 1)}
    results = results.sort_values(["P.Value"], kind="mergesort")
    results.to_csv(output / "array_de_results.csv")
    significant = results[results["adj.P.Val"] < args.alpha]
    summary.update({
        "status": "completed",
        "prior": fit["prior"],
        "significant": {"alpha": args.alpha, "n": int(len(significant)),
                        "higher_in_test": int((significant.logFC > 0).sum()),
                        "lower_in_test": int((significant.logFC < 0).sum())},
        "p_value_histogram": np.histogram(fit["P.Value"], bins=20, range=(0, 1))[0].tolist(),
        "pca": pca_r_squared(fitted, samples, [c["field"] for c in coding]),
    })
    intensity = pd.DataFrame({"median": np.median(fitted, axis=0),
                              "iqr": np.subtract(*np.quantile(fitted, [0.75, 0.25], axis=0))}, index=samples.index)
    (output / "qc").mkdir(parents=True, exist_ok=True)
    intensity.to_csv(output / "qc" / "sample_intensity.csv", index_label="gsm")
    _write_json(output / "qc" / "qc_summary.json", summary)
    _write_json(output / "methods.json", {
        "unit": {"id": UNIT_ID, "version": UNIT_VERSION}, "software": _software(),
        "parameters": {"design_columns": list(design.columns),
                       "design_terms": coding,
                       "blocking": ({"field": blocks["field"], "evidence": blocks["evidence"],
                                     "model": "fixed subject effect"} if blocks else None),
                       "contrast_vector": {k: float(v) for k, v in vector.items()},
                       "scale": scale, "alpha": args.alpha,
                       "variance_prior": "limma fitFDist moments of log(s2); no intensity trend, not robust",
                       "df_total": "residual df + prior df, capped at the pooled residual df",
                       "interval": "95% t interval on the moderated standard error",
                       "multiple_testing": "Benjamini-Hochberg across the fitted probes"},
        "citations": CITATIONS,
    })
    _write_json(output / "receipt_metadata.json",
                receipt_metadata(header, plan, samples, groups, design, coding, output, args.matrix, summary, reasons))

    print(f"Fitted {len(probe_ids)} probes on {len(samples)} samples ({groups}); prior df "
          f"{fit['prior']['df_prior']:.3g}, {len(significant)} probes at adj.P.Val < {args.alpha}.")
    if flags:
        print(f"{len(flags)} quality flag(s); address each in the account or say why it does not apply:")
        for flag in flags:
            print(f"  [{flag['code']}] {flag['message']}")
    invocation = shlex.join(["python", *sys.argv]) if argv is None else "<this command>"
    print("Bind it to the module's receipt:\n  python .agent/skills/computation-replay/scripts/computation_receipt.py "
          f"build --metadata {output / 'receipt_metadata.json'} --status executed_current --input {args.matrix} "
          f"--input {args.plan} --invocation {shlex.quote(invocation)} --output {output / 'array_de_results.csv'} "
          f"--output {output / 'design_table.json'} --output {output / 'samples.csv'} "
          f"--output {output / 'design_matrix.csv'} --output {output / 'qc' / 'qc_summary.json'} "
          "--config uv.lock --receipt <the module's receipt path>")
    return 0


def _count_reasons(reasons):
    counts: dict[str, int] = {}
    for reason in reasons.values():
        key = reason.split(":")[0] if reason.startswith(("excluded", "outside subset")) else reason
        counts[key] = counts.get(key, 0) + 1
    return counts


if __name__ == "__main__":
    sys.exit(main())
