# Tiled — BAI PARTY GAMES

- `level-01.tmx`: file editable untuk Tiled.
- `level-01.json`: salinan JSON untuk editor.
- Runtime map berada di `public/maps/level-01.json`.
- Ukuran map: 120 x 12 tile.
- Ukuran tile: 32 x 32 px.
- Tileset: `public/assets/tiles/mountains-tiles.png` (512 x 288 px, 16 kolom x 9 baris).
- Layer: `Ground`, `Platforms`, `Objects` (`PlayerSpawn`).

Saat mengedit map di Tiled, gunakan tileset dari `../public/assets/tiles/mountains-tiles.png`. Setelah export JSON, pastikan runtime map di `public/maps/level-01.json` memakai path tileset `../assets/tiles/mountains-tiles.png`.
