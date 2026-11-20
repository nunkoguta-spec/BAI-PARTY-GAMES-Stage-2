# Tanpa Question Box (v2) — 2026-11-20

- **Jebakan Kotak Palsu (mimic) dihapus**: ini yang masih tampil sebagai kotak "?". Slot-nya diganti paku/paku muncul
  (München, Frankfurt, Berlin) supaya tingkat susah tetap sama. Hapus juga `public/assets/traps/mimic.png` (tidak dipakai lagi).
- **Kode kuis lama dihapus dari server**: `finishQuiz`, `activeQuiz`, event `quiz:*`, `tv:quiz-status`.
- **Pengaturan "Waktu Kuis" dihapus** dari panel host dan validasi server (tidak ada lagi yang memakainya).
- Tes disesuaikan: 7 jenis jebakan, fairness tetap diuji (53/53), semua tes lain + build lulus.
- Belum dibersihkan: UI kuis di `client-play` (panel kuis, handler `quiz:show`/`quiz:result`) — tidak pernah dipicu lagi, tapi
  terhubung ke alur pause/akhir game; sebaiknya dihapus sambil dites di browser/HP.
