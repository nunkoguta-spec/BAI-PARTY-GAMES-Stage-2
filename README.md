<<<<<<< HEAD
# BAI PARTY GAMES — Stage 2: Tiled World + Parallax

Proyek dibangun ulang dari fondasi Stage 1. Stage 2 menambahkan dunia platformer berbasis Tiled JSON, kamera horizontal, dan parallax dari aset asli yang diunggah.

## Stack
- Phaser 3.90 + Vite 6
- JavaScript ES modules
- Tiled JSON runtime map (`public/maps/level-01.json`)
- Tiled editor sources (`tiled/level-01.json` dan `tiled/level-01.tmx`)
- Semua aset dimuat lokal dari `public/assets`; tidak memakai CDN.

## Menjalankan di Windows PowerShell
Gunakan Node.js 22 LTS atau lebih baru.

```powershell
cd "PATH\\KE\\BAI-PARTY-GAMES-Stage-2"
npm install
npm run dev
```

Buka `http://localhost:5173`.

Build:

```powershell
npm run build
```

## Yang ditambahkan pada Stage 2
- Tileset lingkungan baru berukuran 512x288 px dengan grid 16x9, setiap tile 32x32 px.
- Peta Tiled 120x12 tile (3840x384 px).
- Layer `Ground`, `Platforms`, dan object `PlayerSpawn`.
- Background sky, dua lapisan gunung, dan awan dengan scroll factor berbeda.
- Pohon, rumah, pagar, dan bunga dari aset dekorasi asli.
- Kamera mengikuti pemain secara horizontal dan memiliki batas dunia.
- Avatar modular Stage 1 tetap digunakan, tanpa sprite pengganti buatan kode.
- Tidak ada `Graphics`, `fillRect`, SVG, emoji, atau bentuk kode untuk menggantikan aset visual.

## Status Stage 2
Kode Stage 2 telah ditulis dan file JSON/TMX dibuat. Pemeriksaan sintaks dan integritas aset dilakukan saat paket disiapkan. `npm install` di lingkungan pembuatan mengalami timeout, sehingga runtime browser dan screenshot Stage 2 belum dapat diverifikasi di sini. Jalankan `npm install`, lalu `npm run dev` di komputer lokal dan kirim screenshot untuk pengujian visual.

## Tahapan berikutnya
Stage 3: gerakan kiri/kanan dan lompat menggunakan keyboard terlebih dahulu. Tidak ada kontrol HP atau multiplayer sebelum urutan tahap yang ditetapkan.

## Stage 2.1 — visual cleanup
The runtime scene now removes the dark mountain overlays and snow-peak sprites that looked like clouds. It keeps the pack's original sky and uses its original tree sprites at different scroll factors for layered parallax. All sprite assets remain unmodified. The uploaded pack does not contain a conventional bright-blue sky with white cloud sprites or distant green hills; those elements are intentionally not fabricated with code.
=======
# BAI-PARTY-GAMES-Stage-2
>>>>>>> 84e3a82b8deba1a20d1a2c13584b399f4a2edf4a


## Fitur tambahan

- Kustomisasi karakter tersedia di lobby HP: skin, celana, sepatu, atasan, mata, dan rambut. Pilihan disimpan di `localStorage` dan dikirim ke server saat join; semua pemain/TV menerima konfigurasi avatar melalui event posisi pemain.
- Question Box diacak server saat room dibuat. Semua perangkat dalam room menerima susunan posisi yang sama.
- Layout controller menggunakan safe-area iOS, dynamic viewport height, dan resize Phaser saat viewport/orientasi berubah. iOS Safari tidak mengizinkan fullscreen browser native dari halaman biasa; gunakan Add to Home Screen untuk pengalaman layar penuh yang lebih mendekati aplikasi.
