# Bahnhof Polish — 2026-11-12

## World Bahnhof
- Reworked the Bahnhof layout into a clearer left-to-right composition: station façade, covered platform, train, rails, departure board, lamps and a small set of props.
- Uses the individually extracted transparent pixel-art sprites at controlled native/pixel-art scale.
- Added the train to the in-world Bahnhof so the platform no longer looks empty.
- Removed the duplicate floating Bahnhof title; the station building and departure board provide the signage.
- Added a compact destination panel that changes with the current stage.
- Kept props away from the travel trigger and preserved the trigger position/collision behavior.

## Train travel scene
- Replaced the sparse station arrangement with the same visual language: station, platform, departure board, lamps, bench, ticket machine and plant.
- Rebuilt the rails as a crisp foreground layer beneath the moving train.
- Kept the responsive viewport sizing, train animation and next-city transition unchanged.

## Preserved
- Character controls and movement physics are untouched.
- One city per stage and the Bahnhof-to-train-to-next-city flow are unchanged.
- No hazards or Question Boxes were added.
