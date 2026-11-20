"""首页夺冠横幅（宽幅横条）素材：从 3:2 的 hero 图里裁一条横向视线带。

源图 public/assets/brand/blg-champions-hero.jpg（2400x1601，决赛现场六人举杯）。
裁切窗口取照片上部 2%~57% 的高度，覆盖奖杯顶部到选手面部，避免 CSS 再二次裁切。
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/brand/blg-champions-hero.jpg"
OUT = ROOT / "public/assets/brand/blg-champions-band.jpg"


def band(src: Path, dst: Path, out_w: int, out_h: int, quality: int) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    box_h = round(w * out_h / out_w)
    top = round(h * 0.02)
    if top + box_h > h:
        top = h - box_h
    img.crop((0, top, w, top + box_h)).resize((out_w, out_h), Image.LANCZOS).save(
        dst, "JPEG", quality=quality, optimize=True, progressive=True
    )
    print(dst.name, f"{out_w}x{out_h}", dst.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    band(SRC, OUT, 2400, 880, 82)
