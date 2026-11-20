# V7 Character Clothing Alignment Fix

The original 79 tops and 64 bottoms are preserved from the base package.
The bug was the coordinate system: the base character is 32x40, while
clothing sheets are 32x32 overlays intended for y=8 on the base.
V7 composites them at that offset in both the main preview and item tiles.
No clothing sheet is regenerated or removed.
