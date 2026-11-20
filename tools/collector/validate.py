"""Sanity-check data/games.json against data/series.json (offline, no network).

Exits 1 when any check fails so it can gate a build.
"""
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths  # noqa: E402


def main():
    with open(paths.GAMES, encoding="utf-8") as f:
        games = json.load(f)
    with open(paths.SERIES, encoding="utf-8") as f:
        series = json.load(f)

    failures = []
    by_series = collections.defaultdict(list)
    for game in games:
        by_series[game.get("series_id")].append(game)

    for row in series:
        group = by_series.get(row["series_id"], [])
        if not group:
            continue
        # every participant starts at 0 so a 3-0 sweep yields {3, 0}, not {3}
        wins = collections.Counter({t["name"]: 0 for game in group for t in game["teams"]})
        for game in group:
            for team in game["teams"]:
                if team["win"]:
                    wins[team["name"]] += 1
        try:
            home, away = [int(x) for x in row["score"].replace(" ", "").split("-")]
        except ValueError:
            continue
        if home + away != len(group) or sorted(wins.values()) != sorted([home, away]):
            failures.append(f"series {row['series_id']} {row['label']}: score {row['score']} "
                            f"but {len(group)} games and wins {dict(wins)}")

    def check(name, predicate):
        bad = [g["game_id"] for g in games if not predicate(g)]
        print(f"{name}: {len(games) - len(bad)}/{len(games)}")
        if bad:
            failures.append(f"{name}: {len(bad)} bad games, e.g. {bad[:5]}")

    check("duration", lambda g: bool(g["duration_seconds"]))
    check("patch", lambda g: bool(g["patch"]))
    check("gold_diff>5", lambda g: g["gold_diff"] and len(g["gold_diff"]["diff"]) > 5)
    check("two_teams_with_gold", lambda g: len(g["teams"]) == 2 and all(t["gold"] for t in g["teams"]))
    check("exactly_one_winner", lambda g: sum(1 for t in g["teams"] if t["win"]) == 1)
    check("bans_10_ids", lambda g: len(g["bans"]["blue"] + g["bans"]["red"]) == 10
          and all(c["id"] for c in g["bans"]["blue"] + g["bans"]["red"]))
    check("picks_10_ids", lambda g: len(g["picks"]["blue"] + g["picks"]["red"]) == 10
          and all(c["id"] for c in g["picks"]["blue"] + g["picks"]["red"]))
    check("players_10_champions", lambda g: len(g["players"]) == 10
          and all(p["champion_id"] for p in g["players"]))
    check("players_items", lambda g: all(p["items"] for p in g["players"]))
    check("timeline", lambda g: bool(g["timeline"]))
    check("players_gold_damage", lambda g: len(g["players"]) == 10 and all(
        p.get("stats", {}).get("gold") and p["stats"].get("dpm") for p in g["players"]))

    teams = collections.Counter(t["name"] for g in games for t in g["teams"])
    players = collections.Counter(p["name"] for g in games for p in g["players"])
    print(f"games={len(games)} series={len(series)} teams={len(teams)} players={len(players)}")
    print(f"avg duration min={round(sum(g['duration_seconds'] for g in games) / len(games) / 60, 1)}")
    print(f"dates: {min(g['date'] for g in games)} -> {max(g['date'] for g in games)}")

    if failures:
        print("\nFAILED:")
        for item in failures:
            print("  -", item)
        return 1
    print("\nOK: all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
