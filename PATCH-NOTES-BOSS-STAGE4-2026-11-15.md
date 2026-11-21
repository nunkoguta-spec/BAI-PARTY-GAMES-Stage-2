# Boss di stage 4 (Hamburg), NPC di stage 5 (Köln)

- Boss Tycoon (300 HP) dipindah dari Köln ke HAMBURG (x ≈ 8700, antara question box 13 dan 14). Köln sekarang tanpa enemy, hanya NPC Dinda + side quest.
- FIX: enemy München tidak pernah muncul (stage id `munich` vs folder aset `muenchen`). Sekarang dipetakan lewat `ENEMY_BY_STAGE`.
- FIX: di HP boss tidak bisa dilawan (serangan hanya tombol F). Ditambah tombol SERANG di HP, muncul saat dekat enemy. F di desktop tetap jalan; keduanya memakai `attackStageEnemy()`.
- Boss/enemy masih lokal per klien (tidak disinkron antar pemain), sama seperti sebelumnya. Boss tidak memengaruhi poin, leaderboard, atau finish.
- Tidak diverifikasi: `npm run build` dan tes visual di browser/HP.
