#!/usr/bin/env python3
"""
Re-find Eastbrooke product images after their site rebuild.

The legacy import stored image URLs like
  http://www.eastbrooktrade.com/product/image/large/41.1019_0.jpg
which now redirect to unrelated HTML pages. Eastbrooke's site search
(https://www.eastbrooktrade.com/search?q=<SKU>) redirects straight to the
product page, whose <meta property="og:image"> points at their image CDN.

  python3 refresh_eastbrooke_images.py products.tsv results.tsv [--limit N]

products.tsv: id<TAB>sku<TAB>name   (products whose image is still an old eastbrooktrade.com URL)
results.tsv:  id<TAB>sku<TAB>image_url<TAB>page_url   (only verified matches)

Polite: robots.txt allows crawling; 2 workers, ~1 request/second each, reads
only the first part of each page. Standard library only.
"""
from __future__ import annotations

import concurrent.futures as cf
import html
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; CPR-catalogue-sync/1.0; +https://www.broadlanddigital.co.uk)"
BASE = "https://www.eastbrooktrade.com"
WORKERS = 2
GAP = 1.0          # seconds between requests per worker
READ_BYTES = 400_000

OG = re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I)
OG2 = re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I)
TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
STOP = {"x", "and", "with", "for", "the", "mm", "in", "of", "a", "-", "&"}


def tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP and len(t) > 1}


def fetch(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.geturl(), r.read(READ_BYTES).decode("utf-8", "replace"), None
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(10 * attempt)
                continue
            return None, None, f"http {e.code}"
        except Exception as e:  # network blip
            if attempt < 3:
                time.sleep(5 * attempt)
                continue
            return None, None, f"error {type(e).__name__}"
    return None, None, "error"


def lookup(sku: str, name: str):
    """Return (image_url, page_url, reason)."""
    digits = re.sub(r"\D", "", sku)
    final, body, err = fetch(f"{BASE}/search?q={urllib.parse.quote(sku)}")
    if err:
        return None, None, err

    path = urllib.parse.urlparse(final).path
    if path.startswith("/search") or path in ("", "/"):
        # results list: pick the product whose URL ends with the SKU digits
        links = sorted(set(re.findall(r'href=["\'](/[^"\'#?]+-' + re.escape(digits) + r')["\']', body))) if digits else []
        if len(links) != 1:
            return None, final, "no single match" if not links else "ambiguous"
        time.sleep(GAP)
        final, body, err = fetch(BASE + links[0])
        if err:
            return None, None, err
        path = urllib.parse.urlparse(final).path

    # strict check: the page must be the same product, not just mention the SKU.
    # The first word of our name is the range (Madrid, Bonito, Stour...) and must
    # appear in the page title/URL, and most of the other words must too.
    t = TITLE.search(body)
    title = html.unescape(t.group(1)) if t else ""
    theirs = tokens(title + " " + path.replace("-", " ").replace("/", " "))
    ours = tokens(name)
    first = next(iter(re.findall(r"[a-z]{3,}", name.lower())), None)
    score = len(ours & theirs) / len(ours) if ours else 0
    if not ours or (first and first not in theirs) or score < 0.6:
        return None, final, "name mismatch"
    # Eastbrooke appends the SKU digits to the product URL (41.1019 -> ...-411019).
    # Require the SKU on the page unless the name matches almost exactly.
    if not ((digits and path.endswith(digits)) or sku in body or score >= 0.85):
        return None, final, "page does not mention SKU"

    m = OG.search(body) or OG2.search(body)
    if not m:
        return None, final, "no og:image"
    img = html.unescape(m.group(1)).replace("/512x512/", "/1024x1024/")
    return img, final, "ok"


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None

    rows = [line.rstrip("\n").split("\t") for line in open(src, encoding="utf-8") if line.strip()]
    if limit:
        rows = rows[:limit]
    print(f"Looking up {len(rows)} Eastbrooke products…", flush=True)

    lock = threading.Lock()
    reasons: dict[str, int] = {}
    found = 0
    done = 0
    started = time.time()

    with open(out, "w", encoding="utf-8") as fo:
        def work(row):
            nonlocal found, done
            pid, sku, name = row[0], row[1], (row[2] if len(row) > 2 else "")
            t0 = time.time()
            img, page, reason = lookup(sku, name)
            with lock:
                done += 1
                reasons[reason] = reasons.get(reason, 0) + 1
                if img:
                    found += 1
                    fo.write(f"{pid}\t{sku}\t{img}\t{page}\n")
                    fo.flush()
                if done % 100 == 0 or done == len(rows):
                    rate = done / max(time.time() - started, 1)
                    print(f"  {done}/{len(rows)}  matched {found}  ({rate:.1f}/s)", flush=True)
                if done <= 8 or (reason != "ok" and reasons[reason] <= 3):
                    print(f"  sample: {sku} | {name[:50]} -> {reason} {page or ''}", flush=True)
            time.sleep(max(0, GAP - (time.time() - t0)))

        with cf.ThreadPoolExecutor(WORKERS) as ex:
            list(ex.map(work, rows))

    print("Results: " + ", ".join(f"{k}={v}" for k, v in sorted(reasons.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
