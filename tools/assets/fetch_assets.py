#!/usr/bin/env python3
"""Download every static asset the site needs into public/assets, so it runs fully offline.

Sources
  * DataDragon 16.20.1 - champion / item / summoner-spell icons + en & zh metadata
  * lolesports esports API - team logos

Champion ids in data/games.json are gol.gg's internal ids (a permutation of 1..173,
NOT Riot ids), so champions are resolved by name here and written to
public/assets/data/champion_map.json together with each champion's icon paths.

Usage
    python tools/assets/fetch_assets.py             # icons only (default, ~5 MB)
    python tools/assets/fetch_assets.py --splash    # + champion splash art (big)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import threading
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = ROOT / "public" / "assets"
PATCH = "16.20.1"
DD = f"https://ddragon.leagueoflegends.com/cdn/{PATCH}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) dsh-datalol/0.1"
LOLESPORTS_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z"

# gol.gg display name -> DataDragon champion key, only where normalisation is not enough
KEY_ALIASES = {
    "nunuwillump": "Nunu",
    "monkeyking": "MonkeyKing",
    "reksai": "RekSai",
    "kaisa": "Kaisa",
    "velkoz": "Velkoz",
    "ksante": "KSante",
    "chogath": "Chogath",
}

_lock = threading.Lock()
_ok = _skip = _fail = 0


def get(url: str, timeout: int = 25, headers: dict | None = None) -> bytes:
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def get_json(url: str, headers: dict | None = None):
    return json.loads(get(url, headers=headers).decode("utf-8"))


def fetch_file(url: str, dest: Path) -> str:
    global _ok, _skip, _fail
    if dest.exists() and dest.stat().st_size > 0:
        with _lock:
            _skip += 1
        return "skip"
    dest.parent.mkdir(parents=True, exist_ok=True)
    last = ""
    for _ in range(3):
        try:
            blob = get(url)
            if not blob:
                raise ValueError("empty body")
            tmp = dest.with_suffix(dest.suffix + ".part")
            tmp.write_bytes(blob)
            tmp.replace(dest)
            with _lock:
                _ok += 1
                if _ok % 25 == 0:
                    print(f"  downloaded {_ok} (skipped {_skip}, failed {_fail})", flush=True)
            return "ok"
        except Exception as exc:  # noqa: BLE001
            last = str(exc)
    with _lock:
        _fail += 1
    print(f"  FAIL {url} :: {last}", flush=True)
    return "fail"


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.strip().lower())


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def ensure_metadata() -> dict:
    meta = OUT / "data"
    meta.mkdir(parents=True, exist_ok=True)
    files = {
        "champion.json": f"{DD}/data/en_US/champion.json",
        "champion_zh.json": f"{DD}/data/zh_CN/champion.json",
        "items.json": f"{DD}/data/en_US/item.json",
        "items_zh.json": f"{DD}/data/zh_CN/item.json",
        "spells.json": f"{DD}/data/en_US/summoner.json",
    }
    for name, url in files.items():
        dest = meta / name
        if not dest.exists():
            fetch_file(url, dest)
    return {
        "champ_en": json.loads((meta / "champion.json").read_text(encoding="utf-8"))["data"],
        "champ_zh": json.loads((meta / "champion_zh.json").read_text(encoding="utf-8"))["data"],
        "items": json.loads((meta / "items.json").read_text(encoding="utf-8"))["data"],
        "spells": json.loads((meta / "spells.json").read_text(encoding="utf-8"))["data"],
    }


def used_from_dataset() -> tuple[dict, set, set, set]:
    games = json.loads((DATA / "games.json").read_text(encoding="utf-8"))
    champs: dict[str, int] = {}   # gol.gg name -> gol.gg id (id kept only for reference)
    items, spells, teams = set(), set(), set()
    for g in games:
        for side in ("blue", "red"):
            for p in g["picks"][side]:
                champs.setdefault(p["name"], int(p["id"]))
            for b in g["bans"][side]:
                champs.setdefault(b["name"], int(b["id"]))
        for t in g["teams"]:
            teams.add(t["name"])
        for p in g["players"]:
            items.update(i for i in p["items"] if i.isdigit() and int(i) > 0)
            spells.update(p["spells"])
    return champs, items, spells, teams


def resolve_champions(names: dict, champ_en: dict, champ_zh: dict, meta: dict) -> dict:
    by_norm = {norm(k): k for k in champ_en}
    by_name = {norm(v["name"]): k for k, v in champ_en.items()}
    # keyed by the raw gol.gg display name, which is what data/games.json uses
    resolved, missing = {}, []
    for name, gid in sorted(names.items()):
        key = KEY_ALIASES.get(norm(name)) or by_name.get(norm(name)) or by_norm.get(norm(name))
        if not key:
            missing.append(name)
            continue
        zh = champ_zh.get(key, {})
        resolved[name] = {
            "golgg_name": name,
            "golgg_id": gid,
            "riot_id": int(champ_en[key]["key"]),
            "key": key,
            "name": champ_en[key]["name"],
            # DataDragon zh_CN swaps the two fields: "name" is the fancy title (盲僧),
            # "title" is the champion's real name (李青). Sites want the real name.
            "name_zh": zh.get("title") or zh.get("name") or champ_en[key]["name"],
            "name_zh_title": zh.get("name") or "",
            "icon": f"/assets/champions/{key}.png",
            "splash": f"/assets/champions/splash/{key}.jpg",
        }
    if missing:
        print(f"WARN unresolvable champion names: {missing}", flush=True)
    return resolved


def team_jobs(teams: set) -> list:
    """Team logos via the public lolesports esports API."""
    headers = {"x-api-key": LOLESPORTS_KEY, "Origin": "https://lolesports.com"}
    try:
        esp = get_json("https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US", headers=headers)
    except Exception as exc:  # noqa: BLE001
        print(f"team logos skipped (api): {exc}", flush=True)
        return [], {}
    (OUT / "data" / "teams_api.json").write_text(json.dumps(esp, ensure_ascii=False, indent=1), encoding="utf-8")
    api = {norm(t["name"]): t for t in esp["data"]["teams"]}
    api.update({norm(t["code"]): t for t in esp["data"]["teams"] if t.get("code")})
    # gol.gg name -> lolesports API name, where the two disagree
    aliases = {
        "cloud9": "cloud9kia",
        "geng": "gengesports",
        "teamliquid": "teamliquidhondafirst",  # TL horse mark, not the Alienware bug
        # gol.gg still says "Los Grandes"; the org rebranded to LOS in 2023 and the
        # official Worlds 2026 event lists it as "LOS". "Fla Los Grandes" (FLW) is
        # Black Dragons, a different club - do not match it.
        "losgrandes": "los",
    }
    jobs, matched, missing = [], {}, []
    for t in sorted(teams):
        hit = api.get(norm(t)) or api.get(norm(aliases.get(norm(t), "")))
        if not hit:
            missing.append(t)
            continue
        img = hit.get("image") or hit.get("alternativeImage") or ""
        if not img:
            missing.append(t)
            continue
        ext = ".png" if urllib.parse.urlparse(img).path.lower().endswith(".png") else ".jpg"
        dest = OUT / "teams" / f"{slugify(t)}{ext}"
        jobs.append((img, dest))
        matched[t] = {"logo": f"/assets/teams/{dest.name}", "api_name": hit.get("name"), "code": hit.get("code")}
    print(f"team logos: matched {len(matched)}/{len(teams)}; missing={missing}", flush=True)
    return jobs, matched


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--splash", action="store_true", help="also download champion splash art")
    ap.add_argument("--no-teams", action="store_true")
    args = ap.parse_args()

    print(f"patch {PATCH} -> {OUT}", flush=True)
    meta = ensure_metadata()
    champ_en, champ_zh = meta["champ_en"], meta["champ_zh"]

    names, items, spells, teams = used_from_dataset()
    champs = resolve_champions(names, champ_en, champ_zh, meta)
    print(f"champions: {len(champs)}  items: {len(items)}  spells: {len(spells)}  teams: {len(teams)}", flush=True)

    jobs = [
        (f"{DD}/img/champion/{c['key']}.png", OUT / "champions" / f"{c['key']}.png")
        for _, c in sorted(champs.items())
    ]
    jobs += [(f"{DD}/img/item/{i}.png", OUT / "items" / f"{i}.png") for i in sorted(items)]
    jobs += [(f"{DD}/img/spell/{s}.png", OUT / "spells" / f"{s}.png") for s in sorted(spells)]
    if args.splash:
        jobs += [
            (f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{c['key']}_0.jpg",
             OUT / "champions" / "splash" / f"{c['key']}.jpg")
            for _, c in sorted(champs.items())
        ]
    team_meta = {}
    if not args.no_teams:
        tjobs, team_meta = team_jobs(teams)
        jobs += tjobs

    with ThreadPoolExecutor(max_workers=8) as pool:
        for f in as_completed([pool.submit(fetch_file, u, d) for u, d in jobs]):
            f.result()

    (OUT / "data" / "champion_map.json").write_text(
        json.dumps(champs, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "data" / "team_map.json").write_text(
        json.dumps(team_meta, ensure_ascii=False, indent=1), encoding="utf-8")

    files = [p for p in OUT.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    print(f"done: ok={_ok} skipped={_skip} failed={_fail} files={len(files)} size={total / 1024 / 1024:.2f}MB", flush=True)
    return 0 if _fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
