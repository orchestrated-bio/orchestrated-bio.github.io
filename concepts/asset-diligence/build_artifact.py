#!/usr/bin/env python3
"""Build the single-file, hash-routed Artifact from the multi-page source.

The production site is four hand-written HTML pages
(index/insight/report/company)
sharing modular styles and assets from the repository root. A Claude Artifact
must be ONE self-contained file with no external requests, so this script:

  1. concatenates the site styles into a single <style> block;
  2. inlines every referenced image as a base64 data: URI, JPEG-encoding the
     report figures to keep the artifact compact;
  3. pulls the inner <main> of each page into a <main class="route"
     data-route="..."> section, rewriting the shared masthead/footer once;
  4. rewrites nav hrefs (./ , ./insight.html , …) to hash routes (#home …);
  5. appends a tiny hashchange router plus each page's interaction script.

Re-run after editing any source page:  python3 build_artifact.py
Output: ./asset-diligence.artifact.html
"""
import base64
import io
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / "asset-diligence.artifact.html"

# route key -> source file. Order defines nav + section order.
PAGES = [
    ("home",     "index.html"),
    ("insight",  "insight.html"),
    ("report",   "report.html"),
    ("company",  "company.html"),
]

STYLES = [
    "assets/css/company-site/base.css",
    "assets/css/company-site/drugadopt.css",
    "assets/css/company-site/insight.css",
    "assets/css/company-site/report.css",
    "assets/css/company-site/company.css",
]

# ---------------------------------------------------------------------------
# Asset inlining
# ---------------------------------------------------------------------------
MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
}

# JPEG-encode big report screenshots instead of PNG (q, max width).
SHOT_JPEG = {"quality": 88, "max_w": 920}

_cache = {}

def _resolve(src: str) -> pathlib.Path:
    """Map an HTML src (relative to a source page) to a real file."""
    src = src.split("?")[0]
    if src.startswith("./"):
        return ROOT / src[2:]
    return ROOT / src

def _jpeg_shot(path: pathlib.Path, quality: int, max_w: int) -> bytes:
    from PIL import Image
    im = Image.open(path).convert("RGB")
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()

def data_uri(src: str) -> str:
    if src in _cache:
        return _cache[src]
    path = _resolve(src)
    ext = path.suffix.lower()
    name = path.name
    if name == "orr.png":
        raw, mime = _jpeg_shot(path, **SHOT_JPEG), "image/jpeg"
    elif path.parent.name == "report":
        # Section-leading report figures: detailed charts, keep them crisp but
        # JPEG-encode to hold the artifact size down.
        raw, mime = _jpeg_shot(path, quality=86, max_w=1000), "image/jpeg"
    else:
        raw, mime = path.read_bytes(), MIME[ext]
    uri = f"data:{mime};base64,{base64.b64encode(raw).decode()}"
    _cache[src] = uri
    return uri

def inline_srcs(html: str) -> str:
    """Replace every src="..." pointing at a local asset with a data URI."""
    def repl(m):
        src = m.group(2)
        if src.startswith("data:") or src.startswith("http"):
            return m.group(0)
        return f'{m.group(1)}="{data_uri(src)}"'
    return re.sub(r'(src|href)="((?:\./|\.\./)[^"]+\.(?:png|jpe?g|gif|svg))"',
                  repl, html)

# ---------------------------------------------------------------------------
# Page assembly
# ---------------------------------------------------------------------------
def read(name): return (ROOT / name).read_text()

def extract_main(html: str) -> str:
    m = re.search(r"<main id=\"main\"[^>]*>(.*)</main>", html, re.S)
    return m.group(1).strip()

def extract_scripts(html: str) -> str:
    scripts = []
    for attrs, body in re.findall(r"<script([^>]*)>(.*?)</script>", html, re.S):
        src = re.search(r'src="([^"]+)"', attrs)
        if src:
            scripts.append(_resolve(src.group(1)).read_text())
        elif body.strip():
            scripts.append(body)
    return "\n".join(scripts)

def rewrite_nav(html: str) -> str:
    for a, b in (('href="./"', 'href="#home"'),
                 ('href="./insight.html"', 'href="#insight"'),
                 ('href="./report.html"', 'href="#report"'),
                 ('href="./case.html"', 'href="#report"'),
                 ('href="./company.html"', 'href="#company"')):
        html = html.replace(a, b)
    return html


# In the multi-page site each page carries aria-current="page" on its own nav
# link. In the single-file build the masthead is emitted once, so we set the
# current-page marker at runtime from the active route instead.
def strip_aria_current(html: str) -> str:
    return html.replace(' aria-current="page"', '')


def build() -> str:
    styles = "\n".join(read(name) for name in STYLES)

    # Masthead + footer are identical across pages; take them from index.
    idx = read("index.html")
    masthead = re.search(r"(<header class=\"masthead\">.*?</header>)", idx, re.S).group(1)
    footer = re.search(r"(<footer class=\"foot\">.*?</footer>)", idx, re.S).group(1)
    masthead = strip_aria_current(rewrite_nav(masthead))

    # One <main> section per route; extra <script> blocks (Insight) collected.
    sections, scripts = [], []
    for route, fname in PAGES:
        html = read(fname)
        inner = rewrite_nav(strip_aria_current(extract_main(html)))
        hidden = "" if route == "home" else " hidden"
        sections.append(
            f'<main id="main-{route}" class="route" data-route="{route}"{hidden}>\n{inner}\n</main>'
        )
        s = extract_scripts(html)
        if s.strip():
            scripts.append(s)

    body = masthead + "\n" + "\n".join(sections) + "\n" + footer

    router = """
  function show(r){
    if(!r) r='home';
    if(r==='case') r='report';
    var titles={
      home:'DrugAdopt | Orchestrated Biosciences',
      insight:'Insight | Orchestrated Biosciences',
      report:'Example report | Orchestrated Biosciences',
      company:'Company | Orchestrated Biosciences'
    };
    var target=null;
    if(!titles[r]){
      var fragment=document.getElementById(r);
      var owner=fragment && fragment.closest('.route');
      if(owner){
        target=fragment;
        r=owner.dataset.route;
      }
    }
    var found=false;
    document.querySelectorAll('.route').forEach(function(m){
      var on = m.dataset.route===r; m.hidden=!on; if(on) found=true;
    });
    if(!found){ document.querySelector('[data-route=home]').hidden=false; r='home'; }
    document.querySelectorAll('.site-nav a[href^="#"]').forEach(function(a){
      if(a.getAttribute('href')==='#'+r) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    document.title=titles[r] || titles.home;
    if(target) requestAnimationFrame(function(){ target.scrollIntoView(); });
    else window.scrollTo(0,0);
  }
  show(location.hash.slice(1));
  window.addEventListener('hashchange', function(){ show(location.hash.slice(1)); });
"""

    doc = (
        "<!doctype html>\n"
        "<html lang=\"en\">\n"
        "<head>\n"
        "<meta charset=\"utf-8\" />\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
        "<title>Orchestrated Biosciences — Find the patients most likely to respond before your trial starts</title>\n"
        f"<style>\n{styles}\n</style>\n"
        "</head>\n"
        "<body>\n"
        f"{body}\n"
        f"<script>\n{router}\n</script>\n"
        + "".join(f"<script>\n{s}\n</script>\n" for s in scripts)
        + "</body>\n</html>\n"
    )
    # Inline all local assets last, over the whole document.
    return inline_srcs(doc)


if __name__ == "__main__":
    html = build()
    OUT.write_text(html)
    print(f"wrote {OUT}  ({len(html)/1_000_000:.2f} MB)")
