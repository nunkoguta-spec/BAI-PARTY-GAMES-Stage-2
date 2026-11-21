#!/usr/bin/env python3
"""
BAI PARTY GAMES - seasonal city backdrops.

Turns the four existing summer panoramas
    public/assets/backgrounds/cities/{munich,frankfurt,berlin,hamburg}-bg-v2.png
into one variant per season
    public/assets/backgrounds/cities/seasons/{city}-{spring|summer|autumn|winter}.png

Nothing is repainted by hand: the sky gradient and clouds, the foliage, the
overall colour grade and (for winter) the snow on silhouettes / treetops / the
street parapet are all derived from the original pixels, so every landmark stays
exactly where the collision / gameplay code expects it.

Usage (from the project root):
    pip install numpy scipy pillow
    python tools/make-season-backdrops.py                  # all 4 cities x 4 seasons
    python tools/make-season-backdrops.py --city munich    # one city, all seasons
    python tools/make-season-backdrops.py --season winter  # all cities, one season

Output is deterministic (fixed seeds), so re-running only changes files when
this script changes.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
CITY_DIR = ROOT / "public" / "assets" / "backgrounds" / "cities"
OUT_DIR = CITY_DIR / "seasons"

# Row of the top face of the stone parapet in each panorama (snow lands here in winter).
LEDGE_TOP = {"munich": 204, "frankfurt": 197, "berlin": 203, "hamburg": 189}
SEASONS = ("spring", "summer", "autumn", "winter")

C = lambda *v: np.array(v, dtype=np.float32)


# --------------------------------------------------------------------------- helpers
def rgb_to_hsv(rgb):
    a = rgb / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm = m & (mx == r)
    gm = m & (mx == g) & ~rm
    bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60.0, s, mx


def lum(rgb):
    return rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def ramp3(t, c0, c1, c2):
    """3-stop colour ramp, t in 0..1 (array)."""
    t = np.clip(t, 0, 1)[..., None]
    lo = c0 + (c1 - c0) * np.clip(t * 2, 0, 1)
    hi = c1 + (c2 - c1) * np.clip(t * 2 - 1, 0, 1)
    return np.where(t < 0.5, lo, hi)


def field(shape, sigma, seed):
    """Smooth random field, rank-normalised so that P(field < p) == p (uniform 0..1)."""
    rng = np.random.default_rng(seed)
    g = ndi.gaussian_filter(rng.standard_normal(shape).astype(np.float32), sigma, mode="reflect")
    flat = g.ravel()
    order = flat.argsort()
    ranks = np.empty_like(order)
    ranks[order] = np.arange(flat.size)
    return (ranks / (flat.size - 1)).reshape(shape).astype(np.float32)


def grade(rgb, mul, sat=1.0, gain=1.0):
    out = rgb * np.array(mul, dtype=np.float32) * gain
    l = lum(out)[..., None]
    return np.clip(l + (out - l) * sat, 0, 255)


def blend(base, over, alpha):
    return base + (over - base) * np.clip(alpha, 0, 1)[..., None]


# --------------------------------------------------------------------------- analysis
def analyse(im):
    """Split a panorama into sky / cloud / foliage soft masks."""
    H, W, _ = im.shape
    h, s, v = rgb_to_hsv(im)
    L = lum(im)

    # Row-wise reference sky colour (the sky is a clean vertical gradient).
    cand = (im[..., 2] >= 244) & (h > 185) & (h < 228) & (s > 0.22)
    ref = np.full((H, 3), np.nan, dtype=np.float32)
    for y in range(H):
        if cand[y].sum() >= 400:
            ref[y] = np.median(im[y][cand[y]], axis=0)
    ys = np.arange(H)
    ok = ~np.isnan(ref[:, 0])
    for c in range(3):
        ref[:, c] = np.interp(ys, ys[ok], ref[ok, c])
    Lref = lum(ref)[:, None]

    dist = np.linalg.norm(im - ref[:, None, :], axis=-1)
    skyw = 1.0 - smoothstep(14, 44, dist)

    # Clouds: brighter than the sky, neutral or blue-white (never warm cream facades).
    bluish = ((h > 170) & (h < 270)) | (s < 0.07)
    cloudw = smoothstep(Lref + 14, Lref + 55, L) * bluish * (im[..., 2] > 190)

    binmask = (skyw > 0.4) | (cloudw > 0.4)
    labels, _ = ndi.label(binmask, structure=np.ones((3, 3)))
    top_labels = np.unique(labels[0][labels[0] > 0])
    region = np.isin(labels, top_labels)

    A = np.maximum(region * np.maximum(skyw, cloudw), skyw * (np.arange(H)[:, None] < 178))
    A = np.clip(A, 0, 1).astype(np.float32)

    ca = np.clip((L - Lref) / np.maximum(255 - Lref, 1), 0, 1)   # cloud amount
    ca = ca * (region | (cloudw > 0.4))

    # Foliage: green and olive-yellow, but not teal copper domes, nor bright cream/yellow stone.
    wf = (
        smoothstep(46, 62, h)
        * (1 - smoothstep(145, 160, h))
        * smoothstep(0.30, 0.42, s)
        * smoothstep(0.12, 0.25, v)
        * np.where(h < 78, 1 - smoothstep(0.74, 0.88, v), 1.0)
    )
    wf = (wf * (1 - A)).astype(np.float32)
    return dict(h=h, s=s, v=v, L=L, ref=ref, A=A, ca=ca.astype(np.float32), wf=wf,
                region=region & (A > 0.5))


def sky_gradient(H, W, stops):
    """stops: list of (row, rgb). Linear in between, constant outside."""
    rows = np.array([r for r, _ in stops], dtype=np.float32)
    cols = np.stack([c for _, c in stops])
    ys = np.arange(H, dtype=np.float32)
    g = np.stack([np.interp(ys, rows, cols[:, k]) for k in range(3)], axis=-1)
    return np.repeat(g[:, None, :], W, axis=1)


# --------------------------------------------------------------------------- seasons
SEASON = {
    "spring": dict(
        grade=dict(mul=(1.01, 1.03, 1.00), sat=1.04, gain=1.05),
        sky=[(0, C(104, 186, 250)), (80, C(140, 208, 252)), (150, C(184, 232, 252))],
        cloud=(C(255, 252, 255), C(222, 232, 250)),
    ),
    "summer": dict(
        grade=dict(mul=(1.04, 1.01, 0.95), sat=1.12, gain=1.0),
        sky=[(0, C(24, 128, 250)), (80, C(70, 176, 252)), (150, C(150, 216, 252))],
        cloud=(C(255, 255, 255), C(214, 230, 250)),
    ),
    "autumn": dict(
        grade=dict(mul=(1.07, 0.99, 0.86), sat=0.95, gain=1.0),
        sky=[(0, C(236, 156, 98)), (70, C(246, 188, 120)), (150, C(252, 224, 170))],
        cloud=(C(255, 240, 216), C(232, 176, 140)),
        haze=(C(168, 142, 176), 0.5),
    ),
    "winter": dict(
        grade=dict(mul=(0.93, 0.98, 1.07), sat=0.68, gain=1.04),
        sky=[(0, C(146, 176, 214)), (80, C(184, 205, 230)), (150, C(220, 232, 244))],
        cloud=(C(246, 249, 253), C(198, 212, 232)),
        haze=(C(200, 214, 232), 0.5),
    ),
}

FOLIAGE = {
    "spring": dict(
        green=(C(48, 118, 66), C(108, 192, 80), C(192, 238, 122)),
        blossom=(C(190, 86, 136), C(244, 146, 184), C(255, 218, 232)),
    ),
    "summer": dict(green=(C(20, 88, 52), C(58, 160, 50), C(140, 212, 70))),
    "autumn": dict(
        gold=(C(150, 92, 24), C(232, 160, 36), C(255, 216, 92)),
        orange=(C(140, 52, 18), C(222, 98, 28), C(250, 160, 62)),
        red=(C(104, 28, 28), C(184, 52, 36), C(232, 104, 60)),
        olive=(C(84, 92, 34), C(150, 150, 52), C(206, 196, 92)),
    ),
    "winter": dict(
        frost=(C(40, 80, 94), C(86, 130, 142), C(168, 198, 206)),
        snow=(C(150, 172, 206), C(214, 228, 244), C(255, 255, 255)),
    ),
}


def recolor_foliage(season, shape, v, seed):
    vt = np.clip((v - 0.22) / (0.88 - 0.22), 0, 1)
    fine = field(shape, 5, seed)
    coarse = field(shape, 26, seed + 1)
    mixed = 0.55 * fine + 0.45 * coarse
    r = field(shape, 1, seed + 9)  # re-rank blend so thresholds are area fractions
    order = mixed.ravel().argsort()
    ranks = np.empty_like(order)
    ranks[order] = np.arange(order.size)
    pick = (ranks / (order.size - 1)).reshape(shape)
    pal = FOLIAGE[season]

    if season == "spring":
        out = ramp3(vt, *pal["green"])
        blossom = ramp3(vt, *pal["blossom"])
        speck = field(shape, 0.8, seed + 3)
        blossom = blossom + (C(255, 255, 255) - blossom) * ((speck > 0.82)[..., None] * 0.38)
        return blend(out, blossom, (pick < 0.64).astype(np.float32))
    if season == "summer":
        return ramp3(vt, *pal["green"])
    if season == "autumn":
        out = ramp3(vt, *pal["olive"])
        out = blend(out, ramp3(vt, *pal["red"]), (pick < 0.82).astype(np.float32))
        out = blend(out, ramp3(vt, *pal["orange"]), (pick < 0.68).astype(np.float32))
        out = blend(out, ramp3(vt, *pal["gold"]), (pick < 0.38).astype(np.float32))
        return out
    # winter
    out = ramp3(vt, *pal["frost"])
    return blend(out, ramp3(vt, *pal["snow"]), (pick < 0.64).astype(np.float32))


def add_snow(out, m, city, seed):
    """White caps on every silhouette that meets the sky, on treetops, and on the parapet."""
    H, W, _ = out.shape
    rng = np.random.default_rng(seed)
    snow_hi, snow_lo = C(252, 253, 255), C(196, 212, 236)
    ledge = LEDGE_TOP[city]

    def paint(mask_rows, thick, extra_alpha=None):
        # mask_rows: bool (H,W) of candidate pixels; thick: per-column thickness
        nonlocal out
        top = mask_rows & ~np.roll(mask_rows, 1, axis=0)
        top[0] = mask_rows[0]
        cap = np.zeros((H, W), dtype=np.float32)
        for k in range(8):
            sh = np.roll(top, k, axis=0)
            sh[:k] = False
            cap = np.maximum(cap, (sh & mask_rows & (k < thick[None, :])).astype(np.float32) * (1.0 - 0.09 * k))
        edge = ndi.gaussian_filter(cap, 0.55)
        # shadow side of the cap (bottom row darker/bluer) for a bit of volume
        bottom = (cap > 0.5) & ~np.roll(cap > 0.5, -1, axis=0)
        colour = np.where(bottom[..., None], snow_lo, snow_hi)
        out = blend(out, colour, np.clip(edge * 1.25, 0, 0.97))

    thick_cols = np.clip(2.2 + 3.2 * ndi.gaussian_filter1d(rng.random(W), 4) * 3.0, 2, 5.4)

    # 1. silhouettes against the sky (rooftops, spires, towers, cranes ...)
    solid = ~m["region"]
    solid[ledge - 8:] = False
    paint(solid & ndi.binary_dilation(m["region"], iterations=2), thick_cols)

    # 2. treetops (also the ones standing in front of buildings)
    fol = ndi.binary_closing(m["wf"] > 0.5, structure=np.ones((3, 3)), iterations=2)
    fol[ledge - 4:] = False
    paint(fol, np.clip(thick_cols - 0.4, 2, 5))

    # 2b. red/brown roofs: thicker snow along the ridge and upper slope
    h, sat, v = m["h"], m["s"], m["v"]
    roof = ((h < 28) | (h > 345)) & (sat > 0.40) & (v > 0.45) & (v < 0.97) & ~m["region"]
    roof = ndi.binary_closing(roof, structure=np.ones((3, 3)), iterations=1)
    roof = ndi.binary_opening(roof, structure=np.ones((2, 2)))
    roof[ledge - 14:] = False
    # only roofs: cap must have a non-roof pixel (sky / far building) directly above
    paint(roof, np.clip(thick_cols + 2.0, 4, 7.4))

    # 3. the parapet top face
    ledge_cols = np.clip(1.5 + 2.4 * ndi.gaussian_filter1d(rng.random(W), 2.5) * 3.0, 1, 4)
    for x in range(W):
        t = int(round(ledge_cols[x]))
        for k in range(t):
            y = ledge + 1 - 1 + k
            if y < H:
                out[y, x] = blend(out[y:y + 1, x:x + 1], snow_hi if k < t - 1 else snow_lo, np.array([[0.92]]))[0, 0]
    return out


def make(city, season):
    src = CITY_DIR / f"{city}-bg-v2.png"
    im = np.array(Image.open(src).convert("RGB"), dtype=np.float32)
    H, W, _ = im.shape
    cfg = SEASON[season]
    m = analyse(im)
    seed = {"munich": 11, "frankfurt": 23, "berlin": 37, "hamburg": 53}[city]

    # 1. global colour grade
    out = grade(im, **cfg["grade"])

    # 2. atmospheric haze on distant (mid-blue, low contrast) buildings
    if "haze" in cfg:
        hz_col, hz_amt = cfg["haze"]
        h, s, v = m["h"], m["s"], m["v"]
        hw = (smoothstep(190, 205, h) * (1 - smoothstep(240, 255, h))
              * smoothstep(0.10, 0.20, s) * (1 - smoothstep(0.50, 0.62, s))
              * smoothstep(0.45, 0.58, v) * (1 - smoothstep(0.80, 0.92, v)) * (1 - m["A"]))
        out = blend(out, hz_col, hw * hz_amt)

    # 3. foliage
    fol = recolor_foliage(season, (H, W), m["v"], seed)
    out = blend(out, fol, m["wf"])

    # 4. sky + clouds (keeps the original cloud silhouettes)
    sky = sky_gradient(H, W, cfg["sky"])
    cl_hi, cl_lo = cfg["cloud"]
    cloud_shade = smoothstep(0.35, 0.95, m["ca"])[..., None]
    cloud = cl_lo + (cl_hi - cl_lo) * cloud_shade
    sky_pix = blend(sky, cloud, smoothstep(0.04, 0.35, m["ca"]))
    out = blend(out, sky_pix, m["A"])

    # 5. snow
    if season == "winter":
        out = add_snow(out, m, city, seed + 5)

    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), "RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=list(LEDGE_TOP))
    ap.add_argument("--season", choices=SEASONS)
    args = ap.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for city in ([args.city] if args.city else LEDGE_TOP):
        for season in ([args.season] if args.season else SEASONS):
            img = make(city, season)
            dest = OUT_DIR / f"{city}-{season}.png"
            img.save(dest, optimize=True)
            print(f"wrote {dest.relative_to(ROOT)}  ({dest.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
