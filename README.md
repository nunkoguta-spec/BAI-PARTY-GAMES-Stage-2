# BAI PARTY GAMES — Deutsch Adventure

Game party multiplayer pembelajaran bahasa Jerman berbasis Phaser 3, Vite, Socket.IO, dan Node.js.

## Menjalankan lokal
```powershell
npm install
npm run dev
```

Buka `http://localhost:5173`. Jalankan server multiplayer dengan `npm run server` pada terminal terpisah. Build frontend: `npm run build`.

## Peta dan aset
Dunia permainan memakai peta Tiled JSON lokal di `public/maps/level-01.json`, tileset dan sprite lokal di `public/assets`, serta konfigurasi kursus di `src/game/course.js`.

## Deployment online
Instruksi deployment host dan server ada di `DEPLOY-ONLINE.md`. Atur `VITE_SERVER_URL` untuk frontend dan `CLIENT_URL` untuk server.

## Fitur tambahan
- Kustomisasi karakter tersedia di lobby HP: skin, celana, sepatu, atasan, mata, dan rambut. Pilihan disimpan di `localStorage` dan dikirim ke server saat join; semua pemain/TV menerima konfigurasi avatar melalui event posisi pemain.
- Question Box diacak server saat room dibuat. Semua perangkat dalam room menerima susunan posisi yang sama.
- Layout controller menggunakan safe-area iOS, dynamic viewport height, dan resize Phaser saat viewport/orientasi berubah. iOS Safari tidak mengizinkan fullscreen browser native dari halaman biasa; gunakan Add to Home Screen untuk pengalaman layar penuh yang lebih mendekati aplikasi.

## Stage 2.1 — visual cleanup
The runtime scene removes dark mountain overlays and snow-peak sprites. It uses local pack assets and layered parallax without modifying source sprites.

- Kustomisasi karakter tersedia di lobby HP: skin, celana, sepatu, atasan, mata, dan rambut. Pilihan disimpan di `localStorage` dan dikirim ke server saat join; semua pemain/TV menerima konfigurasi avatar melalui event posisi pemain.
- Question Box diacak server saat room dibuat. Semua perangkat dalam room menerima susunan posisi yang sama.
- Layout controller menggunakan safe-area iOS, dynamic viewport height, dan resize Phaser saat viewport/orientasi berubah. iOS Safari tidak mengizinkan fullscreen browser native dari halaman biasa; gunakan Add to Home Screen untuk pengalaman layar penuh yang lebih mendekati aplikasi.
