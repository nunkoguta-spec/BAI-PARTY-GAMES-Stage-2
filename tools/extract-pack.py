"""Extracts sprites/props from the supplied BAI asset-pack collage (1024x572) into transparent PNGs.
Usage: python3 tools/extract-pack.py <collage.png>   (writes public/assets/pack/*.png)
Background removal = flood fill from the crop border over pixels close to a bilinear model of the panel colour."""
import sys, os
import numpy as np
from PIL import Image
from collections import deque
from scipy import ndimage

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "pack")
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert("RGB")

def key(box, name, tol=30, min_area=25):
    c = np.array(im.crop(box)).astype(float); h, w, _ = c.shape
    top, bot = c[:2].mean(0), c[-2:].mean(0); l, r = c[:, :2].mean(1), c[:, -2:].mean(1)
    yy = np.linspace(0, 1, h)[:, None, None]; xx = np.linspace(0, 1, w)[None, :, None]
    bg = (top[None]*(1-yy) + bot[None]*yy + l[:, None]*(1-xx) + r[:, None]*xx) / 2
    cand = np.abs(c - bg).sum(2) < tol
    seen = np.zeros((h, w), bool); is_bg = np.zeros((h, w), bool); q = deque()
    for x in range(w): q.extend([(0, x), (h-1, x)])
    for y in range(h): q.extend([(y, 0), (y, w-1)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x]: continue
        seen[y, x] = True
        if not cand[y, x]: continue
        is_bg[y, x] = True; q.extend([(y+1, x), (y-1, x), (y, x+1), (y, x-1)])
    fg = ~is_bg
    lab, n = ndimage.label(fg)           # drop specks / label remnants
    if n:
        areas = ndimage.sum(fg, lab, range(1, n+1))
        for i, a in enumerate(areas, 1):
            if a < min_area: fg[lab == i] = False
    out = Image.fromarray(np.dstack([c.astype(np.uint8), fg.astype(np.uint8)*255]), "RGBA")
    bb = out.getchannel("A").getbbox()
    if bb: out = out.crop(bb)
    out.save(os.path.join(OUT, name)); return out.size

# mascot (tol per pose: "hit" has a lighter panel remnant)
for name, (x0, x1, tol) in {"idle":(16,68,30),"run":(74,134,30),"jump":(140,199,30),"victory":(204,258,30),"hit":(263,319,45)}.items():
    print("mascot", name, key((x0, 103, x1, 182), f"mascot-{name}.png", tol, 40))
# props / environment (collage coordinates)
P = {"stall":(597,293,667,366),"tree":(674,295,743,370),"bush":(745,336,828,369),"train":(594,375,1009,434),
     "track":(839,326,1008,356),"lamp":(316,308,358,432),"tower":(13,308,88,433),"building":(154,368,245,433),
     "roof":(154,310,245,364)}
for n, b in P.items(): print(n, key(b, f"{n}.png", 90 if n == "lamp" else 40, 40))
# cobblestone ground tile (kept opaque)
im.crop((363, 384, 449, 430)).save(os.path.join(OUT, "cobble.png"))
