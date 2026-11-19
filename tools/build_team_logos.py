# -*- coding: utf-8 -*-
"""纯白队标改色为墨色（#1f1b16），否则在白纸底上不可见。
   只改「几乎纯白」的像素，彩色像素（如 MVK 的蓝色）保持原样。
   生成结果直接覆盖 public/assets/teams/<slug>.png。
"""
import json
from PIL import Image

INK = (31, 27, 22)
LIGHT = {"Dplus KIA", "Team Liquid", "G2 Esports", "Team Secret Whales", "MVK Esports"}

d = json.load(open("public/assets/data/team_map.json", encoding="utf-8"))
for name in LIGHT:
    p = "public" + d[name]["logo"]
    im = Image.open(p).convert("RGBA")
    px = im.load()
    w, h = im.size
    changed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if min(r, g, b) > 225:
                px[x, y] = (INK[0], INK[1], INK[2], a)
                changed += 1
    im.save(p)
    print("recolored", p, changed, "px")
