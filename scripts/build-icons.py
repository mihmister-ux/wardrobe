"""Build PWA icons for the wardrobe app ("quiet luxury": cream + black outline hanger).

The hanger is generated numerically (arc sampled as a polyline) so the geometry is
deterministic. Rasterisation is done with Pillow at 4x and downscaled (LANCZOS),
because `sharp` is not installed and headless Chrome cannot start inside the sandbox.

Usage (Pillow comes from the DSH runtime):
    python scripts/build-icons.py
Writes public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png
and public/favicon.svg, then verifies size / centring / ink coverage / hook geometry.
"""

from __future__ import annotations

import math
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "icons")

BG = (241, 236, 225)  # #f1ece1
INK = (20, 20, 20)  # #141414
STROKE = 26.0
SS = 4  # supersampling factor

# --------------------------------------------------------------------------- geometry

APEX = (256.0, 232.0)
STEM_TOP = (256.0, 182.0)
HOOK_C = (222.0, 182.0)  # circle whose rightmost point is exactly STEM_TOP (tangent join)
HOOK_R = 34.0
HOOK_SWEEP = 235.0  # right -> over the top -> left -> tip pointing down/inward
LEFT_END = (86.0, 366.0)
RIGHT_END = (426.0, 366.0)


def arc(cx: float, cy: float, r: float, a0: float, a1: float, n: int = 160):
    """Points on a circle from angle a0 to a1 (degrees, screen coords: y grows down)."""
    return [
        (cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
         cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
        for i in range(n + 1)
    ]


def strokes():
    """Two polylines: stem+hook (open) and the closed triangle body."""
    hook = arc(HOOK_C[0], HOOK_C[1], HOOK_R, 0.0, -HOOK_SWEEP)
    stem_hook = [APEX, STEM_TOP] + hook[1:]
    body = [APEX, LEFT_END, RIGHT_END, APEX]
    return [stem_hook, body]


# --------------------------------------------------------------------------- render


def render(size: int, mark_scale: float = 1.0, background=BG) -> Image.Image:
    """Render the mark into a `size` x `size` RGB image (design space is 512x512)."""
    big = size * SS
    k = big / 512.0 * mark_scale
    img = Image.new("RGB", (big, big), background)
    draw = ImageDraw.Draw(img)
    width = max(1, round(STROKE * k))
    r = width / 2.0

    def t(p):
        # scale about the canvas centre so maskable cropping stays symmetric
        return ((p[0] - 256.0) * k + big / 2.0, (p[1] - 256.0) * k + big / 2.0)

    for poly in strokes():
        pts = [t(p) for p in poly]
        draw.line(pts, fill=INK, width=width, joint="curve")
        # round caps and joints: a filled disc at every vertex
        for x, y in pts:
            draw.ellipse((x - r, y - r, x + r, y + r), fill=INK)

    return img.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, path: str) -> None:
    img.convert("RGB").save(path, "PNG", optimize=True)


def svg_markup(size: int, mark_scale: float = 1.0, background: str | None = "#f1ece1") -> str:
    """Equivalent vector source (used for favicon.svg)."""
    hook = arc(HOOK_C[0], HOOK_C[1], HOOK_R, 0.0, -HOOK_SWEEP)
    stem_hook = [APEX, STEM_TOP] + hook[1:]

    def pl(pts):
        return "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in pts)

    body = (f"M {APEX[0]:.2f} {APEX[1]:.2f} L {LEFT_END[0]:.2f} {LEFT_END[1]:.2f} "
            f"L {RIGHT_END[0]:.2f} {RIGHT_END[1]:.2f} Z")
    tr = (""
          if mark_scale == 1.0
          else f' transform="translate(256 256) scale({mark_scale}) translate(-256 -256)"')
    bg = f'<rect width="512" height="512" fill="{background}"/>' if background else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 512 512">{bg}<g{tr} fill="none" stroke="#141414" '
            f'stroke-width="{STROKE:.0f}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="{pl(stem_hook)}"/><path d="{body}"/></g></svg>')


# --------------------------------------------------------------------------- verify


def ink_metrics(img: Image.Image) -> dict:
    w, h = img.size
    px = img.load()
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if (r + g + b) / 3 < 110:
                xs.append(x)
                ys.append(y)
    return {
        "size": (w, h),
        "corner": px[0, 0],
        "ink_px": len(xs),
        "ink_pct": round(100.0 * len(xs) / (w * h), 2),
        "bbox": (min(xs), min(ys), max(xs), max(ys)) if xs else None,
        "bbox_center": ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2) if xs else None,
    }


def region_dark(img: Image.Image, x0, y0, x1, y1) -> int:
    """Dark-ink pixel count in a design-space (512) rectangle."""
    s = img.size[0] / 512.0
    n = 0
    for y in range(int(y0 * s), int(y1 * s)):
        for x in range(int(x0 * s), int(x1 * s)):
            r, g, b = img.getpixel((x, y))
            if (r + g + b) / 3 < 110:
                n += 1
    return n


# --------------------------------------------------------------------------- main


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)

    targets = [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("maskable-512.png", 512, 0.78),
        ("apple-touch-icon.png", 180, 1.0),
    ]

    report = []
    for name, size, scale in targets:
        img = render(size, scale)
        path = os.path.join(OUT_DIR, name)
        save(img, path)
        m = ink_metrics(img)
        m["file"] = name
        m["over_top"] = region_dark(img, 180, 130, 256, 178)
        m["left_of_stem"] = region_dark(img, 190, 150, 240, 215)
        # strictly right of the stem and above the right shoulder: must stay empty
        m["wrong_side"] = region_dark(img, 278, 190, 330, 228)
        report.append(m)
        print(f"{name:24s} {m['size']} ink={m['ink_pct']}% bbox={m['bbox']} "
              f"center={tuple(round(v, 1) for v in m['bbox_center'])} "
              f"hook(over={m['over_top']}, left={m['left_of_stem']}, wrong={m['wrong_side']})")

    fav = os.path.join(ROOT, "public", "favicon.svg")
    with open(fav, "w", encoding="utf-8") as fh:
        fh.write(svg_markup(48, 1.0, background=None) + "\n")
    print("favicon.svg (48x48, transparent) rebuilt from the same geometry")

    problems = []
    for m in report:
        w, h = m["size"]
        cx, cy = m["bbox_center"]
        if m["corner"] != BG:
            problems.append((m["file"], "corner not cream", m["corner"]))
        if not (4.0 <= m["ink_pct"] <= 26.0):
            problems.append((m["file"], "ink coverage", m["ink_pct"]))
        if abs(cx - w / 2) > 0.04 * w or abs(cy - h / 2) > 0.03 * h:
            problems.append((m["file"], "off-centre", (cx, cy)))
        if m["over_top"] == 0 or m["left_of_stem"] == 0:
            problems.append((m["file"], "hook missing", m))
        if m["wrong_side"] > 0:
            problems.append((m["file"], "hook curled the wrong way", m["wrong_side"]))

    print("PROBLEMS:", problems if problems else "none")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
