#!/usr/bin/env python3
"""Extract prose and figure captions from a DrugAdopt deliverable's HTML pages.

report_view_model.json carries the decision layer, but the readable prose --
each module's Question / Answer / Interpretation, and the real figure captions
with their evidence type and claim scope -- lives only in the rendered module
pages. This script pulls that text out verbatim so build_report_page.py can
render it without anything being paraphrased or invented.

Writes two files next to this script:
    module_sections.json   {module: {title, Question, Answer, Interpretation}}
    figure_captions.json   {figure.png: {title, evidence_type, caption,
                                         claim_scope, sources}}

Usage:
    python3 scripts/extract_report_content.py \
        --case ../drugadopt/out/prexasertib-deliverable
"""

from __future__ import annotations

import argparse
import html
import json
import pathlib
import re
import sys

# Module page -> key used by the renderer. The deliverable names the exposure
# chapter "adme" internally while titling it "Pharmacology & Exposure".
MODULE_PAGES = {
    "clinical": "clinical.html",
    "pharmacology": "pharmacology.html",
    "adme": "adme.html",
    "toxicology": "toxicology.html",
}

WANTED_HEADINGS = ("Question", "Answer", "Interpretation")

# Figure -> the module page that carries its caption.
FIGURE_PAGES = {
    "clinical_cohort_flow.png": "clinical.html",
    "replication_signal_robustness.png": "pharmacology.html",
    "mechanism_evidence_chain.png": "pharmacology.html",
    "prexasertib_exposure_boundary.png": "adme.html",
    "clinical_safety_burden.png": "toxicology.html",
}


def text_of(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def clean_prose(body: str) -> str:
    """Pull readable prose out of one module section.

    The deliverable is rendered from markdown with hard-wrapped source lines, so
    a single sentence is split across several <p> tags mid-clause. Naively
    joining every <p> in the section also drags in the collapsed
    "Alternative explanations and limits" <details> block, whose <li> text and
    continuation <p> tags interleave into sentence fragments.

    So: cut the section at the first <details>, take the <p> tags before it, and
    rejoin them into sentences.
    """
    body = re.split(r"<details", body, maxsplit=1)[0]
    paras = re.findall(r"<p[^>]*>(.*?)</p>", body, re.S)
    joined = " ".join(text_of(p) for p in paras)
    joined = re.sub(r"\s+", " ", joined).strip()
    # Hard-wrapped lines leave spaces before punctuation once rejoined.
    joined = re.sub(r"\s+([,.;:%])", r"\1", joined)
    joined = re.sub(r"\(\s+", "(", joined)
    joined = re.sub(r"\s+\)", ")", joined)
    return trim_to_sentences(joined)


# Sentences describing which PNG lives in which artifact bundle are internal
# bookkeeping: true, but about the case's own file layout rather than the drug.
# Anchored to bookkeeping phrasing rather than bare substrings: a plain
# "\.png" would also delete a real finding that happens to name a figure file,
# and "analysis manifests" would match the verb ("the analysis manifests a
# clear dose-response").
HOUSEKEEPING = re.compile(
    r"^\s*(?:The\s+)?(?:reader-facing\s+|strict\s+)?[\w/.-]+\.png\b"
    r"|\bstrict diligence pack\b"
    r"|\brecorded in the analysis manifests\b"
    r"|\breplay-only\b",
    re.I,
)

# Sentences that announce a conclusion's quality instead of stating it -- the
# throat-clearing before the real point ("This makes the development choice
# straightforward. Do not select patients from this dataset."). The sentence
# that follows always carries the content, so dropping these removes no claim.
#
# Deliberately narrow. Most short sentences here are load-bearing: "The
# translational result is exploratory" and "The public data do not explain the
# patient split" look slight but classify evidence. Matching on brevity would
# delete the argument, so each pattern names a specific empty construction.
EMPTY_CONNECTIVE = re.compile(
    r"^\s*(?:This|That|It)\s+"
    r"(?:makes?|renders?|leaves?)\s+"
    r"(?:the\s+)?\w+(?:\s+\w+)?\s+"
    r"(?:choice|decision|question|answer|conclusion|path|case|picture)\s+"
    r"(?:straightforward|clear|simple|obvious|easy|unambiguous)\.\s*$",
    re.I,
)


# A sentence is complete if it ends in terminal punctuation, a closing bracket
# or quote, or a percent sign -- all routine here ("...ORR was 30.8%").
# Questions end in "?", which an earlier version of this set omitted; that
# silently deleted every module's opening Question, since those are always
# questions.
SENTENCE_END = (".", "?", "!", "]", ")", "%", '"', "”", "’", "'")


def trim_to_sentences(text: str) -> str:
    """Drop a trailing fragment and any file-bookkeeping sentences.

    Module prose is hard-wrapped, so the last <p> before a table or <details>
    can end mid-clause. A sentence that does not terminate is dropped rather
    than published as a fragment.
    """
    if not text:
        return ""
    sentences = re.split(r"(?<=[.?!])\s+(?=[A-Z(])", text.strip())
    kept = [
        s
        for s in sentences
        if not HOUSEKEEPING.search(s) and not EMPTY_CONNECTIVE.match(s)
    ]
    while kept and not kept[-1].rstrip().endswith(SENTENCE_END):
        kept.pop()
    return " ".join(kept).strip()


def extract_modules(case: pathlib.Path) -> dict:
    out = {}
    for key, page in MODULE_PAGES.items():
        path = case / page
        if not path.exists():
            print(f"warning: {path} missing, skipping {key}", file=sys.stderr)
            continue
        raw = path.read_text()

        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", raw, re.S)
        section = {"title": text_of(h1.group(1)) if h1 else ""}

        # Split on heading boundaries, keeping the heading text.
        parts = re.split(r"<h[23][^>]*>(.*?)</h[23]>", raw, flags=re.S)
        for i in range(1, len(parts), 2):
            heading = text_of(parts[i])
            if heading not in WANTED_HEADINGS or heading in section:
                continue
            body = parts[i + 1] if i + 1 < len(parts) else ""
            section[heading] = clean_prose(body)
        out[key] = section
    return out


def extract_figures(case: pathlib.Path) -> dict:
    out = {}
    for figure, page in FIGURE_PAGES.items():
        path = case / page
        if not path.exists():
            continue
        raw = path.read_text()
        idx = raw.find("figures/" + figure)
        if idx < 0:
            print(f"warning: {figure} not referenced in {page}", file=sys.stderr)
            continue

        window = text_of(raw[idx : idx + 2600])
        window = window.replace("Open full-resolution figure", "", 1).strip()
        window = re.sub(r'^figures/\S+"?>?\s*', "", window)

        # Title runs up to the first "Evidence type:".
        title = window.split("Evidence type:")[0].strip()

        detail = ""
        m = re.search(r"Evidence type:(.*?)(?:Trace sources:|$)", window, re.S)
        if m:
            detail = m.group(1).strip()

        etype = ""
        em = re.match(r"\s*([^.]+)\.", detail)
        if em:
            etype = em.group(1).strip()

        scope = ""
        sm = re.search(r"Claim scope:\s*(.+?)(?:\s*Sources:|$)", detail, re.S)
        if sm:
            scope = sm.group(1).strip()

        sources = []
        srcm = re.search(r"Sources:\s*([^.]+)\.", detail)
        if srcm:
            sources = [s.strip() for s in srcm.group(1).split(",") if s.strip()]

        # Whatever sits between the evidence type and the claim scope is the
        # descriptive caption. Some figures have none; the title carries it.
        caption = re.sub(r"^\s*[^.]+\.\s*", "", detail)
        caption = re.sub(r"\s*Claim scope:.*$", "", caption, flags=re.S).strip()

        out[figure] = {
            "title": title,
            "evidence_type": etype,
            "caption": caption,
            "claim_scope": scope,
            "sources": sources,
        }
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--case",
        default="../drugadopt/out/prexasertib-deliverable",
        help="Path to the deliverable directory",
    )
    args = parser.parse_args()

    case = pathlib.Path(args.case)
    if not case.exists():
        print(f"error: {case} does not exist", file=sys.stderr)
        return 1

    here = pathlib.Path(__file__).parent
    modules = extract_modules(case)
    figures = extract_figures(case)

    if not modules or not figures:
        print("error: extracted nothing; check the case layout", file=sys.stderr)
        return 1

    (here / "module_sections.json").write_text(json.dumps(modules, indent=2))
    (here / "figure_captions.json").write_text(json.dumps(figures, indent=2))
    print(
        f"wrote module_sections.json ({len(modules)} modules) and "
        f"figure_captions.json ({len(figures)} figures)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
