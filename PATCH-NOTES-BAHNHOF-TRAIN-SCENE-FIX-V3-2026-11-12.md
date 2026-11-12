# Bahnhof / Train Scene Fix V3 — 2026-11-12

Fixed the blank blue screen that appeared after crossing the Bahnhof.

Changes:
- TrainTravelScene no longer assumes a 480x270 viewport.
- All scene layout uses the actual Phaser camera/scale dimensions.
- Camera scroll and zoom are explicitly reset on scene start.
- Travel backdrop is drawn across the full active viewport.
- Bahnhof, platform, track and train remain separate transparent sprites.
- No composite/reference Bahnhof atlas is rendered.
- Train animation runs from left to right and then loads the next city.
- WorldScene now fades to black before starting TrainTravelScene to avoid a frame/camera flash.

The player controls and city/station routing are unchanged.
