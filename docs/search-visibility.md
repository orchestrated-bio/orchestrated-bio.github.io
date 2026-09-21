# Search visibility

On-page SEO is done (titles, descriptions, canonicals, JSON-LD, sitemap,
robots). The two things that actually move indexing and ranking from here both
need account access, so they live here as steps rather than code.

## 1. Google Search Console — not yet claimed

Nothing tells Google to crawl the sitemap today. The sitemap is live at
`/sitemap.xml` and referenced from `robots.txt`, so only the claim is missing.

**Verify by DNS TXT, not by HTML tag.** Porkbun holds the DNS, and a TXT record
verifies the whole domain including `insight.` and `next.` subdomains, so it
only has to be done once. An HTML tag or file verifies the apex alone.

1. <https://search.google.com/search-console> → Add property → **Domain** →
   `orchestrated.bio`.
2. Copy the `google-site-verification=...` TXT value it shows.
3. Porkbun → DNS for `orchestrated.bio` → add a **TXT** record, host blank
   (apex), value as given. Save.
4. Back in Search Console, press Verify. DNS can take a few minutes.
5. Once verified: **Sitemaps** → submit `sitemap.xml`.
6. **URL Inspection** → paste `https://orchestrated.bio/` → Request indexing.
   Repeat for `custom-analysis.html`, the newest page.

If you would rather verify with a meta tag, say so and the tag can be added to
`index.html`; the apex-only limitation is the tradeoff.

## 2. Inbound links — the real ranking lever

No amount of on-page work substitutes for links from sites Google already
trusts. These are legitimate placements, not link building: each one is a true
statement of affiliation.

Highest value first:

| Where | What to add | Why it counts |
|---|---|---|
| Google Scholar profile | `orchestrated.bio` in the Homepage field | Ties ten years of publications to the company |
| LinkedIn company page | Website field, and personal profiles' Experience | Usually the first result for a company name |
| GitHub (`alexvnesta`) | Website field on the profile | Trusted domain, immediate |
| ORCID | Websites section | Permanent research identifier |
| Praesage Bio, Nodes and Edges, Myogenex, vsepr4neuro | Partner or client listing, where the relationship is current | Topically relevant, which matters more than volume |
| UConn Health / UTEP | Alumni or spinout listings, if eligible | `.edu` domains carry weight |

The publications themselves cannot be edited after the fact, so the Scholar
profile is the practical way to connect them to the company.

**Not worth doing:** paid directories, guest-post schemes, or anything that
pays for a link. Google discounts them, and for a company selling evidence
standards the reputational cost is real.

## Scope note

A seven-page site with no inbound links will not outrank established CROs for a
broad term like "biomarker discovery". What the on-page work buys is the
long-tail: "antibody-drug conjugate biomarker discovery", "RNA-seq trial
support pipeline". Those are winnable now that pages name them.
