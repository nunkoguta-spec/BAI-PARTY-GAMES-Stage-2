# BAI PARTY GAMES — UI Roadmap (Pixel-Art)

## Scope and guardrails
- Visual/UI improvements only; preserve gameplay, Socket.IO events, server contracts, existing DOM IDs, character assets, stage assets, and existing features.
- Keep the established German-adventure pixel-art identity, Press Start 2P typography, brass framing, navy panels, gold accents, and crisp pixel rendering.
- Do not add, enable, or rely on Question Box.

## Phase 1 — Client Play and Host Lobby (implemented in this revision)
- Improve pixel-panel depth, background texture, border hierarchy, and readable controls.
- Improve client character category focus, selected-item state, scrollbars, touch targets, and form focus states.
- Improve host room-code prominence, QR framing, settings inputs, player-list readability, and button interaction feedback.
- Keep responsive layouts for narrow phones, landscape phones, tablets, and desktop.

## Phase 2 — Client gameplay HUD (next)
- Refine player name, rank, score, room, and timer hierarchy without changing game state or events.
- Improve leaderboard drawer readability and safe-area positioning.
- Refine mobile movement/jump control hit areas and pressed/disabled feedback.

## Phase 3 — Shared visual system
- Consolidate spacing, color, border, shadow, focus, and typography tokens across client and host.
- Audit all dialogs, battle/result panels, and status messages for consistent pixel-art treatment.
- Verify reduced-motion and keyboard focus behavior.

## Phase 4 — Visual QA
- Check 320px, 375px, 430px, tablet, desktop, and landscape viewports.
- Verify no horizontal overflow, clipped buttons, hidden room fields, or overlapping controls.
- Run syntax/build and existing regression checks; manually verify host/client join and gameplay flows.

## Implemented files
- `client-play/style.css`
- `src/style.css`

No gameplay JavaScript or server behavior was changed in Phase 1.
