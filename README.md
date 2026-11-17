# Orchestrated Biosciences company website

This repository contains the static website for [Orchestrated Biosciences](https://orchestrated.bio). It covers DrugAdopt and its example report, custom analysis, the Insight preview, and company information.

## Architecture

The site uses plain HTML, CSS, JavaScript, XML, and images. There is no application framework, package manager, template engine, Ruby environment, or deployment build.

| Surface | Source |
| --- | --- |
| DrugAdopt | `index.html`, `drugadopt.html` |
| DrugAdopt case study | `drugadopt-case-study.html` (tolvaptan walkthrough; shares DrugAdopt CSS and `drugadopt-walkthrough.js`) |
| Custom analysis | `custom-analysis.html` |
| Insight preview and inquiries | `insight.html` |
| Example report | `report.html`, generated with `python3 scripts/build_report_page.py --case <deliverable dir>`; edit the generator or `scripts/*.json`, never `report.html` |
| Company | `company.html` |
| Privacy and terms | `privacy-policy.html`, `terms.html` |
| Not found | `404.html` (root-absolute URLs: Pages serves it at any depth) |
| Shared styles | `assets/css/company-site/base.css` |
| Page styles | `assets/css/company-site/` |
| Interactive demos | `assets/js/company-site/` |
| Portable review artifact | `concepts/asset-diligence/asset-diligence.artifact.html` |

The `.nojekyll` marker tells GitHub Pages to publish these files directly. `sitemap.xml` is maintained as a static file.

The root product pages can be opened directly from disk or served by any static web server. The portable artifact is generated from the same root pages, styles, scripts, and images so it does not become a second implementation.

Legacy product, portfolio, team, case, concept and Scopeify URLs contain lightweight redirects to the current pages.

## Local preview

```bash
python3 -m http.server 8767
```

Open <http://localhost:8767/>.

## Build the portable artifact

```bash
python3 concepts/asset-diligence/build_artifact.py
```

The builder writes `concepts/asset-diligence/asset-diligence.artifact.html`. That generated file is ignored by Git.

## Common edits

| Task | File or directory |
| --- | --- |
| Change product positioning or page content | Root HTML pages, except the generated ones |
| Change the example report | `scripts/build_report_page.py`, `scripts/module_sections.json`, `scripts/figure_alt.json`, then rerun the report builder |
| Change shared layout or typography | `assets/css/company-site/base.css` |
| Change one product page | Its page-specific CSS and JavaScript |
| Change policy styling | `assets/css/company-site/editorial.css` |
| Rebuild the portable review artifact | `concepts/asset-diligence/build_artifact.py` |

## Deployment

Pushes to the publishing branch are served directly by GitHub Pages. Deployment does not install dependencies or run a site generator. Publish frontend changes that depend on a backend change only after that backend change is live.
