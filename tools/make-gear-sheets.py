#!/usr/bin/env python3
"""Build avatar gear layers (hat / glasses / weapon) that match the existing avatar sheets.

Output (public/assets/avatar-gear/<Part>/<Anim>/<Part>_<Anim>_<Dir>-Sheet.png):
  32x32 frames, columns = animation frames, rows = variants (row 0 is always empty = "none").
  Same naming/geometry as public/assets/avatar/*, so WorldScene can stack them like any other layer.

Placement is measured per frame from the real avatar sheets (hair top / head centre / eyes / feet),
so hats and glasses follow the head bob in every animation. Hats come from
public/assets/pixel-heroes/layers/hats, glasses frames/colours from .../glasses. Weapons are drawn
here in a compact held pose (the 40x46 pack layers would be clipped by a 32px frame).

Usage:  python tools/make-gear-sheets.py
"""
import os, sys
from collections import Counter
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AV = os.path.join(ROOT, "public/assets/avatar")
PACK = os.path.join(ROOT, "public/assets/pixel-heroes/layers")
OUT = os.path.join(ROOT, "public/assets/avatar-gear")
F = 32
SHEETS = [("Idle", "Front", 4), ("Walk", "Left", 4), ("Walk", "Right", 4), ("Jump", "Left", 3), ("Jump", "Right", 3),
          ("Interact", "Left", 3), ("Interact", "Right", 3), ("Punch", "Left", 5), ("Punch", "Right", 5),
          ("Sword", "Left", 5), ("Sword", "Right", 5),
          ("Hurt", "Left", 3), ("Hurt", "Right", 3)]
OL = (28, 18, 48)

def load(path):
    return Image.open(path).convert("RGBA") if os.path.exists(path) else None

def frame(sheet, col, row=0):
    return sheet.crop((col * F, row * F, col * F + F, row * F + F)) if sheet else None

def pixels(im):
    px = im.load()
    return [(x, y) for y in range(im.height) for x in range(im.width) if px[x, y][3] > 0]

def anchors(anim, d, col):
    # Map Sword to Punch character anchors if character sword sheet not loaded
    search_anim = anim
    body = frame(load(f"{AV}/{search_anim}/Character/Character_{search_anim}_{d}-Sheet.png"), col, 0)
    if not body and anim == "Sword":
        search_anim = "Punch"
        body = frame(load(f"{AV}/{search_anim}/Character/Character_{search_anim}_{d}-Sheet.png"), col, 0)
    hair = frame(load(f"{AV}/{search_anim}/Hair/Hair_{search_anim}_{d}-Sheet.png"), col, 1)
    eyes = frame(load(f"{AV}/{search_anim}/Eyes/Eyes_{search_anim}_{d}-Sheet.png"), col, 0)
    shoes = frame(load(f"{AV}/{search_anim}/Clothing/Clothing_Shoes_{search_anim}_{d}-Sheet.png"), col, 0)
    bp = pixels(body) if body else []
    hp = pixels(hair) if hair else []
    ys = [y for _, y in bp] + [y for _, y in hp]
    top = min(ys) if ys else 3
    btop = min((y for _, y in bp), default=top)
    head = [x for x, y in bp if y <= btop + 8] or [16]
    cx = (min(head) + max(head)) / 2
    bx = [x for x, _ in bp] or [16]
    feet = max([y for _, y in bp] + [y for _, y in (pixels(shoes) if shoes else [])] or [29])
    ep = pixels(eyes) if eyes else []
    eye = None
    if ep:
        xs = sorted({x for x, _ in ep})
        groups, cur = [], [xs[0]]
        for x in xs[1:]:
            if x - cur[-1] >= 3: groups.append(cur); cur = [x]
            else: cur.append(x)
        groups.append(cur)
        cy = sum(y for _, y in ep) / len(ep)
        eye = ([(sum(g) / len(g), cy) for g in groups], cy)
    return dict(top=top, cx=cx, bcx=(min(bx) + max(bx)) / 2, feet=feet, eye=eye)

def paste_shift(dst, src, dx, dy):
    for (x, y) in pixels(src):
        nx, ny = x + dx, y + dy
        if 0 <= nx < F and 0 <= ny < F: dst.putpixel((nx, ny), src.getpixel((x, y)))

def pack_layer(cat, n):
    im = Image.open(os.path.join(PACK, cat, f"{cat}_{n:02d}.png")).convert("RGBA")
    return im

def hat_frame(n, a):
    # pack layer coordinates: hair top y=9, head centre x=19.5 (40x46 canvas)
    src = pack_layer("hats", n)
    out = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    dx = round(a["cx"] - 19.5) 
    dy = a["top"] - 9
    paste_shift(out, src, dx, dy)
    return out

def dominant(im):
    c = Counter(im.getpixel(p) for p in pixels(im))
    return c.most_common(1)[0][0][:3] if c else (40, 40, 60)

SHAPES = {0: "round", 1: "square", 2: "sun", 3: "square", 4: "round", 5: "half", 6: "round", 7: "round", 8: "round"}
def glasses_frame(n, a, d):
    out = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    if not a["eye"]: return out
    src = pack_layer("glasses", n)
    centres, cy = a["eye"]
    if d == "Front" and len(centres) >= 2:
        mid = (centres[0][0] + centres[-1][0]) / 2
        paste_shift(out, src, round(mid - 19.5), round(cy - 19))
        return out
    col = dominant(src) + (255,)
    style = (n - 1) // 9
    shape = SHAPES.get(style, "round")
    ex, ey = round(centres[0][0]), round(cy)
    s = 1 if d == "Right" else -1
    P = []
    if shape == "round":
        P = [(1,0),(2,0),(3,0),(0,1),(4,1),(0,2),(4,2),(0,3),(4,3),(1,4),(2,4),(3,4)]
    elif shape == "square":
        P = [(x,0) for x in range(5)] + [(x,4) for x in range(5)] + [(0,y) for y in range(1,4)] + [(4,y) for y in range(1,4)]
    elif shape == "sun":
        P = [(x,y) for x in range(5) for y in range(4)]
    elif shape == "half":
        P = [(x,0) for x in range(5)] + [(x,1) for x in range(5)]
    for (x, y) in P:
        px, py = ex - 2 + x, ey - 2 + y
        if 0 <= px < F and 0 <= py < F: out.putpixel((px, py), (36, 34, 54, 255) if shape == "sun" else col)
    if shape == "sun": out.putpixel((ex - 2, ey - 2), (170, 170, 210, 255))
    # temple towards the back of the head
    for k in range(3, 8):
        px = ex - s * k
        if 0 <= px < F: out.putpixel((px, ey - 1), col)
    return out

BLADES = [(192,202,218),(244,204,72),(212,52,72),(130,212,242),(66,60,86),(72,202,124),(162,92,222),(246,144,192),(196,124,62)]
GUARDS = [(245,205,70),(200,205,218),(120,70,40),(222,58,68),(245,205,70),(56,176,200),(245,205,70),(152,98,226),(245,205,70)]
WANDC = [(246,134,188),(247,206,72),(66,122,228),(152,98,226),(56,176,200),(222,58,68),(106,198,96),(246,134,52),(238,238,244)]
KINDS = [("longsword", 11, False, 2, 2), ("broadsword", 10, True, 2, 2), ("katana", 12, False, 1, 3),
         ("dagger", 6, False, 1, 1), ("greatsword", 13, True, 3, 2), ("rapier", 11, False, 1, 2)]
STAR = ["..#..", ".###.", "#####", ".###.", ".#.#."]
HEART = [".#.#.", "#####", "#####", ".###.", "..#.."]
LOLLI = [".###.", "#####", "#####", "#####", ".###."]
GEM = ["..#..", ".###.", "#####", ".###.", "..#.."]

def weapon_rows():
    rows = []
    for (name, L, thick, span, grip) in KINDS:
        for b, g in zip(BLADES, GUARDS): rows.append(("sword", L, thick, span, grip, b, g))
    for kind, pat in (("star", STAR), ("heart", HEART), ("lolli", LOLLI), ("gem", GEM)):
        for c in WANDC: rows.append((kind, pat, c))
    return rows

def lighter(c, f=.55): return tuple(int(v + (255 - v) * f) for v in c)

def weapon_frame(spec, a, d, anim="Idle", col=0):
    out = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    s = -1 if d == "Left" else 1
    # Forward spacing for walking/idle to prevent piercing the body/head
    fwd_offset = 2.5 if anim in ("Walk", "Idle") else (1.5 if anim == "Jump" else 0)
    hx = round(a["bcx"] + (5 + fwd_offset) * s)
    hy = a["feet"] - 7

    # Dynamic animation adjustments for weapon holding & attack swing:
    if anim in ("Punch", "Sword"):
        # 5 attack frames:
        # Col 0: ready
        # Col 1: windup / pull back
        # Col 2: forward lunge
        # Col 3: FULL FORWARD SLASH ARC!
        # Col 4: follow-through
        shift_x = [0, -3, 3, 9, 6][col % 5]
        shift_y = [0, 1, -1, 0, 2][col % 5]
        hx += shift_x * s
        hy += shift_y
    elif anim == "Walk":
        # Synchronize forward swing and vertical bob with stride
        shift_x = [0, 1, 0, 1][col % 4]
        shift_y = [0, -1, 0, -1][col % 4]
        hx += shift_x * s
        hy += shift_y
    elif anim == "Jump":
        hy -= 2
    elif anim == "Hurt":
        hx -= 3 * s
        hy += 2

    P = {}
    if spec[0] == "sword":
        _, L, thick, span, grip, b, g = spec
        for t in range(1, L + 1):
            x, y = hx + s * (t // 3), hy - 1 - t
            P[(x, y)] = b if (thick or t % 2) else lighter(b)
            if thick and t < L: P[(x + s, y)] = lighter(b)
        for j in range(-span, span + 1): P[(hx + j, hy - 1)] = g
        for k in range(grip): P[(hx - s * (k // 2), hy + k)] = (112, 70, 42)
        P[(hx - s * (grip // 2), hy + grip)] = g
    else:
        kind, pat, c = spec
        for t in range(0, 9): P[(hx + s * (t // 3), hy - t)] = (150, 104, 66) if kind != "lolli" else (240, 240, 246)
        tx, ty = hx + s * 3, hy - 9
        for ry, line in enumerate(pat):
            for rx, ch in enumerate(line):
                if ch == "#": P[(tx - 2 + rx, ty - 4 + ry)] = c
        P[(tx - 1, ty - 3)] = lighter(c, .7)
    ring = {}
    for (x, y) in P:
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            q = (x + dx, y + dy)
            if q not in P: ring[q] = OL
    for (x, y), c in {**ring, **P}.items():
        if 0 <= x < F and 0 <= y < F: out.putpixel((x, y), c + (255,))
    return out

def build(part, nrows, make):
    for anim, d, cols in SHEETS:
        sheet = Image.new("RGBA", (cols * F, nrows * F), (0, 0, 0, 0))
        for col in range(cols):
            a = anchors(anim, d, col)
            for r in range(1, nrows):
                sheet.paste(make(r, a, d, anim, col), (col * F, r * F))
        folder = os.path.join(OUT, part, anim)
        os.makedirs(folder, exist_ok=True)
        sheet.save(os.path.join(folder, f"{part}_{anim}_{d}-Sheet.png"))

if __name__ == "__main__":
    n_hat = len([f for f in os.listdir(os.path.join(PACK, "hats")) if f.endswith(".png") and "_back" not in f])
    n_gl = len([f for f in os.listdir(os.path.join(PACK, "glasses")) if f.endswith(".png") and "_back" not in f])
    wr = weapon_rows()
    build("Hat", n_hat + 1, lambda r, a, d, anim, col: hat_frame(r, a))
    build("Glasses", n_gl + 1, lambda r, a, d, anim, col: glasses_frame(r, a, d))
    build("Weapon", len(wr) + 1, lambda r, a, d, anim, col: weapon_frame(wr[r - 1], a, d, anim, col))
    print("rows (incl. empty row 0): hat", n_hat + 1, "glasses", n_gl + 1, "weapon", len(wr) + 1)
