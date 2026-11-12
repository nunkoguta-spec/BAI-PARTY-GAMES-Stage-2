# Bahnhof fix — 2026-11-12

## Masalah yang ditemukan
- `bahnhof-clean-scene.png` adalah komposit 960x270 dengan latar biru + skyline "baked" di dalamnya, jadi Bahnhof tampak seperti kotak gelap menempel di stage.
- Di dalam komposit itu kereta terpotong, papan jadwal terpotong di pojok, dan peron menimpa kereta.
- `TrainTravelScene` meregangkan gambar: kereta 248x160 dipaksa jadi 250x98 (rasio 1.55 -> 2.55) dan latar dipaksa 480x144 (rasio 3.56 -> 3.33).

## Perbaikan
- Sprite dipotong satu per satu dari sheet Bahnhof Asset Pack v2 (tampak samping, transparan): `public/assets/bahnhof/sprites/` (22 file: station, train, platform-a/b, track-tile, papan, lampu, bangku, kios, dll).
- `BootScene.js`: memuat sprite baru dengan key `bhf-*`.
- `WorldScene.createBahnhof()`: Bahnhof disusun dari sprite terpisah (peron kiri/kanan, stasiun, lampu, papan, kios) tanpa latar baked. Aset lama tetap dimuat sebagai fallback.
- `TrainTravelScene.js`: kereta pakai rasio asli (scale 0.8), stasiun dan peron dari sprite baru, filter NEAREST agar pixel art tajam.

## Validasi
- `node --check` lolos untuk WorldScene, BootScene, TrainTravelScene.
- Belum dijalankan di browser/Vite (dependensi tidak terpasang di lingkungan ini). Cek visual: `npm ci && npm run dev`, lalu jalan ke ujung stage.
- Posisi sprite (x/y/scale) ada di `createBahnhof()` dan mudah disetel bila perlu.
