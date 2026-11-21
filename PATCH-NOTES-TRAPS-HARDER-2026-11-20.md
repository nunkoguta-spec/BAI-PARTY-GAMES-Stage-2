# Jebakan lebih susah (tetap gaya Mario) — 2026-11-20

Prinsip Mario dipertahankan: semua jebakan tetap **punya tanda peringatan**, ritmenya bisa dipelajari, dan ada jalan lewat
dari setiap momen kedatangan (diuji otomatis di `scripts/test-traps.js`, simulasi pemain lari/lompat).

## Yang berubah
- **Ritme lebih cepat, peringatan lebih singkat**: paku muncul 3,0→2,4 dtk, bandul 2,8→2,3 dtk (ayunan 52°→58°), eiszapfen 3,6→3,0 dtk
  (peringatan 1,0→0,8 dtk), camar 4,4→3,6 dtk (titik tukik makin lebar ±40), tram 6,0→5,0 dtk (peringatan 1,5→1,0 dtk; tram ganda 7,2→6,2 dtk).
- **Gauntlet**: paku 2 petak di tiap stage awal, dua paku muncul berurutan (Frankfurt) yang fasenya bergantian, 4 kanopi es
  berurutan (Berlin, sebelumnya 3), tong guling lebih cepat, paku/pop lebih lebar.
- **Damage naik ±25%** (Hamburg paling berat, Köln hanya naik sedikit karena stage santai).
- **Invulnerability setelah kena**: 1,5 dtk → 1,2 dtk.

## Pengujian
`node scripts/test-traps.js`: 57/57 lulus (penempatan, keadilan, server). Angka timing di tes disesuaikan dengan nilai baru.
Belum dicoba di browser/HP: rasa susahnya perlu dites langsung. Semua nilai ada di `TRAP.types` dan `LAYOUT` (`src/game/traps.js`).
