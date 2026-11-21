# Jebakan V2 — "bukan jebakan biasa" — 2026-11-18

Paku / paku muncul / tong guling tetap ada, tapi sekarang tiap stage dicampur dengan 5 jenis jebakan baru yang
punya **cara main berbeda** (bukan sekadar "jangan diinjak"). Semuanya tetap server-authoritative dan murni fungsi
dari jam server, jadi TV + semua HP melihat fase yang sama.

| Jenis | Stage | Cara kerja | Cara lolos |
|---|---|---|---|
| **Tram lewat** (`tram`) | München, Hamburg, Köln | Lampu sinyal + bonsel menyala ±1,5 dtk sebelum tram melaju di rel jalan. Arah tram berganti tiap siklus. Di Hamburg ada **tram ganda**: tram kedua dari arah sebaliknya menyusul; lampu baru mati setelah keduanya lewat. | Tunggu, atau lompat di atas atap |
| **Eiszapfen** (`icicle`) | Berlin | Kanopi bersalju: es bergetar + penanda merah membesar di tanah, lalu jatuh dan pecah jadi cincin pecahan rendah. Tiga kanopi berurutan dengan fase berbeda = harus "menari" mengikuti ritme. | Keluar dari bawah kanopi / lompati pecahan |
| **Möwe** (`gull`) | Hamburg | Camar berputar, melayang di atas penanda "!" (titik tukik **berubah tiap siklus**), menukik, lalu meluncur di tanah. | Geser dari titik tukik, lompati luncurannya |
| **Kotak palsu** (`mimic`) | München, Frankfurt, Berlin | Menyerupai Question Box asli. Hanya menggigit kalau **kamu lompat menabraknya**; berjalan di bawahnya aman. Petunjuk: tanda "?" berkedip merah tiap 2,6 dtk. | Jangan lompat ke kotak yang "?"-nya merah |
| **Bandul** (`pendulum`) | Frankfurt (bola penghancur), Köln (Weihrauchfass Dom) | Bola berat berayun melintasi jalan. | Tunggu ayunannya menjauh atau lompati bagian bawah ayunan |

Damage naik per stage (`TRAP_DAMAGE`), Köln tetap paling ringan. Jumlah jebakan: München 5, Frankfurt 5, Berlin 8, Hamburg 5 (berat), Köln 5.

## Jaminan "adil" (diuji otomatis)
`node scripts/test-traps.js` sekarang mensimulasikan pemain yang berlari/melompat melawan setiap jebakan dengan fungsi hit-test
yang sama dengan server: **dari setiap momen kedatangan selalu ada jalan lewat** (tunggu maksimum: tram 3,2 dtk, lainnya ≤1,5 dtk;
hasil terukur: tram 0,7 dtk, icicle 0,3, gull 0,1, pendulum 0,2). Penempatan juga dicek menjauhi stasiun, Question Box asli (≥70 px),
zona enemy/boss, dan NPC Köln memakai `trapExtent()` (jangkauan bahaya sebenarnya tiap jebakan).

## File
Baru: `src/scenes/trapVisuals.js` (semua gambar jebakan), `public/assets/traps/{tram,rails,signal,icicle,canopy,gull,mimic,ball,censer}.png`,
`scripts/test-trap-visuals.js`.
Diubah: `src/game/traps.js` (8 jenis, `LAYOUT`, state per jenis, `trapExtent`, `trapCenterX`), `server/index.js` (arah knock-back via
`trapCenterX`), `src/scenes/WorldScene.js` (membuat/update jebakan lewat `trapVisuals.js`), `src/scenes/BootScene.js` (memuat sprite),
`src/audio/retroAudio.js` (`playBell`, `playShatter`, `playGull`), `tools/make-trap-sprites.py` (sprite baru), `scripts/test-traps.js`.

## Mengubah
Posisi/jenis: `LAYOUT` di `traps.js` → jalankan `node scripts/test-traps.js`. Opsi: tram `half`/`double`, pendulum `skin`/`len`, gull `dir`,
semua jenis `phaseMs`. Timing tiap jenis: `TRAP.types.<jenis>`.

## Verifikasi
- `node scripts/test-traps.js`: 57/57 lulus (placement, fairness, logika tiap jenis, server asli: HP, cooldown, K.O.).
- `node scripts/test-trap-visuals.js`: semua visual jalan tanpa error (scene tiruan).
- **BELUM dicoba di browser / HP / TV** dan `vite build` tidak bisa dijalankan di lingkungan ini (modul native rollup). Cek manual:
  ukuran sprite di layar HP, kesan visual tram/camar/kotak palsu, volume bonsel, apakah kedipan "?" merah terlihat jelas, rasa knock-back.
- `scripts/test-battle.js` menggantung (timeout) juga pada zip asli tanpa perubahan ini — masalah yang sudah ada, tidak diselidiki.
