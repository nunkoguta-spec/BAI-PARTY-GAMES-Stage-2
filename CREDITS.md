    # CREDITS — BAI PARTY GAMES

    ## 1. Original platformer tileset (retained from Stage 1)
    - File: `public/assets/tiles/tileset.png`
    - Package: Free tileset to 2D sidescrolling platformer game
    - Creator: Gurigraphics (as listed in the uploaded package readme)
    - Image size: 256x256 px; grid 8x8; tile size 32x32 px
    - License: CC0, declared in the uploaded `readme.txt`
    - Retained in project, not used by Stage 2 world map.

    ## 2. Mountains tiles/background pack (Stage 2)
    - Package: Pixel Art Tiles and Backgrounds - Mountains
    - Files: `public/assets/tiles/mountains-tiles.png`, `public/assets/backgrounds/mountains/`, `public/assets/decorations/mountains/`
    - Creator: karsiori.
    - Main tilesheet: 512x288 px; verified grid 16x9 (144 atlas slots); tile size 32x32 px. The creator's page describes 120 actual tile assets; unused atlas slots remain empty.
    - Background image dimensions were inspected individually; the four mountain files are not all the same size.
    - Parallax images `mountains-far.png` and `mountains-mid.png` are exact 768x288 top crops from original Mountains 2 and Mountains 1 images. No resizing, repainting, or recoloring was performed.
    - License: CC0, confirmed on the creator's source page: https://karsiori.itch.io/free-pixel-art-mountains-tileset-and-backgrounds. The uploaded ZIP did not include a separate license/readme file; source-page terms are recorded here.

    ## 3. Customizable Character Pack
    - Folder: `public/assets/avatar/`
    - Package: 32x32 Customizable Character Pack
    - License: CC0 1.0 Universal, according to included `License_CC0.txt`.
    - Avatar uses original separate body, bottoms, shoes, top, eyes, and hair layers.

    ## 4. Implementation note
    - No character, tile, icon, background, or decoration is drawn with Phaser Graphics or custom SVG.
    - All runtime assets are local; no Google Fonts, image CDN, or external asset fetch is used.

    ## 5. Stage 2.1 visual cleanup
    - Runtime uses the original `sky.png`, tree sprites (`tree-1`, `tree-2`, `tree-3`), house, flowers, and fences from the same Mountains CC0 pack.
    - The pack's cloud sprites are not used because visual inspection shows they depict snowy mountain silhouettes rather than conventional clouds.
    - The dark mountain parallax crops are not used because they dominate the playfield and conflict with the requested bright classic-platformer look.
    - No asset has been recolored, redrawn, stretched, or replaced with code-generated artwork.
