# Asset manifest — BAI PARTY GAMES Stage 2

## Platformer tile pack (existing)
- Path: `tiles/tileset.png`
- Dimensions: 256x256 RGBA; grid 8x8; cells 32x32.
- Source ZIP includes `readme.txt` declaring CC0.
- Kept from Stage 1 but not used by Stage 2 map.

## Mountains tiles/background pack (new upload)
- Main tileset: `tiles/mountains-tiles.png`, 512x288 RGBA.
- Verified grid: 16 columns x 9 rows = 144 atlas slots, each 32x32; the source listing describes 120 actual tile assets, with unused/transparent atlas slots left empty.
- Runtime Tiled map uses this pack as its only world tileset.
- `backgrounds/mountains/sky.png`: 768x288.
- Original mountain backgrounds:
  - `mountains-1.png`: 768x587.
  - `mountains-2.png`: 768x638.
  - `mountains-3.png`: 768x676.
  - `mountains-4.png`: 768x741.
- Parallax derivatives:
  - `mountains-far.png`: crop of top 768x288 pixels from original Mountains 2.
  - `mountains-mid.png`: crop of top 768x288 pixels from original Mountains 1.
  - Cropped only; no resizing, recoloring, or redrawing.
- Decoration folder: `decorations/mountains/` (31 original PNGs).
- Used decorations include 6 cloud sprites, 3 tree sprites, house, flowers, and fences.
- Creator: karsiori. License: CC0, confirmed on the creator's source page (https://karsiori.itch.io/free-pixel-art-mountains-tileset-and-backgrounds); the uploaded ZIP itself did not include a separate license/readme file.

## Customizable avatar pack
- Path: `avatar/`
- 189 files extracted from uploaded archive.
- `License_CC0.txt` declares CC0 1.0 Universal.
- Idle Front sheet cells are 32x32; 4 columns per sheet.
- Avatar layers: body, bottoms, shoes, top, eyes, hair.
- Default avatar uses the first row of each original sheet.

## Rendering and provenance
- Phaser uses `pixelArt: true`, `roundPixels: true`, and `antialias: false`.
- World tiles are 32x32; mountain tileset uses the same 32x32 grid.
- No sprites, tiles, icons, or characters are drawn using code.
- The two mountain parallax images are pixel crops from original uploaded PNGs.

## Stage 2.1 runtime selection
- Background: original `backgrounds/mountains/sky.png` only.
- Parallax depth is built from original tree sprites at three scroll factors.
- Foreground decorations: original tree, house, flower, and fence sprites.
- Deliberately excluded from runtime: `mountains-far.png`, `mountains-mid.png`, and `cloud-1.png` through `cloud-6.png`; visual inspection found dark mountain silhouettes and snow-capped mountain shapes, not suitable blue-sky clouds.

## Stage 2.2 — tema cerah ala platformer klasik
Dibuat dengan `python3 tools/make-bright-assets.py` (hanya pemetaan palet piksel; bentuk, ukuran, alpha tidak berubah; file asli tetap ada):
- `backgrounds/mountains/sky-bright.png` ← sky.png (langit biru)
- `backgrounds/mountains/mountains-snow-blue.png` ← mountains-4.png (gunung biru, puncak salju putih)
- `backgrounds/mountains/hills-green.png` ← mountains-3.png (bukit hijau muda)
- `backgrounds/mountains/forest-green.png` ← mountains-1.png (hutan pinus hijau)
- `tiles/mountains-tiles-bright.png` ← mountains-tiles.png (rumput hijau terang, tanah cokelat)
- Awan putih asli `cloud-1/2/3/5/6` dipakai kembali (sebelumnya salah dikira puncak gunung), bergerak pelan.
- Kamera dikunci vertikal (scrollY=20); `main.js` menghitung skala integer sebelum Phaser dibuat (memperbaiki canvas yang membesar & terpotong).
