"""HTTP helpers for gol.gg.

Sequential by design: gol.gg rate-limits aggressive concurrency (parallel
requests hang without closing the socket), so every caller sleeps between
requests and each request carries a hard timeout.
"""
import gzip
import os
import time
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def get(url, timeout=20, retries=2, data=None, headers=None):
    """Fetch url, return (status, bytes). Retries with linear backoff."""
    hdrs = {"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"}
    if headers:
        hdrs.update(headers)
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=hdrs)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return resp.status, raw
        except Exception as exc:  # noqa: BLE001 - network noise of many kinds
            last = exc
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
    raise last


def get_text(url, **kwargs):
    return get(url, **kwargs)[1].decode("utf-8", "ignore")


def cached_html(url, path, refresh=False, min_bytes=10000, sleep=0.5):
    """Return (html, from_cache), reusing the local snapshot when possible."""
    if not refresh and os.path.exists(path) and os.path.getsize(path) >= min_bytes:
        with open(path, encoding="utf-8", errors="ignore") as f:
            return f.read(), True
    html = get_text(url)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    if sleep:
        time.sleep(sleep)
    return html, False
