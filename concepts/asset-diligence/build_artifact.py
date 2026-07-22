#!/usr/bin/env python3
"""Build the single-file, hash-routed Artifact from the multi-page source.

The concept site is four hand-written HTML pages (index/products/case/company)
sharing styles.css and assets under ./img and ../../images. A Claude Artifact
must be ONE self-contained file with no external requests, so this script:

  1. inlines styles.css into a <style> block;
  2. inlines every referenced image as a base64 data: URI (slimming the
     heaviest GIFs so the artifact stays a reasonable size);
  3. pulls the inner <main> of each page into a <main class="route"
     data-route="..."> section, rewriting the shared masthead/footer once;
  4. rewrites nav hrefs (./ , ./products.html , …) to hash routes (#home …);
  5. appends a tiny hashchange router plus the Insight animation script.

Re-run after editing any source page:  python3 build_artifact.py
Output: ./asset-diligence.artifact.html
"""
import base64, io, re, pathlib

HERE = pathlib.Path(__file__).resolve().parent
IMAGES = (HERE / "../../images").resolve()
OUT = HERE / "asset-diligence.artifact.html"

# route key -> source file. Order defines nav + section order.
PAGES = [
    ("home",     "index.html"),
    ("products", "products.html"),
    ("case",     "case.html"),
    ("company",  "company.html"),
]

# ---------------------------------------------------------------------------
# Asset inlining
# ---------------------------------------------------------------------------
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".svg": "image/svg+xml"}

# GIFs get thumbnailed to keep the artifact lean.
# (width, colors, max_frames). The three "in development" demos render small on
# the products grid, so they can be aggressive; the DrugAdopt hero stays sharp.
GIF_SLIM = {
    "spatial-advisor-demo.gif": (560, 96, 24),
    "mouse-selector-demo.gif":  (560, 96, 24),
    "bioventure-demo.gif":      (560, 96, 24),
    "drugadopt-demo.gif":       (1100, 160, None),
}
# JPEG-encode big report screenshots instead of PNG (q, max width).
SHOT_JPEG = {"quality": 88, "max_w": 920}

_cache = {}

def _resolve(src: str) -> pathlib.Path:
    """Map an HTML src (relative to a source page) to a real file."""
    src = src.split("?")[0]
    if src.startswith("../../images/"):
        return IMAGES / src[len("../../images/"):]
    if src.startswith("./"):
        return HERE / src[2:]
    return HERE / src

def _slim_gif(path: pathlib.Path, width: int, colors: int = 128,
              max_frames: int | None = None) -> bytes:
    """Downscale a GIF and re-encode against ONE shared palette.

    Per-frame ADAPTIVE palettes + disposal=2 (full redraw) defeat GIF
    inter-frame compression and can inflate a file. Quantizing every frame to
    a single palette derived from the first frame, with disposal=1 (leave prior
    pixels), lets PIL's optimizer diff frames — which is where the savings are.
    """
    from PIL import Image, ImageSequence
    im = Image.open(path)
    rgb_frames, durations = [], []
    for fr in ImageSequence.Iterator(im):
        durations.append(fr.info.get("duration", 100))
        f = fr.convert("RGB")
        if f.width > width:
            h = round(f.height * width / f.width)
            f = f.resize((width, h), Image.LANCZOS)
        rgb_frames.append(f)
    if max_frames and len(rgb_frames) > max_frames:
        step = len(rgb_frames) / max_frames
        idx = [int(i * step) for i in range(max_frames)]
        merged = [sum(durations[idx[k]:(idx[k + 1] if k + 1 < len(idx) else None)])
                  for k in range(len(idx))]
        rgb_frames = [rgb_frames[i] for i in idx]
        durations = merged
    palette = rgb_frames[0].quantize(colors=colors, method=Image.MEDIANCUT)
    frames = [f.quantize(palette=palette, dither=Image.FLOYDSTEINBERG)
              for f in rgb_frames]
    buf = io.BytesIO()
    frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, disposal=1, optimize=True)
    return buf.getvalue()

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
    if ext == ".gif" and name in GIF_SLIM:
        w, colors, mf = GIF_SLIM[name]
        raw, mime = _slim_gif(path, w, colors, mf), "image/gif"
    elif name in {"orr.png", "biomarker.png", "modelability.png",
                  "neutropenia.png", "citation.png"}:
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
def read(name): return (HERE / name).read_text()

def extract_main(html: str) -> str:
    m = re.search(r"<main id=\"main\">(.*)</main>", html, re.S)
    return m.group(1).strip()

def extract_scripts(html: str) -> str:
    return "\n".join(re.findall(r"<script>(.*?)</script>", html, re.S))

def rewrite_nav(html: str) -> str:
    for a, b in (('href="./"', 'href="#home"'),
                 ('href="./products.html"', 'href="#products"'),
                 ('href="./case.html"', 'href="#case"'),
                 ('href="./company.html"', 'href="#company"')):
        html = html.replace(a, b)
    return html


# In the multi-page site each page carries aria-current="page" on its own nav
# link. In the single-file build the masthead is emitted once, so we set the
# current-page marker at runtime from the active route instead.
def strip_aria_current(html: str) -> str:
    return html.replace(' aria-current="page"', '')


def build() -> str:
    styles = read("styles.css")

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
    var found=false;
    document.querySelectorAll('.route').forEach(function(m){
      var on = m.dataset.route===r; m.hidden=!on; if(on) found=true;
    });
    if(!found){ document.querySelector('[data-route=home]').hidden=false; r='home'; }
    document.querySelectorAll('.site-nav a[href^="#"]').forEach(function(a){
      if(a.getAttribute('href')==='#'+r) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0,0);
  }
  show(location.hash.slice(1));
  window.addEventListener('hashchange', function(){ show(location.hash.slice(1)); });
"""

    doc = (
        "<meta charset=\"utf-8\" />\n"
        "<title>Orchestrated Biosciences — Biomarker- and evidence-grounded decision support</title>\n"
        f"<style>\n{styles}\n</style>\n"
        f"{body}\n"
        f"<script>\n{router}\n</script>\n"
        + "".join(f"<script>\n{s}\n</script>\n" for s in scripts)
    )
    # Inline all local assets last, over the whole document.
    return inline_srcs(doc)


if __name__ == "__main__":
    html = build()
    OUT.write_text(html)
    print(f"wrote {OUT}  ({len(html)/1_000_000:.2f} MB)")
