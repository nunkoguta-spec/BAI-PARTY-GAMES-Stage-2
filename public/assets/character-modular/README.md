# BAI Party Games - Modular Character Customization Pack (Phaser 3)

339 styles, every slot independent, ANY colour per part (nothing is a pre-made outfit):
hair 31, top 42, outer 36, bottom 36, shoes 36, hat 45, glasses 36, bag 36, accessory 40, + skin tones.

- Frame 48x64, sheet 6x3 (idle 0-3, run 6-11, jump 12-13). Same grid for every layer.
- layers/<cat>/<style>__<slot>__<part>.png ; part = main | accent | fixed
  main / accent = white masks -> tint any colour (Phaser setTint); fixed = never tinted (eyes, buttons, ribbons)
- manifest.json: slot_order, animations, palettes, items (tintable parts, presets, icon paths)
- icons/ = 96x96 icons for the customization UI
- CharacterAvatar.js: new CharacterAvatar(scene,x,y,manifest,loadout,2).play('run')
- loadout JSON = what the web customizer's "Loadout JSON" box exports
- Use pixelArt:true in the Phaser config.
