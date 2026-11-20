# Bug Fix & Stability Pass — 2026-11-19

## Fixed
- Restored Question Box runtime objects in the active `WorldScene`. The previous active scene no longer created them, while the phone scene still listened for their collision event; this disconnected the quiz trigger from gameplay.
- Loaded the existing `public/assets/question-box-32x32.png` texture in `BootScene`.
- Added player collision handling that only triggers when a player hits a Question Box from below, pauses movement, plays feedback, and emits `question-box-hit` for the existing phone/server quiz flow.
- Added room-authoritative Question Box position application. Phone clients use the positions returned by `room:join`; TV clients receive the same shuffled positions from `tv:subscribe`. The host panel caches positions so they are also applied if the scene starts slightly later than the network callback.
- Updated the stale ground/Question Box regression script. It previously expected Question Boxes to be empty even though the current course and server intentionally define them.
- Rewrote `README.md` to remove unresolved Git merge-conflict markers and document the current commands/features.

## Validation
- JavaScript syntax checks: passed for all project `.js` files.
- JSON parse checks: passed for all project JSON files.
- `python3 scripts/check-boot-assets.py`: passed, no missing BootScene assets.
- `node scripts/verify-ground-fix.js`: 8/8 passed.
- `node scripts/test-trap-visuals.js`: 28 visuals, 11,200 updates, 0 errors.
- ZIP integrity check: passed.

## Not verified in this environment
- `npm run build` and Socket.IO integration tests were not completed because npm dependency downloads failed with DNS/network `EAI_AGAIN`; dependencies need to be installed on the target machine with `npm ci`.
- Browser, physical Android/iOS, TV display, and live multiplayer visual tests still need to be run on the target devices.
