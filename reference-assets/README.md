# BAI PARTY GAMES — Reference Asset Library

This archive organizes the 19 visual reference sheets supplied by the user.
The original image data is preserved; files are renamed descriptively and grouped by intended game subsystem/stage.

## Important status
- These files are visual references / sprite-sheet or UI-sheet images.
- They are NOT yet individually sliced, transparent, Phaser texture atlases, or animation JSON.
- Do not treat a combined reference sheet as a ready-to-use production asset.
- No source game code has been modified by this organization step.
- The supplied visual direction should be treated as the source of truth for subsequent asset production.

## Folder guide
01_ENVIRONMENT_MUNICH — Munich city background, architecture, street props.
02_GAMEPLAY_REFERENCE — full gameplay compositions and in-game HUD reference.
03_LEADERBOARD_RESULTS — ranking, podium, rewards.
04_VFX_REFERENCE — particle/effect reference.
05_QUIZ_UI — question, answer, timer, progress panels.
06_MULTIPLAYER_UI — player slots, ready states, countdown.
07_TILESET_REFERENCE — terrain, nature, stone, water tiles.
08_STAGE_4_HAMBURG — harbor skyline and props.
09_STAGE_3_BERLIN — Berlin skyline/landmarks and props.
10_STAGE_2_FRANKFURT — Frankfurt skyline and props.
11_MAIN_MENU_UI — main menu panels/buttons/icons.
12_CHARACTER_CUSTOMIZATION — modular customization parts.
13_CHARACTER_ANIMATIONS — character views, movement, emotes.
14_ORNAMENTAL_UI — decorative gold frames/panels.
15_STAGE_TRANSITION_UI — framed city transition card.
16_GENERAL_GAME_UI — common panels/buttons/controls.

## Recommended production sequence
1. Lock the visual style using the gameplay composition and ornamental UI references.
2. Rebuild/slice UI elements into separate transparent PNGs.
3. Build character layers with aligned pivots and consistent dimensions.
4. Extract/build individual environment props and stage backgrounds.
5. Create tileset atlases, collision metadata, animation JSON, and Phaser manifest.
6. Verify every asset in a Phaser test scene before calling it production-ready.
