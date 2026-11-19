"""Rebuild data/games.json + data/summary.json from cached HTML snapshots.

Idempotent and offline: needs only data/series.json and data/raw/*.html.
Series metadata (stage/date/score) is attached by locating each game id in the
cached series pages.
"""
import collections
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths  # noqa: E402
from parse import parse_game  # noqa: E402

GAME_LINK_RE = re.compile(r"/game/stats/(\d+)/page-game/")
META_FIELDS = ("series_id", "stage", "date", "tournament", "series_score", "series_teams")


def load_series():
    with open(paths.SERIES, encoding="utf-8") as f:
        rows = json.load(f)
    return rows, {row["series_id"]: row for row in rows}


def game_to_series(series_rows):
    """Map game id -> series id using the cached per-series pages."""
    mapping = {}
    for row in series_rows:
        path = os.path.join(paths.RAW, f"series_{row['series_id']}.html")
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8", errors="ignore") as f:
            html = f.read()
        ids = [int(x) for x in GAME_LINK_RE.findall(html)]
        if row["series_id"] not in ids:
            ids.insert(0, row["series_id"])
        for gid in ids:
            mapping.setdefault(gid, row["series_id"])
    return mapping


def completeness(games):
    def count(predicate):
        return sum(1 for g in games if predicate(g))

    def has_bans(g):
        bans = g["bans"]["blue"] + g["bans"]["red"]
        return len(bans) == 10 and all(c["id"] for c in bans)

    def has_picks(g):
        picks = g["picks"]["blue"] + g["picks"]["red"]
        return len(picks) == 10 and all(c["id"] for c in picks)

    checks = {
        "duration": count(lambda g: bool(g["duration_seconds"])),
        "patch": count(lambda g: bool(g["patch"])),
        "gold_diff>5": count(lambda g: g["gold_diff"] and len(g["gold_diff"]["diff"]) > 5),
        "two_teams_with_gold": count(
            lambda g: len(g["teams"]) == 2 and all(t["gold"] for t in g["teams"])),
        "exactly_one_winner": count(
            lambda g: sum(1 for t in g["teams"] if t["win"]) == 1),
        "bans_10_ids": count(has_bans),
        "picks_10_ids": count(has_picks),
        "players_10_champions": count(
            lambda g: len(g["players"]) == 10 and all(p["champion_id"] for p in g["players"])),
        "players_items": count(lambda g: all(p["items"] for p in g["players"])),
        "timeline": count(lambda g: bool(g["timeline"])),
    }
    return checks


def main():
    series_rows, by_id = load_series()
    mapping = game_to_series(series_rows)

    files = sorted(glob.glob(os.path.join(paths.RAW, "game_*.html")))
    if not files:
        raise SystemExit("no game_*.html snapshots in " + paths.RAW)
    games, errors, orphan = [], [], []
    for path in files:
        gid = int(os.path.basename(path)[len("game_"):-len(".html")])
        with open(path, encoding="utf-8", errors="ignore") as f:
            html = f.read()
        try:
            record = parse_game(html, gid)
        except Exception as exc:  # noqa: BLE001 - report and continue
            errors.append((gid, type(exc).__name__, str(exc)[:80]))
            continue
        series = by_id.get(mapping.get(gid))
        if series is None:
            orphan.append(gid)
        else:
            record.update({"series_id": series["series_id"], "stage": series["stage"],
                           "date": series["date"], "tournament": series["tournament"],
                           "series_score": series["score"], "series_teams": series["teams"]})
            if not record.get("patch"):
                record["patch"] = series.get("patch")
        games.append(record)

    games.sort(key=lambda g: (g.get("date") or "", g["game_id"]))
    with open(paths.GAMES, "w", encoding="utf-8") as f:
        json.dump(games, f, ensure_ascii=False, indent=1)

    teams = collections.Counter(t["name"] for g in games for t in g["teams"])
    picked = collections.Counter(c["name"] for g in games
                                 for c in g["picks"]["blue"] + g["picks"]["red"])
    banned = collections.Counter(c["name"] for g in games
                                 for c in g["bans"]["blue"] + g["bans"]["red"])
    summary = {"teams": teams.most_common(),
               "champions_picked": picked.most_common(),
               "champions_banned": banned.most_common()}
    with open(paths.SUMMARY, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)

    print(f"games: {len(games)}  errors: {len(errors)}  orphan: {len(orphan)}")
    if errors:
        print("  errors:", errors[:5])
    if orphan:
        print("  orphan game ids:", orphan[:10])
    checks = completeness(games)
    for key, value in checks.items():
        print(f"  {key}: {value}/{len(games)}")
    bad = [k for k, v in checks.items() if v != len(games)]
    print("WARNING incomplete fields: " + ", ".join(bad) if bad else "all fields complete")
    print(f"wrote {paths.GAMES}")
    print(f"wrote {paths.SUMMARY}")


if __name__ == "__main__":
    main()
