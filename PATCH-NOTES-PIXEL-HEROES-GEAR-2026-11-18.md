# Pixel Heroes gear + scene fixes — 2026-11-18

## New: Hat / Glasses / Weapon avatar layers (previously "no hat/accessory layers exist")
- 80 hats (16 styles x 5 colours), 81 glasses (9 styles x 9 colours), 90 weapons (6 sword types x 9 blades + 4 wand types x 9 colours).
- Phone customizer: three new tabs (Topi, Kacamata, Senjata); row 0 is "OFF". Choices are saved in `localStorage` like the other parts.
- Rendered on the local player, remote players, TV/host view and the train-travel scene. They use the existing layer system
  (`avatar-<part>[-<pose>-<dir>]` textures, rows = variants), so animation/frame logic is unchanged.
- Placement is measured from the real avatar frames per animation frame (hair top, head centre, eyes, feet), so gear follows the head bob.
- Server (`sanitizeAvatar`) accepts `hat` (0-80), `glasses` (0-81), `weapon` (0-90); invalid values fall back to 0.

Files: `public/assets/pixel-heroes/**`, `public/assets/avatar-gear/**`, `tools/make-gear-sheets.py`, `src/avatar/defaultAvatar.js`,
`src/scenes/{BootScene,WorldScene,TrainTravelScene}.js`, `server/index.js`, `client-play/{controller.js,index.html}`.

## Scene / UI fixes
- Press Start 2P is now served locally (`public/assets/fonts`). Before, the Google Fonts request failed offline and all canvas text fell back to a
  tiny monospace font (the player nameplate looked like noise). Phaser now waits (max 1.5 s) for the font before creating the canvas.
- Remote-player nameplate: 8px (was 5px, below the font's legible size), name cut to 8 characters.
- Host dashboard folds into the minibar automatically when the game starts (it covered a third of the TV view); the minibar sits bottom-left.
- TV stage tag is two lines (city / landmark) so it no longer runs under the centred timer.

## Not changed / known
- `src/reference-ui.css` is not imported anywhere and the HTML it targets (`.menu-banner`, `#tv-hud`) no longer exists, so the reference menu/TV-HUD
  theme is currently dead code. Wiring it needs the menu HTML restored first; left untouched on purpose.
- Glasses on side views are drawn procedurally (ring/square/sunglasses/half); heart/star/goggle front styles map to a round side lens.
- Verified in Chromium (TV + phone): customizer, join, start, walking; `npm run build`, `scripts/test-traps.js` (31/31) and
  `npm run test:integration` pass. Not tested: real phones, many simultaneous players.
