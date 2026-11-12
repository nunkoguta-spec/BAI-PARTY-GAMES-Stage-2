# Client Play Train Scene Registration Fix — 2026-11-12

## Root cause
The browser controller page (`/client-play/`) creates a separate Phaser game in `client-play/phone-game.js`. Its scene list contained only `PhoneBootScene` and `PhoneWorldScene`. The main game (`src/main.js`) registered `TrainTravelScene`, but that registration does not carry over to the separate controller Phaser instance.

When a controller player crossed a Bahnhof, `WorldScene.startTrainTravel()` attempted to start `TrainTravelScene`, which was not registered in that Phaser instance. The result was a plain blue scene/canvas with the controller HUD still visible.

## Fix
- Imported `TrainTravelScene` into `client-play/phone-game.js`.
- Registered it in the controller Phaser scene list after `PhoneWorldScene`.
- Kept `PhoneWorldScene` registered under the existing `WorldScene` key so the train scene can return to the multiplayer-enabled controller world scene.
- No movement controls, physics, collision, room networking, or stage route logic changed.

## Validation
- `node --check client-play/phone-game.js` passed.
- `node --check src/scenes/TrainTravelScene.js` passed.
- `node --check src/scenes/WorldScene.js` passed.
- Full browser/gameplay verification still required in the local Vite + multiplayer server environment.
