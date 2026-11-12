# Ground / Collision Fix — 2026-11-11

## Changes
- Removed legacy `Ground` and `Platforms` tilemap rendering and tile collision from `WorldScene`.
- Replaced legacy tile collision with one continuous invisible Arcade Physics floor.
- Floor top is fixed at world Y=224, aligned with the visible street/cobblestone baseline and avatar body.
- Player now collides only with the new continuous floor; old terrain tiles cannot push the player into walls or create floating/embedded positions.
- Disabled all Question Boxes at both data and runtime levels.
- Kept existing character controls unchanged.
- Kept the existing city-stage/world flow and existing station/train-related assets intact.

## Validation
- `node --check src/scenes/WorldScene.js` — PASS
- `node --check src/game/course.js` — PASS
- Legacy tile collision calls removed from `WorldScene.js`.
- `COURSE.questionBoxes` is now empty.
- Full Vite build could not be executed in this environment because dependencies were not available after the install timeout.
