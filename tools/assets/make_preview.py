import json, math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(r"C:\Users\98336\Desktop\DSH工资区".replace("工资", "工作")) / "New Project"
A = ROOT / "public" / "assets"
m = json.loads((A / "data" / "champion_map.json").read_text(encoding="utf-8"))
items = sorted(m.values(), key=lambda v: v["name"])
COLS, CELL, LABEL = 12, 96, 18
rows = math.ceil(len(items) / COLS)
sheet = Image.new("RGB", (COLS * CELL, rows * (CELL + LABEL)), (16, 18, 24))
d = ImageDraw.Draw(sheet)
for i, v in enumerate(items):
    x, y = (i % COLS) * CELL, (i // COLS) * (CELL + LABEL)
    try:
        ic = Image.open(A / "champions" / f"{v['key']}.png").convert("RGBA").resize((CELL - 6, CELL - 6))
        sheet.paste(ic, (x + 3, y + 3), ic)
    except Exception as e:
        d.text((x + 4, y + 30), "?", fill=(255, 80, 80))
    d.text((x + 4, y + CELL), v["name"][:13], fill=(200, 205, 215))
out = A / "_preview"; out.mkdir(exist_ok=True)
sheet.save(out / "champions_sheet.png")

teams = json.loads((A / "data" / "team_map.json").read_text(encoding="utf-8"))
tcols, tcell = 10, 90
trows = math.ceil(len(teams) / tcols)
tsheet = Image.new("RGB", (tcols * tcell, trows * (tcell + LABEL)), (16, 18, 24))
td = ImageDraw.Draw(tsheet)
for i, (name, v) in enumerate(sorted(teams.items())):
    x, y = (i % tcols) * tcell, (i // tcols) * (tcell + LABEL)
    p = ROOT / "public" / v["logo"].lstrip("/")
    try:
        ic = Image.open(p).convert("RGBA").resize((tcell - 8, tcell - 8))
        tsheet.paste(ic, (x + 4, y + 4), ic)
    except Exception:
        td.text((x + 4, y + 34), "?", fill=(255, 80, 80))
    td.text((x + 3, y + tcell), name[:14], fill=(200, 205, 215))
tsheet.save(out / "teams_sheet.png")
print("ok", sheet.size, tsheet.size, len(items), len(teams))
