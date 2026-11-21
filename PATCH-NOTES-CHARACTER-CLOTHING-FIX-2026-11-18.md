# Character Creator Clothing Fix — 2026-11-18

## Changes
- Rebuilt the bottoms layer across all 32 front/back/left/right animation sheets (idle, walk, run, jump, interact, hurt, punch and sword variants) so all 64 selectable rows render visible trouser legs instead of only a tiny waist/belt detail.
- Kept the original per-row waistband/detail pixels layered above the generated trouser legs.
- Updated the phone character creator's top, bottoms and shoes tiles to show the full 32×32 character frame rather than a tight torso/waist crop.
- Added the selected bottoms and shoes as context layers when browsing tops, and shoes when browsing bottoms.

## Verification
- `node --check client-play/controller.js` passed.
- `node --check src/scenes/WorldScene.js` passed.
- `npm run build` could not run in this environment because project dependencies are not installed (`vite: not found`).
