#!/usr/bin/env python3
"""Build Scopeify demo pages from the embeddable include."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INCLUDE = ROOT / "_includes" / "scopeify-demo.html"
OUTPUT = ROOT / "scopeify-demo" / "standalone.html"
PAGE = ROOT / "scopeify.html"
SCOPEIFY_CSS = ROOT / "assets" / "css" / "scopeify-demo.css"
SCOPEIFY_JS = ROOT / "assets" / "js" / "scopeify-demo.js"


def main() -> None:
    body = INCLUDE.read_text(encoding="utf-8")
    css_version = int(SCOPEIFY_CSS.stat().st_mtime)
    js_version = int(SCOPEIFY_JS.stat().st_mtime)
    standalone_html = f"""<!doctype html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Scopeify Demo</title>
    <meta name="description" content="Scopeify demo: AI-assisted public-data scoping for prospective bioinformatics consulting projects.">
    <link rel="icon" type="image/svg+xml" href="../images/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="../favicon.png">
    <link rel="stylesheet" href="../assets/css/company-site/base.css">
    <link rel="stylesheet" href="../assets/css/scopeify-demo.css?v={css_version}">
</head>
<body>
{body}
<script src="../assets/js/scopeify-demo.js?v={js_version}"></script>
</body>
</html>
"""

    page_html = f"""<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Scopeify turns a prospective bioinformatics project question into a public-data feasibility brief, ballpark estimate, and draft statement of work." />
    <meta name="theme-color" content="#111826" />
    <title>Scopeify | Orchestrated Biosciences</title>
    <link rel="canonical" href="https://orchestrated.bio/scopeify.html" />
    <link rel="icon" type="image/svg+xml" href="./images/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="./favicon.png" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Orchestrated Biosciences" />
    <meta property="og:title" content="Scopeify | Orchestrated Biosciences" />
    <meta property="og:description" content="Scope a bioinformatics consulting project from a natural-language hypothesis, public-data evidence, browser-side metadata scan, and a draft SOW." />
    <meta property="og:url" content="https://orchestrated.bio/scopeify.html" />
    <meta property="og:image" content="https://orchestrated.bio/images/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="./assets/css/company-site/base.css" />
    <link rel="stylesheet" href="./assets/css/scopeify-demo.css?v={css_version}" />
    <script src="./assets/js/cookie-consent.js"></script>
  </head>
  <body class="scopeify-page">
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="masthead">
      <div class="shell">
        <a class="brand" href="./" aria-label="Orchestrated Biosciences home">
          <img class="brand-logo brand-logo-light" src="./images/logo-icon.png" alt="" aria-hidden="true" />
          <img class="brand-logo brand-logo-dark" src="./images/logo-icon-white.svg" alt="" aria-hidden="true" />
          <span class="brand-word">rchestrated<span>.bio</span></span>
        </a>
        <nav class="site-nav" aria-label="Primary">
          <a href="./">DrugAdopt</a>
          <a href="./insight.html">Insight</a>
          <a href="./scopeify.html" aria-current="page">Scopeify</a>
          <a href="./report.html">Report</a>
          <a href="./company.html">Company</a>
          <a class="nav-cta" href="mailto:support@orchestrated.bio">Contact</a>
        </nav>
      </div>
    </header>

    <main id="main">
{body}
    </main>

    <footer class="foot">
      <div class="shell">
        <p>© 2026 Orchestrated Biosciences · Cromwell, CT</p>
        <nav class="foot-links" aria-label="Footer">
          <a href="https://orchestrated.bio/blog/">Blog</a>
          <a href="https://orchestrated.bio/privacy-policy.html">Privacy</a>
          <a href="https://orchestrated.bio/terms.html">Terms</a>
        </nav>
      </div>
    </footer>
    <script src="./assets/js/scopeify-demo.js?v={js_version}"></script>
  </body>
</html>
"""

    OUTPUT.write_text(standalone_html, encoding="utf-8")
    PAGE.write_text(page_html, encoding="utf-8")
    print(OUTPUT)
    print(PAGE)


if __name__ == "__main__":
    main()
