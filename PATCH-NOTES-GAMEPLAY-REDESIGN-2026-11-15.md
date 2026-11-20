# Gameplay visual redesign — 2026-11-15

## Implemented
- Multiplayer remote-player nameplates now use a compact parchment/classic-RPG treatment: cream fill, double brown trim, dark-brown pixel lettering, and content-sized width. Player slot number and player name remain visible.
- Nameplate layout is refreshed when a multiplayer player changes their display name and follows the smoothed remote-avatar position.
- Local and remote idle sprites receive a very subtle breathing/bob offset; physics bodies, network coordinates, and avatar sprite-sheet identities are unchanged.
- Camera follow interpolation is softened for player and spectator follow. Camera bounds, stage coordinates, and viewport framing remain unchanged.
- Stage HUD and leaderboard panels receive restrained dark-leather/brass framing; leaderboard ordering, scores, and event flow are unchanged.
- CSS design tokens and reusable parchment surfaces were added for classic-RPG dialog/quest overlays, while preserving the existing pixel UI structure.
- Existing jump/landing dust, seasonal particles, parallax, NPC events, and quest flow were retained.

## Files changed
- `src/scenes/WorldScene.js`
- `src/style.css`

## Verification
- `node --check` passed for every JavaScript file under `src`, `server`, and `scripts`.
- A production Vite build could not be completed in this packaging environment: dependency installation (`npm ci`) timed out and left no usable Vite executable. Run `npm ci` then `npm run build` in an environment with npm registry access.
- Browser-based visual QA and live multiplayer/stage-transition tests were not run in this environment. No server, scoring, room, quest, course, or stage progression source files were modified.

## Compatibility notes
- No stage definitions, map coordinates, collision geometry, score calculations, leaderboard data flow, multiplayer payload schemas, or quest rules were changed.
