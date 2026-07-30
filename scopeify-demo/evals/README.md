# Scopeify Agentic QA

These fixtures turn Scopeify feedback into repeatable checks. The core workflow is intentionally small and static-site friendly: it does not need PubMed, GEO, SRA, ENA, GSA/CNSA, bioRxiv, Pydantic AI, or browser automation to run.

Run it after editing Scopeify:

```bash
python3 scripts/build_scopeify_standalone.py
python3 scripts/evaluate_scopeify_demo.py
```

The evaluator writes:

- `tmp/scopeify-evals/latest.md`
- `tmp/scopeify-evals/latest.json`

For higher-judgment review, use `agentic_review_prompt.md` with one or more reviewer agents after the automated checks pass.

For rendered QA, use `scopeify_rendered_scenarios.json` as the scenario matrix. It covers project-question routing, empty input, long text wrapping, browser-side metadata scans, malformed JSON, binary files, arbitrary field-name mapping, duplicate sample IDs, single-group designs, and known product gaps where the current static demo still falls back to the GLP-1 example.

## Agent Lanes

- `source_discovery_agent`: verifies archive coverage, found/screened/selected counts, selected evidence, and excluded evidence.
- `sow_quote_agent`: verifies the default submitted document behaves like a concise client SOW with generation date, effort, deliverables, assumptions, exclusions, and an exportable estimate.
- `browser_data_review_agent`: verifies local files are framed as browser-side scans and that low-n, missing outcome, and batch-effect risks can appear.
- `visual_formatting_agent`: verifies the dark page theme and the submitted light PDF-style document window.
- `client_confidence_agent`: verifies the second document tab preserves dataset inventory/search transparency without crowding the SOW, and keeps the consultation path obvious.
- `roadmap_agent`: tracks future cases that should become real fixtures once Scopeify has backend search skills and canned analyses.

`PLANNED` rows are not failures. They are coverage debt: future Scopeify workflows that the static demo should not claim to perform yet.
