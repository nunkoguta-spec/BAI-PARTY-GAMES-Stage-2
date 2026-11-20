# Pixel Heroes pack

Layered chibi customisation pack (hats, glasses, hair, tops, bottoms, shoes, bags, accessories, swords/wands, expressions, facial items, icons, effects).

- `layers/<category>/<item>.png` — 40x46 aligned layers (`*_back.png` = part drawn behind the body).
- `icons/<category>/` — 16x16 / 32x32 item icons. `characters/` — sample characters. `spritesheet_*.png` — icon sheets (10 columns).
- `palette_hair_colors.png` — 20 hair colours (16x16 each).

## How it is used in the game
The game's avatar is made of 32x32 sheets (`public/assets/avatar`). The pack is *not* drawn directly; `tools/make-gear-sheets.py`
re-anchors hats and glasses and draws held weapons for every Idle/Walk/Jump/Interact/Punch/Hurt frame and writes
`public/assets/avatar-gear/{Hat,Glasses,Weapon}/...`. Re-run it after changing the pack:

    python tools/make-gear-sheets.py

Rows: Hat 0-80, Glasses 0-81, Weapon 0-90 (row 0 = nothing equipped). Avatar keys: `hat`, `glasses`, `weapon`.
