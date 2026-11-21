# BAI PARTY GAMES — Patch Notes

## Changes
- Added a live, layered pixel-art avatar preview to the controller customization panel. It uses the project's existing idle spritesheets and redraws immediately when a clothing selector changes.
- Repositioned touch controls as a viewport-fixed control row with iOS/Android safe-area insets, landscape sizing, and a reserved game-panel footer area.
- Added viewport/orientation resize handling for the phone Phaser game.
- Preserved remote avatar costume rows in `WorldScene` and use those rows during remote animation, preventing the TV/peer avatar animation loop from reverting costumes to the default outfit.

## Validation status
- `node --check client-play/controller.js`: passed
- `node --check src/scenes/WorldScene.js`: passed
- `node --check server/index.js`: passed
- `npm run build`: not completed in the packaging environment because dependencies are not installed (`vite: not found`).
- `npm ci`: network request timed out; `npm ci --offline` could not complete because `graphology-types` is not cached.
- `node scripts/test-full-suite.js`: could not start because `socket.io-client` is not installed.

Install dependencies in the project folder with `npm ci`, then run `npm run build` and `npm run test:integration` before deployment.
