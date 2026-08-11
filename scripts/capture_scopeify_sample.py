#!/usr/bin/env python3
"""Capture a real Scopeify run and store it as the landing-page sample.

The landing page shows a finished SOW before the visitor types anything. That sample
must come from a real API run: an earlier hand-written example shipped invented search
counts, was removed in 5b25bee, and the `no_initial_stale_example` QA check exists to
keep fabricated numbers from coming back.

Run this against production to refresh the sample:

    python3 scripts/capture_scopeify_sample.py

The output is committed. It is a snapshot, not a live fetch, so the page costs no API
call on load. Regenerate it when the SOW contract or the example question changes.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "js" / "scopeify-sample-report.js"

API_BASE = "https://scopeify-api.orchestrated.bio"
ORIGIN = "https://orchestrated.bio"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# Matches the "Try oncology example" button so the sample and the button agree.
HYPOTHESIS = (
    "Can public tumor transcriptomics data identify biomarkers of anti-PD-1 "
    "response in melanoma patients?"
)
NOTES = "Estimate a biomarker study before we decide whether to fund a larger analysis."

POLL_ATTEMPTS = 40
POLL_SECONDS = 5


def request_json(path: str, payload: dict | None = None, headers: dict | None = None) -> dict:
    url = f"{API_BASE}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(url, data=data, method="POST" if data else "GET")
    request.add_header("Origin", ORIGIN)
    # Cloudflare rejects the default urllib agent with error 1010 before it reaches the API.
    request.add_header("User-Agent", USER_AGENT)
    if data:
        request.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SystemExit(f"{path} failed with HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise SystemExit(f"{path} unreachable: {error.reason}") from error


def build_payload() -> dict:
    """Mirror buildDraftPayload() in scopeify-demo.js."""
    return {
        "project": {
            "hypothesis": HYPOTHESIS,
            "notes": NOTES,
            "requested_outputs": [
                "Preliminary Statement of Work",
                "Dataset inventory",
                "Project estimate",
            ],
        },
        "client_data_preview": {
            "schema_version": "scopeify.client_data_preview.v1",
            "privacy": "browser_side_preview_only",
            "files": [],
            "aggregate": {
                "files_selected": 0,
                "parsable_files": 0,
                "total_preview_rows": 0,
                "roles_detected": {},
                "risk_flags": [],
            },
            "validation": {"status": "no_files", "errors": [], "warnings": []},
        },
        "allowed_archive_sources": ["PubMed", "GEO", "SRA", "ENA", "GSA/CNSA", "bioRxiv"],
        "expected_response_schema": "scopeify.sow_draft.v1",
    }


def capture() -> dict:
    ticket = request_json("/v1/scopeify/submission-ticket")
    print(f"ticket acquired, expires {ticket['expires_at']}")

    job = request_json(
        "/v1/scopeify/draft-jobs",
        build_payload(),
        {
            "X-Scopeify-Submission-Token": ticket["token"],
            "X-Idempotency-Key": f"sample-capture-{date.today().isoformat()}",
        },
    )
    job_id = job["job_id"]
    print(f"job {job_id} queued")

    for _ in range(POLL_ATTEMPTS):
        status = request_json(f"/v1/scopeify/draft-jobs/{job_id}")
        print(f"  {status.get('progress')}% {status.get('status')} / {status.get('stage')}")
        if status.get("status") == "completed":
            return status
        if status.get("status") in {"failed", "error"}:
            raise SystemExit(f"job failed: {status.get('error') or status.get('message')}")
        time.sleep(POLL_SECONDS)

    raise SystemExit("job did not finish within the polling window")


def main() -> int:
    status = capture()
    draft = status.get("draft")
    if not draft or not draft.get("sow"):
        raise SystemExit("captured job has no SOW; refusing to write an empty sample")

    sample = {
        "captured_on": date.today().isoformat(),
        "hypothesis": HYPOTHESIS,
        "notes": NOTES,
        "draft": draft,
        "feedback": status.get("feedback", []),
    }

    banner = (
        "// Generated by scripts/capture_scopeify_sample.py — do not edit by hand.\n"
        "// A real captured API run, shown on load as a labelled sample. Never fabricate\n"
        "// these numbers: the hand-written example this replaced was removed in 5b25bee.\n"
    )
    body = json.dumps(sample, indent=4, ensure_ascii=False)
    OUTPUT.write_text(f"{banner}window.SCOPEIFY_SAMPLE_REPORT = {body};\n", encoding="utf-8")

    sow = draft["sow"]
    sources = draft.get("archive_search", {}).get("source_results", [])
    selected = sum(len(item.get("records") or []) for item in sources)
    print(f"\nwrote {OUTPUT.relative_to(ROOT)}")
    print(f"  title: {sow.get('title')}")
    print(f"  hours: {sow.get('estimated_hours_min')}-{sow.get('estimated_hours_max')}")
    print(f"  selected records: {selected}")
    for item in sources:
        print(f"    {item.get('source')}: {len(item.get('records') or [])} kept of {item.get('found_count')} found")
    print("\nRe-run scripts/build_scopeify_standalone.py to restamp the asset hashes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
