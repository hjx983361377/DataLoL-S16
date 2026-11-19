
"""Build player metadata (role, headshot) for the site.

- role: from lolesports roster when the summoner name matches, else from the
  fixed player order inside each game (blue top/jungle/mid/bottom/support, then red)
- headshot: lolesports static image, resized to 256px webp under public/assets/players

Writes public/assets/data/players_meta.json keyed by "team|summoner" (lowercase).
"""
import io, json, os, re, urllib.request
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
DATA = os.path.join(ROOT, "data")
ASSETS = os.path.join(ROOT, "public", "assets")
OUT_META = os.path.join(ASSETS, "data", "players_meta.json")
OUT_DIR = os.path.join(ASSETS, "players")
ROLES = ["top", "jungle", "mid", "bottom", "support"]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def load(p):
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)

games = load(os.path.join(DATA, "games.json"))
api = load(os.path.join(ASSETS, "data", "teams_api.json"))["data"]["teams"]
team_map = load(os.path.join(ASSETS, "data", "team_map.json"))
api_by_name = {t["name"].lower(): t for t in api}

def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "player"

# team -> api roster keyed by normalized summoner name
rosters = {}
for team, info in team_map.items():
    api_team = api_by_name.get(info["api_name"].lower())
    if not api_team:
        continue
    rosters[team] = {p["summonerName"].strip().lower(): p for p in api_team["players"]}

players = {}
order_role = {}
for game in games:
    sides = {t["side"]: t["name"] for t in game["teams"]}
    for i, p in enumerate(game["players"]):
        team = sides[p["team"]]
        key = (team, p["name"].strip().lower())
        order_role.setdefault(key, []).append(ROLES[i % 5])
        players.setdefault(key, set()).add(p["champion"])

os.makedirs(OUT_DIR, exist_ok=True)
meta = {}
downloaded = skipped = 0
for (team, name), champions in sorted(players.items()):
    roles = order_role[(team, name)]
    counts = {r: roles.count(r) for r in ROLES}
    role = max(counts, key=counts.get)
    roster = rosters.get(team, {}).get(name)
    if roster and roster.get("role") in ROLES:
        role = roster["role"]
    entry = {"team": team, "role": role, "photo": None}
    if roster:
        entry["summoner"] = roster["summonerName"].strip()
        url = roster.get("image") or ""
        if url and "default-headshot" not in url:
            fname = slug(team) + "--" + slug(name) + ".webp"
            dest = os.path.join(OUT_DIR, fname)
            if not os.path.exists(dest):
                try:
                    req = urllib.request.Request(url, headers=UA)
                    raw = urllib.request.urlopen(req, timeout=25).read()
                    im = Image.open(io.BytesIO(raw)).convert("RGBA")
                    w, h = im.size
                    side = min(w, h)
                    im = im.crop(((w - side) // 2, 0, (w - side) // 2 + side, side)).resize((256, 256), Image.LANCZOS)
                    im.save(dest, "WEBP", quality=82, method=6)
                    downloaded += 1
                except Exception as exc:
                    print("  photo fail", team, name, exc)
                    skipped += 1
            if os.path.exists(dest):
                entry["photo"] = "/assets/players/" + fname
    meta[(team + "|" + name).lower()] = entry

with open(OUT_META, "w", encoding="utf-8") as fh:
    json.dump(meta, fh, ensure_ascii=False, indent=1, sort_keys=True)

print("players", len(meta), "photos", sum(1 for v in meta.values() if v["photo"]), "downloaded", downloaded, "failed", skipped)
print("roles", {r: sum(1 for v in meta.values() if v["role"] == r) for r in ROLES})
