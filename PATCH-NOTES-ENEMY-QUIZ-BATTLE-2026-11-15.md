# Enemy battle: musuh dikalahkan dengan menjawab soal

## Aturan
- 4 stage punya musuh: München 3 soal, Frankfurt 5 soal, Berlin 8 soal, Hamburg (boss Tycoon) 10 soal. Köln tidak punya musuh (stage NPC).
- Soal naik tingkat: A1 dasar -> A1 tata bahasa -> A2 -> A2/B1 (boss). Soal + kunci jawaban hanya ada di server (`server/battleQuestions.js`).
- Dekati musuh -> tombol SERANG (HP) / F (desktop) -> panel soal. Benar = karakter memukul, HP musuh turun 1/N. Salah = musuh menyerang, HP pemain turun (10/10/12/15), soal diulang di akhir antrean, jawaban benar TIDAK dibocorkan.
- Musuh mati setelah semua soal terjawab benar. Progres tersimpan di server (bisa MUNDUR dan lanjut). K.O. = respawn, progres soal tetap.
- Tidak menambah poin dan tidak menyentuh leaderboard.

## Animasi
- Pemain: sheet Punch (baru dimuat di BootScene), lunge kecil, slash effect, camera shake. Disinkronkan ke pemain lain (`punch-left/right`).
- Musuh: pose idle/attack (boss kadang special)/hit/defeat dengan kaki tetap di tanah.

## Perbaikan
- Enemy München sudah muncul (mapping id aset).
- Tabrakan dengan musuh masih memberi damage kecil di luar battle.

## File
`src/game/battle.js` (baru), `server/battleQuestions.js` (baru), `server/index.js`, `src/scenes/WorldScene.js`, `src/scenes/BootScene.js`, `client-play/controller.js|index.html|style.css`, `src/hostPanel.js`, `scripts/test-battle.js` (baru).

## Belum diverifikasi
- `npm run build` dan tampilan/animasi di browser atau HP (tidak bisa dijalankan di sandbox). Musuh tetap lokal per pemain (HP musuh tidak dibagi antar pemain).
