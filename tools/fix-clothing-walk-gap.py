#!/usr/bin/env python3
"""Close the 1px waist gap on walk frames 0 and 2.

The original Walk tops end at y=24 and bottoms start at y=26 on those frames,
so the bare body skin shows as a split while walking. Extend each top row down
by one pixel (copy its last opaque scanline) so the shirt meets the pants.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AV = os.path.join(ROOT, "public/assets/avatar/Walk/Clothing")
F = 32
# Frames where the original sheets leave a bare waist pixel.
GAP_COLS = (0, 2)


def close_gap(path):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    rows = im.height // F
    cols = im.width // F
    filled = 0
    for row in range(rows):
        for col in GAP_COLS:
            if col >= cols:
                continue
            ox = col * F
            oy = row * F
            # Copy the lowest opaque pixel of each column onto the empty row beneath it.
            for x in range(F):
                src_y = None
                for y in range(F - 1, -1, -1):
                    if px[ox + x, oy + y][3] > 0:
                        src_y = y
                        break
                if src_y is None or src_y + 1 >= F:
                    continue
                dest_y = src_y + 1
                if px[ox + x, oy + dest_y][3] == 0:
                    px[ox + x, oy + dest_y] = px[ox + x, oy + src_y]
                    filled += 1
    im.save(path)
    return filled


if __name__ == "__main__":
    total = 0
    for name in ("Clothing_Tops_Walk_Right-Sheet.png", "Clothing_Tops_Walk_Left-Sheet.png"):
        path = os.path.join(AV, name)
        n = close_gap(path)
        total += n
        print(name, "pixels extended:", n)
    print("done", total)
