# BAI PARTY GAMES — Home Server Windows

Panduan menjalankan game dan Socket.IO dari satu laptop Windows, lalu membagikannya lewat Cloudflare Tunnel.

## Yang sudah disiapkan dalam paket ini

- Build Vite menghasilkan game utama (`dist/index.html`) dan controller HP (`dist/client-play/index.html`).
- `server/index.js` menyajikan folder `dist/` jika hasil build tersedia.
- Socket.IO dan frontend produksi menggunakan origin yang sama.
- Saat development, Vite tetap memakai Socket.IO di port `3001`.
- Script `npm run home-server` membangun frontend lalu menjalankan server.
- Sistem room, gameplay, aset, dan fitur game yang sudah ada tidak diganti oleh patch ini.

## Kebutuhan

1. Windows 10/11.
2. Node.js LTS (disarankan Node.js 22 LTS atau LTS terbaru yang kompatibel).
3. Koneksi internet kabel/LAN.
4. Cloudflared untuk URL publik sementara.

## A. Jalankan server lokal

1. Ekstrak ZIP project ke folder yang mudah ditemukan, misalnya `C:\BAI-PARTY-GAMES`.
2. Buka folder tersebut di File Explorer.
3. Klik dua kali `START-BAI-SERVER.bat`.
4. Pertama kali dijalankan, script akan memasang dependency dengan `npm ci` jika `node_modules` belum ada, lalu menjalankan build dan server.
5. Pastikan terminal menampilkan `BAI PARTY GAMES MULTIPLAYER SERVER` dan `http://localhost:3001`.
6. Pastikan file `dist/client-play/index.html` ada setelah build; halaman ini dipakai oleh QR controller HP.
7. Buka `http://localhost:3001/health`. Hasil yang benar berisi `"status":"ok"`.
8. Buka `http://localhost:3001/` untuk game di laptop.

Jangan tutup jendela server selama game dipakai.

## B. Tes di jaringan rumah

Cari IPv4 laptop:
- Buka PowerShell.
- Jalankan `ipconfig`.
- Catat `IPv4 Address` pada adapter Ethernet.

Dari HP/PC lain yang terhubung ke router yang sama, buka `http://IP-LAPTOP:3001/`.
Contoh format: `http://192.168.1.10:3001/`.

Jika Windows Firewall bertanya, izinkan Node.js pada jaringan Private. Jangan membuka akses Public secara sembarangan.

## C. Akses dari internet tanpa port forwarding

1. Install `cloudflared` dari dokumentasi resmi: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Pastikan server lokal sudah berjalan.
3. Klik dua kali `START-CLOUDFLARE-TUNNEL.bat`, atau buka terminal dan jalankan:
   `cloudflared tunnel --url http://localhost:3001`
4. Tunggu sampai terminal menampilkan URL `https://....trycloudflare.com`.
5. Bagikan URL HTTPS tersebut ke teman. Semua pemain memakai URL yang sama.
6. Jangan tutup jendela tunnel atau server.

Quick Tunnel tidak memerlukan kartu pembayaran atau domain sendiri. URL ini bersifat sementara dan dapat berubah saat tunnel dibuat ulang. Quick Tunnel cocok untuk uji coba, bukan jaminan layanan produksi 24/7.

## D. Menjalankan kembali

- Jalankan `START-BAI-SERVER.bat` untuk game server.
- Jalankan `START-CLOUDFLARE-TUNNEL.bat` untuk akses publik.
- Laptop harus tetap menyala, tidak sleep/hibernate, dan tetap terhubung ke internet.
- Matikan sleep saat laptop menjadi server dan gunakan adaptor daya.

## Catatan batasan dan keamanan

- Intel Core i3 generasi 3–5 + RAM 8 GB cukup untuk uji coba multiplayer skala kecil, tetapi jumlah pemain aman harus ditentukan lewat tes nyata.
- Kualitas upload, stabilitas LAN, suhu laptop, dan beban game memengaruhi hasil.
- Saat laptop mati atau koneksi internet putus, server tidak bisa diakses.
- Room disimpan di memori proses server; restart server akan menghapus room aktif.
- Jangan bagikan `hostToken`, file `.env`, atau kredensial apa pun.
- Jangan menganggap ini layanan 24/7: Quick Tunnel dan laptop rumahan tidak memberikan SLA.
