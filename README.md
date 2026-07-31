# Orchestrated Biosciences company website

The static website for [Orchestrated Biosciences](https://orchestrated.bio), centered on DrugAdopt, Insight, an inspectable DrugAdopt report, and the company.

## Architecture

The entire site is plain HTML, CSS, JavaScript, XML, and images. There is no application framework, package manager, template engine, Ruby environment, or deployment build.

| Surface | Source |
| --- | --- |
| DrugAdopt | `index.html` |
| Insight | `insight.html` |
| Scopeify | `scopeify.html`, `_includes/scopeify-demo.html` |
| Example report | `report.html` |
| Company | `company.html` |
| Blog index | `blog/index.html` |
| Blog articles | `blog/YYYY/MM/DD/slug/index.html` |
| Privacy and terms | `privacy-policy.html`, `terms.html` |
| Shared styles | `assets/css/company-site/base.css` |
| Page styles | `assets/css/company-site/` |
| Interactive demos | `assets/js/company-site/` |
| Portable review artifact | `concepts/asset-diligence/asset-diligence.artifact.html` |

The `.nojekyll` marker tells GitHub Pages to publish these files directly. `sitemap.xml` and `blog/feed.xml` are maintained as static files.

The root product pages can be opened directly from disk or served by any static web server. The portable artifact is generated from the same root pages, styles, scripts, and images so it does not become a second implementation.

Scopeify is a static browser client in this public repository. Its API keys and archive/model integrations live only in the separate private Scopeify backend. Selected data files are parsed in the browser; only the bounded structural summary described in `privacy-policy.html` is sent to the backend. Production draft submissions use short-lived, single-use server tickets, and recovery attempts reuse one idempotency key so a lost response cannot create a duplicate paid job.

Legacy product, portfolio, team, case, and concept URLs contain lightweight redirects to the current pages.

## Local preview

```bash
python3 -m http.server 8767
```

Open <http://localhost:8767/>.

## Build the portable artifact

```bash
python3 concepts/asset-diligence/build_artifact.py
```

The builder writes `concepts/asset-diligence/asset-diligence.artifact.html`. That generated file is intentionally ignored by Git.

## Build and verify Scopeify

```bash
python3 scripts/build_scopeify_standalone.py
python3 scripts/evaluate_scopeify_demo.py
```

The builder keeps the standalone review page and production `scopeify.html` synchronized with the checked-in include, CSS, JavaScript, and vendored SheetJS runtime. The evaluator must report no warnings or failures. GitHub Actions repeats both checks and rejects stale generated pages or a changed vendor checksum.

## Common edits

| Task | File or directory |
| --- | --- |
| Change product positioning or page content | Root HTML pages |
| Change shared layout or typography | `assets/css/company-site/base.css` |
| Change one product page | Its page-specific CSS and JavaScript |
| Add a blog article | Add a static `index.html` under its dated URL and update `blog/index.html`, `blog/feed.xml`, and `sitemap.xml` |
| Change Scopeify | Edit its include, CSS, or JavaScript; run the Scopeify builder and evaluator |
| Change blog or policy styling | `assets/css/company-site/editorial.css` |
| Rebuild the portable review artifact | `concepts/asset-diligence/build_artifact.py` |

## Deployment

Pushes to the publishing branch are served directly by GitHub Pages. Because the repository is fully static, deployment does not install dependencies or run a site generator. Deploy the private Scopeify backend and verify its production contract before publishing frontend changes that depend on it.
