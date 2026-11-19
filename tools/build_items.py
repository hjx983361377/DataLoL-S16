#!/usr/bin/env python3
"""生成 public/assets/data/items_map.json

只收录 data/games.json 里真正出现过的装备 id，供单场详情页显示图标与中文名。
源数据：public/assets/data/items_zh.json（Riot DataDragon zh_CN 全量，870 条）
        public/assets/data/items.json（英文名，用于副标题/tooltip）
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ASSETS = ROOT / "public" / "assets" / "data"
OUT = ASSETS / "items_map.json"


def main() -> None:
    games = json.loads((DATA / "games.json").read_text(encoding="utf-8"))
    zh = json.loads((ASSETS / "items_zh.json").read_text(encoding="utf-8")).get("data", {})
    en = json.loads((ASSETS / "items.json").read_text(encoding="utf-8")).get("data", {})

    used: set[str] = set()
    for game in games:
        for player in game.get("players", []):
            used.update(str(i) for i in player.get("items", []))

    out: dict[str, dict[str, str]] = {}
    missing: list[str] = []
    for item_id in sorted(used, key=lambda x: int(x)):
        z = zh.get(item_id)
        e = en.get(item_id)
        name_zh = (z or {}).get("name") or (e or {}).get("name") or item_id
        name_en = (e or {}).get("name") or ""
        if name_zh == item_id:
            missing.append(item_id)
        out[item_id] = {"name": name_zh, "en": name_en}

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(out)} items, {OUT.stat().st_size} bytes")
    if missing:
        print("missing zh names:", missing)


if __name__ == "__main__":
    main()
