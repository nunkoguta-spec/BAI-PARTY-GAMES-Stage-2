# Train Boarding Cinematic — 2026-11-12

Implemented a multi-phase animated rail journey between city stages.

## Sequence
1. Train enters the Bahnhof and brakes at the platform.
2. Sliding door panels open.
3. The player's currently selected avatar costume is recreated from the existing modular avatar textures and walks to the train door.
4. Passenger fades into the carriage; doors slide shut.
5. Train accelerates out of the station while the scenery moves in the opposite direction.
6. Destination station arrives on screen, followed by a camera flash and the next city gameplay scene.

## Integration
- WorldScene passes the selected avatar row configuration into TrainTravelScene.
- The original avatar controls, movement, collision, and stage trigger are unchanged.
- Stage order and `COURSE.stages` routing are unchanged.
- No new hazards or Question Boxes are introduced.
- The Bahnhof platform canopy is no longer stretched as a floor; the travel scene draws a separate platform edge and keeps the canopy as a station structure.

## Validation
- `node --check src/scenes/TrainTravelScene.js` passed.
- `node --check src/scenes/WorldScene.js` passed.
- Full Vite build was not run: `npm ci` did not finish within the available install window, so Vite was unavailable.
