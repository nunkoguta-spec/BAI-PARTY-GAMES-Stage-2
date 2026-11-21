# Germany City World + Character + Enemy Asset Integration

## Imported folders
- `public/assets/germany-city-world/` — five city folders, previews, documentation, manifests, ambient effect PNGs and 8-frame looping strips.
- `public/assets/legendary-character-customization/` — separated customization category previews and item crops. The source pack explicitly describes these crops as prototype references, not production-ready transparent sprites; they are not wired into the avatar compositor yet.
- `public/assets/enemy-asset-pack/pack/` — München, Frankfurt, Berlin, Hamburg enemy states and Tycoon boss states. These individual state PNGs are loaded by BootScene; gameplay spawn/combat logic is not changed.

## Runtime wiring
`BootScene` preloads the seasonal ambient strips and enemy pose textures. `WorldScene` plays ambient loops for the existing four playable stages (München, Frankfurt, Berlin, Hamburg). Snowfall is now restricted to Berlin rather than appearing in every city. Cologne assets are imported and registered for future stage activation, but the current `COURSE.stages` still has four stages and has not been expanded.

## Animation format
City ambient strips: 8 horizontal frames, each 32x32 px, RGBA PNG, suggested 8 FPS loop. Enemy states are separate pose PNGs, not frame sequences.

## Important limitations
- This is asset import + ambient animation wiring, not full integration of every building/vehicle/NPC into level layouts.
- The legendary customization pack is documented by its source as extracted crops and should be redrawn/exported cleanly before using as live layered avatar equipment.
- Enemy textures are preloaded, but enemy AI, spawn points, collision and combat behavior remain unchanged.
- Existing four-city gameplay progression remains intact. Cologne is available as an imported asset set, not yet a playable stage.
