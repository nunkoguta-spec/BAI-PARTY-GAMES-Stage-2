# BAI PARTY GAMES — Gameplay Background Patch (Stage 1)

## What changed
- Added `public/assets/backgrounds/cities/munich-marienplatz.png`, a new pixel-art city-square backdrop for Stage 1.
- Registered the new image in `src/scenes/BootScene.js`, so both TV and phone Phaser clients load the same asset.
- Replaced the mountain parallax background in `WorldScene.createParallaxBackground()` with a world-space München backdrop.
- Hid the old mountain tilemap artwork while retaining the existing tilemap collision layers.
- Added cobblestone/stone street artwork beneath the players.
- Disabled the old alpine forest, pond, and cabin decorations for the city stage.
- Kept existing player movement, remote avatars, Socket.IO, question boxes, hazards, finish flow, and scoring code intact.

## Scope
This patch fixes the obvious old mountain/grass/dirt visual in the current Stage 1 gameplay. It does **not** yet implement the complete four-city route (Frankfurt, Berlin, Hamburg), final boss, final TV spectator multi-player framing, or final quiz UI layout. Those remain subsequent implementation stages.

## Validation
- `node --check src/scenes/WorldScene.js`: passed.
- `node --check src/scenes/BootScene.js`: passed.
- `npm run build`: blocked because supplied `node_modules` is missing `@rollup/rollup-linux-x64-gnu`. Reinstall dependencies with `npm install` before production build.
