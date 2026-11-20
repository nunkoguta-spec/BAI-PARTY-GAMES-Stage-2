# Modular Character Pack V2 + Customizer Alignment Fix — 2026-11-19

## Asset pack
- Replaced `public/assets/character-modular/` with BAI_Character_Assets_Modular (339 styles, 720 layer sheets, icons, manifest, previews).
  Previous pack had 300 items. Every manifest path was verified to exist (0 missing, 0 orphan files, all sheets 288x192 = 6x3 frames of 48x64).
- `src/avatar/ModularCharacterAvatar.js` updated to the new pack's CharacterAvatar.js. The new manifest `slot_order` draws bottoms over tops
  (top -> bottom -> shoes -> outer); the class reads the order from the manifest, so no code change was needed.
- Pack README: `public/assets/character-modular/README.md`.

## Character customizer bug (client-play/controller.js)
Cause: the V7 patch assumed the body sheet was 32x40 and shifted clothing down by 8px. Real sheet sizes:
Character 128x160 (5 rows of 32), Eyes 128x128 (4x32), Hair 128x800 (25x32), Tops 128x2528 (79x32), Bottoms 128x2048 (64x32), Shoes 128x320 (10x32).
Every layer is a 32x32 frame, so reading skin at `row*40` pulled in pixels from the neighbouring skin row (a second head above the character),
and the +8px offset pushed clothes off the body.
Fix: all layers (main preview + item tiles) are drawn from native 32x32 frames with no offset. Tile crops and the temp canvas are 32x32.

## Not changed
- Gameplay (WorldScene, server avatar payload) still uses the 32x32 row-index avatar, which has punch/hurt/interact poses.
  The modular pack only has idle/run/jump, so switching gameplay to it is a separate step (see PATCH-NOTES-MODULAR-CHARACTER-PACK-2026-11-19.md).
