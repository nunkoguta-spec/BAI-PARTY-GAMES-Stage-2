# BAI PARTY GAMES — Implementation status (2026-11-10)

## Changes in this build
- Replaced the legacy three-action landing panel with the BAI PARTY GAMES arcade menu: Play, Customization, Leaderboard, Settings, and Quit.
- Play now opens the existing Host / Join room paths; the Socket.IO room flow remains in place.
- Added a Munich city-art backdrop using the project's existing pixel-art city asset, plus responsive layout rules for narrow screens and landscape phones.
- Retained the existing HP character workshop (layered live preview, selectable sprite variants, local persistence) and relabelled the skin category as Wajah.
- Hardened sprite-sheet frame selection by resolving both column and row counts from the active texture. This accounts for the 3-column Jump sheets and differing clothing/face variant row counts.

## Verification performed
- `node --check` passed for the edited client, scene, controller, host panel, and server JavaScript files.
- `node scripts/test-full-suite.js` passed all 14 reported multiplayer integration checks, including room creation, two player joins, TV host subscription, settings, 12-minute default, connected city stages, movement/animation sync, quiz delivery/scoring, pause/resume, kick, and final podium.
- ZIP archive integrity checked after packaging.

## Known limitations (not represented as completed)
- A production Vite build could not be run in this Linux workspace because the optional native dependency `@rollup/rollup-linux-x64-gnu` is absent from the supplied `node_modules`; `npm run build` reports a missing executable permission for the local Vite shim, and invoking Vite through Node reports the missing Rollup native package.
- Android and iOS physical-device/browser testing has not been performed.
- The menu is now a responsive, functional implementation using the existing Munich pixel-art asset, but it is not a pixel-for-pixel recreation of the supplied composite reference. The source project also does not include dedicated Hat, Accessory, or Effect sprite layers, so those cosmetic categories are not falsely presented as implemented.
