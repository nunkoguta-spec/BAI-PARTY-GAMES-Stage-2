# BAI PARTY GAMES — Reference Asset Library

This folder contains the 19 supplied visual reference images, organized by the intended game subsystem.
These are reference/composite images, not automatically usable Phaser spritesheets.

## Integration rules
- Keep the current Phaser/Socket.IO game source and working multiplayer flows intact.
- Use the references as art-direction targets for the menu, phone UI, TV spectator UI, character workshop, quiz, leaderboard, VFX, and four city stages.
- Do not slice a composite screenshot into runtime sprites unless the elements have been isolated and checked for transparency, scale, and animation frame consistency.
- Character gender: the current runtime avatar layers are modular skin/eyes/hair/clothing sprite variants, but the supplied project does not yet contain a dedicated, clearly separated male base sheet and female base sheet. Do not label the current variants as complete male/female character sets. A proper implementation needs separate compatible base/layer assets and matching animation directions.

## Next production sequence
1. Confirm and produce compatible Male and Female base character layers.
2. Complete modular character cosmetics (hair, tops, bottoms, shoes, hats, accessories, effects).
3. Replace/upgrade the phone quiz and gameplay HUD to match the supplied HP reference.
4. Upgrade TV spectator overview to match the supplied TV reference while retaining all-player visibility.
5. Build distinct München, Frankfurt, Berlin, and Hamburg environment art and transitions.
6. Verify full 10–15 minute multiplayer playthrough and device layouts.
