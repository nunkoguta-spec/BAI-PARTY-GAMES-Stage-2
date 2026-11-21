# BAI PARTY GAMES — Clothing Expansion & Multiplayer Sync Fix

## Basis
`BAI-PARTY-GAMES-Stage-2-traps-v2.zip`

## Changes
- Extended avatar tops from **29 -> 79** rows.
- Extended avatar bottoms from **14 -> 64** rows.
- Processed the clothing sheets used by Idle, Walk, Run, Jump, Hurt, Interact, Punch and Sword poses.
- Preserved the original animated clothing rows.
- Added 50 top variants and 50 bottom variants from the existing Pixel Heroes aligned layer pack.
- Extra clothing rows are converted to the game's 32x32 sprite format and reused across pose frames with a small animation bob so they remain attached to the avatar.
- Updated the controller customizer limits so all 79 tops and 64 bottoms are selectable.
- Updated `WorldScene` local/remote avatar validation to accept the expanded clothing ranges.
- Updated the server avatar sanitizer so multiplayer snapshots accept and preserve the expanded clothing selections.
- Improved customizer labels to show `79 pilihan` for tops and `64 pilihan` for bottoms and show the selected model/count.
- Added `tools/make-clothing-sheets.py` so the clothing expansion can be reproduced.

## Verification
- JavaScript syntax check: **PASS** for `src`, `server`, and `client-play` JavaScript files.
- Boot asset check: **PASS** (`missing none`).
- Clothing sheet validation: **PASS** — 64 clothing sheets checked; tops have 79 rows and bottoms have 64 rows.
- Visual spot-check: **PASS** for representative original and newly-added clothing rows and composite avatar previews.
- Vite production build: **NOT COMPLETED in this environment** because project dependencies were not installed; `npm install --no-audit --no-fund` timed out twice and `vite` was unavailable locally. No source/build error was observed; the blocker is dependency installation in the execution environment.
