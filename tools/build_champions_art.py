"""生成夺冠纪念页的 hero 背景图：金色奖杯 + 舞台光束 + 金色彩屑。

真实世界没有 2026 赛季的捧杯照片，这里不伪造照片，而是画一张海报：
舞台中央的冠军奖杯被顶光打亮，纸屑在光柱里翻落，观众在下方虚化成暗带。

用法：python tools/build_champions_art.py
输出：public/assets/brand/champions-2026.jpg
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 2880, 1620
# 奖杯的水平位置（相对于画面宽度）；左侧留白给页面文字
CUP_X = 0.66
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "brand" / "champions-2026.jpg"

random.seed(20261114)
np.random.seed(20261114)


def add(a: Image.Image, b: Image.Image) -> Image.Image:
    return ImageChops.add(a.convert("RGB"), b.convert("RGB"))


def radial(size, cx, cy, radius, color, strength) -> Image.Image:
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / (radius ** 2)
    f = np.exp(-d2) * strength
    arr = f[:, :, None] * np.array(color, np.float32)[None, None, :]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def base_plate(size) -> Image.Image:
    w, h = size
    y = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    top = np.array([10, 11, 16], np.float32)
    mid = np.array([34, 25, 18], np.float32)
    low = np.array([7, 8, 12], np.float32)
    grad = top + (mid - top) * (np.clip(y / 0.58, 0, 1) ** 1.4)
    grad = grad + (low - mid) * np.clip((y - 0.58) / 0.42, 0, 1)
    plate = np.repeat(grad, w, axis=1)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    def glow(px, py, radius, color, strength):
        d2 = ((xx - px) ** 2 + (yy - py) ** 2) / (radius ** 2)
        return (np.exp(-d2) * strength)[:, :, None] * np.array(color, np.float32)[None, None, :]

    plate += glow(w * CUP_X, h * 0.34, w * 0.30, (255, 186, 112), 0.34)
    plate += glow(w * CUP_X, h * 0.20, w * 0.12, (255, 226, 182), 0.34)
    plate += glow(w * 0.08, -h * 0.06, w * 0.28, (70, 88, 130), 0.18)
    plate += glow(w * 0.97, -h * 0.04, w * 0.26, (92, 78, 126), 0.12)
    plate += glow(w * CUP_X, h * 1.05, w * 0.36, (150, 104, 58), 0.16)
    return Image.fromarray(np.clip(plate, 0, 255).astype(np.uint8), "RGB")


def beams(size) -> Image.Image:
    w, h = size
    layer = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(layer)
    origin = (w * CUP_X, -h * 0.22)
    for i in range(16):
        ang = math.radians(-40 + i * 5.0 + random.uniform(-1.0, 1.0))
        length = h * 2.6
        spread = math.radians(random.uniform(0.7, 2.2))
        p2 = (origin[0] + math.sin(ang - spread) * length, origin[1] + math.cos(ang - spread) * length)
        p3 = (origin[0] + math.sin(ang + spread) * length, origin[1] + math.cos(ang + spread) * length)
        d.polygon([origin, p2, p3], fill=random.randint(20, 44))
    layer = layer.filter(ImageFilter.GaussianBlur(w * 0.009))
    arr = np.asarray(layer, np.float32) / 255.0
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    arr = arr * np.clip(1.18 - yy * 1.0, 0.05, 1.0)
    rgb = arr[:, :, None] * np.array((255, 212, 160), np.float32)[None, None, :]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def crowd(size) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for base, ridge, blur in ((h * 0.895, 0.018, 3.4), (h * 0.945, 0.030, 1.8)):
        pts = [(0, h + 20)]
        steps = 150
        for i in range(steps + 1):
            x = w * i / steps
            y = base - abs(math.sin(i * 0.85 + 0.6)) * h * ridge - random.uniform(0, h * 0.005)
            pts.append((x, y))
        pts.append((w, h + 20))
        d.polygon(pts, fill=(4, 5, 8, 255))
        layer = layer.filter(ImageFilter.GaussianBlur(blur))

    flashes = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(flashes)
    for _ in range(200):
        x = random.uniform(0, w)
        y = random.uniform(h * 0.86, h * 1.0)
        r = random.uniform(h * 0.0022, h * 0.0085)
        fd.ellipse([x - r, y - r, x + r, y + r], fill=(255, 238, 204, random.randint(45, 150)))
    flashes = flashes.filter(ImageFilter.GaussianBlur(h * 0.0032))
    return Image.alpha_composite(layer, flashes)


def confetti_layer(size, count, near: bool) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    palette = [(240, 198, 120), (248, 238, 216), (198, 148, 66), (232, 206, 152), (255, 244, 220)]
    for _ in range(count):
        x = random.uniform(-0.04 * w, 1.04 * w)
        y = random.uniform(-0.08 * h, 1.02 * h)
        if near:
            length = h * random.uniform(0.006, 0.015)
            width = h * random.uniform(0.0012, 0.0024)
            alpha = random.randint(110, 200)
        else:
            length = h * random.uniform(0.0025, 0.008)
            width = h * random.uniform(0.0007, 0.0015)
            alpha = random.randint(40, 105)
        ang = math.radians(random.uniform(-34, 34))
        dx, dy = -math.sin(ang) * length, math.cos(ang) * length
        nx, ny = math.cos(ang) * width, math.sin(ang) * width
        color = palette[random.randrange(len(palette))] + (alpha,)
        d.polygon(
            [(x - nx, y - ny), (x + nx, y + ny), (x + dx + nx, y + dy + ny), (x + dx - nx, y + dy - ny)],
            fill=color,
        )
    return layer.filter(ImageFilter.GaussianBlur(2.0 if not near else 0.55))


def cup_mask(size, cx: float, base_y: float, cup_h: float) -> Image.Image:
    """冠军奖杯的剪影：底座、杯身、杯口、双耳。"""
    w, h = size
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)

    base_h = cup_h * 0.055
    base_w = cup_h * 0.150
    plinth_h = cup_h * 0.035
    plinth_w = cup_h * 0.200
    stem_h = cup_h * 0.150
    stem_w = cup_h * 0.038
    knop_r = cup_h * 0.045
    bowl_bot = base_y - base_h - plinth_h - stem_h
    bowl_h = cup_h * 0.430
    bowl_top = bowl_bot - bowl_h
    rim_w = cup_h * 0.245
    bowl_bot_w = cup_h * 0.105

    # 底座 + 台阶
    d.rounded_rectangle(
        [cx - base_w / 2, base_y - base_h, cx + base_w / 2, base_y],
        radius=base_h * 0.45,
        fill=255,
    )
    d.rounded_rectangle(
        [cx - plinth_w / 2, base_y - base_h - plinth_h, cx + plinth_w / 2, base_y - base_h + 2],
        radius=plinth_h * 0.4,
        fill=255,
    )

    # 杯柄 + 柄上的球节
    d.rectangle([cx - stem_w / 2, bowl_bot, cx + stem_w / 2, base_y - base_h - plinth_h + 4], fill=255)
    d.ellipse(
        [cx - knop_r, bowl_bot + stem_h * 0.42 - knop_r, cx + knop_r, bowl_bot + stem_h * 0.42 + knop_r],
        fill=255,
    )

    # 杯身：抛物线的杯壁
    pts_left, pts_right = [], []
    steps = 64
    for i in range(steps + 1):
        t = i / steps
        y = bowl_top + bowl_h * t
        half = bowl_bot_w + (rim_w - bowl_bot_w) * ((1.0 - t) ** 0.78)
        pts_left.append((cx - half, y))
        pts_right.append((cx + half, y))
    d.polygon(pts_left + pts_right[::-1], fill=255)
    d.ellipse(
        [cx - rim_w, bowl_top - cup_h * 0.042, cx + rim_w, bowl_top + cup_h * 0.042],
        fill=255,
    )

    # 双耳
    ear_w = cup_h * 0.058
    ear_h = cup_h * 0.135
    ear_cy = bowl_top + cup_h * 0.115
    # 杯耳贴在杯壁外侧：取该高度处的杯壁半宽
    t_ear = np.clip((ear_cy - bowl_top) / bowl_h, 0, 1)
    wall_half = bowl_bot_w + (rim_w - bowl_bot_w) * ((1.0 - t_ear) ** 0.78)
    for sign in (-1, 1):
        box = [
            cx + sign * wall_half - ear_w,
            ear_cy - ear_h / 2,
            cx + sign * wall_half + ear_w,
            ear_cy + ear_h / 2,
        ]
        start, end = (300, 120) if sign > 0 else (60, 240)
        d.arc(box, start=start, end=end, fill=255, width=int(cup_h * 0.018))

    return m.filter(ImageFilter.GaussianBlur(cup_h * 0.0015))


def render_cup(size, cx: float, base_y: float, cup_h: float) -> tuple[Image.Image, Image.Image]:
    w, h = size
    mask = cup_mask(size, cx, base_y, cup_h)
    arr = np.asarray(mask, np.float32) / 255.0
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    # 金属渐变：左侧受光、右侧进暗部，纵向从亮金到深金
    side = np.clip((xx - (cx - cup_h * 0.16)) / (cup_h * 0.32), 0, 1)
    vertical = np.clip((yy - (base_y - cup_h)) / cup_h, 0, 1)
    spec = np.exp(-(((side - 0.30) / 0.14) ** 2)) * 0.85
    shade = (1.0 - side) ** 1.25 * 0.95 + spec * 0.5
    shade *= 0.72 + 0.28 * (1.0 - vertical)

    hi = np.array((255, 233, 178), np.float32)
    mid = np.array((214, 162, 82), np.float32)
    lo = np.array((96, 62, 24), np.float32)
    base = lo[None, None, :] + (mid - lo)[None, None, :] * np.clip(shade * 1.25, 0, 1)[:, :, None]
    base = base + (hi - base) * np.clip((shade - 0.72) * 2.4, 0, 1)[:, :, None]

    # 杯口内壁：椭圆内部压暗，读成「杯」而不是「圆锥」
    base_h = cup_h * 0.055
    plinth_h = cup_h * 0.035
    stem_h = cup_h * 0.150
    bowl_bot = base_y - base_h - plinth_h - stem_h
    bowl_h = cup_h * 0.430
    bowl_top = bowl_bot - bowl_h
    rim_w = cup_h * 0.245
    inner = Image.new("L", size, 0)
    idr = ImageDraw.Draw(inner)
    idr.ellipse(
        [cx - rim_w * 0.94, bowl_top - cup_h * 0.036, cx + rim_w * 0.94, bowl_top + cup_h * 0.036],
        fill=255,
    )
    inner_arr = np.asarray(inner.filter(ImageFilter.GaussianBlur(cup_h * 0.004)), np.float32) / 255.0
    base *= (1.0 - 0.72 * inner_arr)[:, :, None]

    # 竖向高光带 + 右缘反光
    band = np.exp(-(((side - 0.26) / 0.10) ** 2)) * 0.55
    base += (hi[None, None, :] * band[:, :, None] * arr[:, :, None])

    rgb = (np.clip(base, 0, 255) * arr[:, :, None]).astype(np.uint8)
    return Image.fromarray(rgb, "RGB"), mask


def floor_reflection(size, cx: float, base_y: float, cup_h: float) -> Image.Image:
    w, h = size
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(26):
        t = i / 25
        ry = base_y + cup_h * 0.010 + t * cup_h * 0.22
        half = cup_h * (0.20 - t * 0.16)
        a = int(62 * (1 - t) ** 1.8)
        d.ellipse([cx - half, ry, cx + half, ry + cup_h * 0.012], fill=(a, int(a * 0.72), int(a * 0.42)))
    return layer.filter(ImageFilter.GaussianBlur(cup_h * 0.010))


def finish(img: Image.Image) -> Image.Image:
    w, h = img.size
    arr = np.asarray(img, np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx - w / 2) / (w / 2)
    ny = (yy - h / 2) / (h / 2)
    v = np.clip(1.0 - 0.44 * (nx ** 2 * 0.9 + ny ** 2 * 0.85), 0.32, 1.0)
    arr *= v[:, :, None]
    arr += np.random.normal(0, 3.2, (h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def main() -> None:
    size = (W, H)
    img = base_plate(size)
    img = add(img, beams(size))
    img = add(img, radial(size, W * CUP_X, H * 0.30, W * 0.17, (255, 198, 136), 0.40))
    img = Image.alpha_composite(img.convert("RGBA"), crowd(size)).convert("RGB")

    cx = W * CUP_X
    base_y = H * 0.87
    cup_h = H * 0.58

    img = add(img, floor_reflection(size, cx, base_y, cup_h))
    cup, mask = render_cup(size, cx, base_y, cup_h)

    # 奖杯外发光
    glow_mask = mask.filter(ImageFilter.GaussianBlur(cup_h * 0.030))
    glow = Image.new("RGB", size, (0, 0, 0))
    glow = Image.composite(Image.new("RGB", size, (255, 204, 140)), glow, glow_mask)
    img = add(img, glow.point(lambda p: int(p * 0.55)))

    img = Image.composite(cup, img, mask)

    # 顶光在杯口的高光（别炸白）
    img = add(img, radial(size, cx - cup_h * 0.075, base_y - cup_h * 0.74, cup_h * 0.055, (255, 240, 206), 0.30))

    far = confetti_layer(size, 1500, near=False)
    near = confetti_layer(size, 380, near=True)
    img = Image.alpha_composite(img.convert("RGBA"), far)
    img = Image.alpha_composite(img, near).convert("RGB")

    img = finish(img)
    img = img.resize((W // 2, H // 2), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.8, percent=55, threshold=2))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
    print("wrote", OUT, OUT.stat().st_size, "bytes", img.size)


if __name__ == "__main__":
    main()
