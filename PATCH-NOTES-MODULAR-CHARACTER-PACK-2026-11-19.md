# Modular Character Pack (EXPANDED) — added 2026-11-19

Added (nothing existing was changed or removed):
- `public/assets/character-modular/` — layers/, icons/, manifest.json, previews, pack README
  (300 items, 10 categories, frame 48x64, sheet 6x3: idle 0-3, run 6-11, jump 12-13;
  parts: main/accent = white masks to tint, fixed = never tinted).
- `src/avatar/ModularCharacterAvatar.js` — Phaser container from the pack (CharacterAvatar.js, unchanged).

Usage (in a Phaser scene; manifest loaded via this.load.json('charManifest', 'assets/character-modular/manifest.json')):
  preloadAvatarAssets(scene, manifest, 'assets/character-modular/')
  createAvatarAnims(scene, manifest)
  new CharacterAvatar(scene, x, y, manifest, loadout, 2).play('run')

NOT yet wired in: the game still uses the old 32x32 row-index avatar
(src/avatar/defaultAvatar.js, WorldScene, client-play/controller.js).
The two systems differ (32x32 row indices vs 48x64 per-layer sheets + loadout JSON + tint colours),
so switching the customizer/WorldScene/server avatar payload is a separate step.
