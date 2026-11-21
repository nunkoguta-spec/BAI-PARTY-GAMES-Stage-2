#!/usr/bin/env python3
"""Rebuild every Bottoms sheet so trousers only cover hips + legs.

Bug: the bottoms layer was a static 18x15 box (x7-25, y16-30) copied into every
frame. It covered chest and arms (looked like a robe/cloak) and ignored the pose.
Fix: per row keep the palette of the existing sheet, but paint trousers only on
the lowest rows of the *character silhouette* of the same state/direction/frame,
limited to the leg columns (so arms never get painted).
Run from repo root:  python3 tools/fix-bottoms-shape.py
(Originals are in tools/backup-bottoms-before-shape-fix/.)
"""
from pathlib import Path
from collections import Counter
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AV = ROOT / 'public/assets/avatar'
BACKUP = ROOT / 'tools/backup-bottoms-before-shape-fix'
F = 32
ROWS = 64
STATES = ['Idle', 'Walk', 'Run', 'Jump', 'Hurt', 'Interact', 'Punch', 'Sword']
DIRS = ['Front', 'Back', 'Left', 'Right']
NAVY = (55, 75, 110)
NAVY_DARK = (23, 32, 47)
PANTS_ROWS = 6          # hip + legs height in pixels (counted up from the feet)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


def row_palette(sheet, row):
    """(main, dark, light) from the row's existing colours in the Idle Front sheet."""
    cnt = Counter()
    for f in range(sheet.width // F):
        fr = sheet.crop((f * F, row * F, f * F + F, row * F + F))
        for px in fr.get_flattened_data() if hasattr(fr,'get_flattened_data') else fr.getdata():
            if px[3] > 200:
                cnt[px[:3]] += 1
    others = [(c, n) for c, n in cnt.most_common() if c not in (NAVY, NAVY_DARK)]
    if row < 16 and others:               # original rows: the colour lives in the accent
        main = others[0][0]
    else:                                 # generated rows: box colour is the garment colour
        main = cnt.most_common(1)[0][0]
    return main, shade(main, 0.62), shade(main, 1.22)


def silhouette(state, direction, frame):
    p = AV / state / 'Character' / f'Character_{state}_{direction}-Sheet.png'
    fr = Image.open(p).convert('RGBA').crop((frame * F, 0, frame * F + F, F))
    return fr.getchannel('A')


def pants_frame(pal, alpha):
    main, dark, light = pal
    px = alpha.load()
    ys = [y for y in range(F) for x in range(F) if px[x, y] > 0]
    out = Image.new('RGBA', (F, F), (0, 0, 0, 0))
    if not ys:
        return out
    bottom = max(ys)
    # leg columns = columns occupied on the feet row(s); excludes the arms
    cols = [x for y in (bottom, bottom - 1) for x in range(F) if px[x, y] > 0]
    x0, x1 = min(cols), max(cols)
    top = bottom - PANTS_ROWS + 1
    o = out.load()
    for y in range(top, bottom + 1):
        for x in range(x0, x1 + 1):
            if px[x, y] == 0:
                continue
            c = main
            if y == top:
                c = dark                                   # waistband
            elif y == top + 1:
                c = light if x in (x0 + 2, x1 - 2) else main  # belt loops / highlight
            elif x in (x0, x1):
                c = dark                                   # outer side shade
            elif y == bottom and px[x, y] > 0:
                c = dark                                   # hem
            o[x, y] = c + (255,)
    # centre fly seam on front view handled by silhouette gap; add a light seam row
    return out


def main():
    idle_ref = Image.open(BACKUP / 'Idle' / 'Clothing_Bottoms_Idle_Front-Sheet.png').convert('RGBA')
    for state in STATES:
        # NB: the Run/ folder mixes "Run_" and "Walk_" file names, so glob instead of building names.
        for p in sorted((AV / state / 'Clothing').glob('Clothing_Bottoms_*-Sheet.png')):
            d = p.stem.split('_')[3].split('-')[0]          # Front / Back / Left / Right
            bk = BACKUP / state / p.name
            src = Image.open(bk if bk.exists() else p).convert('RGBA')
            frames = src.width // F
            out = Image.new('RGBA', src.size, (0, 0, 0, 0))
            alphas = [silhouette(state, d, f) for f in range(frames)]
            for r in range(ROWS):
                pal = row_palette(idle_ref, r)
                for f in range(frames):
                    out.alpha_composite(pants_frame(pal, alphas[f]), (f * F, r * F))
            out.save(p)
            print('wrote', p.relative_to(ROOT))


if __name__ == '__main__':
    main()
