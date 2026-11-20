# BAI PARTY GAMES — Character Customizer Reference Patch

## Changes
- Replaced the phone's six dropdown presentation with a three-column character editor: category rail, large live preview, and item-card grid.
- Added the six reference category labels: Wajah, Rambut, Baju, Aksesori, Topi, Efek.
- Added selectable sprite thumbnails for existing avatar assets (skin, eyes, hair, tops, bottoms, shoes).
- Selected items receive a gold outline and checkmark.
- Added a save button; selections continue to persist in localStorage and are passed to the local Phaser scene.
- Kept legacy select elements hidden for compatibility with existing controller state and event wiring.

## Asset limitation
The ZIP contains sprite sheets for skin/body, eyes, hair, tops, bottoms, and shoes. It does not contain separate hat, accessory, or effect sprite sheets. Those three reference tabs are shown but indicate that their art assets are not yet present; no fake assets were invented.

## Validation
- `node --check client-play/controller.js`: passed.
- `npm run build`: could not run because the supplied `node_modules` is missing optional package `@rollup/rollup-linux-x64-gnu`.
