# Question Box dihapus — 2026-11-20

- `course.js`: `questionBoxes` kosong.
- Server: hapus pengacakan box, `quiz:request`, `quiz:answer`, bank soal box, dan event `room:question-boxes`.
- Klien: hapus pembuatan box, collider, dan handler `question-box-hit` (WorldScene, phone-game, controller, BootScene).
- Tes disesuaikan (full-suite, quest, regressions, verify-ground-fix). Semua tes + build lulus.
- Catatan: jebakan **Kotak Palsu (mimic)** tetap ada dan masih berbentuk kotak "?" — sekarang tanpa kotak asli sebagai pembanding.
- Kode tidur: `finishQuiz`/`activeQuiz`/`quiz:result` di server dan `quiz:show` di controller tidak terpakai lagi.
