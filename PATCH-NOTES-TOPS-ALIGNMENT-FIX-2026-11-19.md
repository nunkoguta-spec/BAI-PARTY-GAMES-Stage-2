# Tops Alignment Fix — 2026-11-19

## Bug
Tops #30-#79 (the 50 generated ones) were painted at y16-23 of the 32x32 frame, i.e. over the chin/mouth,
so they looked like a beard or mask and left the chest bare. Tops #1-#29 (original) sit at y18-24 and were fine.

## Fix
`tools/fix-tops-alignment.py` regenerates rows 29-78 of every `Clothing_Top*_*-Sheet.png` (8 states x 4 directions).
For each state/direction/frame it uses the original top row 0 of the same sheet as the placement mask, so the shirt
follows the torso in every pose, and paints the same 10 styles / 10 palettes inside it.
Rows 0-28 are untouched; sheet sizes unchanged (79 rows). Originals: tools/backup-tops-before-fix/.
