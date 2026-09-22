# Search visibility

On-page SEO is done (titles, descriptions, canonicals, JSON-LD, sitemap,
robots). The two things that actually move indexing and ranking from here both
need account access, so they live here as steps rather than code.

## 1. Google Search Console — done

Claimed 2026-09-21. Ownership auto-verified by **DNS TXT** at the domain
provider, which covers the apex and every subdomain. The record is
`google-site-verification=CqLkxJY3OvFLzQkhUa-ZRepmPoiKimABJ77kxkYpJzs` on the
apex TXT — **do not remove it**, or verification is lost. Consider adding a
second method under Settings → Ownership verification as a backup.

`sitemap.xml` submitted and read successfully: 5 pages discovered. Indexing
requested for the newest page. `scopeify.html` was taken out of the sitemap
deliberately in b3e9751 — it is an internal scoping tool, not a page to
promote — so five is the expected count, not a missing page. Since Sept 2026
both Scopeify pages also send `robots: noindex, follow`, and the standalone
copy canonicalises to `/scopeify.html`; they stay crawlable so the noindex is
actually seen, which is why robots.txt does not disallow them.

Verified from Googlebot's own perspective (Cloudflare fronts the origin, so
this was worth confirming rather than assuming):

- All five indexable pages return **200** to a Googlebot user-agent, with real
  content and no challenge page.
- `robots.txt` serves normally; the `Disallow` rules cover only build inputs.
- Organization and Service JSON-LD both parse, with the Service referencing
  the Organization by `@id`.

**"Discovered — currently not indexed" is expected** on a new property with no
inbound links. It means Google knows the URL and has not crawled it yet;
it usually resolves in days to weeks. It is not an error and needs no fix.
Re-requesting indexing repeatedly does not speed it up. The thing that does
is section 2.

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
