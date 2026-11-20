#!/usr/bin/env python3
"""Compatibility entry point for rebuilding BAI avatar clothing.

The project avatar is a 32x32 rig. Older versions of this tool appended
40x46 Pixel Heroes layers and caused visible misalignment. The active builder
now paints clothing directly against the game's character silhouette.
"""
from generate_matching_clothing import build, TOP_TARGET, BOTTOM_TARGET, TOP_STYLES, BOTTOM_STYLES, TOP_PALETTES, BOTTOM_PALETTES

if __name__ == '__main__':
    build('tops', TOP_TARGET, TOP_STYLES, TOP_PALETTES)
    build('bottoms', BOTTOM_TARGET, BOTTOM_STYLES, BOTTOM_PALETTES)
