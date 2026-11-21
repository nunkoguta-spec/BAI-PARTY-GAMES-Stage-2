#!/usr/bin/env python3
"""Draws the three trap sprite sheets used by every stage (pixel art, no external assets).
   public/assets/traps/spikes.png      32x16, 1 frame            static floor spikes
   public/assets/traps/pop-spikes.png  32x20 x 4 frames          retracted / warning / rising / extended
   public/assets/traps/barrel.png      26x26 x 8 frames          rolling barrel (one full turn)
   public/assets/traps/sign.png        12x16                     warning sign (placed before the first trap)
Run: python tools/make-trap-sprites.py   (needs pillow)"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "traps"
OUT.mkdir(parents=True, exist_ok=True)
OL = (28, 22, 36, 255)            # outline
M1, M2, M3 = (214, 222, 236, 255), (150, 162, 184, 255), (92, 102, 128, 255)   # metal light/mid/dark
RED = (226, 64, 64, 255)

def spike(d, x, base_y, w, h):
    """one triangular spike with outline + 2-tone shading; (x,base_y) = bottom-left."""
    for row in range(h):
        t = row / max(h - 1, 1)
        half = (w / 2) * (1 - t)
        cx = x + w / 2
        x0, x1 = int(round(cx - half)), int(round(cx + half)) - 1
        y = base_y - 1 - row
        if x1 < x0: x1 = x0
        tip = t > 0.55                                   # red-hot tip: reads as "danger" on grey cobble
        body, hi, lo = ((RED, (255, 150, 120, 255), (160, 36, 48, 255)) if tip else (M2, M1, M3))
        d.line([(x0, y), (x1, y)], fill=body)
        if x1 - x0 >= 4 or not tip:                      # keep the red tip free of outline so it stays red
            d.point((x0, y), fill=OL); d.point((x1, y), fill=OL)
            if x1 - x0 >= 2: d.point((x0 + 1, y), fill=hi)
            if x1 - x0 >= 3: d.point((x1 - 1, y), fill=lo)
        else:
            d.point((x0, y), fill=hi)
    d.point((int(x + w / 2), base_y - h), fill=(120, 24, 40, 255))

def plate(d, w, y0, y1):
    d.rectangle([0, y0, w - 1, y1], fill=M3, outline=OL)
    d.line([(1, y0 + 1), (w - 2, y0 + 1)], fill=M2)

# ---- static spikes: 32x16
im = Image.new("RGBA", (32, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
plate(d, 32, 13, 15)
for i in range(4): spike(d, i * 8, 13, 8, 12)
im.save(OUT / "spikes.png")

# ---- pop spikes: 4 frames 32x20 (height reached: 0 / 3 / 8 / 16)
frames = []
for h, warn in ((0, False), (3, True), (9, False), (16, False)):
    f = Image.new("RGBA", (32, 20), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    plate(d, 32, 17, 19)
    for i in range(4):
        cx = i * 8 + 4
        d.rectangle([cx - 2, 16, cx + 1, 17], fill=(30, 24, 40, 255))          # holes in the plate
        if h: spike(d, i * 8, 17, 8, h)
    if warn:                                                                     # red warning glints on the plate
        for i in range(4): d.point((i * 8 + 3, 18), fill=RED)
    if h == 0:
        for i in range(4): d.point((i * 8 + 3, 18), fill=(200, 160, 60, 255))
    frames.append(f)
sheet = Image.new("RGBA", (32 * 4, 20), (0, 0, 0, 0))
for i, f in enumerate(frames): sheet.paste(f, (i * 32, 0))
sheet.save(OUT / "pop-spikes.png")

# ---- barrel: 8 rotation frames 26x26
W_ = 26
sheet = Image.new("RGBA", (W_ * 8, W_), (0, 0, 0, 0))
for k in range(8):
    f = Image.new("RGBA", (W_ * 4, W_ * 4), (0, 0, 0, 0)); d = ImageDraw.Draw(f)       # draw 4x then downscale for round edges
    S = 4; c = W_ * S / 2; r = (W_ / 2 - 1) * S
    d.ellipse([c - r, c - r, c + r, c + r], fill=(176, 112, 52, 255), outline=OL, width=S)
    ang = k * math.pi / 4 / 2          # planks repeat every 45deg; half-steps keep the loop seamless
    for j in range(4):                  # wooden planks (lines through the centre)
        a = ang + j * math.pi / 4
        dx, dy = math.cos(a) * (r - S), math.sin(a) * (r - S)
        d.line([(c - dx, c - dy), (c + dx, c + dy)], fill=(120, 72, 32, 255), width=S)
    d.ellipse([c - r * .62, c - r * .62, c + r * .62, c + r * .62], outline=(92, 98, 112, 255), width=S)   # metal band
    d.ellipse([c - r * .18, c - r * .18, c + r * .18, c + r * .18], fill=(92, 98, 112, 255))
    d.ellipse([c - r, c - r, c + r, c + r], outline=OL, width=S)
    sprite = f.resize((W_, W_), Image.LANCZOS)
    # warning stripe on one plank so the roll is readable
    sheet.paste(sprite, (k * W_, 0))
sheet.save(OUT / "barrel.png")

# ---- warning sign 12x16
s = Image.new("RGBA", (12, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(s)
d.rectangle([5, 9, 6, 15], fill=(110, 76, 44, 255), outline=OL)
d.polygon([(6, 0), (11, 9), (0, 9)], fill=(247, 200, 59, 255), outline=OL)
d.rectangle([5, 3, 6, 6], fill=OL); d.point((5, 7), fill=OL); d.point((6, 7), fill=OL)
s.save(OUT / "sign.png")
print("ok", sorted(p.name for p in OUT.iterdir()))

# =====================================================================================================
# "Not ordinary" traps (v2): tram, signal, rails, icicles + canopy, gull, mimic box, wrecking ball, censer
# Everything is drawn here (pillow only), no external assets.
# =====================================================================================================
WHITE = (240, 244, 250, 255); WHITE2 = (206, 214, 228, 255)
TRED, TRED2, TRED3 = (214, 52, 52, 255), (255, 120, 104, 255), (148, 30, 44, 255)
GLASS, GLASS2 = (96, 164, 214, 255), (170, 214, 240, 255)
DARK = (44, 40, 56, 255)

# ---- tram 104x46: white/red street tram, nose on the RIGHT (flip in code for the other direction)
W, H = 104, 46
tr = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(tr)
d.rectangle([2, 6, W - 5, H - 8], fill=WHITE, outline=OL)                    # body
d.rectangle([3, 7, W - 6, 9], fill=WHITE2)                                   # roof shade
d.rectangle([3, 26, W - 6, 33], fill=TRED)                                   # red stripe
d.line([(3, 27), (W - 6, 27)], fill=TRED2); d.line([(3, 33), (W - 6, 33)], fill=TRED3)
for i in range(5):                                                           # windows
    x0 = 8 + i * 17
    d.rectangle([x0, 12, x0 + 12, 23], fill=GLASS, outline=OL)
    d.line([(x0 + 2, 14), (x0 + 5, 14)], fill=GLASS2); d.line([(x0 + 2, 15), (x0 + 3, 15)], fill=GLASS2)
d.rectangle([W - 15, 11, W - 6, 24], fill=GLASS, outline=OL)                 # cab window
d.polygon([(W - 5, 8), (W - 1, 14), (W - 1, H - 12), (W - 5, H - 8)], fill=WHITE2, outline=OL)  # nose
d.rectangle([W - 4, H - 17, W - 2, H - 14], fill=(255, 226, 120, 255))      # headlight
d.rectangle([W - 6, 36, W - 4, 38], fill=TRED)
d.line([(30, 5), (30, 1)], fill=DARK); d.line([(24, 1), (50, 1)], fill=DARK); d.line([(30, 5), (48, 1)], fill=DARK)  # pantograph
d.rectangle([4, H - 8, W - 6, H - 7], fill=DARK)                             # skirt
for wx in (12, 30, 70, 88):                                                  # wheels
    d.ellipse([wx - 5, H - 11, wx + 5, H - 1], fill=DARK, outline=OL); d.point((wx - 2, H - 8), fill=M2)
tr.save(OUT / "tram.png")

# ---- rails: 16x6 repeating tile (sleepers + two steel rails), laid flush in the street
rl = Image.new("RGBA", (16, 6), (0, 0, 0, 0)); d = ImageDraw.Draw(rl)
d.rectangle([2, 2, 5, 5], fill=(104, 78, 56, 255)); d.rectangle([10, 2, 13, 5], fill=(104, 78, 56, 255))
d.rectangle([0, 1, 15, 2], fill=M2); d.line([(0, 1), (15, 1)], fill=M1); d.line([(0, 3), (15, 3)], fill=M3)
rl.save(OUT / "rails.png")

# ---- signal post 14x40 x 3 frames: 0 off, 1 left lamp red, 2 right lamp red (alternating flash) + Andreaskreuz
sheet = Image.new("RGBA", (14 * 3, 40), (0, 0, 0, 0))
for k in range(3):
    f = Image.new("RGBA", (14, 40), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rectangle([6, 14, 7, 39], fill=(150, 156, 172, 255), outline=OL)                    # pole
    d.rectangle([1, 5, 12, 12], fill=(36, 34, 44, 255), outline=OL)                       # lamp box
    for j, cx in enumerate((4, 9)):
        on = (k == 1 and j == 0) or (k == 2 and j == 1)
        d.rectangle([cx - 1, 7, cx + 1, 10], fill=(255, 70, 60, 255) if on else (96, 44, 48, 255))
        if on: d.point((cx - 1, 7), fill=(255, 200, 190, 255))
    d.polygon([(0, 0), (3, 0), (13, 4), (10, 4)], fill=WHITE, outline=OL)                 # cross arm 1
    d.polygon([(10, 0), (13, 0), (3, 4), (0, 4)], fill=TRED, outline=OL)                  # cross arm 2
    sheet.paste(f, (k * 14, 0))
sheet.save(OUT / "signal.png")

# ---- icicle row 48x30 x 2 frames (0 hanging, 1 warning: brighter + dripping) ; tips point DOWN
def icicle(d, cx, top, ln, w, bright):
    for row in range(ln):
        half = max(0, round((w / 2) * (1 - row / ln)))
        y = top + row
        d.line([(cx - half, y), (cx + half, y)], fill=(176, 226, 248, 255) if row % 5 else (214, 242, 252, 255))
        d.point((cx - half, y), fill=(88, 150, 200, 255)); d.point((cx + half, y), fill=(88, 150, 200, 255))
        if half >= 2: d.point((cx - half + 1, y), fill=(255, 255, 255, 255))
    if bright: d.point((cx, top + ln), fill=(255, 255, 255, 255))
sheet = Image.new("RGBA", (48 * 2, 30), (0, 0, 0, 0))
for k in range(2):
    f = Image.new("RGBA", (48, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    for cx, top, ln, w in ((7, 0, 18, 7), (16, 0, 26, 9), (25, 0, 22, 8), (33, 0, 28, 9), (41, 0, 17, 7)):
        icicle(d, cx, top, ln + (1 if k else 0), w, k == 1)
    if k == 1:
        for cx in (16, 33): d.point((cx, 29), fill=(255, 255, 255, 255))
    sheet.paste(f, (k * 48, 0))
sheet.save(OUT / "icicle.png")

# ---- snowy canopy 64x20 (icicles hang from its underside)
cn = Image.new("RGBA", (64, 20), (0, 0, 0, 0)); d = ImageDraw.Draw(cn)
d.rectangle([0, 8, 63, 19], fill=(96, 70, 56, 255), outline=OL)
for x in range(2, 62, 6): d.line([(x, 10), (x, 17)], fill=(120, 90, 70, 255))
d.rectangle([2, 17, 61, 18], fill=(70, 50, 42, 255))
d.ellipse([-2, 0, 24, 14], fill=WHITE, outline=OL); d.ellipse([16, -2, 50, 14], fill=WHITE, outline=OL); d.ellipse([40, 1, 66, 14], fill=WHITE, outline=OL)
d.rectangle([0, 8, 63, 11], fill=WHITE2)
for x in (6, 20, 34, 48, 57): d.point((x, 5), fill=(170, 190, 220, 255))
cn.save(OUT / "canopy.png")

# ---- gull 30x22 x 6 frames: 0..3 flap (up, mid, down, mid), 4 dive (wings swept back), 5 skim (wings flat)
def gull_frame(wing, tilt=0):
    f = Image.new("RGBA", (30, 22), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.ellipse([7, 8, 22, 16], fill=WHITE, outline=OL)                    # body
    d.polygon([(20, 10), (27, 12), (21, 14)], fill=(255, 190, 60, 255), outline=OL)   # beak
    d.ellipse([18, 8, 24, 13], fill=WHITE, outline=OL); d.point((21, 10), fill=OL)    # head + eye
    d.polygon([(8, 11), (3, 13), (8, 15)], fill=WHITE2, outline=OL)       # tail
    if wing == "up":    pts = [(11, 10), (15, 10), (20, 1), (9, 2)]
    elif wing == "mid": pts = [(11, 10), (15, 10), (24, 8), (6, 8)]
    elif wing == "down": pts = [(11, 11), (15, 11), (22, 19), (8, 19)]
    elif wing == "swept": pts = [(11, 10), (16, 10), (12, 20), (6, 17)]
    else: pts = [(10, 11), (16, 11), (27, 12), (4, 12)]
    d.polygon(pts, fill=(176, 186, 204, 255), outline=OL)
    d.line([pts[2], pts[3]], fill=DARK)                                    # dark wing tips
    return f
sheet = Image.new("RGBA", (30 * 6, 22), (0, 0, 0, 0))
for i, w in enumerate(("up", "mid", "down", "mid", "swept", "flat")): sheet.paste(gull_frame(w), (i * 30, 0))
sheet.save(OUT / "gull.png")

# ---- mimic box 32x32 x 3 frames, built from the REAL question box so it fools the eye:
#      0 = looks identical, 1 = "tell" (the ? turns red + fang glints), 2 = chomp (angry, fangs out)
box = Image.open(OUT.parent / "question-box-32x32.png").convert("RGBA")
sheet = Image.new("RGBA", (32 * 3, 32), (0, 0, 0, 0))
sheet.paste(box, (0, 0))
tell = box.copy(); px = tell.load()
for y in range(32):
    for x in range(32):
        r, g, b, a = px[x, y]
        if a and r < 150 and g < 110 and b < 90 and 6 <= x <= 25 and 5 <= y <= 26:    # the dark brown "?" pixels
            px[x, y] = (214, 40, 52, 255)
sheet.paste(tell, (32, 0))
ch = box.copy(); d = ImageDraw.Draw(ch)
d.rectangle([5, 9, 26, 20], fill=(70, 20, 34, 255), outline=OL)                          # open mouth
for x in range(7, 26, 5):
    d.polygon([(x, 9), (x + 4, 9), (x + 2, 14)], fill=WHITE)                              # upper fangs
    d.polygon([(x + 2, 20), (x + 6, 20), (x + 4, 15)], fill=WHITE)                        # lower fangs
d.rectangle([9, 5, 12, 7], fill=(255, 80, 60, 255)); d.rectangle([19, 5, 22, 7], fill=(255, 80, 60, 255))   # angry eyes
sheet.paste(ch, (64, 0))
sheet.save(OUT / "mimic.png")

# ---- wrecking ball 30x30 (Frankfurt) and incense censer 24x32 (Köln Dom)
S = 4
f = Image.new("RGBA", (30 * S, 30 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
d.ellipse([2 * S, 3 * S, 28 * S, 29 * S], fill=(70, 78, 96, 255), outline=OL, width=S)
d.ellipse([6 * S, 6 * S, 17 * S, 15 * S], fill=(150, 160, 182, 255))                    # highlight
d.ellipse([8 * S, 7 * S, 13 * S, 11 * S], fill=(224, 232, 244, 255))
d.arc([4 * S, 5 * S, 26 * S, 27 * S], 20, 120, fill=(40, 44, 58, 255), width=S)          # shade
d.rectangle([13 * S, 0, 17 * S, 5 * S], fill=(150, 160, 182, 255), outline=OL, width=S // 2)     # eye bolt
f.resize((30, 30), Image.LANCZOS).save(OUT / "ball.png")

c = Image.new("RGBA", (24, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
GOLD, GOLD2, GOLD3 = (246, 200, 59, 255), (255, 236, 150, 255), (166, 118, 34, 255)
d.rectangle([10, 0, 13, 4], fill=GOLD3, outline=OL)                                      # top ring
d.polygon([(4, 14), (19, 14), (21, 26), (2, 26)], fill=GOLD, outline=OL)                 # bowl
d.pieslice([2, 8, 21, 22], 180, 360, fill=GOLD, outline=OL)                              # dome
d.line([(5, 12), (8, 10)], fill=GOLD2); d.line([(6, 18), (6, 23)], fill=GOLD2)
for x in range(6, 19, 4): d.rectangle([x, 15, x + 1, 17], fill=(60, 36, 36, 255))        # vent holes
d.rectangle([5, 26, 18, 29], fill=GOLD3, outline=OL)                                     # base
d.line([(3, 28), (20, 28)], fill=(120, 80, 30, 255))
for x, y in ((8, 5), (16, 3)): d.point((x, y), fill=(210, 210, 226, 255))                # a wisp of smoke
c.save(OUT / "censer.png")
print("ok v2", sorted(p.name for p in OUT.iterdir()))
