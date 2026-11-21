# BAI PARTY GAMES — Build handoff status

## Project source
This package is based on the supplied `BAI-PARTY-GAMES-UI-REFERENCE-FULL` source ZIP. Existing Node/Vite/Phaser/Socket.IO source files and game assets are preserved.

## Reference integration in this handoff
- Added the organized 19-image reference library under `reference-assets/`.
- Added an integration guide and an explicit note about Male/Female sprite readiness.
- Did not convert composite reference screenshots into pretend runtime sprites.
- Did not overwrite the existing game code or multiplayer behavior.

## Verification performed in this packaging environment
- ZIP source archive integrity: passed before extraction.
- JavaScript syntax checks: 19 files passed with `node --check`.
- Full Socket.IO integration suite: not run to completion because this environment has no installed `socket.io-client` dependency (`ERR_MODULE_NOT_FOUND`).
- Vite production build: not run because project dependencies / `node_modules` are not installed in this environment.
- Android/iOS physical-device and browser visual tests: not performed.

## Important remaining production work
- Dedicated Male and Female base sprite sheets and compatible animation layers.
- Complete hat/accessory/effect sprite layers.
- Reference-matched phone gameplay UI and TV spectator UI.
- Production-quality, distinct city environments for all four stages.
- Run `npm ci`, `npm run build`, and `npm run test:integration` on the target Windows development machine, then verify TV + multiple phones.


## Update: source-level correction pass (2026-11-11)

### Runtime fixes applied
- Activated `createCityLandmarks()` in the actual Phaser world initialization. The Frankfurt skyline, Berlin Fernsehturm/Brandenburg Gate, and Hamburg harbour structures were already authored but were never added to the scene.
- Reworked `createReferenceStreet()` so Munich facades and Rathaus assets are only placed in Stage 1. Neutral lamps, trees, and bushes remain light recurring street furniture; Munich architecture no longer repeats through Frankfurt, Berlin, and Hamburg.
- Corrected the character renderer in `WorldScene.js`: the previous extracted mascot pose overlay hid the modular avatar layers after preview selection. The scene now keeps the real body, eyes, hair, top, bottoms, and shoes sprites visible for local and remote players, allowing the selected rows to be the same on the phone, other players, and TV spectator.
- Added a short city-change card when a player/TV camera enters a new stage. The stage badge and existing `bai-stage` host event remain intact.
- Kept Socket.IO room, movement, quiz, leaderboard, and spectator event flows unchanged.

### Validation performed in this environment
- `node --check`: 21 JavaScript files passed.
- JSON parse: 6 project JSON files passed.
- Required four city SVGs and core modular avatar sprite sheets: present.
- Project reference library: all 19 reference images are present.
- `npm run build`: blocked because dependencies are not installed (`vite: not found`). `npm ci` did not complete in this environment.
- `node scripts/test-full-suite.js`: blocked because `socket.io-client` is not installed. Multiplayer runtime was therefore not claimed as integration-tested.

### Known asset limitation — Male/Female
The supplied runtime asset set has one modular base-body sheet with skin-tone rows, plus shared hair/eyes/clothing layers. The organized reference pack includes a composite illustration, not separated compatible Male and Female base/animation sprite sheets. A real gender-specific character switch cannot be implemented honestly from these files alone. Current costume layers now render consistently, but dedicated Male/Female bodies and compatible directional animation sheets remain required.
