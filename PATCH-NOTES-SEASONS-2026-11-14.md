# Musim per stage (2026-11-14)

| Stage | Kota | Musim |
|---|---|---|
| 1 | München | Herbst (autumn) |
| 2 | Frankfurt | Sommer (summer) |
| 3 | Berlin | Winter |
| 4 | Hamburg | Frühling (spring) |

Ganti musim = ganti satu kata `season: "..."` di `src/game/course.js`
(spring | summer | autumn | winter). Semua 16 kombinasi kota x musim sudah ada.

## Yang berubah
- `public/assets/backgrounds/cities/seasons/{kota}-{musim}.png` (16 file): langit, awan, daun/pohon,
  grading warna, salju di atap/pohon/parapet. Dibuat dari panorama asli oleh `tools/make-season-backdrops.py`
  (`pip install numpy scipy pillow`), posisi landmark tidak berubah.
- `src/game/seasons.js` (baru): warna trotoar, tint stasiun, partikel tiap musim.
- `course.js`: field `season` per stage. `BootScene.js`: load panorama musiman.
- `WorldScene.js`: backdrop musiman, partikel (daun / kelopak sakura + kupu-kupu / salju / burung + kilau),
  detail trotoar (salju, daun gugur, bunga), tint stasiun, kartu transisi "STAGE n • HERBST".
  Salju Berlin yang hard-coded dan frost di semua trotoar dihapus (sekarang winter-only).

## Belum
- Scene kereta (TrainTravelScene) masih pakai langit sendiri, belum ikut musim.
- Diverifikasi: `node --check`, `vite build` sukses. Belum dijalankan di browser/perangkat.
