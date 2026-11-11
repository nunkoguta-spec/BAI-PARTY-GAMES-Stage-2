<<<<<<< HEAD
# BAI PARTY GAMES

Multiplayer party adventure bertema Jerman. Stack: Node.js, Express, Socket.IO, Vite, Phaser 3.

## Menjalankan di Windows

1. Install Node.js LTS.
2. Buka folder project melalui PowerShell.
3. Jalankan `npm install`.
4. Jalankan `npm run dev`.
5. Buka `http://localhost:5173` untuk layar TV/host.
6. HP pemain membuka `http://IP-KOMPUTER:5173/client-play/` pada jaringan Wi-Fi yang sama.

`npm run dev` menjalankan frontend Vite dan server Socket.IO sekaligus. Untuk menjalankan server saja gunakan `npm run server`. Jangan menjalankan dua server pada port 3001 bersamaan; jika muncul `EADDRINUSE`, hentikan proses lama terlebih dahulu.

## Build dan pengujian

- `npm run build` — build frontend produksi.
- `npm run test:integration` — uji room, join multiplayer, subscribe TV, sinkronisasi gerak, kuis, scoring, pause/resume, kick, dan podium.

## Fitur dan perbaikan dalam paket ini

- Branding utama diperbarui menjadi **BAI PARTY GAMES**.
- Lobby HP memiliki category rail vertikal, live preview avatar, dan grid pilihan sprite yang menyimpan pilihan secara lokal.
- TV Spectator mode AUTO menampilkan overview seluruh pemain dalam satu frame; mode MANUAL tetap tersedia untuk mengikuti pemain tertentu.
- Animasi avatar menghitung kolom frame dari ukuran texture aktif. Sprite sheet Jump/Interact/Hurt memiliki 3 kolom, sedangkan Idle/Walk memiliki 4 kolom; indeks variasi kostum tidak lagi diasumsikan selalu 4 kolom.
- Durasi default permainan 12 menit. Pilihan host dibatasi ke 10, 12, atau 15 menit.
- Rute dunia dibagi menjadi empat segmen: München, Frankfurt, Berlin, dan Hamburg. München memakai backdrop Marienplatz; Frankfurt, Berlin, dan Hamburg memakai landmark pixel-art yang digambar dari Phaser Graphics pada koordinat dunia.
- Layout HP mempertahankan safe-area, dynamic viewport sizing, dan kontrol sentuh untuk Android/iOS.

## Catatan kompatibilitas

Browser fisik Android/iOS dan orientasi perangkat perlu diuji pada perangkat target. Pada iOS Safari, gunakan Add to Home Screen jika ingin tampilan aplikasi yang lebih penuh. Pengujian integrasi Socket.IO dilakukan di lingkungan pengembangan; pengujian build produksi pada lingkungan Linux ini terkendala paket native Rollup Windows yang ikut terbundel dalam ZIP sumber. Di Windows, jalankan `npm install` agar dependency sesuai sistem operasi sebelum build.

## Deployment online

Lihat `DEPLOY-ONLINE.md`. Set `VITE_SERVER_URL` pada frontend dan `CLIENT_URL` pada server sesuai URL deployment.


## Source correction pass — 2026-11-11
- Stage-specific city landmark graphics are now mounted in the live Phaser scene; Munich facades are restricted to München.
- Modular costume layers remain visible in local and remote avatars instead of being hidden by the unrelated mascot pose overlay.
- A city transition card appears when the stage changes.
- See `HANDOFF-STATUS.md` for validation results and the Male/Female source-asset limitation.
=======
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
>>>>>>> 9d50e30d7c4301c8064254cef288197da15e9467
