# BAI PARTY GAMES — Asset pack integration (2026-11-11)

This continuation preserves the existing Vite / Phaser / Socket.IO project and adds
the newly supplied asset packs under `public/assets/asset-packs/`.

## Existing game route
1. München
2. Frankfurt
3. Berlin
4. Hamburg

The current source already contains stage-specific city backgrounds and a city-change
transition card in `src/scenes/WorldScene.js`. Keep these city transitions and do not
replace the working multiplayer, quiz, scoring, or spectator event flows.

## Imported packs
- `berlin/`: separated Berlin panorama, building groups, street props, signs, vehicles,
  decorations, tilesets, and UI sprites. `manifest.csv` describes the exported images.
- `characters/`: extracted modular body, hair, top, bottom, headwear/accessory, and
  face/glasses sprites. These are source assets; they are not automatically compatible
  with the current runtime animation atlas without checking dimensions, pivots, and
  directional frame alignment.
- `city-environment/`: separate urban panorama, buildings/landmarks, bridges, roads,
  vegetation, vehicles, and street props.
- `hamburg-reference/`: composite reference sheet plus categorized copies of the same
  source sheet. It is not a set of individually extracted production sprites yet.
- `medieval-town/`: separated medieval town panorama, buildings, market props,
  lamps, stalls, decorations, walls, and fences.

## Safe integration notes
- Do not blindly load a full reference sheet as a sprite atlas.
- For a Phaser runtime asset, validate transparency, dimensions, frame geometry,
  anchor/pivot alignment, and licensing before adding it to an animation.
- The character pack has 20 base sprites, 26 hair sprites, 15 tops, 26 bottoms,
  75 headwear/accessory sprites, and 20 face/glasses sprites. It does not, by itself,
  establish a complete set of matching male/female directional animation sheets.
- The Hamburg pack still needs individual sprite extraction before its categorized
  source references can be used as separate objects.

## Next visual production pass
1. Replace the Berlin stage placeholder/landmark composition with the separated Berlin
   background and landmark objects, keeping the scene's current camera/world scale.
2. Build Hamburg from its harbor reference by extracting distinct harbor structures,
   boats, cranes, and foreground props as transparent sprites.
3. Build a medieval-town scene only if it is intended as a new stage or bonus location;
   it is not one of the four current German-city stages.
4. Test the character parts in a dedicated Phaser preview scene before mapping them to
   the live avatar customizer.
