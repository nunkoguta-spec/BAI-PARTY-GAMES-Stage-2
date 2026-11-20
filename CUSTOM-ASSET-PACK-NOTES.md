# BAI PARTY GAMES — Custom Asset Pack Notes

This build adds a first custom environment set authored specifically for BAI PARTY GAMES.

## Included
- Munich / Marienplatz / Neues Rathaus
- Frankfurt / Mainhattan skyline
- Berlin / Fernsehturm and Brandenburg Gate
- Hamburg / harbor and Elbphilharmonie

Each SVG is 2400 x 224 pixels in world coordinates and is loaded as a distinct chapter backdrop in Phaser. The main menu also uses the custom Munich backdrop. The original assets remain in the project as fallbacks; existing multiplayer, scoring, room, and quiz code is not replaced.

## Scope and honest limitations
This is the first custom environment pack, not a claim that every part of the reference collage has been recreated 1:1. The existing CC0 avatar sprite layers and current functional UI are retained. Dedicated bespoke chibi outfit/accessory/effect sprite sheets and a fully illustrated ornate UI atlas still need separate production work. No generated screenshot collage is used as a fake interactive screen.

## Verification
- XML parse check passed for all four SVG assets.
- JavaScript syntax check passed for all 21 JavaScript files in this archive.
- Full browser/Vite build and physical Android/iOS tests were not run in this environment.
