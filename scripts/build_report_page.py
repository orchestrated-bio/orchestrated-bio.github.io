#!/usr/bin/env python3
"""Render report.html from a DrugAdopt deliverable.

The example report on the marketing site used to be hand-authored, which meant
it silently forked from the pipeline every time a case was regenerated. This
script makes the page a projection of the case instead.

Visual language follows the `.dax-*` document mockup already used on the
homepage hero: dark section spine, serif paper, numbered sections, numbered
figures with real captions, inline [PMID ...] citations. Here it runs at
full-page scale rather than shrunk into a figure.

Content rule: scientific report prose is copied verbatim from the case --
either from report_view_model.json or from the module pages' own
Question / Answer / Interpretation blocks. Structural labels ("Figure 3.",
"Section 2") and the marketing introduction and closing invitation are authored
here. Scientific conclusions are not paraphrased.

Second content rule: the page presents evidence, not recommendations
(drugadopt docs/capability-boundary.md, "Evidence presentation contract").
The source case predates that contract and carries a recommendation layer,
so this builder never reads decision_packet.recommendation, a row's
owner_role / sequence / pass_fail_criteria / failure_rule / next_action, a
delta's next_step, reader_surface.what_to_test_next,
reader_surface.diligence_question (a question about "another prexasertib
study" whose only answer in the case is the hold disposition),
biomarker_decision_brief.summary, or a brief row's readiness. Case prose that
directs an action is handled by WITHHELD_SENTENCES: whole sentences are left
out, never reworded, and the page says so.

Inputs, all produced from the case by scripts/extract_report_content.py:
    scripts/module_sections.json   Question/Answer/Interpretation per module
    scripts/figure_captions.json   real figure captions, scope, evidence type

Usage (the --case default is relative to the main checkout; from a worktree,
pass the absolute path):
    python3 scripts/build_report_page.py \
        --case ../_case_backups/from-out-dir-20260820/prexasertib-deliverable

report.html is generated: change it here and regenerate, never by hand.
"""

from __future__ import annotations

import argparse
import html
import json
import hashlib
import pathlib
import re
import struct
import sys

SUPPORTED_SCHEMA = 3
FIGURE_DIR = "./images/drugadopt/report"
CONTENT_DIR = pathlib.Path(__file__).parent
ROOT = CONTENT_DIR.parent
FIGURE_ROOT = ROOT / "images/drugadopt/report"


def asset_version(rel: str) -> str:
    """?v= fingerprint for a site asset: first 12 hex of its sha256, the
    convention every page uses. Computed rather than hardcoded so a base.css
    edit never leaves this generator emitting a stale reference."""
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:12]

# Section spine. Order and labels mirror the homepage demo so the two read as
# the same product. `module` keys into module_sections.json; `figure` keys into
# figure_captions.json.
SECTIONS = [
    {
        "id": "clinical",
        "num": "1",
        "label": "Clinical Phenotype &amp; Endpoints",
        "module": "clinical",
        "figure": "clinical_cohort_flow.png",
    },
    {
        "id": "mechanism",
        "num": "2",
        "label": "Mechanism &amp; Biomarker Biology",
        "module": "pharmacology",
        "figure": "replication_signal_robustness.png",
        "figure2": "mechanism_evidence_chain.png",
    },
    {
        "id": "pharmacology",
        "num": "3",
        "label": "Pharmacology &amp; Exposure",
        "module": "adme",
        "figure": "prexasertib_exposure_boundary.png",
        # drugadopt docs/capability-boundary.md: ADME/PK is a bounded
        # prototype, "Public labels and literature only -- no measured PK".
        "scope": "From published papers, trial records and regulatory documents. No drug levels were measured for this report.",
    },
    {
        "id": "toxicology",
        "num": "4",
        "label": "Toxicology &amp; Therapeutic Window",
        "module": "toxicology",
        "figure": "clinical_safety_burden.png",
    },
]

# The reader-facing chapter a claim's internal module id belongs to. The two
# do not line up -- the Mechanism chapter is built from the `pharmacology`
# module and the Pharmacology chapter from `adme` -- so a traceability entry
# tagged "module pharmacology" sits under a Mechanism claim.
SECTION_BY_MODULE = {s["module"]: s["label"] for s in SECTIONS}

# What a traceability entry is when it carries no semantic review: these are
# structured records, not prose claims a reviewer could sign off.
CLAIM_KIND_LABELS = {
    "figure": "figure records",
    "decision_packet": "evidence-summary rows",
    "biomarker_decision": "biomarker-brief rows",
    "semantic_review": "prose claims awaiting re-review",
}

STATE_LABELS = {
    "blocker": "Not established",
    "gap": "Gap",
    "not_supported": "Not supported",
    "conditional": "Conditional",
    "supported": "Supported",
}

# Evidence rows rendered on the Evidence & Gaps section. The case's
# biomarker-01 claim is a readiness verdict ("No public biomarker is ready to
# select patients") and its ip-01 claim ends in a legal directive ("require
# counsel review before ..."); each is a single sentence, so both rows are left
# out rather than cut mid-sentence. Table 1 carries the biomarker evidence.
# clinical-01 states the finding the Clinical chapter already shows, and
# protocol-01 and cmc-01 are from lanes the current DrugAdopt modules do not
# have. The Traceability disclosure names each of these reasons.
FEATURED_ROWS = (
    "replication-01",
    "mechanism-01",
    "exposure-01",
    "safety-01",
)

# Missing-evidence rows shown in Table 3, by their missing_evidence text. The
# case's other two are trial-design ("Censoring-aware design inputs") and
# manufacturing/rights ("Product-quality and rights package") rows from lanes
# the current DrugAdopt modules do not have.
FEATURED_DELTAS = (
    "Independent biomarker cohort",
    "Participant-linked exposure",
    "POLA1-combination therapeutic index",
)

# Case sentences that direct an action, set a priority, or state a
# disposition, keyed by the text they appear in. Whole sentences are withheld,
# never clauses, and nothing is reworded. Each entry is the sentence's opening
# words. withhold() fails the build if a key names no text the page shows, or
# if a prefix does not open exactly one sentence, so a re-extraction that
# rewords one of these openings stops the build. That is all it checks. It
# does not catch a new directive sentence, and a sentence is only what
# SENTENCE_BREAK splits (a period, then a capital or "("): a withheld sentence
# that ends in "?" or a quote, or is followed by one opening with a digit,
# takes the next sentence with it. After any re-extraction, re-read the
# withheld sentences and the prose around them before publishing.
WITHHELD_SENTENCES = {
    "reader_surface.current_readout": (
        "Another unselected efficacy study should remain on hold",
    ),
    "biomarker_decision_brief.guardrail": (
        "Use these rows as report-level translational decision support",
    ),
    "pharmacology.Interpretation": (
        "Do not select patients or propose a clinical POLA1 combination",
        "Freeze one continuous assay, score orientation",
        "Run a therapeutic-index experiment before advancing",
    ),
    "adme.Interpretation": (
        "The development consequence is narrow",
        "The next analysis should estimate",
    ),
    "toxicology.Interpretation": (
        "That number must be frozen before CRO execution",
        "The POLA1 result in the pharmacology chapter merits",
    ),
}
SENTENCE_BREAK = re.compile(r"(?<=[.])\s+(?=[A-Z(])")


def withhold(texts: dict[str, str]) -> dict[str, str]:
    """Each case text with the sentences WITHHELD_SENTENCES names removed.

    Takes every text the page shows that WITHHELD_SENTENCES may name, keyed the
    same way, in one call, so a key that names none of them (a typo, a renamed
    module) stops the build instead of letting its sentences through.
    """
    unread = sorted(set(WITHHELD_SENTENCES) - set(texts))
    if unread:
        raise SystemExit(
            f"error: WITHHELD_SENTENCES keys {unread} name no text this page "
            "shows, so their sentences would not be withheld. Fix the keys."
        )
    shown = {}
    for key, text in texts.items():
        prefixes = WITHHELD_SENTENCES.get(key, ())
        sentences = SENTENCE_BREAK.split((text or "").strip())
        for prefix in prefixes:
            hits = sum(1 for s in sentences if s.startswith(prefix))
            if hits != 1:
                raise SystemExit(
                    f"error: {key}: expected one sentence starting {prefix!r}, "
                    f"found {hits}. Re-read the case prose before publishing."
                )
        shown[key] = " ".join(s for s in sentences if not s.startswith(prefixes))
    return shown


def pick(rows: dict[str, dict], wanted: tuple[str, ...], where: str) -> list[dict]:
    """The rows named in `wanted`, in that order; the build stops on a missing
    one, so a count printed from `wanted` is never larger than what is shown."""
    missing = [w for w in wanted if w not in rows]
    if missing:
        raise SystemExit(f"error: {where} has no row for {missing}")
    return [rows[w] for w in wanted]

# What a cited source is, where its id alone does not say. The case's own
# titles are not reliable here: it records US10189818B2 as "Crystalline forms
# of a CHK1 inhibitor" (the patent claims the (S)-lactate monohydrate salt)
# and gives the FDA briefing document a trial's title. Each note was checked
# against the linked document, 2026-09-21.
SOURCE_NOTES = {
    "WO2010077758A1": "Eli Lilly: compound and salts",
    "US10189818B2": "Eli Lilly: (S)-lactate monohydrate salt",
    "WO2024015484A2": "Acrivon: response-predictive biomarker method",
    "Prexasertib": "Eli Lilly FDA advisory committee briefing, 2017",
}


def esc(value) -> str:
    return html.escape(str(value if value is not None else ""), quote=True)


def png_size(path: pathlib.Path) -> tuple[int, int] | None:
    """Intrinsic pixel size from a PNG's IHDR chunk, or None.

    Read here rather than hardcoded so a re-exported figure never leaves the
    page declaring the old aspect ratio, and without adding a Pillow
    dependency for 8 bytes of header.
    """
    try:
        head = path.read_bytes()[:24]
    except OSError:
        return None
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", head[16:24])


def join_and(items: list[str]) -> str:
    """Join as prose: a / a and b / a, b, and c."""
    if len(items) < 3:
        return " and ".join(items)
    return ", ".join(items[:-1]) + ", and " + items[-1]


def humanize(enum_value: str) -> str:
    """Render a snake_case enum as prose without title-casing it.

    Title case on a machine value ("Hold For Named Data") reads as generated
    output; sentence case reads as a written verdict.
    """
    text = str(enum_value or "").replace("_", " ").strip()
    return text[:1].upper() + text[1:] if text else ""


def source_url(sid: str) -> str | None:
    """Map a declared evidence id to a public URL, or None if it has no page.

    Ids carry trailing qualifiers ("PMID 38555285 Supplementary Data 2",
    "PMC10981752_SOURCE_DATA"), so each branch extracts the bare accession
    rather than using the whole string.
    """
    sid = sid.strip().strip("[]")
    upper = sid.upper()

    if upper.startswith("PMID"):
        digits = re.search(r"\d+", sid)
        return (
            f"https://pubmed.ncbi.nlm.nih.gov/{digits.group()}/" if digits else None
        )
    if upper.startswith("NCT"):
        acc = re.match(r"NCT\d+", upper)
        return f"https://clinicaltrials.gov/study/{acc.group()}" if acc else None
    if upper.startswith("PMC"):
        acc = re.match(r"PMC\d+", upper)
        return (
            f"https://www.ncbi.nlm.nih.gov/pmc/articles/{acc.group()}/"
            if acc
            else None
        )
    if upper.startswith("GSE"):
        acc = re.match(r"GSE\d+", upper)
        return (
            "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=" + acc.group()
            if acc
            else None
        )
    # Patent publication numbers, e.g. WO2010077758A1 or US10189818B2. The
    # case records Google Patents as the canonical locator for each.
    if re.fullmatch(r"(WO|US|EP|JP|CN|KR)\d{6,}[A-Z]\d?", upper):
        return f"https://patents.google.com/patent/{upper}/en"
    return None


def linkify(text: str, code: bool = True) -> str:
    """Turn inline [PMID 38555285] / [NCT02203513] markers into real citations.

    The module prose carries these markers already; rendering them as links is
    presentation, not new content. Claim text also arrives as raw markdown, so
    `code spans` are converted here rather than shown as literal backticks.
    Pass code=False where a span holds a measurement rather than an
    identifier: "IC50 <1 nM" set in monospace mid-sentence reads as a bug.
    """
    escaped = esc(text)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>" if code else r"\1", escaped)

    def repl(match: re.Match) -> str:
        inner = match.group(1)
        parts = [p.strip() for p in re.split(r"[;,]", inner) if p.strip()]
        out = []
        for part in parts:
            # Case-local analysis paths are real provenance but mean nothing to
            # a reader who cannot open them; the Traceability section covers
            # them. Keep only identifiers that resolve to something public.
            if part.startswith("analysis/") or part.endswith((".json", ".csv")):
                continue
            url = source_url(part)
            out.append(
                f'<a class="dax-cite" href="{url}" target="_blank" '
                f'rel="noreferrer">{esc(part)}</a>'
                if url
                else esc(part)
            )
        return "[" + "; ".join(out) + "]" if out else ""

    escaped = re.sub(r"\[([^\[\]]{3,120})\]", repl, escaped)
    # Dropping an all-internal citation can leave " ." or a double space.
    escaped = re.sub(r"\s+([.,;:])", r"\1", escaped)
    return re.sub(r"  +", " ", escaped)


def source_link(source_id: str, locators: dict[str, str] | None = None) -> str:
    """One source id as a citation, rendered the same wherever it appears.

    Ids source_url() cannot map fall back to the public locator the case
    recorded for them, then to plain code. SOURCE_NOTES adds what the source
    is where the id alone does not say.
    """
    sid = source_id.strip().strip("[]")
    note = SOURCE_NOTES.get(sid)
    tail = f' <span class="dax-ref-part">({esc(note)})</span>' if note else ""
    url = source_url(sid)
    if not url:
        located = (locators or {}).get(sid, "")
        if located.startswith("https://"):
            return (
                f'<a class="dax-cite" href="{esc(located)}" target="_blank" '
                f'rel="noreferrer">{esc(sid)}</a>{tail}'
            )
        return f"<code>{esc(sid)}</code>{tail}"
    if sid.upper().startswith(("PMC", "GSE")):
        # Ids like PMC10981752_SUPP_DATA_1 or GSE249587_PROCESSED name a part of
        # a record; the link can only reach the record, so keep the suffix
        # outside it.
        acc = sid.split("_")[0]
        suffix = sid[len(acc):].replace("_", " ").strip().lower()
        anchor = (
            f'<a class="dax-cite" href="{url}" target="_blank" '
            f'rel="noreferrer">{esc(acc)}</a>'
        )
        return f'{anchor} <span class="dax-ref-part">{esc(suffix)}</span>' if suffix else anchor
    return (
        f'<a class="dax-cite" href="{url}" target="_blank" '
        f'rel="noreferrer">{esc(sid)}</a>{tail}'
    )


# The module prose names a few studies in words rather than by identifier
# ("the larger multicenter study"), so the reader has no way to reach them.
# These attach the citation the sentence is already describing.
IMPLIED_CITATIONS = (
    (
        re.compile(r"(The larger multicenter study makes that limit more important)"),
        "PMID 36192237",
    ),
    (
        re.compile(r"(The CA125 paper does not fill the mechanism gap)"),
        "PMID 39075200",
    ),
)


# Sentences of the form "X does not establish A, B, C, or D." recur in every
# chapter -- six times across the report. Each one is a genuine enumeration, so
# the words stay, but read in sequence the repeated frame becomes a cadence a
# reader starts predicting. Rendering the longest ones as the lists they
# already are breaks that without paraphrasing anything.
NEGATION_LIST = re.compile(
    r"^(?P<lead>.*?\b(?:do(?:es)? not (?:establish|support|show|exclude)|cannot"
    r"\s+(?:separate|show|establish))\b)\s+(?P<items>.+)\.$",
    re.S,
)


def split_items(items: str) -> list[str] | None:
    """Split "A, B, C, or D" into parts, if it really is a list of four or more.

    Returns None when the tail is ordinary prose, when a part is long enough to
    be a clause rather than an item, or when a part contains a citation marker
    that would be orphaned on its own line.
    """
    if ", or " not in items and ", and " not in items:
        return None
    parts = [p.strip() for p in re.split(r",\s*(?:or\s+|and\s+)?", items) if p.strip()]
    if len(parts) < 4:
        return None
    if any(len(p) > 90 or "[" in p for p in parts):
        return None
    return parts


def render_prose(chunk: str) -> str:
    """Render one paragraph, promoting a long trailing enumeration to a list.

    Only the chunk's final sentence is tested: matching across the whole chunk
    lets the pattern latch onto an earlier negation and swallow the rest of the
    paragraph as list items.
    """
    chunk = chunk.strip()
    sentences = re.split(r"(?<=[.])\s+(?=[A-Z(])", chunk)
    match = NEGATION_LIST.match(sentences[-1]) if sentences else None
    if match:
        parts = split_items(match.group("items"))
        if parts:
            lead_in = " ".join(sentences[:-1] + [match.group("lead")]).strip()
            items = "".join(f"<li>{linkify(p)}</li>" for p in parts)
            return (
                f'<p class="dax-body-p dax-body-lead">{linkify(lead_in)}:</p>'
                f'<ul class="dax-negation-list">{items}</ul>'
            )
    return f'<p class="dax-body-p">{linkify(chunk)}</p>'


def paragraphs(text: str) -> str:
    """Split long module prose into readable paragraphs."""
    if not text:
        return ""
    for pattern, source_id in IMPLIED_CITATIONS:
        text = pattern.sub(rf"\1 [{source_id}]", text, count=1)
    sentences = re.split(r"(?<=[.])\s+(?=[A-Z(])", text.strip())

    # A qualifying enumeration becomes its own chunk so it can be promoted to a
    # list; everything else packs into paragraphs as before.
    chunks, current = [], []
    for sentence in sentences:
        match = NEGATION_LIST.match(sentence.strip())
        if match and split_items(match.group("items")):
            # Carry the preceding sentences into the lead-in rather than
            # flushing them: the enumeration usually opens with a pronoun whose
            # antecedent is the sentence before it, and splitting them leaves a
            # one-line orphan paragraph above a dangling "It does not..."
            # The enumeration must end the chunk, since render_prose() anchors
            # its match to the end of the string.
            chunks.append(" ".join(current + [sentence]).strip())
            current = []
            continue
        current.append(sentence)
        if len(" ".join(current)) > 340:
            chunks.append(" ".join(current))
            current = []
    if current:
        chunks.append(" ".join(current))
    return "".join(render_prose(c) for c in chunks)


def figure_block(
    fig_key: str, figures: dict, number: int, alts: dict, locators: dict[str, str]
) -> str:
    meta = figures.get(fig_key)
    if not meta:
        return ""
    caption = meta.get("caption") or ""
    scope = meta.get("claim_scope") or ""
    etype = meta.get("evidence_type") or ""
    sources = meta.get("sources") or []

    tail = []
    if etype:
        tail.append(f"Evidence type: {esc(etype)}.")
    if scope:
        tail.append(f"Claim scope: {esc(scope.rstrip('.'))}.")
    src = (
        " Sources: " + "; ".join(source_link(s, locators) for s in sources) + "."
        if sources
        else ""
    )

    # The caption already states the finding, so alt text describes the data
    # instead of repeating the conclusion a screen-reader user just heard.
    alt = alts.get(fig_key) or meta.get("title", "")

    # Intrinsic size reserves the space: without it every lazy figure lays out
    # 2px tall and shoves the caption down when the PNG arrives.
    size = png_size(FIGURE_ROOT / fig_key)
    dims = f' width="{size[0]}" height="{size[1]}"' if size else ""

    return f"""
              <figure class="dax-figure">
                <a class="dax-fig-link" href="{FIGURE_DIR}/{esc(fig_key)}" target="_blank" rel="noopener"><img src="{FIGURE_DIR}/{esc(fig_key)}" alt="{esc(alt)}"{dims} loading="lazy" decoding="async" /></a>
                <figcaption class="dax-figcap">
                  <b>Figure {number}.</b> {linkify(meta.get('title', ''))}
                  {linkify(caption)}
                  <span class="dax-figmeta">{' '.join(tail)}{src}</span>
                </figcaption>
              </figure>
"""


def state_chip(state: str) -> str:
    label = STATE_LABELS.get(state, humanize(state))
    cls = "dax-chip-gap" if state in ("blocker", "not_supported") else "dax-chip-warn"
    return f'<span class="dax-ov-chip {cls}">{esc(label)}</span>'


def render_gate(row: dict, locators: dict[str, str]) -> str:
    """Render one evidence row in full: its finding, sources, and the data
    that would resolve it.

    Rendering every row this way repeated the same bold labels row after row,
    which read as a filled-in template however real the content was. One
    worked example plus a summary table carries the same information.
    Confidence is omitted: every row in a case tends to be "high", so a scale
    that never varies is decoration. Owner, sequence, pass/fail criteria,
    failure rule and next action are not read (see the module docstring).
    """
    row_id = row.get("row_id", "")
    state = row.get("status") or row.get("state") or ""
    requested = row.get("requested_files_or_data") or []
    req = ""
    if requested:
        items = "".join(f"<li>{esc(i)}</li>" for i in requested)
        req = (
            '<p class="dax-gate-reqhead">Data that would resolve this</p>'
            f'<ul class="dax-gate-req">{items}</ul>'
        )
    return f"""
              <article class="dax-gate">
                <p class="dax-gate-head">
                  <code>{esc(row_id)}</code>
                  {state_chip(state)}
                </p>
                <p class="dax-gate-claim">{linkify(row.get('claim', ''))} {gate_sources(row, locators)}</p>
                {req}
              </article>
"""


def gate_sources(row: dict, locators: dict[str, str]) -> str:
    """The row's evidence as citations, so each finding shows its sources.

    Case-local analysis paths are dropped for the same reason linkify drops
    them: the Traceability section covers them, and a reader cannot open them.
    """
    links = [
        source_link(sid, locators)
        for sid in (s.strip() for s in row.get("evidence_ids") or [])
        if "/" not in sid and not sid.endswith((".json", ".csv"))
    ]
    if not links:
        return ""
    return f'<span class="dax-gate-sources">Sources: {"; ".join(links)}.</span>'


def render_gate_rows(rows: list[dict], locators: dict[str, str]) -> str:
    """Summarise the remaining evidence rows as table rows."""
    out = []
    for row in rows:
        row_id = row.get("row_id", "")
        state = row.get("status") or row.get("state") or ""
        items = "".join(f"<li>{esc(i)}</li>" for i in row.get("requested_files_or_data") or [])
        requested = f'<ul class="dax-gate-req">{items}</ul>' if items else ""
        out.append(
            "<tr>"
            f'<th scope="row"><code>{esc(row_id)}</code></th>'
            f"<td>{state_chip(state)}</td>"
            f"<td>{linkify(row.get('claim', ''))} {gate_sources(row, locators)}</td>"
            f"<td>{requested}</td>"
            "</tr>"
        )
    return "".join(out)


def build(vm: dict, modules: dict, figures: dict, alts: dict) -> str:
    # Public locators the case recorded, for ids source_url() cannot map.
    locators = {
        s.get("source_id", ""): s.get("locator") or ""
        for s in vm.get("evidence_traceability", {}).get("sources", [])
    }
    reader = vm["reader_surface"]
    packet = vm["decision_packet"]
    brief = vm["biomarker_decision_brief"]
    et = vm.get("evidence_traceability", {})
    shown = withhold(
        {
            "reader_surface.current_readout": reader.get("current_readout", ""),
            "biomarker_decision_brief.guardrail": brief.get("guardrail", ""),
            **{
                s["module"] + ".Interpretation": modules.get(s["module"], {}).get("Interpretation", "")
                for s in SECTIONS
            },
        }
    )

    asset = vm.get("asset", "")
    # The top-level indication is an abbreviation ("Platinum-resistant HGSOC")
    # that drops BRCA-wild-type, a defining eligibility criterion and a major
    # stratifier for a DNA-damage-response asset. The decision packet carries
    # the full population; use it on the cover and keep the short form for
    # running heads where space is tight.
    indication = vm.get("indication", "")
    indication_full = (
        packet.get("biomarker_decision_brief", {}).get("indication") or indication
    )
    prepared = vm.get("prepared_date", "")
    as_of = packet.get("source_status_as_of", prepared)

    claims = et.get("claims", [])
    sources = et.get("sources", [])

    def is_reviewed(claim: dict) -> bool:
        return (
            claim.get("kind") == "semantic_review"
            and (claim.get("review_binding") or {}).get("status") == "current"
        )

    reviewed = sum(1 for c in claims if is_reviewed(c))
    external = sum(1 for s in sources if s.get("locator"))

    # The stat row prints "64/89 claims reviewed" and "23/44 public source
    # links" with no denominator, which reads as 25 unchecked claims and 21
    # undisclosed sources. Both remainders are computed here so the page can
    # say what they actually are.
    kinds = {c.get("kind") for c in claims if not is_reviewed(c)}
    kind_names = [v for k, v in CLAIM_KIND_LABELS.items() if k in kinds]
    kind_names += sorted(
        f"{humanize(k).lower()} records" for k in kinds if k not in CLAIM_KIND_LABELS
    )
    remainder = (
        f"The remaining {len(claims) - reviewed} entries are {join_and(kind_names)}. "
        if kind_names
        else ""
    )

    # ---- spine -----------------------------------------------------------
    nav = [
        '<li><a class="dax-nav-item" href="#overview"><span class="dax-nav-num" aria-hidden="true">◆</span>'
        '<span class="dax-nav-label">Overview</span></a></li>'
    ]
    short_labels = {"clinical": "Clinical", "mechanism": "Mechanism", "pharmacology": "Exposure", "toxicology": "Safety"}
    for s in SECTIONS:
        nav.append(
            f'<li><a class="dax-nav-item" href="#{s["id"]}">'
            f'<span class="dax-nav-num">{s["num"]}</span>'
            f'<span class="dax-nav-label"><span class="dax-nav-long">{s["label"]}</span>'
            f'<span class="dax-nav-short">{short_labels[s["id"]]}</span></span></a></li>'
        )
    nav.append(
        '<li><a class="dax-nav-item" href="#gaps"><span class="dax-nav-num" aria-hidden="true">◆</span>'
        '<span class="dax-nav-label">Evidence &amp; Gaps</span></a></li>'
    )
    nav.append(
        '<li><a class="dax-nav-item" href="#traceability"><span class="dax-nav-num" aria-hidden="true">◆</span>'
        '<span class="dax-nav-label">Traceability</span></a></li>'
    )

    # ---- overview --------------------------------------------------------
    # Each chip states what the chapter PRODUCED, not what the asset lacks.
    # An earlier version labelled the asset's state ("No selection biomarker"),
    # which read as though the analysis had come up empty -- the opposite of
    # the point, since finding and grading the candidates is the deliverable.
    section_status = []
    chips = {
        "clinical": (
            "dax-chip-ok",
            "Responder subset observed",
            "12 of 39 evaluable patients had a partial response.",
        ),
        "mechanism": (
            "dax-chip-warn",
            "Two unvalidated candidates",
            "Neither the replication score nor POLA1 has independent validation.",
        ),
        "pharmacology": (
            "dax-chip-warn",
            "Gross underexposure less likely",
            "Public data cannot show whether individual nonresponders were underexposed.",
        ),
        "toxicology": (
            "dax-chip-warn",
            "Marrow toxicity quantified",
            "The therapeutic margin in combination regimens remains unmeasured.",
        ),
    }
    for s in SECTIONS:
        cls, chip, gist = chips[s["id"]]
        section_status.append(
            f'<li><a class="dax-ov-link" href="#{s["id"]}">'
            f'<span class="dax-ov-sec-block">'
            f'<span class="dax-ov-sec-name">{s["label"]}</span>'
            f'<span class="dax-ov-sec-gist">{esc(gist)}</span></span>'
            f'<span class="dax-ov-chip {cls}">{esc(chip)}</span></a></li>'
        )

    # ---- body sections ---------------------------------------------------
    body, fig_no = [], 1
    for s in SECTIONS:
        mod = modules.get(s["module"], {})
        figs = figure_block(s["figure"], figures, fig_no, alts, locators)
        fig_no += 1
        extra = ""
        scope = f'<p class="dax-scope-line">{esc(s["scope"])}</p>' if s.get("scope") else ""
        if s.get("figure2"):
            extra = figure_block(s["figure2"], figures, fig_no, alts, locators)
            fig_no += 1

        body.append(
            f"""
            <section class="dax-page" id="{s['id']}">
              <div class="dax-rhead"><span>{esc(asset)} · {esc(indication)}</span><b>DrugAdopt biomarker readout</b></div>
              <p class="dax-sec-num">Section {s['num']}</p>
              <h2 class="dax-sec-h">{s['label']}</h2>

              <p class="dax-question-line">{linkify(mod.get('Question', ''))}</p>

              {figs}
              {paragraphs(mod.get('Answer', ''))}
              {extra}

              <div class="dax-callout">
                <div class="dax-callout-head">Interpretation</div>
                <div class="dax-callout-body">{paragraphs(shown[s['module'] + '.Interpretation'])}</div>
              </div>
              {scope}

              <div class="dax-rfoot"><span>Generated by DrugAdopt from public evidence · Not medical advice</span><span>{s['num']}</span></div>
            </section>
"""
        )

    # ---- gates -----------------------------------------------------------
    # The first featured gate is shown in full as a worked example; the rest
    # are summarised, so the reader sees the structure once instead of five
    # times.
    by_id = {r.get("row_id"): r for r in packet.get("rows", [])}
    featured = pick(by_id, FEATURED_ROWS, "decision_packet.rows")
    gates = render_gate(featured[0], locators) if featured else ""
    gate_rows = render_gate_rows(featured[1:], locators)

    bio_rows = "".join(
        "<tr>"
        f'<th scope="row">{esc(r.get("biomarker"))}</th>'
        f"<td>{esc(r.get('evidence_strength'))}</td>"
        "</tr>"
        for r in brief.get("rows", [])
    )

    delta_by_gap = {d.get("missing_evidence"): d for d in packet.get("decision_deltas", [])}
    deltas = "".join(
        "<tr>"
        f'<th scope="row">{esc(d.get("missing_evidence"))}</th>'
        f"<td>{esc(d.get('would_change_decision_if'))}</td>"
        "</tr>"
        for d in pick(delta_by_gap, FEATURED_DELTAS, "decision_deltas")
    )

    # ---- traceability ----------------------------------------------------
    # Sample one claim per module rather than the first four in file order:
    # those all land in plan-tpp and share a hash, which reads as repetition
    # instead of showing the binding spans the whole case.
    sample = []
    for module in ("clinical", "pharmacology", "adme", "toxicology"):
        for c in claims:
            if c.get("module") != module:
                continue
            refs = [
                r for r in (c.get("source_refs") or [])
                if r.get("resolution") == "hash_bound"
            ]
            binding = c.get("review_binding") or {}
            if not refs or binding.get("status") != "current":
                continue
            chapter = SECTION_BY_MODULE.get(module, esc(module))
            sample.append(
                "<li>"
                f'<span class="dax-claim-text">{linkify(c.get("claim", ""), code=False)}</span>'
                f'<span class="dax-claim-meta"><code>{esc(c.get("claim_id", ""))}</code>'
                f' · {chapter}'
                f' @ <code>{esc((binding.get("module_sha256") or "")[:12])}</code></span>'
                "</li>"
            )
            break

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://www.googletagmanager.com https://static.cloudflareinsights.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://cloudflareinsights.com" />
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="description" content="An example DrugAdopt readout: a CHK1 inhibitor in platinum-resistant ovarian cancer, worked from public evidence with source-linked figures and named gaps." />
    <meta name="theme-color" content="#f2f3f1" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#101412" media="(prefers-color-scheme: dark)" />
    <title>Example report | Orchestrated Biosciences</title>
    <link rel="canonical" href="https://orchestrated.bio/report.html" />
    <link rel="icon" type="image/svg+xml" href="./images/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="./favicon.png" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Orchestrated Biosciences" />
    <meta property="og:title" content="DrugAdopt example report | Orchestrated Biosciences" />
    <meta property="og:description" content="{esc(asset)} in {esc(indication)}: what the public evidence supports, what it does not, and the experiment that would close the gap." />
    <meta property="og:url" content="https://orchestrated.bio/report.html" />
    <meta property="og:image" content="https://orchestrated.bio/images/og-image.png" />
    <meta property="og:image:alt" content="Orchestrated.bio: the DNA-helix mark and wordmark, with the lines Biomarker discovery for patient selection and DrugAdopt, Custom analysis, Insight" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="./assets/css/company-site/base.css?v={asset_version("assets/css/company-site/base.css")}" />
    <link rel="stylesheet" href="./assets/css/company-site/drugadopt.css?v={asset_version("assets/css/company-site/drugadopt.css")}" />
    <link rel="stylesheet" href="./assets/css/company-site/report.css?v={asset_version("assets/css/company-site/report.css")}" />
    <script src="./assets/js/cookie-consent.js?v={asset_version("assets/js/cookie-consent.js")}"></script>
  </head>
  <body>
    <a class="skip-link" href="#overview">Skip to content</a>

    <header class="masthead">
      <div class="shell">
        <a class="brand" href="./" aria-label="Orchestrated Biosciences home">
          <img class="brand-logo brand-logo-light" src="./images/logo-icon.png" alt="" aria-hidden="true" />
          <img class="brand-logo brand-logo-dark" src="./images/logo-icon-white.svg" alt="" aria-hidden="true" />
          <span class="brand-word">rchestrated<span>.bio</span></span>
        </a>
        <button class="site-nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" hidden>Menu</button>
        <nav class="site-nav" id="site-nav" aria-label="Primary">
          <!-- "true", not "page": this marks the current section, and the
               link goes to another page. -->
          <a href="./" aria-current="true">DrugAdopt</a>
          <a href="./custom-analysis.html">Custom analysis</a>
          <a href="./insight.html">Insight</a>
          <a href="./company.html">Company</a>
          <a class="nav-cta" href="mailto:support@orchestrated.bio">Contact</a>
        </nav>
      </div>
    </header>

    <main id="main" class="rpt-stage">
      <div class="rpt-intro">
        <h1 class="rpt-intro-title">Public evidence on prexasertib's candidate response biomarkers.</h1>
        <p class="rpt-intro-lede">This example DrugAdopt report uses public evidence to examine candidate response biomarkers for {esc(asset.lower())}. It shows the evidence for and against each marker and the experiments needed to address the gaps. No candidate marker has independent validation. <a href="./">What DrugAdopt does</a>. <a href="https://calendar.app.google/HNzF6R9HYb7xhypd7" target="_blank" rel="noreferrer">Book a call&nbsp;<span aria-hidden="true">↗</span></a></p>
      </div>

      <div class="dax-ui dax-full" role="region" aria-label="DrugAdopt biomarker readout on {esc(asset)} in {esc(indication)}">

        <nav class="dax-spine" aria-label="Report sections">
          <div class="dax-spine-brand">
            <span class="dax-spine-logo"><img src="./images/logo-icon-white.svg" alt="" aria-hidden="true" /></span>
            <span class="dax-spine-title">DrugAdopt<span>Biomarker &amp; patient-selection readout</span></span>
          </div>
          <ul class="dax-nav">{''.join(nav)}</ul>
        </nav>

        <div class="dax-paper dax-paper-scroll">

          <section class="dax-page dax-overview" id="overview" tabindex="-1">
            <div class="dax-ov-top">
              <div>
                <p class="dax-sec-num">Biomarker &amp; patient-selection readout</p>
                <h2 class="dax-ov-asset">{esc(asset)}</h2>
                <p class="dax-ov-target">{humanize(reader.get('modality', ''))} · Target {esc(reader.get('target', ''))}</p>
                <p class="dax-ov-ind">{esc(indication_full)}</p>
              </div>
            </div>

            <p class="dax-ov-readout">{linkify(reader.get('what_happened', ''))}</p>

            <div class="dax-callout dax-callout-verdict">
              <div class="dax-callout-head">What the public evidence leaves open</div>
              <div class="dax-callout-body">
                <p class="dax-callout-item">{linkify(shown['reader_surface.current_readout'])}</p>
              </div>
            </div>

            <p class="dax-ov-sechead">What each section found</p>
            <ul class="dax-ov-sections">{''.join(section_status)}</ul>

            <div class="dax-ov-foot">
              <span>Prepared {esc(prepared)} · sources as of {esc(as_of)} · from public evidence</span>
              <span>Each reviewed claim is hash-bound to its source and its review record</span>
            </div>
          </section>

          {''.join(body)}

          <section class="dax-page" id="gaps">
            <div class="dax-rhead"><span>{esc(asset)} · {esc(indication)}</span><b>DrugAdopt biomarker readout</b></div>
            <p class="dax-sec-num">Evidence &amp; Gaps</p>
            <h2 class="dax-sec-h">Candidate biomarkers and what would validate them</h2>

            <p class="dax-body-p"><b>A responder subset makes a selection biomarker plausible.</b> These are the {len(brief.get('rows', []))} candidates the public evidence raises, the evidence behind each, and the data that would show whether it predicts response.</p>

            <div class="dax-table-scroll" tabindex="0" role="group" aria-label="Table 1. Candidate biomarkers and evidence strength">
            <table class="dax-table">
              <caption>Table 1. Every candidate assessed and the evidence behind it</caption>
              <thead><tr><th scope="col">Candidate</th><th scope="col">Evidence strength</th></tr></thead>
              <tbody>{bio_rows}</tbody>
            </table>
            </div>
            <p class="dax-scope-line">{esc(shown['biomarker_decision_brief.guardrail'])}</p>

            <h3 class="dax-sub-h">Open questions and the evidence behind them</h3>
            <p class="dax-body-p">Each row states a finding, its sources, and the data that would resolve it. One is shown in full below; the rest follow in Table 2.</p>
            {gates}

            <div class="dax-table-scroll" tabindex="0" role="group" aria-label="Table 2. The remaining open questions">
            <table class="dax-table">
              <caption>Table 2. The remaining open questions, with the data that would resolve each</caption>
              <thead><tr><th scope="col">Row</th><th scope="col">State</th><th scope="col">Finding</th><th scope="col">Data that would resolve it</th></tr></thead>
              <tbody>{gate_rows}</tbody>
            </table>
            </div>
            <p class="dax-scope-line">{len(featured)} of the {len(packet.get('rows', []))} evidence rows in the source case are shown.</p>

            <h3 class="dax-sub-h">What would change the interpretation</h3>
            <div class="dax-table-scroll" tabindex="0" role="group" aria-label="Table 3. Missing evidence and what it would show">
            <table class="dax-table">
              <caption>Table 3. Missing evidence and the result that would change the interpretation</caption>
              <thead><tr><th scope="col">Missing evidence</th><th scope="col">Would change the interpretation if</th></tr></thead>
              <tbody>{deltas}</tbody>
            </table>
            </div>

            <div class="dax-rfoot"><span>Generated by DrugAdopt from public evidence · Not medical advice</span><span>Gaps</span></div>
          </section>

          <section class="dax-page" id="traceability">
            <div class="dax-rhead"><span>{esc(asset)} · {esc(indication)}</span><b>DrugAdopt biomarker readout</b></div>
            <p class="dax-sec-num">Traceability</p>
            <h2 class="dax-sec-h">Evidence you can inspect</h2>

            <p class="dax-body-p">Where a finding cites a public source, the citation links to it. The counts below cover the whole source case, including chapters this page does not show.</p>

            <dl class="dax-stats">
              <div><dt>{len(claims)}</dt><dd>report claims</dd></div>
              <div><dt>{len(sources)}</dt><dd>source records</dd></div>
              <div><dt>{reviewed}/{len(claims)}</dt><dd>claims reviewed</dd></div>
              <div><dt>{external}/{len(sources)}</dt><dd>public source links</dd></div>
            </dl>
            <p class="dax-scope-line">{remainder}{len(sources) - external} of the {len(sources)} source records are analysis outputs computed for this report rather than external links. The report labels those boundaries instead of presenting them as settled evidence.</p>
            <p class="dax-scope-line">This case was prepared on {esc(prepared)} by an earlier DrugAdopt version that also wrote recommendations: a disposition, owners, next actions and stop rules. Current DrugAdopt reports present evidence and leave those decisions to you. This page therefore leaves out those fields, every row or sentence of the case that directs an action or rates readiness, rows from lanes current DrugAdopt does not cover, and the clinical row, whose finding the Clinical chapter already states. What it shows from the case is not reworded.</p>

            <details class="dax-trace-details">
              <summary>Technical traceability details</summary>
              <p class="dax-scope-line">One reviewed claim from each chapter:</p>
            <ol class="dax-claims">{''.join(sample)}</ol>

              <p class="dax-scope-line">The identifier fixes the reviewed claim and its chapter. If that text changes, the claim is flagged for another review. This record detects changes within this case; it does not establish publisher origin or scientific truth on its own.</p>
            </details>

            <div class="dax-rfoot"><span>Generated by DrugAdopt from public evidence · Not medical advice</span><span>Trace</span></div>
          </section>

        </div>
      </div>

      <aside class="rpt-outro">
        <div class="rpt-outro-body">
          <h2>What public evidence can and cannot settle, with the sources cited.</h2>
          <p>Every figure above comes from published papers, trial registries, and public repositories. No sponsor data or privileged access was used.</p>
          <p>On your own asset, the same pipeline runs against whatever you can share: internal PK, participant-level outcomes, unpublished assays. A sponsor can help close several gaps by sharing participant-linked exposure data, dose-modification records, or archived tissue.</p>
          <p class="rpt-outro-terms"><b>We are taking on a small number of pilot assets.</b> Tell us the drug and the indication, and we will show what public evidence can and cannot settle before you commit anything.</p>
        </div>
        <div class="rpt-outro-actions">
          <a class="btn" href="https://calendar.app.google/HNzF6R9HYb7xhypd7" target="_blank" rel="noreferrer">Book a call&nbsp;<span aria-hidden="true">↗</span></a>
          <a class="link-quiet" href="mailto:support@orchestrated.bio?subject=DrugAdopt%20pilot">Or email us</a>
          <a class="link-quiet" href="./company.html#data-handling">How your data is handled</a>
        </div>
      </aside>
    </main>

    <footer class="foot">
      <div class="shell">
        <p>© 2026 Orchestrated Biosciences · Cromwell, CT</p>
        <nav class="foot-links" aria-label="Footer">
          <a href="./privacy-policy.html">Privacy</a>
          <a href="./terms.html">Terms</a>
        </nav>
      </div>
    </footer>
    <script src="./assets/js/company-site/mobile-nav.js?v={asset_version("assets/js/company-site/mobile-nav.js")}"></script>
    <script src="./assets/js/company-site/report-spine.js?v={asset_version("assets/js/company-site/report-spine.js")}"></script>
  </body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--case",
        default="../_case_backups/from-out-dir-20260820/prexasertib-deliverable",
        help="Path to the deliverable directory containing report_view_model.json",
    )
    parser.add_argument("--out", default="report.html", help="Output HTML path")
    args = parser.parse_args()

    case = pathlib.Path(args.case)
    model_path = case / "report_view_model.json"
    if not model_path.exists():
        print(f"error: no view model at {model_path}", file=sys.stderr)
        return 1

    vm = json.loads(model_path.read_text())
    schema = vm.get("schema_version")
    if schema != SUPPORTED_SCHEMA:
        print(
            f"error: {model_path} is schema_version {schema}; this renderer "
            f"targets {SUPPORTED_SCHEMA}. Regenerate the case before publishing.",
            file=sys.stderr,
        )
        return 1

    for field in ("reader_surface", "decision_packet", "biomarker_decision_brief", "evidence_traceability"):
        if field not in vm:
            print(f"error: view model is missing {field}", file=sys.stderr)
            return 1

    modules = json.loads((CONTENT_DIR / "module_sections.json").read_text())
    figures = json.loads((CONTENT_DIR / "figure_captions.json").read_text())
    alts = {
        k: v
        for k, v in json.loads((CONTENT_DIR / "figure_alt.json").read_text()).items()
        if not k.startswith("_")
    }

    missing_figs = [
        s[k]
        for s in SECTIONS
        for k in ("figure", "figure2")
        if s.get(k) and not (pathlib.Path("images/drugadopt/report") / s[k]).exists()
    ]
    for fig in missing_figs:
        print(
            f"warning: {fig} is not in images/drugadopt/report; copy it from "
            f"{case / 'figures' / fig}",
            file=sys.stderr,
        )

    out = pathlib.Path(args.out)
    out.write_text(build(vm, modules, figures, alts))
    print(f"wrote {out} from {model_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
