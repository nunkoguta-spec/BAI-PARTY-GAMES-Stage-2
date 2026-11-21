#!/usr/bin/env python3
"""
BAI PARTY GAMES - Stage 5 (KÖLN) panorama.

There was no source panorama for Köln, so this draws one procedurally in the
same pixel scale as the other cities (2400 x 224, parapet top at row 189):
Kölner Dom, Gross St. Martin, Altstadt gabled houses, Hohenzollernbrücke,
Rhine and cherry-blossom trees (Cologne_Spring pack theme).

Output: public/assets/backgrounds/cities/seasons/koeln-spring.png
Usage:  python tools/make-koeln-backdrop.py        (needs pillow)
Deterministic (fixed seed). Replace with hand-made art any time; the game only
needs a 2400x224 PNG at that path.
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "backgrounds" / "cities" / "seasons" / "koeln-spring.png"
W, H = 2400, 224
LEDGE = 189
rnd = random.Random(5)

OUTLINE = (38, 36, 60)
img = Image.new("RGB", (W, H))
d = ImageDraw.Draw(img)

# ---- sky -------------------------------------------------------------------
top, bot = (104, 186, 249), (196, 228, 250)
for y in range(H):
    t = min(1.0, y / 150)
    d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))


def cloud(cx, cy, s=1.0):
    for dx, dy, r in [(-22, 2, 9), (-10, -4, 12), (4, -7, 14), (18, -2, 11), (30, 3, 8), (0, 4, 12)]:
        r = int(r * s)
        d.ellipse([cx + int(dx * s) - r, cy + int(dy * s) - r, cx + int(dx * s) + r, cy + int(dy * s) + r], fill=(255, 255, 255))
    d.rectangle([cx - int(34 * s), cy + int(8 * s), cx + int(40 * s), cy + int(14 * s)], fill=(236, 246, 255))


for cx, cy, s in [(150, 28, 1.1), (520, 46, .8), (880, 24, 1.0), (1190, 40, .7), (1850, 30, 1.1), (2150, 52, .8), (2330, 22, .7)]:
    cloud(cx, cy, s)


# ---- helpers ---------------------------------------------------------------
def box(x0, y0, x1, y1, fill, outline=OUTLINE):
    d.rectangle([x0 - 1, y0 - 1, x1 + 1, y1 + 1], fill=outline)
    d.rectangle([x0, y0, x1, y1], fill=fill)


def poly(pts, fill, outline=OUTLINE):
    d.polygon(pts, fill=fill, outline=outline)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


def window(x, y, w=5, h=8, lit=False, arch=False):
    col = (255, 226, 130) if lit else (120, 170, 214)
    d.rectangle([x - 1, y - 1, x + w, y + h], fill=(70, 60, 80))
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=col)
    d.line([(x + w // 2, y), (x + w // 2, y + h - 1)], fill=(70, 60, 80))
    if arch:
        d.point([(x, y), (x + w - 1, y)], fill=(70, 60, 80))


# ---- Rhine + far bank ------------------------------------------------------
WATER_TOP = 160
d.rectangle([0, WATER_TOP, W, LEDGE], fill=(86, 150, 206))
for y in range(WATER_TOP, LEDGE, 3):
    for x in range(rnd.randint(0, 20), W, 34):
        d.line([(x, y), (x + rnd.randint(6, 12), y)], fill=(150, 200, 236))

# ---- far skyline haze (distant small blocks) --------------------------------
x = 0
while x < W:
    w, h = rnd.randint(18, 40), rnd.randint(18, 40)
    d.rectangle([x, WATER_TOP - h, x + w, WATER_TOP], fill=(150, 178, 214))
    x += w + rnd.randint(0, 6)

# ---- Hohenzollernbrücke (steel arch bridge across the right side) ----------
BR = (88, 108, 150)
for i in range(4):
    cx = 1960 + i * 110
    pts = [(cx - 52, WATER_TOP + 6)]
    for k in range(-52, 53, 4):
        yy = WATER_TOP + 6 - int(34 * (1 - (k / 52) ** 2))
        pts.append((cx + k, yy))
    pts.append((cx + 52, WATER_TOP + 6))
    d.line(pts, fill=BR, width=3)
    for k in range(-48, 49, 8):
        yy = WATER_TOP + 6 - int(34 * (1 - (k / 52) ** 2))
        d.line([(cx + k, yy), (cx + k, WATER_TOP + 6)], fill=BR, width=1)
    d.rectangle([cx - 4, WATER_TOP + 6, cx + 4, LEDGE - 4], fill=(120, 112, 124))
d.rectangle([1900, WATER_TOP + 4, 2400, WATER_TOP + 8], fill=(70, 80, 112))
# small train on the bridge
d.rectangle([2060, WATER_TOP - 6, 2150, WATER_TOP + 3], fill=(214, 60, 60))
for xx in range(2064, 2148, 12):
    d.rectangle([xx, WATER_TOP - 4, xx + 6, WATER_TOP - 1], fill=(255, 240, 200))

# ---- Kölner Dom ------------------------------------------------------------
STONE = (118, 112, 126)
STONE_D = (84, 78, 96)
STONE_L = (150, 144, 156)
DX = 1180          # centre
base = LEDGE - 4


def spire(cx, top_y, half_w, body_top):
    # tower body
    box(cx - half_w, body_top, cx + half_w, base, STONE)
    d.rectangle([cx - half_w, body_top, cx - half_w + 3, base], fill=STONE_L)
    d.rectangle([cx + half_w - 4, body_top, cx + half_w, base], fill=STONE_D)
    # belfry bands + pointed windows
    for yy in range(body_top + 10, base - 16, 22):
        d.rectangle([cx - half_w, yy, cx + half_w, yy + 1], fill=STONE_D)
        for ox in (-half_w // 2, 0, half_w // 2):
            d.rectangle([cx + ox - 2, yy + 5, cx + ox + 2, yy + 15], fill=(60, 54, 76))
            d.point([(cx + ox, yy + 4)], fill=(60, 54, 76))
    # corner pinnacles
    for sx in (-half_w, half_w):
        d.polygon([(cx + sx - 3, body_top), (cx + sx + 3, body_top), (cx + sx, body_top - 22)], fill=STONE, outline=OUTLINE)
    # open-work spire
    pts = [(cx - half_w + 2, body_top), (cx, top_y), (cx + half_w - 2, body_top)]
    d.polygon(pts, fill=STONE, outline=OUTLINE)
    d.line([(cx, top_y + 4), (cx, body_top)], fill=STONE_D)
    for k in range(1, 7):
        yy = top_y + k * (body_top - top_y) // 7
        wdt = int((yy - top_y) * (half_w - 2) / (body_top - top_y))
        d.line([(cx - wdt, yy), (cx + wdt, yy)], fill=STONE_D)
        d.point([(cx - wdt - 1, yy), (cx + wdt + 1, yy)], fill=STONE_L)
    # cross
    d.line([(cx, top_y - 7), (cx, top_y)], fill=(230, 200, 90))
    d.line([(cx - 2, top_y - 4), (cx + 2, top_y - 4)], fill=(230, 200, 90))


# nave + choir roof
box(DX - 150, 112, DX + 150, base, STONE)
d.polygon([(DX - 150, 112), (DX, 88), (DX + 150, 112)], fill=(96, 112, 128), outline=OUTLINE)
d.rectangle([DX - 150, 112, DX + 150, 114], fill=STONE_D)
# flying buttresses
for ox in range(-140, 141, 28):
    d.polygon([(DX + ox, 114), (DX + ox + 6, 114), (DX + ox + 6, base), (DX + ox - 4, base)], fill=STONE_D)
    d.line([(DX + ox, 120), (DX + ox + 14, 140)], fill=STONE_L)
for ox in range(-132, 133, 24):
    d.rectangle([DX + ox - 3, 122, DX + ox + 3, 150], fill=(70, 64, 92))
    d.point([(DX + ox, 121)], fill=(70, 64, 92))
    d.rectangle([DX + ox - 2, 124, DX + ox + 2, 146], fill=(120, 170, 214))
# fleche (slim spire over the crossing)
d.polygon([(DX - 6, 90), (DX, 40), (DX + 6, 90)], fill=STONE, outline=OUTLINE)
# the two west towers (the famous twin spires)
spire(DX - 62, 6, 28, 82)
spire(DX + 62, 6, 28, 82)
# central portal
box(DX - 26, 140, DX + 26, base, STONE_D)
d.polygon([(DX - 22, base), (DX - 22, 154), (DX, 138), (DX + 22, 154), (DX + 22, base)], fill=(52, 46, 70))

# ---- Gross St. Martin (Romanesque square tower, 4 turrets) ------------------
GX = 760
box(GX - 20, 74, GX + 20, base, (176, 120, 96))
for ox in (-20, 20):
    box(GX + ox - 5, 56, GX + ox + 5, 78, (176, 120, 96))
    d.polygon([(GX + ox - 6, 56), (GX + ox, 36), (GX + ox + 6, 56)], fill=(78, 100, 120), outline=OUTLINE)
d.polygon([(GX - 16, 74), (GX, 50), (GX + 16, 74)], fill=(78, 100, 120), outline=OUTLINE)
for yy in (86, 112, 138):
    window(GX - 3, yy, 6, 12, arch=True)
box(GX - 44, 128, GX + 44, base, (196, 140, 110))
d.polygon([(GX - 46, 128), (GX, 106), (GX + 46, 128)], fill=(90, 112, 130), outline=OUTLINE)

# ---- Altstadt gabled houses --------------------------------------------------
PAL = [(214, 92, 78), (244, 196, 84), (236, 138, 74), (88, 172, 168), (232, 140, 160),
       (246, 232, 196), (150, 104, 168), (112, 176, 96)]
ROOF = [(84, 70, 92), (96, 74, 70), (70, 84, 104)]


def house(x, w, h, col, gable="step"):
    y0 = base - h
    box(x, y0, x + w, base, col)
    d.rectangle([x, y0, x + 2, base], fill=shade(col, 1.12))
    d.rectangle([x + w - 3, y0, x + w, base], fill=shade(col, .84))
    roof = rnd.choice(ROOF)
    if gable == "step":
        steps = 4
        for s in range(steps):
            sw = w - s * (w // (steps + 1)) * 2 // 2
            inset = s * (w // (2 * steps + 1))
            d.rectangle([x + inset - 1, y0 - (s + 1) * 6 - 1, x + w - inset + 1, y0 - s * 6], fill=OUTLINE)
            d.rectangle([x + inset, y0 - (s + 1) * 6, x + w - inset, y0 - s * 6 - 1], fill=col)
        d.rectangle([x + w // 2 - 1, y0 - steps * 6 - 5, x + w // 2 + 1, y0 - steps * 6 - 1], fill=roof)
        top = y0 - steps * 6
    else:
        d.polygon([(x - 2, y0), (x + w // 2, y0 - w // 2 - 2), (x + w + 2, y0)], fill=roof, outline=OUTLINE)
        top = y0 - w // 2
    # windows
    cols = max(1, (w - 4) // 9)
    rows = max(2, (h - 14) // 17)
    gap = (w - cols * 5) / (cols + 1)
    for r in range(rows):
        for c in range(cols):
            wx = int(x + gap * (c + 1) + 5 * c)
            window(wx, y0 + 6 + r * 17, 5, 9, lit=rnd.random() < .12)
    # door
    d.rectangle([x + w // 2 - 3, base - 12, x + w // 2 + 3, base], fill=(84, 56, 48))
    return top


def row_of_houses(x0, x1):
    x = x0
    while x < x1:
        w = rnd.choice([30, 34, 38, 42])
        h = rnd.choice([54, 64, 74, 84, 94])
        house(x, w, h, rnd.choice(PAL), rnd.choice(["step", "step", "peak"]))
        x += w + rnd.choice([0, 1, 2])


row_of_houses(14, 706)
row_of_houses(812, 1020)
row_of_houses(1352, 1780)
# right bank buildings in front of the bridge
row_of_houses(1790, 1950)
row_of_houses(2260, 2398)

# ---- blossom trees -----------------------------------------------------------
def tree(cx, s=1.0):
    th = int(30 * s)
    d.rectangle([cx - 2, base - th, cx + 2, base], fill=(92, 62, 50))
    for dx, dy, r in [(-12, -th, 11), (0, -th - 10, 14), (12, -th, 11), (-4, -th + 6, 10), (8, -th + 6, 9)]:
        r = int(r * s)
        d.ellipse([cx + int(dx * s) - r, base + dy - r, cx + int(dx * s) + r, base + dy + r], fill=(246, 168, 200), outline=(206, 112, 160))
    for _ in range(14):
        px = cx + rnd.randint(-int(18 * s), int(18 * s))
        py = base - th + rnd.randint(-int(22 * s), int(8 * s))
        d.point([(px, py)], fill=(255, 224, 238))
    for _ in range(5):
        px = cx + rnd.randint(-int(14 * s), int(14 * s))
        py = base - th + rnd.randint(-int(16 * s), int(6 * s))
        d.point([(px, py)], fill=(118, 190, 98))


for cx in range(60, W, rnd.randint(150, 230)):
    tree(cx, rnd.choice([.9, 1.0, 1.1]))

# ---- railing + parapet + lamps (matches the other panoramas' ledge) ---------
d.rectangle([0, 172, W, 189], fill=(60, 56, 90))
for x in range(0, W, 8):
    d.line([(x, 175), (x, LEDGE - 1)], fill=(104, 100, 132))
d.line([(0, 173), (W, 173)], fill=(150, 146, 176))
d.line([(0, 181), (W, 181)], fill=(104, 100, 132))
d.rectangle([0, LEDGE, W, H], fill=(190, 160, 150))
d.rectangle([0, LEDGE, W, LEDGE + 2], fill=(226, 200, 188))
for y in range(LEDGE + 3, H, 11):
    d.line([(0, y), (W, y)], fill=(104, 92, 126))
    off = 0 if ((y - LEDGE) // 11) % 2 == 0 else 20
    for x in range(off, W, 40):
        d.line([(x, y), (x, y + 10)], fill=(104, 92, 126))
d.rectangle([0, 214, W, H], fill=(104, 92, 126))


def lamp(cx):
    d.rectangle([cx - 1, 140, cx + 1, LEDGE], fill=(40, 40, 60))
    d.rectangle([cx - 5, 132, cx + 5, 142], fill=(40, 40, 60))
    d.rectangle([cx - 3, 134, cx + 3, 140], fill=(255, 228, 140))


for cx in range(180, W, 420):
    lamp(cx)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, optimize=True)
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
