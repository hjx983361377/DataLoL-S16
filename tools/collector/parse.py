"""Parse one gol.gg page-game snapshot into a structured game record.

Fields: duration, patch, gold-diff curve, both teams, bans/picks (ordered,
with champion ids), all ten players (champion, KDA, CS, items, summoner
spells) and the event timeline.
"""
import json
import os
import re
import sys

from bs4 import BeautifulSoup

DURATION_RE = re.compile(r"Game Time\s*<br/?>\s*<h1>\s*(\d+):(\d+)\s*</h1>")
PATCH_RE = re.compile(
    r"<h1>\s*\d+:\d+\s*</h1>\s*</div>\s*<div class=\"col-3 text-right\">\s*v(\d+\.\d+)")
PATCH_FALLBACK_RE = re.compile(r"col-3 text-right\">\s*v(\d+\.\d+)")
KDA_RE = re.compile(r"\d+/\d+/\d+")


def _num(text):
    """'46.8k' -> 46800, '12' -> 12, junk -> None."""
    text = (text or "").strip().replace(",", "")
    match = re.match(r"^(\d+(?:\.\d+)?)(k?)$", text)
    if not match:
        return None
    value = float(match.group(1))
    return int(value * 1000) if match.group(2) == "k" else int(value)


def _gold_diff(html):
    """The curve lives in inline JS: var golddatas = {labels:[...], datasets:[...,{data:[...]}]}."""
    start = html.find("var golddatas")
    if start == -1:
        return None
    segment = html[start:start + 6000]
    labels = re.search(r"labels:\s*\[([^\]]*)\]", segment)
    datasets = re.findall(r"data:\s*\[([^\]]*)\]", segment)
    if not labels or len(datasets) < 2:
        return None
    minutes = [x.strip().strip("'").strip('"') for x in labels.group(1).split(",") if x.strip()]
    values = [x.strip() for x in datasets[1].split(",") if x.strip()]
    try:
        return {"minutes": [int(float(x)) for x in minutes],
                "diff": [int(float(x)) for x in values]}
    except ValueError:
        return {"minutes": minutes, "diff": values}


def _teams(soup, bans, picks):
    """Team blocks (blue/red header) + ordered ban/pick lists."""
    teams = []
    for side in ("blue", "red"):
        header = soup.find(class_=f"{side}-line-header")
        if header is None:
            continue
        block = header.find_parent("div", class_="col-12")
        text = header.get_text(" ", strip=True)
        name, _, result = text.rpartition("-")
        team = {"name": name.strip(), "side": side,
                "win": result.strip().upper().startswith("WIN")}
        boxes = {}
        for box in block.find_all("span", class_="score-box"):
            img = box.find("img")
            if img is not None:
                boxes[img.get("alt")] = _num(box.get_text(" ", strip=True))
        team.update({"kills": boxes.get("Kills"), "towers": boxes.get("Towers"),
                     "dragons": boxes.get("Dragons"), "barons": boxes.get("Nashor"),
                     "gold": boxes.get("Team Gold")})
        alts = [img.get("alt") for img in block.find_all("img")]
        team["first_blood"] = "First Blood" in alts
        team["first_tower"] = "First Tower" in alts
        team["dragon_types"] = [a for a in alts if a and a.endswith("Drake")]
        teams.append(team)
        for label, sink in (("Bans", bans), ("Picks", picks)):
            for row in block.find_all("div", class_="row"):
                cols = row.find_all("div", recursive=False)
                if len(cols) >= 2 and cols[0].get_text(" ", strip=True).startswith(label):
                    for anchor in cols[1].find_all("a"):
                        img = anchor.find("img")
                        if img is None:
                            continue
                        cid = re.search(r"champion-stats/(\d+)/", anchor.get("href") or "")
                        sink[side].append({"name": img.get("alt"),
                                           "id": int(cid.group(1)) if cid else None})
                    break
    return teams


def _players(soup, picks):
    """Ten player rows. Table 1 is blue side, table 2 is red side."""
    name2id = {c["name"]: c["id"] for side in picks.values() for c in side if c["name"]}
    tables = [tb for tb in soup.find_all("table")
              if any(th.get_text(strip=True) == "KDA" for th in tb.find_all("th"))]
    players = []
    for index, table in enumerate(tables):
        side = "blue" if index == 0 else "red"
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if not cells:
                continue
            champion = None
            for img in cells[0].find_all("img"):
                if "champion_icon" in (img.get("class") or []) and img.get("alt") not in (None, "Runes"):
                    champion = img.get("alt")
            if not champion:
                continue
            name = cells[0].get_text(" ", strip=True).split()[0]
            kda, cs, kda_index = None, None, None
            for idx, cell in enumerate(cells):
                text = cell.get_text(" ", strip=True)
                if KDA_RE.fullmatch(text):
                    kda, kda_index = [int(x) for x in text.split("/")], idx
                elif kda_index is not None and cs is None and re.fullmatch(r"\d+", text):
                    cs = int(text)
            imgs = row.find_all("img")
            items = [re.sub(r"\D", "", img.get("alt")) for img in imgs
                     if (img.get("alt") or "").startswith("Item_")]
            spells = [re.sub(r"\.png$", "", (img.get("src") or "").rsplit("/", 1)[-1])
                      for img in imgs if img.get("alt") == "Summoner spell"]
            players.append({"team": side, "name": name, "champion": champion,
                            "champion_id": name2id.get(champion), "kda": kda, "cs": cs,
                            "items": [i for i in items if i], "spells": spells})
    return players


def _timeline(soup):
    events = []
    for span in soup.find_all("span", class_=re.compile(r"^(blue|red)_action$")):
        text = span.get_text(" ", strip=True)
        match = re.match(r"^(\d+:\d+)", text)
        if not match:
            continue
        img = span.find("img")
        events.append({"time": match.group(1),
                       "event": img.get("alt") if img is not None else None,
                       "side": "blue" if "blue_action" in (span.get("class") or []) else "red"})
    return events


def parse_game(html, game_id):
    soup = BeautifulSoup(html, "lxml")
    record = {"game_id": game_id}

    match = DURATION_RE.search(html)
    record["duration_seconds"] = (int(match.group(1)) * 60 + int(match.group(2))) if match else None
    patch = PATCH_RE.search(html) or PATCH_FALLBACK_RE.search(html)
    record["patch"] = patch.group(1) if patch else None
    record["gold_diff"] = _gold_diff(html)

    bans = {"blue": [], "red": []}
    picks = {"blue": [], "red": []}
    record["teams"] = _teams(soup, bans, picks)
    record["bans"] = bans
    record["picks"] = picks
    record["players"] = _players(soup, picks)
    record["timeline"] = _timeline(soup)
    return record


def main(argv):
    import paths
    if len(argv) > 1 and argv[1].isdigit():
        gid = int(argv[1])
    else:
        gid = None
        for name in sorted(os.listdir(paths.RAW)):
            if name.startswith("game_") and name.endswith(".html"):
                gid = int(name[5:-5])
                break
        if gid is None:
            raise SystemExit("no game snapshots in " + paths.RAW)
    path = os.path.join(paths.RAW, f"game_{gid}.html")
    with open(path, encoding="utf-8", errors="ignore") as f:
        record = parse_game(f.read(), gid)
    print(json.dumps(record, ensure_ascii=False, indent=1)[:4000])


if __name__ == "__main__":
    main(sys.argv)
