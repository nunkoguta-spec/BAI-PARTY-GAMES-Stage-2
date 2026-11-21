# GERMANY_CITY_WORLD

## City and permanent season
1. Hamburg — Summer
2. Berlin — Winter
3. Munich — Autumn
4. Cologne — Spring
5. Frankfurt — Summer

## Technical target
- 2D side-scrolling pixel art
- 32x32 px base tile
- RGBA PNG for standalone transparent assets
- Modular ground/road tiles and separate parallax layers
- Engine-neutral source organization (Unity, Godot, GameMaker)

## Current package status
This ZIP is a **concept-preview and folder scaffold**, not the completed production asset pack.
It contains the generated five-city visual direction sheet, the requested city/category
folder structure, and a machine-readable manifest. Individual transparent object exports,
full-resolution parallax backgrounds, character/vehicle animation sheets, and validated
tilesets have not yet been produced.

See `Asset_Manifest/asset_manifest.json` for machine-readable status.

## Added in animation update
Every city now includes `Animations/` and `Effects/`:
- 4 city/season-specific looping 8-frame PNG strips per city
- 32x32 px frames, horizontal layout (256x32 px per strip)
- Transparent RGBA background
- Standalone first-frame effect PNGs
- `Asset_Manifest/animation_manifest.json`
- `Phaser3_Animation_Integration.js` example

These are starter ambient animation elements. They are not full character/vehicle
animation sets or a complete production particle/weather system. The original
city concept sheet remains a visual preview, not a set of sliced production assets.
