# PATCH: Refresh Host & Client Play (Reconnect / Session Recovery)

## Masalah
1. Host di-refresh -> room baru dibuat (kode berubah), pemain tertinggal di room lama
   ("Koneksi terputus. Mencoba menyambung kembali..." selamanya).
2. Client play di-refresh / koneksi putus -> pemain dihapus server dan tidak bisa masuk lagi
   (socket.id berubah tiap reconnect, controller tidak pernah join ulang).

## Perbaikan
### server/index.js
- Pemain punya `playerToken` (dikembalikan saat `room:join`). Join dengan token yang sama
  = melanjutkan pemain lama (stage, posisi, skor, HP, quest) walau socket.id baru.
- Disconnect tidak lagi menghapus pemain langsung: ada grace period 3 menit (`PLAYER_GRACE_MS`),
  ditandai `connected:false`.
- Room tidak dihapus langsung saat kosong: 20 menit (`ROOM_IDLE_MS`) agar host bisa kembali.
- Event baru `room:resume-host` (validasi `hostToken`) untuk host yang refresh.
- Status `ended` menyimpan hasil (leaderboard/winner) sehingga host/pemain yang kembali
  langsung melihat podium.
- `hostToken` kini token acak kriptografis.

### src/session.js (baru), src/hostPanel.js, src/main.js
- Host menyimpan `{roomCode, hostToken}` di localStorage. Setelah refresh, halaman otomatis
  masuk mode host dan melanjutkan room yang SAMA. Tambahkan `?new=1` di URL untuk paksa room baru.

### client-play/controller.js
- Menyimpan `{roomCode, playerToken, name, avatar}` di localStorage.
- Refresh halaman -> auto-join kembali dan lanjut dari stage/posisi terakhir.
- Socket reconnect (sinyal hilang, HP sleep) -> otomatis `room:join` ulang dengan token.
- Jika room benar-benar sudah ditutup -> sesi dibersihkan, pemain kembali ke form join.
- Kicked oleh host -> sesi dihapus (tidak auto-join lagi).
- Layar Game Over ditampilkan kembali bila room sudah berakhir.

## Catatan
- Pemain yang terputus > 3 menit dihapus; jika room masih ada, join ulang membuat pemain baru.
- Jika server Render restart/sleep (free tier), room di memori hilang; itu di luar patch ini
  (butuh penyimpanan persisten).
