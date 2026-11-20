# Jebakan di setiap stage — 2026-11-15

Setiap stage (München, Frankfurt, Berlin, Hamburg, Köln) sekarang punya jebakan di jalan. Kena jebakan = **HP berkurang**
(sistem HP / K.O. yang sudah ada: HP 0 = K.O., -25 poin sekali, respawn di awal stage). Tidak ada pengurangan poin langsung.

## 3 jenis jebakan
| Jenis | Perilaku | Damage (Mün / Fra / Ber / Ham / Köln) |
|---|---|---|
| Paku (`spikes`) | selalu berbahaya | 8 / 8 / 10 / 12 / 6 |
| Paku muncul (`pop`) | siklus 3 dtk: aman → **peringatan** (kilau merah + getar) → muncul → berbahaya ±0,7 dtk → turun | 12 / 12 / 14 / 18 / 10 |
| Tong guling (`roller`) | tong bolak-balik di jalur patroli (ada rel tipis di tanah) | 10 / 10 / 12 / 15 / 8 |

Semua bisa dilewati dengan **satu lompatan biasa**. Ada rambu peringatan kuning sebelum jebakan pertama tiap stage.
Jumlah: München 5, Frankfurt 5, Berlin 7, Hamburg 8 (sebelum boss), Köln 5 (lebih ringan, stage damai).

## Aturan (server-authoritative)
- Server yang memutuskan kena/tidak (posisi dari klien + jam server) di `player:move`; klien hanya menggambar.
- Setelah kena: kebal 1,5 dtk, terpental + guncangan layar, teks "JEBAKAN!" (juga terlihat di TV / pemain lain).
- Tidak berlaku saat: kuis / battle terbuka, sudah K.O., sudah finish, room belum `playing`.
- Paku muncul hanya melukai di jendela "terjulur" yang dipersempit, jadi yang terlihat aman tidak pernah melukai.
- Posisi jebakan menjauhi stasiun, Question Box, zona fight enemy/boss, dan NPC Köln (dicek otomatis di tes).

## Sinkron waktu
`src/game/clock.js` mengukur selisih jam browser vs server (`clock:sync`) supaya paku muncul / tong guling di layar sama
fasenya dengan yang dipakai server. Dipanggil di HP (tiap 30 dtk) dan TV.

## File
Baru: `src/game/traps.js` (data + timing + hit test, dipakai server & klien), `src/game/clock.js`,
`public/assets/traps/*.png`, `tools/make-trap-sprites.py`, `scripts/test-traps.js`.
Diubah: `server/index.js`, `src/scenes/WorldScene.js`, `src/scenes/BootScene.js`, `client-play/phone-game.js`, `src/hostPanel.js`.

## Mengubah jebakan
- Posisi / jumlah / jenis: `LAYOUT` di `src/game/traps.js` (x lokal dari awal stage). Jalankan `node scripts/test-traps.js`
  untuk memastikan tidak menabrak stasiun / box / enemy / NPC.
- Damage: `TRAP_DAMAGE`. Timing paku muncul: `TRAP.types.pop`. Kebal setelah kena: `TRAP.hitCooldownMs`.
- Pengaturan host `hazardPenalty` (poin) tidak dipakai jebakan ini.

## Verifikasi
- `node scripts/test-traps.js`: 31/31 lulus (penempatan, timing, hit box, server asli: HP -8, cooldown, lompat lolos,
  stage lain tidak kena, Köln lebih ringan, K.O. sekali -25, respawn HP penuh). `node scripts/test-battle.js` tetap lulus.
- `npm run build` sukses.
- BELUM dicoba di browser / HP / TV (tidak ada browser di lingkungan ini). Cek: ukuran sprite di layar HP, rasa knock-back,
  dan fase paku muncul di TV vs HP.
