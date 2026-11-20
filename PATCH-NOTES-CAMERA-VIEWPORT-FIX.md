# BAI PARTY GAMES — Camera Viewport Fix

## Bug fixed
The screenshot showed the playable world compressed into a narrow strip at the top with a huge empty sky area below. `WorldScene.handleViewportResize()` was manually setting the Phaser camera viewport and camera size to browser pixel dimensions, while `Phaser.Scale.FIT` already handles display scaling.

## Change
- Removed manual `camera.setViewport()` and `camera.setSize()` calls.
- Kept camera dimensions in Phaser's logical 480x270 coordinate system.
- Preserved physics world bounds and spectator follow behavior.
- No Socket.IO, player identity, movement, avatar, quiz, or scoring logic was changed.

## Validation
- Static JavaScript syntax validation passed.
- Browser visual verification and production build are still required after installing dependencies and deploying this ZIP.
