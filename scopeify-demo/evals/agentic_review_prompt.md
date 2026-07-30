# Scopeify Agent Review Prompt

Use this prompt when asking a coding or product-review agent to evaluate Scopeify after a demo change. Pair it with the automated evaluator:

```bash
python3 scripts/build_scopeify_standalone.py
python3 scripts/evaluate_scopeify_demo.py
```

## Shared Inputs

- `_includes/scopeify-demo.html`
- `assets/css/scopeify-demo.css`
- `assets/js/scopeify-demo.js`
- `scopeify.html`
- `scopeify-demo/standalone.html`
- `scopeify-demo/evals/scopeify_eval_cases.json`
- `tmp/scopeify-evals/latest.md`

## Ground Rules

- Do not claim live PubMed, GEO, SRA, ENA, GSA/CNSA, bioRxiv, or LLM-backed search unless a backend implementation is present and verified.
- Treat `PLANNED` fixtures as roadmap coverage, not current product behavior.
- Do not describe user-selected local files as uploaded unless a real transfer exists.
- Judge the output as something a prospective client would use to decide whether a consultation is worth scheduling.
- Findings should include file and line references.

## Reviewer Lanes

### Visual Formatting Agent

Review whether the page keeps the Orchestrated dark theme while the submitted SOW appears as a clean, light PDF-style document window. Check first-screen behavior after submit, mobile layout, print styling, text overflow risk, and whether the static evaluator would catch obvious HTML/CSS corruption.

### SOW And Quote Agent

Review whether the default submitted document feels like a professional consulting SOW: generation date, prepared-for/prepared-by metadata, effort estimate, timeline/window, expected deliverables, phase table, assumptions, exclusions, and CSV/XLSX-ready export. Search audit and selected evidence should not crowd the SOW.

### Evidence Search Agent

Review whether the separate Dataset Inventory document makes search comprehensiveness legible: source coverage, query focus, found/screened/selected counts, selected dataset rationale, availability, technology, cohort, year, and reuse risk. Flag any overclaiming about direct evidence.

### Browser Data Review Agent

Review whether local file handling is accurately framed as a browser-side scan of filenames, formats, headings, and preview-level risks. Confirm low n, missing response labels, and batch-effect language are testable fixtures.

### Roadmap Agent

Review whether future fixtures cover the right canned workflows: bulk RNA-seq differential expression, single-cell RNA-seq, GWAS, controlled-access constraints, China archive coverage, no-go public data findings, and backend agent/tool truthfulness.

## Output Format

Return:

1. Blocking findings, if any.
2. Non-blocking confidence risks.
3. Missing or weak fixtures to add next.
4. A one-line verdict: `ready for demo`, `needs polish`, or `not ready`.
