# Anti-freeze + Stage scene polish — 2026-11-21

## Anti-freeze
- `src/game/loopGuard.js` (baru): Phaser tidak menjadwalkan frame berikutnya kalau ada exception di satu frame, sehingga game beku permanen. Loop sekarang dibungkus try/catch; error dicatat di console dan `window.baiLoopErrors`. Dipasang di `main.js` (host/TV) dan `client-play/phone-game.js` (HP).
- `WorldScene.createWorld`: reset `introActive`, `quizPaused`, `battleActive`, `playerKo`, dll. (instance scene dipakai ulang saat restart).
- `guardStuckStates()`: intro > 5.5 dtk, boss intro > 5 dtk, atau K.O. > 8 dtk otomatis dilepas.
- Listener `postupdate` bocor tiap pindah stage (2→6) -> dilepas saat shutdown. Interval timer dibersihkan saat shutdown.
- `player:moved` tidak lagi didaftarkan dua kali (update avatar remote dobel).
- Mode host tidak lagi dispatch `bai-stage` tiap frame.

## Intro / countdown
- HP: hanya modal DOM yang tampil (sebelumnya modal DOM + bubble Phaser tumpang tindih). Phaser hanya mengunci input + confetti (`playGameStartIntro(undefined, {silent:true})`).
- TV/host: bubble Phaser, teks hitung mundur sekarang di dalam bubble.

## Scene tiap stage
- `src/scenes/streetDressing.js` (baru): props jalan khas tiap kota (bangku, lampu, tong, kios, peti, pagar, bunga, bollard Hamburg), menghindari posisi jebakan/musuh, mood tint per kota + vignette.
- Papan "HBF • AUSGANG" digeser agar tidak menimpa atap stasiun.

## Verifikasi (Chromium headless)
Alur München->Köln via kereta, 60 FPS, 0 error halaman, listener stabil, `test-trap-visuals` lulus.
Freeze asli di PC kamu belum bisa direproduksi di headless; kalau masih terjadi cek Console / `window.baiLoopErrors`.
