# Bottoms Shape Fix — 2026-11-19

## Bug
In the character creator ("Celana" tab) every one of the 64 bottoms looked like a big boxy robe/cloak
sitting on the chest, and the main preview showed a long cloak over the character.
Cause: all 32 `Clothing_Bottoms_*` sheets contained a static 18x15 rectangle (x7-25, y16-30) copied into
every frame of every animation. It was wider than the body, started at chest height, covered the arms and
ignored the pose (idle / walk / run / jump / hurt / interact / punch / sword).

## Fix
- `tools/fix-bottoms-shape.py` regenerates all bottoms sheets (64 rows each). Per row it keeps the existing
  colour (original rows 0-15: the accent colour; generated rows 16-63: the box colour), then paints trousers
  only on the lowest 6 pixel rows of the character silhouette of the same state/direction/frame,
  limited to the leg columns so arms are never painted. Waistband, belt-loop highlight, side shade and hem added.
- Handles the mixed `Run_*` / `Walk_*` file names inside `public/assets/avatar/Run/Clothing/`.
- No JS changes; sheet sizes and row counts are unchanged (64 rows x 32px).
- Originals are kept in `tools/backup-bottoms-before-shape-fix/`.
