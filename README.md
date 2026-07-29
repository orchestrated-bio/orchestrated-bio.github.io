# Orchestrated Biosciences company website

The static website for [Orchestrated Biosciences](https://orchestrated.bio), centered on DrugAdopt, Insight, an inspectable DrugAdopt report, and the company.

## Architecture

The entire site is plain HTML, CSS, JavaScript, XML, and images. There is no application framework, package manager, template engine, Ruby environment, or deployment build.

| Surface | Source |
| --- | --- |
| DrugAdopt | `index.html` |
| Insight | `insight.html` |
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

## Common edits

| Task | File or directory |
| --- | --- |
| Change product positioning or page content | Root HTML pages |
| Change shared layout or typography | `assets/css/company-site/base.css` |
| Change one product page | Its page-specific CSS and JavaScript |
| Add a blog article | Add a static `index.html` under its dated URL and update `blog/index.html`, `blog/feed.xml`, and `sitemap.xml` |
| Change blog or policy styling | `assets/css/company-site/editorial.css` |
| Rebuild the portable review artifact | `concepts/asset-diligence/build_artifact.py` |

## Deployment

Pushes to the publishing branch are served directly by GitHub Pages. Because the repository is fully static, deployment does not install dependencies or run a site generator.
