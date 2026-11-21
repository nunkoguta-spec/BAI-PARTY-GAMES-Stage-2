# Character Clothing Fix V6 — 2026-11-19

- Restored the original clothing sheets from the base package; no original top/bottom rows were deleted or replaced.
- Kept the existing 79 top and 64 bottom selections.
- Fixed the character-creator preview to render each layer as the complete native 32x32 frame.
- Removed the old 24x32 crop from the main preview, which could cut off clothing pixels and make layers look incomplete.
- Changed the preview canvas to a square 32x32 presentation so clothing and body use the same pixel grid.
- Gameplay avatar layering remains on the existing 32x32 Phaser sprites.
