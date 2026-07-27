# Orchestrated Biosciences company website

The public site for [Orchestrated Biosciences](https://orchestrated.bio), centered on DrugAdopt, Insight, an inspectable DrugAdopt report, and the company.

## Architecture

The primary product site is a small static HTML/CSS/JavaScript application. Jekyll remains in the repository for the blog and legal pages and is built by GitHub Pages.

| Surface | Source |
| --- | --- |
| DrugAdopt | `index.html` |
| Insight | `insight.html` |
| Example report | `report.html` |
| Company | `company.html` |
| Shared product-site styles | `assets/css/company-site/base.css` |
| Page styles | `assets/css/company-site/{drugadopt,insight,report,company}.css` |
| Interactive demos | `assets/js/company-site/` |
| Blog and legal pages | Jekyll layouts, includes, and Markdown |
| Portable review artifact | `concepts/asset-diligence/asset-diligence.artifact.html` |

The root product pages deliberately have no framework or bundler. They can be opened directly from disk or served by any static web server. The portable artifact is generated from the same root pages, styles, scripts, and images so it does not become a second implementation.

Legacy product, portfolio, team, and concept URLs contain lightweight redirects to the current pages.

## Local preview

For the product pages only:

```bash
python3 -m http.server 8767
```

Open <http://localhost:8767/>.

For the complete GitHub Pages site, including the blog:

```bash
bundle install
bundle exec jekyll serve --livereload
```

Open <http://localhost:4000/>.

## Build the portable artifact

```bash
python3 concepts/asset-diligence/build_artifact.py
```

The builder writes `concepts/asset-diligence/asset-diligence.artifact.html`. That generated file is intentionally ignored by Git.

## Common edits

| Task | File or directory |
| --- | --- |
| Change product positioning or page content | Root HTML pages |
| Change shared product-site layout or typography | `assets/css/company-site/base.css` |
| Change one product page | Its page-specific CSS and JavaScript |
| Change blog navigation or footer links | `_data/navigation.yml` |
| Add a blog post | `_posts/YYYY-MM-DD-title.md` |
| Change blog/Jekyll styling | `assets/css/custom.css` |
| Rebuild the portable review artifact | `concepts/asset-diligence/build_artifact.py` |

## Deployment

Pushes to the publishing branch are built and deployed by GitHub Pages. There is no Node.js or frontend bundling step.
