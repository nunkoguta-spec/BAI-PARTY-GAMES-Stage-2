# Sistem HP, damage, dan penalti K.O. (server-authoritative) — 2026-11-15

## Aturan yang berlaku
1. HP maksimal tiap player = 100 (`BATTLE.playerMaxHp`).
2. Jawaban battle BENAR: player +poin (`correctPoints` dari pengaturan host, default 10) dan HP enemy turun 1/N.
3. Jawaban battle SALAH: tidak ada poin, enemy menyerang, HP player turun (10/10/12/15 per stage). Soal diulang di akhir antrean.
4. HP player 0 = K.O.: penalti **-25 poin** (`BATTLE.koPenalty`).
5. Setelah K.O. server me-respawn player otomatis (1,8 dtk) dengan HP penuh di awal stage yang sedang dimainkan. Progres enemy tetap tersimpan.
6. Penalti hanya SEKALI per K.O.: selama `player.ko` aktif semua damage/jawaban/kontak ditolak server.
7. Enemy contact (menabrak enemy di luar kuis) juga mengurangi HP, divalidasi server (jarak, stage, cooldown 1,2 dtk).

## HP antar-stage
HP disimpan di server (`player.hp`) dan di klien di `window.baiPlayerHpState`. Pindah stage (kereta -> `scene.restart`) TIDAK mereset atau memulihkan HP. HP hanya kembali 100 pada: awal sesi (`room:start`), `room:restart`, atau respawn setelah K.O. HP juga dipulihkan dari server saat reload lewat `battle:state`.

## Sinkronisasi / multiplayer
- Server mengirim `player:hp` (hp, maxHp, ko, damage, penalty, score, respawn) ke seluruh room; `tv:player-ko`, `tv:enemy-hit`.
- `hp/maxHp/ko` juga ada di snapshot posisi, daftar pemain, dan leaderboard (`hp`, `kos`).
- Skor hanya diubah server; HP dan skor di HP pemain dibaca dari event server.

## Visual
- HP bar player (HUD) memakai nilai server; teks berubah jadi "K.O." saat KO.
- Pemain lain (dan layar TV) mendapat HP bar kecil di atas nameplate + angka damage, K.O. (abu-abu, rebah) dan RESPAWN.
- Animasi: pukulan player + slash (benar), serangan enemy + shake (salah), K.O. (rebah, abu-abu, "-25 POIN"), respawn. Damage baru tampil saat serangan enemy mengenai (`holdHp`/`releaseHp`).
- Perbaikan: bar HP enemy dipotong memakai ukuran tekstur sebenarnya (340px, sebelumnya 510px sehingga bar baru terlihat berkurang setelah HP < 67%).

## Tidak diubah
Sistem kuis Question Box, randomisasi soal, karakter, aset, hazard, side quest. Stage 5 (Köln) tetap tanpa enemy: tidak ada damage, poin battle, maupun efek leaderboard dari sistem ini. Question Box hanya ditambah satu guard: pemain yang sedang K.O. tidak bisa membuka kuis.

## File
`src/game/battle.js`, `server/index.js`, `src/scenes/WorldScene.js`, `client-play/controller.js`, `client-play/phone-game.js`, `src/hostPanel.js`, `scripts/test-battle.js`.

## Verifikasi
- `node --check` lolos untuk semua file yang diubah.
- Logika server diuji dengan harness Socket.IO tiruan (22 pemeriksaan: poin, damage, K.O. sekali, respawn, HP lintas 4 stage, kontak, Köln): semua lulus.
- BELUM dijalankan: `npm run build`, `npm run test:integration` (butuh `npm ci`), dan uji visual di browser/HP + TV. Jalankan `node scripts/test-battle.js` setelah `npm ci`.

## Update: bank 100 soal, acak, tanpa pengulangan
- `server/battleQuestions.js`: 100 soal battle (München 20, Frankfurt 25, Berlin 25, Hamburg 30), semua unik. Jumlah soal yang harus dijawab benar tetap 3 / 5 / 8 / 10; sisanya cadangan.
- Tiap fight memakai urutan acak dari seluruh pool stage tersebut. Soal yang sudah muncul tidak muncul lagi di fight itu.
- Jawaban SALAH: soal diganti soal BARU (tidak lagi diulang di akhir antrean). Hanya jika seluruh pool habis, pool diacak ulang dan soal yang barusan salah tidak langsung muncul lagi.
- Urutan pilihan A-D diacak server tiap soal tampil, huruf jawaban benar disimpan di server (tidak dikirim ke klien).
- Bank Question Box (`QUESTION_BANK`, 27 soal) TIDAK diubah.
- `scripts/test-battle.js` disesuaikan (mencari huruf benar lewat teks pilihan).

## Update: tingkat kesulitan per stage
**Level stage** (`src/game/battle.js`): München LEVEL 1 · A1 (poin x1) | Frankfurt LEVEL 2 · A1+ (x1,5) | Berlin LEVEL 3 · A2 (x2) | Hamburg BOSS LEVEL 4 · A2/B1 (x3). Poin per jawaban benar = `correctPoints` x pengali (default 10 / 15 / 20 / 30). Pengali dan label bisa diubah di `BATTLE.stages`.

**Tier soal di dalam satu fight** (`BATTLE_TIERS` di `server/battleQuestions.js`): tiap soal ditandai 1 MUDAH / 2 SEDANG / 3 SULIT. Satu fight selalu naik dari mudah ke sulit (`battlePlan`): 3 soal = 1-2-3, 5 soal = 1-1-2-3-3, 8 soal = 1-1-1-2-2-3-3-3, 10 soal = 1-1-1-2-2-2-2-3-3-3. Soal diambil acak dari tier yang dibutuhkan, tanpa pengulangan. Jawaban salah diganti soal BARU dengan tier yang sama.

**Tampilan:** panel battle menampilkan level stage, tier soal (hijau/kuning/merah), dan poin yang didapat. Nama di atas musuh memuat level (LV.1 · A1 ... BOSS LV.4 · B1).
