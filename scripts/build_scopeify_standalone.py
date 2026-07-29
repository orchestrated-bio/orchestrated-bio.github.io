#!/usr/bin/env python3
"""Build a direct-open Scopeify demo page from the embeddable include."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INCLUDE = ROOT / "_includes" / "scopeify-demo.html"
OUTPUT = ROOT / "scopeify-demo" / "standalone.html"


def main() -> None:
    body = INCLUDE.read_text(encoding="utf-8")
    OUTPUT.write_text(
        f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Scopeify Demo</title>
    <meta name="description" content="Scopeify demo: AI-assisted public-data scoping for prospective bioinformatics consulting projects.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/custom.css">
    <link rel="stylesheet" href="../assets/css/scopeify-demo.css">
    <style>
        body {{
            margin: 0;
            background: #0d1020;
            color: #e5eefb;
            font-family: "Plus Jakarta Sans", system-ui, sans-serif;
        }}
    </style>
</head>
<body>
{body}
<script src="../assets/js/scopeify-demo.js"></script>
</body>
</html>
""",
        encoding="utf-8",
    )
    print(OUTPUT)


if __name__ == "__main__":
    main()
