#!/usr/bin/env python3
"""Run lightweight agentic QA checks for the Scopeify static demo."""

from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
EVAL_CASES = ROOT / "scopeify-demo" / "evals" / "scopeify_eval_cases.json"
RENDERED_SCENARIOS = ROOT / "scopeify-demo" / "evals" / "scopeify_rendered_scenarios.json"
OUT_DIR = ROOT / "tmp" / "scopeify-evals"

SOURCE_FILES = {
    "include": ROOT / "_includes" / "scopeify-demo.html",
    "script": ROOT / "assets" / "js" / "scopeify-demo.js",
    "https_upgrade": ROOT / "assets" / "js" / "scopeify-https-upgrade.js",
    "styles": ROOT / "assets" / "css" / "scopeify-demo.css",
    "builder": ROOT / "scripts" / "build_scopeify_standalone.py",
    "standalone": ROOT / "scopeify-demo" / "standalone.html",
    "page": ROOT / "scopeify.html"
}


@dataclass
class Check:
    status: str
    agent: str
    check_id: str
    summary: str
    evidence: list[str]


VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
}


class BalanceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.stack: list[tuple[str, int]] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() not in VOID_TAGS:
            self.stack.append((tag.lower(), self.getpos()[0]))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        return

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if not self.stack:
            self.errors.append(f"Unexpected closing </{tag}> at line {self.getpos()[0]}")
            return
        top, line = self.stack[-1]
        if top != tag:
            self.errors.append(f"Expected closing </{top}> from line {line}, found </{tag}> at line {self.getpos()[0]}")
            return
        self.stack.pop()

    def finish(self) -> list[str]:
        return self.errors + [f"Unclosed <{tag}> from line {line}" for tag, line in reversed(self.stack)]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_sources() -> dict[str, str]:
    return {name: read_text(path) for name, path in SOURCE_FILES.items() if path.exists()}


def lower_contains(text: str, needle: str) -> bool:
    return needle.lower() in text.lower()


def find_line(sources: dict[str, str], needle: str) -> str | None:
    for name, text in sources.items():
        for number, line in enumerate(text.splitlines(), 1):
            if lower_contains(line, needle):
                rel = SOURCE_FILES[name].relative_to(ROOT)
                return f"{rel}:{number}"
    return None


def find_regex_lines(sources: dict[str, str], pattern: str) -> list[str]:
    found: list[str] = []
    compiled = re.compile(pattern, re.IGNORECASE)
    for name, text in sources.items():
        for number, line in enumerate(text.splitlines(), 1):
            if compiled.search(line):
                rel = SOURCE_FILES[name].relative_to(ROOT)
                found.append(f"{rel}:{number}: {line.strip()}")
    return found


def add_check(
    checks: list[Check],
    status: str,
    agent: str,
    check_id: str,
    summary: str,
    evidence: Iterable[str] = ()
) -> None:
    checks.append(Check(status=status, agent=agent, check_id=check_id, summary=summary, evidence=list(evidence)))


def require_terms(
    checks: list[Check],
    sources: dict[str, str],
    agent: str,
    check_id: str,
    summary: str,
    terms: Iterable[str],
    corpus_names: Iterable[str] | None = None
) -> None:
    selected = {name: sources[name] for name in (corpus_names or sources.keys()) if name in sources}
    corpus = "\n".join(selected.values())
    missing = [term for term in terms if not lower_contains(corpus, term)]
    evidence = [find_line(selected, term) or term for term in terms if term not in missing]
    if missing:
        add_check(checks, "FAIL", agent, check_id, f"{summary} Missing: {', '.join(missing)}", evidence)
    else:
        add_check(checks, "PASS", agent, check_id, summary, evidence[:8])


def freshness_check(checks: list[Check]) -> None:
    include = SOURCE_FILES["include"]
    builder = SOURCE_FILES["builder"]
    outputs = [SOURCE_FILES["standalone"], SOURCE_FILES["page"]]
    if not include.exists() or not builder.exists():
        add_check(checks, "FAIL", "visual_formatting_agent", "generated_pages_freshness", "Missing include or builder file.", [])
        return

    stale: list[str] = []
    newest_input = max(include.stat().st_mtime, builder.stat().st_mtime)
    for output in outputs:
        if not output.exists():
            stale.append(f"{output.relative_to(ROOT)} is missing")
        elif output.stat().st_mtime < newest_input:
            stale.append(f"{output.relative_to(ROOT)} is older than the Scopeify include or builder")

    if stale:
        add_check(checks, "WARN", "visual_formatting_agent", "generated_pages_freshness", "; ".join(stale), [])
    else:
        add_check(checks, "PASS", "visual_formatting_agent", "generated_pages_freshness", "Generated Scopeify pages are current against the include and builder.", [])


def syntax_checks(checks: list[Check], sources: dict[str, str]) -> None:
    try:
        ast.parse(sources.get("builder", ""))
        ast.parse(read_text(Path(__file__)))
        add_check(checks, "PASS", "visual_formatting_agent", "python_syntax", "Scopeify build and eval scripts parse cleanly.", [])
    except SyntaxError as error:
        add_check(checks, "FAIL", "visual_formatting_agent", "python_syntax", str(error), [])

    try:
        results = [
            subprocess.run(
                ["node", "--check", str(SOURCE_FILES[name])],
                cwd=ROOT,
                text=True,
                capture_output=True,
                timeout=10,
                check=False
            )
            for name in ("script", "https_upgrade")
        ]
    except (FileNotFoundError, subprocess.TimeoutExpired) as error:
        add_check(checks, "WARN", "visual_formatting_agent", "javascript_syntax", f"Could not run node --check: {error}", [])
        return

    failures = [result for result in results if result.returncode != 0]
    if not failures:
        add_check(checks, "PASS", "visual_formatting_agent", "javascript_syntax", "Scopeify JavaScript files pass node --check.", [])
    else:
        output = "\n".join((result.stderr or result.stdout).strip() for result in failures)
        add_check(checks, "FAIL", "visual_formatting_agent", "javascript_syntax", output[:1000], [])

    html_errors: list[str] = []
    for name in ["include", "standalone", "page"]:
        if name not in sources:
            continue
        parser = BalanceParser()
        parser.feed(sources[name])
        errors = parser.finish()
        if errors:
            html_errors.extend(f"{SOURCE_FILES[name].relative_to(ROOT)}: {error}" for error in errors)

    if html_errors:
        add_check(checks, "FAIL", "visual_formatting_agent", "html_balance", "Scopeify HTML has unbalanced tags.", html_errors[:20])
    else:
        add_check(checks, "PASS", "visual_formatting_agent", "html_balance", "Scopeify include and generated pages have balanced HTML tags.", [])


def static_workflow_checks(checks: list[Check], sources: dict[str, str]) -> None:
    require_terms(
        checks,
        sources,
        "privacy_security_agent",
        "production_https_upgrade",
        "Scopeify upgrades production page loads from HTTP to HTTPS before the application starts.",
        [
            "window.location.protocol === \"http:\"",
            "orchestrated\\.bio",
            "window.location.replace",
            "scopeify-https-upgrade.js"
        ],
        ["https_upgrade", "builder", "standalone", "page"]
    )

    require_terms(
        checks,
        sources,
        "visual_formatting_agent",
        "critical_dom_structure",
        "Critical form, report, PDF-window, and action elements are present.",
        [
            "scopeify-form",
            "scopeify-hypothesis",
            "scopeify-notes",
            "scopeify-data-files",
            "scopeify-report",
            "scopeify-document-tabs",
            "scopeify-feedback-progress",
            "scopeify-feedback-list",
            "scopeify-panel-sow",
            "scopeify-panel-inventory",
            "scopeify-pdf-canvas",
            "scopeify-pdf-page",
            "scopeify-download",
            "scopeify-edit"
        ],
        ["include", "script", "styles"]
    )

    require_terms(
        checks,
        sources,
        "visual_formatting_agent",
        "submitted_document_state",
        "Submit hides the intake and brings the document-style report to the top.",
        [
            "enterSubmittedState",
            "scopeify-is-submitted",
            "moveShellToTop",
            ".scopeify-is-submitted .scopeify-intake",
            "display: none",
            ".scopeify-is-submitted .scopeify-report",
            "display: block"
        ],
        ["script", "styles"]
    )

    require_terms(
        checks,
        sources,
        "visual_formatting_agent",
        "dark_theme_light_pdf_window",
        "The page keeps the dark site theme while the submitted brief renders as a light PDF-style page.",
        [
            "data-theme=\"dark\"",
            "color-scheme: dark",
            ".scopeify-pdf-canvas",
            "overflow: auto",
            ".scopeify-pdf-page",
            "color-scheme: light",
            "max-width: 8.5in",
            "min-height: 10.7in"
        ],
        ["standalone", "page", "styles"]
    )

    require_terms(
        checks,
        sources,
        "sow_quote_agent",
        "sow_and_quote_shape",
        "The generated output separates the SOW from the inventory appendix and keeps business actions visible.",
        [
            "Draft statement of work",
            "Statement of Work:",
            "Prepared for",
            "Prepared by",
            "Preliminary Statement of Work",
            "Generation date",
            "Project window",
            "Phase",
            "Workstream",
            "Expected output",
            "Assumptions and client inputs",
            "Exclusions and change controls",
            "Estimated effort",
            "Expected deliverables",
            "Client comments reflected",
            "Browser-side data scan",
            "Dataset Inventory",
            "Search appendix",
            "Dataset inventory and project estimates",
            "Schedule consultation",
            "Download project workbook (.xlsx)"
        ],
        ["include", "script"]
    )

    require_terms(
        checks,
        sources,
        "client_confidence_agent",
        "scoping_feedback_workflow",
        "Submit starts a scoping workflow with progress feedback before the SOW is treated as ready.",
        [
            "Scoping feedback",
            "scopeify-feedback-progress",
            "scopeify-feedback-list",
            "draft-jobs",
            "runDraftJob",
            "renderJobProgress",
            "Project route",
            "Browser data preview",
            "Public archive screen",
            "Statement of Work",
            "Human review",
            "queued",
            "Checking scope"
        ],
        ["include", "script", "styles"]
    )

    include = sources.get("include", "")
    sow_position = include.find("scopeify-panel-sow")
    inventory_position = include.find("scopeify-panel-inventory")
    if sow_position != -1 and inventory_position != -1 and sow_position < inventory_position:
        add_check(
            checks,
            "PASS",
            "sow_quote_agent",
            "sow_default_document",
            "The submitted document presents the SOW as the first/default document before the inventory appendix.",
            [str(SOURCE_FILES["include"].relative_to(ROOT))]
        )
    else:
        add_check(
            checks,
            "FAIL",
            "sow_quote_agent",
            "sow_default_document",
            "The SOW document should appear before the inventory appendix.",
            []
        )

    removed_main_terms = [
        "Feasibility decision",
        "scopeify-metrics",
        "Ballpark estimate",
        "Evidence boundary",
        "Download Excel-ready CSV",
        "scopeify-download-note"
    ]
    present_removed = [term for term in removed_main_terms if lower_contains(include, term)]
    if present_removed:
        add_check(
            checks,
            "FAIL",
            "sow_quote_agent",
            "removed_main_report_noise",
            f"Removed report noise is still present in the submitted markup: {', '.join(present_removed)}",
            [find_line({"include": include}, term) or term for term in present_removed]
        )
    else:
        add_check(
            checks,
            "PASS",
            "sow_quote_agent",
            "removed_main_report_noise",
            "The submitted markup no longer includes the old feasibility dashboard, evidence boundary section, or unnecessary footer note.",
            []
        )

    script = sources.get("script", "")
    include = sources.get("include", "")
    stale_markup = {
        "GLP-1 / cocaine reward-circuit scope",
        "Example brief",
        "Generated from search screen",
        "Demo search",
    }
    if (
        "renderReport(neutralProjectReport('pending'), 'Ready to scope')" in script
        and "renderReport(chooseReport()" not in script
        and not any(term in include for term in stale_markup)
    ):
        add_check(
            checks,
            "PASS",
            "client_confidence_agent",
            "no_initial_stale_example",
            "Initial and query-parameter page state use a neutral report instead of a GLP-1 or melanoma example.",
            [
                str(SOURCE_FILES["script"].relative_to(ROOT)),
                str(SOURCE_FILES["include"].relative_to(ROOT)),
            ]
        )
    else:
        add_check(
            checks,
            "FAIL",
            "client_confidence_agent",
            "no_initial_stale_example",
            "Initial page state can still render a canned example before live submission.",
            []
        )

    require_terms(
        checks,
        sources,
        "sow_quote_agent",
        "standard_deliverables",
        "Expected consulting deliverables are represented in the report and workbook export.",
        [
            "Nextflow pipeline",
            "Quarto HTML",
            "Slide deck plus review meeting",
            "Exported XLSX",
            "estimated_hours",
            "report.estimate.outputs"
        ],
        ["script"]
    )

    require_terms(
        checks,
        sources,
        "source_discovery_agent",
        "archive_coverage",
        "Archive coverage includes all six live source adapters.",
        [
            "PubMed",
            "GEO",
            "SRA",
            "ENA",
            "GSA/CNSA",
            "bioRxiv",
            "liveArchiveSources"
        ],
        ["include", "script"]
    )

    require_terms(
        checks,
        sources,
        "client_confidence_agent",
        "search_comprehensiveness",
        "Search transparency is retained in the separate inventory appendix and export data, not the main SOW.",
        [
            "Found",
            "Screened",
            "Selected",
            "found",
            "screened",
            "selected",
            "rationale",
            "source warnings",
            "Dataset inventory",
            "Search appendix"
        ],
        ["include", "script"]
    )

    require_terms(
        checks,
        sources,
        "browser_data_review_agent",
        "browser_side_file_review",
        "Local data handling is framed as a browser-side scan and includes preview-level risk flags.",
        [
            "Optional browser-side data scan",
            "Cell values stay local",
            "selected file metadata in browser",
            "JSON Lines",
            "profileSpreadsheetFile",
            "low n signal",
            "no obvious response or outcome field",
            "batch-effect fields to review"
        ],
        ["include", "script"]
    )

    require_terms(
        checks,
        sources,
        "browser_data_review_agent",
        "llm_ready_data_preview",
        "The file scanner produces a value-redacted structured DataPreview for backend validation instead of raw table text.",
        [
            "scopeify.client_data_preview.v1",
            "value_examples_redacted",
            "schema summary validated",
            "inferred_type",
            "inferred_role",
            "role_confidence",
            "missing_rate",
            "unique_count_preview",
            "candidate_roles",
            "risk_flags",
            "Cell values remain in this browser"
        ],
        ["include", "script"]
    )

    privacy_forbidden = [
        "scopeifyLatestDataPreview",
        "dataset.previewJson",
        "unique_values_preview",
        "llm_ready_data_preview_json",
        "JSON.stringify(latestDataPreview)"
    ]
    privacy_leaks = [
        term for term in privacy_forbidden
        if lower_contains("\n".join(sources.get(name, "") for name in ("include", "script")), term)
    ]
    if privacy_leaks:
        add_check(
            checks,
            "FAIL",
            "browser_data_review_agent",
            "no_literal_value_preview_exposure",
            f"Legacy preview exposure paths remain: {', '.join(privacy_leaks)}",
            privacy_leaks
        )
    else:
        add_check(
            checks,
            "PASS",
            "browser_data_review_agent",
            "no_literal_value_preview_exposure",
            "No legacy global, DOM, or export path exposes the structured preview or literal value examples.",
            []
        )

    require_terms(
        checks,
        sources,
        "browser_data_review_agent",
        "xlsx_export_safety",
        "Project export is a multi-sheet workbook and neutralizes spreadsheet formulas.",
        [
            "Project Estimate",
            "Dataset Inventory",
            "Search Audit",
            "Data Schema",
            "neutralizeSpreadsheetText",
            "aoa_to_sheet",
            "writeFile"
        ],
        ["include", "script"]
    )

    forbidden = find_regex_lines(
        {name: sources[name] for name in ["include", "script", "styles"] if name in sources},
        r"\bupload(?:ed|ing)?\b"
    )
    if forbidden:
        add_check(
            checks,
            "FAIL",
            "browser_data_review_agent",
            "no_upload_language",
            "Scopeify should describe selected local files as scanned/evaluated, not uploaded.",
            forbidden
        )
    else:
        add_check(
            checks,
            "PASS",
            "browser_data_review_agent",
            "no_upload_language",
            "No upload/uploaded/uploading language found in Scopeify UI, JS, or CSS.",
            []
        )

    require_terms(
        checks,
        sources,
        "client_confidence_agent",
        "demo_truthfulness",
        "The page describes the validated backend and typed LLM revision path without claiming unverified records.",
        [
            "private backend validates",
            "Pydantic AI can revise the typed SOW when enabled",
            "run server-side",
            "human review"
        ],
        ["include", "script"]
    )

    require_terms(
        checks,
        sources,
        "visual_formatting_agent",
        "responsive_and_print_support",
        "The document layout has mobile, wrapping, and print safeguards.",
        [
            "@media (max-width: 760px)",
            "overflow-x: auto",
            "overflow-wrap: anywhere",
            "min-width: 0",
            "width: 100%",
            "@media print",
            ".scopeify-report-actions",
            "display: none !important",
            ".scopeify-pdf-canvas",
            "max-height: none",
            "overflow: visible",
            ".scopeify-pdf-page",
            "box-shadow: none",
            "min-height: 0"
        ],
        ["styles"]
    )


def case_checks(checks: list[Check], sources: dict[str, str], cases: list[dict]) -> None:
    corpus = "\n".join(sources.values())
    for case in cases:
        agent = case.get("agent", "roadmap_agent")
        case_id = f"case_{case['id']}"
        terms = case.get("must_find_terms", [])
        implemented = bool(case.get("implemented"))
        present = [term for term in terms if lower_contains(corpus, term)]
        missing = [term for term in terms if term not in present]

        if implemented and missing:
            add_check(
                checks,
                "FAIL",
                agent,
                case_id,
                f"Implemented fixture is missing expected terms: {', '.join(missing)}",
                [find_line(sources, term) or term for term in present[:8]]
            )
        elif implemented:
            add_check(
                checks,
                "PASS",
                agent,
                case_id,
                f"Implemented fixture is covered: {case.get('expected_decision', case['id'])}",
                [find_line(sources, term) or term for term in present[:8]]
            )
        else:
            detail = case.get("expected_decision", "Planned fixture")
            add_check(
                checks,
                "PLANNED",
                agent,
                case_id,
                f"{detail} This is intentionally tracked as a future fixture.",
                [f"planned query: {case.get('query', case['id'])}"]
            )


def rendered_scenario_checks(checks: list[Check], scenario_matrix: dict) -> None:
    scenarios = scenario_matrix.get("scenarios", [])
    sources = scenario_matrix.get("scenario_sources", [])

    if len(scenarios) >= 10:
        add_check(
            checks,
            "PASS",
            "visual_formatting_agent",
            "rendered_scenario_count",
            f"Rendered scenario matrix covers {len(scenarios)} scenarios.",
            [scenario.get("id", "unnamed") for scenario in scenarios]
        )
    else:
        add_check(
            checks,
            "FAIL",
            "visual_formatting_agent",
            "rendered_scenario_count",
            f"Rendered scenario matrix should cover at least 10 scenarios; found {len(scenarios)}.",
            []
        )

    source_urls = [source.get("url", "") for source in sources if source.get("url")]
    if len(source_urls) >= 5:
        add_check(
            checks,
            "PASS",
            "source_discovery_agent",
            "rendered_scenario_source_basis",
            "Rendered scenarios are anchored to public-data search resources.",
            source_urls
        )
    else:
        add_check(
            checks,
            "WARN",
            "source_discovery_agent",
            "rendered_scenario_source_basis",
            "Rendered scenario source basis is thin; add more archive/API sources.",
            source_urls
        )

    required_categories = {
        "routing variation",
        "empty input",
        "layout stress",
        "browser-side data scan",
        "arbitrary header mapping",
        "table validation",
        "unsupported canned analysis"
    }
    categories = {scenario.get("category") for scenario in scenarios}
    missing_categories = sorted(required_categories - categories)
    if missing_categories:
        add_check(
            checks,
            "FAIL",
            "client_confidence_agent",
            "rendered_edge_case_coverage",
            f"Rendered scenarios are missing edge categories: {', '.join(missing_categories)}.",
            sorted(category for category in categories if category)
        )
    else:
        add_check(
            checks,
            "PASS",
            "client_confidence_agent",
            "rendered_edge_case_coverage",
            "Rendered scenarios cover routing, empty input, layout stress, file scanning, arbitrary header mapping, table validation, and unsupported-analysis edges.",
            sorted(required_categories)
        )

    file_scenarios = [scenario.get("id", "") for scenario in scenarios if scenario.get("files")]
    if len(file_scenarios) >= 3:
        add_check(
            checks,
            "PASS",
            "browser_data_review_agent",
            "rendered_file_scan_coverage",
            "Rendered scenarios include text, malformed JSON, and binary-file scan coverage.",
            file_scenarios
        )
    else:
        add_check(
            checks,
            "FAIL",
            "browser_data_review_agent",
            "rendered_file_scan_coverage",
            "Rendered scenarios need at least three file-scan cases.",
            file_scenarios
        )

    malformed: list[str] = []
    for scenario in scenarios:
        if not scenario.get("id"):
            malformed.append("scenario missing id")
        if "hypothesis" not in scenario:
            malformed.append(f"{scenario.get('id', 'unnamed')}: missing hypothesis")
        if scenario.get("expected_product_state") not in {"pass_current_demo", "known_gap"}:
            malformed.append(f"{scenario.get('id', 'unnamed')}: invalid expected_product_state")
        if not scenario.get("must_find_sow_terms"):
            malformed.append(f"{scenario.get('id', 'unnamed')}: missing SOW expectations")

    if malformed:
        add_check(
            checks,
            "FAIL",
            "visual_formatting_agent",
            "rendered_scenario_schema",
            "Rendered scenario matrix has malformed entries.",
            malformed[:20]
        )
    else:
        add_check(
            checks,
            "PASS",
            "visual_formatting_agent",
            "rendered_scenario_schema",
            "Rendered scenario matrix has ids, hypotheses, expected states, and SOW assertions.",
            []
        )

    known_gaps = [scenario for scenario in scenarios if scenario.get("expected_product_state") == "known_gap"]
    if known_gaps:
        add_check(
            checks,
            "WARN",
            "roadmap_agent",
            "rendered_known_product_gaps",
            f"{len(known_gaps)} rendered scenarios intentionally track current product gaps instead of hiding them.",
            [f"{scenario['id']}: {scenario.get('known_gap', 'gap not described')}" for scenario in known_gaps]
        )
    else:
        add_check(
            checks,
            "PASS",
            "roadmap_agent",
            "rendered_known_product_gaps",
            "No rendered scenario is marked as a known product gap.",
            []
        )


def summarize_status(checks: list[Check]) -> dict[str, int]:
    counts = {"PASS": 0, "WARN": 0, "FAIL": 0, "PLANNED": 0}
    for check in checks:
        counts[check.status] = counts.get(check.status, 0) + 1
    return counts


def render_markdown(checks: list[Check], cases: dict, scenario_matrix: dict, sources: dict[str, str]) -> str:
    counts = summarize_status(checks)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    source_lines = "\n".join(
        f"- `{SOURCE_FILES[name].relative_to(ROOT)}`" for name in SOURCE_FILES if name in sources
    )

    lines = [
        "# Scopeify Agentic QA Report",
        "",
        f"Generated: {generated}",
        "",
        "## Summary",
        "",
        f"- PASS: {counts.get('PASS', 0)}",
        f"- WARN: {counts.get('WARN', 0)}",
        f"- FAIL: {counts.get('FAIL', 0)}",
        f"- PLANNED: {counts.get('PLANNED', 0)}",
        "",
        "## Source Files",
        "",
        source_lines,
        "",
        "## Agent Lanes",
        "",
        "| Agent | Role |",
        "| --- | --- |"
    ]

    for agent in cases.get("agents", []):
        lines.append(f"| `{agent['id']}` | {agent['role']} |")

    lines.extend([
        "",
        "## Checks",
        "",
        "| Status | Agent | Check | Summary |",
        "| --- | --- | --- | --- |"
    ])

    for check in checks:
        summary = check.summary.replace("|", "\\|")
        lines.append(f"| {check.status} | `{check.agent}` | `{check.check_id}` | {summary} |")

    notable = [check for check in checks if check.status in {"FAIL", "WARN", "PLANNED"}]
    if notable:
        lines.extend(["", "## Notable Items", ""])
        for check in notable:
            lines.append(f"### {check.status}: {check.check_id}")
            lines.append("")
            lines.append(check.summary)
            if check.evidence:
                lines.append("")
                lines.append("Evidence:")
                for item in check.evidence[:10]:
                    lines.append(f"- {item}")
            lines.append("")

    lines.extend([
        "## Scenario Fixtures",
        "",
        "| Case | Agent | Implemented | Expected decision |",
        "| --- | --- | --- | --- |"
    ])
    for case in cases.get("cases", []):
        implemented = "yes" if case.get("implemented") else "planned"
        decision = case.get("expected_decision", "").replace("|", "\\|")
        lines.append(f"| `{case['id']}` | `{case.get('agent', '')}` | {implemented} | {decision} |")

    if scenario_matrix.get("scenarios"):
        lines.extend([
            "",
            "## Rendered Browser Scenarios",
            "",
            "| Scenario | Category | Expected state | Edge |",
            "| --- | --- | --- | --- |"
        ])
        for scenario in scenario_matrix.get("scenarios", []):
            edge = "yes" if scenario.get("edge_case") else "no"
            lines.append(
                f"| `{scenario['id']}` | {scenario.get('category', '')} | {scenario.get('expected_product_state', '')} | {edge} |"
            )

        lines.extend([
            "",
            "## Scenario Source Basis",
            ""
        ])
        for source in scenario_matrix.get("scenario_sources", []):
            lines.append(f"- [{source.get('name', source.get('id', 'source'))}]({source.get('url', '')}): {source.get('basis', '')}")

    lines.extend([
        "",
        "## Interpretation",
        "",
        "Blocking failures mean the static demo no longer supports a promised visible behavior. Planned items are roadmap fixtures for backend search skills, canned analysis scoping, and no-go feasibility reports.",
        ""
    ])

    return "\n".join(lines)


def write_outputs(checks: list[Check], cases: dict, scenario_matrix: dict, sources: dict[str, str]) -> tuple[Path, Path]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    markdown = render_markdown(checks, cases, scenario_matrix, sources)
    markdown_path = OUT_DIR / "latest.md"
    json_path = OUT_DIR / "latest.json"
    markdown_path.write_text(markdown, encoding="utf-8")
    json_path.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "summary": summarize_status(checks),
                "checks": [asdict(check) for check in checks],
                "cases": cases,
                "rendered_scenarios": scenario_matrix
            },
            indent=2
        ),
        encoding="utf-8"
    )
    return markdown_path, json_path


def run(strict_planned: bool = False) -> tuple[list[Check], dict, dict, dict[str, str]]:
    checks: list[Check] = []
    missing_files = [str(path.relative_to(ROOT)) for path in SOURCE_FILES.values() if not path.exists()]
    if missing_files:
        add_check(checks, "FAIL", "visual_formatting_agent", "source_files_present", f"Missing files: {', '.join(missing_files)}", [])

    try:
        cases = json.loads(read_text(EVAL_CASES))
        add_check(checks, "PASS", "roadmap_agent", "eval_case_json", "Scopeify eval case JSON loaded.", [str(EVAL_CASES.relative_to(ROOT))])
    except (OSError, json.JSONDecodeError) as error:
        cases = {"agents": [], "cases": []}
        add_check(checks, "FAIL", "roadmap_agent", "eval_case_json", f"Could not load eval cases: {error}", [])

    try:
        scenario_matrix = json.loads(read_text(RENDERED_SCENARIOS))
        add_check(
            checks,
            "PASS",
            "visual_formatting_agent",
            "rendered_scenario_json",
            "Scopeify rendered scenario JSON loaded.",
            [str(RENDERED_SCENARIOS.relative_to(ROOT))]
        )
    except (OSError, json.JSONDecodeError) as error:
        scenario_matrix = {"scenario_sources": [], "scenarios": []}
        add_check(
            checks,
            "FAIL",
            "visual_formatting_agent",
            "rendered_scenario_json",
            f"Could not load rendered scenarios: {error}",
            []
        )

    sources = load_sources()
    syntax_checks(checks, sources)
    static_workflow_checks(checks, sources)
    freshness_check(checks)
    case_checks(checks, sources, cases.get("cases", []))
    rendered_scenario_checks(checks, scenario_matrix)

    if strict_planned:
        planned = [check for check in checks if check.status == "PLANNED"]
        if planned:
            add_check(checks, "FAIL", "roadmap_agent", "strict_planned", f"{len(planned)} planned fixtures are still unimplemented.", [])

    return checks, cases, scenario_matrix, sources


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate Scopeify static-demo QA workflows.")
    parser.add_argument("--strict-planned", action="store_true", help="Treat planned fixtures as failures.")
    parser.add_argument("--no-write", action="store_true", help="Print summary without writing report files.")
    args = parser.parse_args()

    checks, cases, scenario_matrix, sources = run(strict_planned=args.strict_planned)
    counts = summarize_status(checks)

    if args.no_write:
        markdown_path = json_path = None
    else:
        markdown_path, json_path = write_outputs(checks, cases, scenario_matrix, sources)

    print("Scopeify agentic QA")
    print(f"PASS={counts.get('PASS', 0)} WARN={counts.get('WARN', 0)} FAIL={counts.get('FAIL', 0)} PLANNED={counts.get('PLANNED', 0)}")
    if markdown_path and json_path:
        print(markdown_path.relative_to(ROOT))
        print(json_path.relative_to(ROOT))

    failures = [check for check in checks if check.status == "FAIL"]
    if failures:
        print("Blocking failures:")
        for check in failures:
            print(f"- {check.check_id}: {check.summary}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
