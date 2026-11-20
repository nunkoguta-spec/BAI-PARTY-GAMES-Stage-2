#!/usr/bin/env python3
"""Rebuild the 50 generated tops (rows 29-78) so they sit on the torso.

Bug: generated tops were painted at y16-23, over the chin/mouth (looked like a beard/mask),
while the original 29 tops sit at y18-24. Fix: for every state/direction/frame, use the
ORIGINAL top row 0 of the same sheet as the placement mask, and paint the style inside it.
Run from repo root: python3 tools/fix-tops-alignment.py   (originals: tools/backup-tops-before-fix/)
"""
from pathlib import Path
from PIL import Image
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
AV = ROOT / 'public/assets/avatar'
BACKUP = ROOT / 'tools/backup-tops-before-fix'
F = 32
ORIGINAL_ROWS = 29
TOTAL = 79
STATES = ['Idle', 'Walk', 'Run', 'Jump', 'Hurt', 'Interact', 'Punch', 'Sword']

spec = importlib.util.spec_from_file_location('gen', ROOT / 'tools/generate_matching_clothing.py')
gen = importlib.util.module_from_spec(spec); spec.loader.exec_module(gen)
hexrgb, PALS, STYLES = gen.hexrgb, gen.TOP_PALETTES, gen.TOP_STYLES


def draw_top(idx, style, pal, mask):
    name, c0, c1, c2, c3 = pal
    base, dark, hi, light = hexrgb(c0), hexrgb(c1), hexrgb(c2), hexrgb(c3)
    out = Image.new('RGBA', (F, F), (0, 0, 0, 0)); o = out.load(); m = mask.load()
    pts = [(x, y) for y in range(F) for x in range(F) if m[x, y] > 0]
    if not pts:
        return out
    x0 = min(p[0] for p in pts); x1 = max(p[0] for p in pts)
    y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
    cx = (x0 + x1) // 2

    def put(x, y, c):
        if 0 <= x < F and 0 <= y < F and m[x, y] > 0:
            o[x, y] = c + (255,)

    def rect(xa, ya, xb, yb, c):
        for yy in range(ya, yb + 1):
            for xx in range(xa, xb + 1):
                put(xx, yy, c)

    for x, y in pts:                      # base + outline
        c = base
        if y == y1 or x in (x0, x1):
            c = dark
        put(x, y, c)
    r = lambda n: y0 + n                  # row n inside the shirt
    if style == 'tee':
        rect(cx - 1, r(0), cx + 1, r(0), dark)
    elif style == 'stripe':
        rect(x0 + 1, r(2), x1 - 1, r(2), hi); rect(x0 + 1, r(4), x1 - 1, r(4), hi)
        rect(cx - 1, r(0), cx + 1, r(0), dark)
    elif style == 'polo':
        rect(cx - 2, r(0), cx + 1, r(0), light); rect(cx - 1, r(1), cx, r(3), dark); put(cx - 1, r(2), light)
    elif style == 'hoodie':
        rect(x0 + 1, r(0), x1 - 1, r(0), hi); rect(cx - 1, r(0), cx, r(1), dark)
        rect(cx - 2, r(4), cx + 1, r(5), dark); rect(cx - 1, r(4), cx, r(4), light)
    elif style == 'jacket':
        rect(cx, r(0), cx, y1, hi); rect(cx - 1, r(0), cx - 1, y1, dark)
    elif style == 'varsity':
        rect(x0 + 1, r(2), x0 + 2, r(3), hi); rect(x1 - 2, r(2), x1 - 1, r(3), hi); rect(cx, r(0), cx, y1 - 1, light)
    elif style == 'sweater':
        rect(x0 + 1, r(2), x1 - 1, r(2), hi); rect(x0 + 1, r(4), x1 - 1, r(4), hi); rect(cx - 1, r(0), cx, r(0), dark)
    elif style == 'vest':
        rect(x0 + 1, r(0), x0 + 2, y1 - 1, dark); rect(x1 - 2, r(0), x1 - 1, y1 - 1, dark); rect(cx - 1, r(0), cx, r(3), light)
    elif style == 'button':
        rect(cx, r(0), cx, y1 - 1, light); rect(cx - 1, r(0), cx - 1, y1 - 1, dark)
        for n in (2, 4): put(cx, r(n), dark)
    elif style == 'sport':
        rect(x0 + 1, r(2), x1 - 1, r(3), hi); rect(cx - 1, r(0), cx, r(0), light)
    c = idx % 5                           # extra trim so equal styles still differ
    if c == 1: rect(cx - 3, r(3), cx - 2, r(4), light); rect(cx + 1, r(3), cx + 2, r(4), light)
    elif c == 2: rect(cx - 1, r(3), cx, r(4), hi); put(cx - 1, r(4), light)
    elif c == 3: rect(x0 + 1, y1 - 1, x1 - 1, y1 - 1, dark)
    elif c == 4: put(cx - 3, r(1), light); put(cx + 2, r(1), light)
    return out


def main():
    for state in STATES:
        for p in sorted((AV / state / 'Clothing').glob('Clothing_Top*_*-Sheet.png')):
            bk = BACKUP / state / p.name
            src = Image.open(bk if bk.exists() else p).convert('RGBA')
            frames = src.width // F
            out = src.copy()
            out.paste((0, 0, 0, 0), (0, ORIGINAL_ROWS * F, src.width, src.height))
            masks = [src.crop((f * F, 0, f * F + F, F)).getchannel('A') for f in range(frames)]
            for row in range(ORIGINAL_ROWS, TOTAL):
                i = row - ORIGINAL_ROWS
                for f in range(frames):
                    out.alpha_composite(draw_top(i, STYLES[i % len(STYLES)], PALS[i % len(PALS)], masks[f]), (f * F, row * F))
            out.save(p); print('wrote', p.relative_to(ROOT))


if __name__ == '__main__':
    main()
