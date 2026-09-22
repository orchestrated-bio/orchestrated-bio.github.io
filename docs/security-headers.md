# Security headers

The site is served by **Cloudflare proxying to GitHub Pages** (apex A records
point at Cloudflare; a single response carries both `server: cloudflare` and
`x-github-request-id`). Neither GitHub Pages nor this repo can set HTTP
response headers, so the policy is split in two.

## In this repo (done)

Every page carries these as `<meta>` elements, which browsers honour:

| Header | Where |
|---|---|
| `Content-Security-Policy` | `<meta http-equiv>` on every page |
| Referrer policy | `<meta name="referrer">` on every page |

`scopeify.html` and `scopeify-demo/standalone.html` are generated — edit
`scripts/build_scopeify_standalone.py`, never the pages directly.

The CSP needs no `'unsafe-inline'` for scripts because no page uses an inline
script, inline style attribute, or inline event handler. `style-src` does keep
`'unsafe-inline'` because the demo scripts assign `element.style` at runtime.

## Still to do, in Cloudflare only

These are **ignored in a `<meta>` element** and must be real response headers.
Add them in Cloudflare under *Rules → Transform Rules → Modify Response Header*
(or via a `_headers`-style worker) for `orchestrated.bio/*`:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

Notes:

- **HSTS** is the one with real security value here. HTTP already 301-redirects
  to HTTPS, but without HSTS a first visit is unprotected before that redirect.

  The apex is the only host missing it. As of Sept 2026 the other subdomains
  already assert HSTS *with* `includeSubDomains`:

  | Host | HSTS |
  |---|---|
  | `orchestrated.bio` (apex) | none |
  | `insight.orchestrated.bio` | `max-age=63072000; includeSubDomains; preload` |
  | `next.orchestrated.bio` | `max-age=63072000; includeSubDomains; preload` |
  | `scopeify-api.orchestrated.bio` | `max-age=31536000; includeSubDomains` |

  Because those have been asserting it for a long period already, the usual
  "ramp up from a short max-age" caution does not really apply — the
  compatibility question is settled in practice. The real constraint is
  `includeSubDomains`: once cached, every future subdomain must serve valid
  HTTPS for the full duration, including ones that do not exist yet. Do not
  add `preload` at the apex without a deliberate decision; the domain is not
  on the preload list today and it is a one-way door.
- **X-Content-Type-Options** was previously listed as done because every page
  carries `<meta http-equiv="X-Content-Type-Options" content="nosniff">`. It is
  not in the HTML spec's `http-equiv` list, so browsers ignore it, and
  `curl -sI https://orchestrated.bio/` returns no such header. The metas are
  inert but harmless and stay on the pages; the header itself is still to do.
- **X-Frame-Options** is the clickjacking control. Verified safe: no tracked
  file or live page contains an `<iframe>`, and no site JS creates one, so
  `DENY` breaks nothing. CSP `frame-ancestors` would be the modern equivalent,
  but browsers ignore it in a `<meta>` element (it logs a console error), so it
  is deliberately omitted from the pages.
- GitHub's own *Enforce HTTPS* setting reads `https_enforced: false` and
  **cannot be enabled** while Cloudflare proxies the domain — GitHub cannot
  validate that the domain resolves to its IPs. This is expected; TLS is
  terminated by Cloudflare, whose certificate is what visitors see.
