"""Refresh data/series.json + data/raw/*.html from gol.gg.

Examples:
    python collect.py --season S16 --list
    python collect.py --season S16 --prefix "Worlds 2026"
    python collect.py --season S16 --series-only --refresh

Followed by:
    python build.py && python validate.py

Rate-limit notes (learned the hard way): one request at a time, hard timeout,
0.5-1 s between requests. Parallel workers make gol.gg hang without closing
the connection.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths  # noqa: E402
from fetch import cached_html, get  # noqa: E402

GAME_LINK_RE = re.compile(r"/game/stats/(\d+)/page-game/")
AJAX_HEADERS = {"X-Requested-With": "XMLHttpRequest", "Referer": "https://gol.gg/tournament/list/"}


def log(*args):
    print(*args, flush=True)


def tournaments(season):
    body = urllib.parse.urlencode({"season": season, "league": "ALL"}).encode()
    _, raw = get("https://gol.gg/tournament/ajax.trlist.php", data=body,
                 headers=AJAX_HEADERS)
    return json.loads(raw.decode("utf-8", "ignore"))


def series_rows(tournament, refresh=False):
    url = "https://gol.gg/tournament/tournament-matchlist/" + urllib.parse.quote(tournament) + "/"
    slug = "matchlist_" + re.sub(r"\W+", "_", tournament) + ".html"
    html, cached = cached_html(url, os.path.join(paths.RAW, slug), refresh=refresh)
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    rows = []
    for tr in soup.find_all("tr"):
        cells = tr.find_all("td")
        if len(cells) < 7:
            continue
        anchor = tr.find("a", href=re.compile(r"game/stats/\d+"))
        if anchor is None:
            continue
        match = re.search(r"game/stats/(\d+)", anchor["href"])
        rows.append({
            "series_id": int(match.group(1)),
            "label": cells[0].get_text(" ", strip=True),
            "stage": cells[4].get_text(" ", strip=True),
            "score": cells[2].get_text(" ", strip=True),
            "teams": [cells[1].get_text(" ", strip=True), cells[3].get_text(" ", strip=True)],
            "patch": cells[5].get_text(" ", strip=True),
            "date": cells[6].get_text(" ", strip=True),
            "tournament": tournament,
        })
    log(f"  {tournament}: {len(rows)} series (cache={cached})")
    return rows


def series_games(series_id, refresh=False):
    url = f"https://gol.gg/game/stats/{series_id}/page-summary/"
    path = os.path.join(paths.RAW, f"series_{series_id}.html")
    html, cached = cached_html(url, path, refresh=refresh)
    ids = []
    for gid in GAME_LINK_RE.findall(html):
        gid = int(gid)
        if gid not in ids:
            ids.append(gid)
    if series_id not in ids:
        ids.insert(0, series_id)  # game 1 shares the series id
    return ids, cached


def main(argv=None):
    parser = argparse.ArgumentParser(description="Refresh S16 data from gol.gg")
    parser.add_argument("--season", default="S16", help="gol.gg season code, e.g. S16")
    parser.add_argument("--tournament", action="append", default=[],
                        help="exact tournament name (repeatable)")
    parser.add_argument("--prefix", default=None, help="tournament name prefix, e.g. 'Worlds 2026'")
    parser.add_argument("--list", action="store_true", help="only list tournaments for the season")
    parser.add_argument("--series-only", action="store_true", help="skip game page downloads")
    parser.add_argument("--refresh", action="store_true", help="ignore cached snapshots")
    parser.add_argument("--sleep", type=float, default=0.5, help="pacing between requests")
    args = parser.parse_args(argv)

    paths.ensure_dirs()
    available = tournaments(args.season)
    if args.list:
        for item in available:
            log(f"{item['trname']}\t{item.get('nbgames')} games")
        return 0

    wanted = list(args.tournament)
    if args.prefix:
        wanted += [t["trname"] for t in available if t["trname"].startswith(args.prefix)]
    if not wanted:
        raise SystemExit("pass --tournament or --prefix (use --list to see names)")

    rows = []
    for name in wanted:
        rows += series_rows(name, refresh=args.refresh)
        time.sleep(args.sleep)
    rows.sort(key=lambda r: (r["date"], r["series_id"]), reverse=True)
    with open(paths.SERIES, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    log(f"wrote {paths.SERIES}: {len(rows)} series")
    if args.series_only:
        return 0

    total = fetched = 0
    for index, row in enumerate(rows, 1):
        try:
            ids, _ = series_games(row["series_id"], refresh=args.refresh)
        except Exception as exc:  # noqa: BLE001 - keep going on flaky pages
            log(f"[{index}/{len(rows)}] series {row['series_id']} ERR {type(exc).__name__}")
            continue
        time.sleep(args.sleep)
        for gid in ids:
            total += 1
            path = os.path.join(paths.RAW, f"game_{gid}.html")
            if not args.refresh and os.path.exists(path) and os.path.getsize(path) > 10000:
                continue
            try:
                _, cached = cached_html(f"https://gol.gg/game/stats/{gid}/page-game/",
                                        path, refresh=args.refresh, sleep=args.sleep)
                fetched += 0 if cached else 1
            except Exception as exc:  # noqa: BLE001
                log(f"    game {gid} ERR {type(exc).__name__} {str(exc)[:70]}")
        log(f"[{index}/{len(rows)}] {row['label']} {row['stage']} games={len(ids)}")
    log(f"done: {total} game pages tracked, {fetched} downloaded")
    log("next: python build.py && python validate.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
