# -*- coding: utf-8 -*-
"""Build the championship hero images from a real press photo.

源图：懂球帝图集 http://pc.dongqiudi.com/articles/6655810.html
      https://bdimg7.qunliao.info/fastdfs8/M00/F9/CB/rBXRDGr5E8-AV42SABjYzou7IpY109.jpg
      （4096x2732，页面缩略图地址需去掉 720x- 前缀）
先把原图存到 tools/_web/dqd/2.jpg（该目录不进版本库），再运行：
    python tools/build_champions_hero.py
输出：
    public/assets/brand/blg-champions-hero.jpg         2400x1601（桌面 hero）
    public/assets/brand/blg-champions-hero-mobile.jpg  1200x800（窄屏 3:2 横带）
"""
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tools/_web/dqd/2.jpg"
OUT = ROOT / "public/assets/brand"


def save(im, name, quality):
    im.save(OUT / name, "JPEG", quality=quality, optimize=True, progressive=True)
    print(name, im.size, (OUT / name).stat().st_size)


if not SRC.exists():
    raise SystemExit("missing source photo: " + str(SRC))

src = Image.open(SRC).convert("RGB")
W, H = src.size
print("src", src.size)
OUT.mkdir(parents=True, exist_ok=True)

# 桌面：保留完整 3:2 画幅（奖杯高举 + 六名选手）
desk = src.resize((2400, round(2400 * H / W)), Image.LANCZOS)
desk = ImageEnhance.Color(desk).enhance(1.04)
desk = ImageEnhance.Contrast(desk).enhance(1.03)
save(desk, "blg-champions-hero.jpg", 82)

# 窄屏：同样整幅，只缩到 1200 宽控制体积
mob = src.resize((1200, round(1200 * H / W)), Image.LANCZOS)
mob = ImageEnhance.Color(mob).enhance(1.05)
mob = ImageEnhance.Contrast(mob).enhance(1.04)
save(mob, "blg-champions-hero-mobile.jpg", 80)
