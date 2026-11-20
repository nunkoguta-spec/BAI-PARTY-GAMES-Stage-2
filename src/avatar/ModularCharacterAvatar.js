// BAI Party Games - modular, recolourable avatar for Phaser 3 (pack v2, 339 styles)
// Source: bai_character_assets_modular/CharacterAvatar.js (unchanged logic).
// Every slot (top, bottom, hair, shoes...) is independent: pick any style + ANY colour.
// "main" and "accent" layers are white masks -> setTint(colour). "fixed" layers are never tinted.
export function preloadAvatarAssets(scene, manifest, base = 'assets/character/') {
  for (const item of manifest.items)
    for (const [slot, parts] of Object.entries(item.layers))
      for (const [part, file] of Object.entries(parts))
        scene.load.spritesheet(`${item.id}:${slot}:${part}`, base + file, { frameWidth: manifest.frame_width, frameHeight: manifest.frame_height });
}
export function createAvatarAnims(scene, manifest) {
  for (const item of manifest.items)
    for (const [slot, parts] of Object.entries(item.layers))
      for (const part of Object.keys(parts)) {
        const key = `${item.id}:${slot}:${part}`;
        for (const [name, a] of Object.entries(manifest.animations)) {
          const ak = `${key}_${name}`;
          if (!scene.anims.exists(ak))
            scene.anims.create({ key: ak, frames: scene.anims.generateFrameNumbers(key, { start: a.start, end: a.end }), frameRate: a.frameRate, repeat: a.repeat });
        }
      }
}
const hex = h => (typeof h === 'number' ? h : parseInt(h.replace('#', ''), 16));
export class CharacterAvatar extends Phaser.GameObjects.Container {
  // loadout = { skin_body:{main:'#fce0c8'}, hair_long:{main:'#7a5238'}, top_hoodie_stripes:{main:'#4a62d6', accent:'#ffffff'}, ... }
  // (same JSON the web customizer exports)
  constructor(scene, x, y, manifest, loadout, scale = 1) {
    super(scene, x, y);
    this.manifest = manifest; this.byId = Object.fromEntries(manifest.items.map(i => [i.id, i]));
    this.sprites = []; this.baseScale = scale; this.current = 'idle';
    this.setLoadout(loadout); this.setScale(scale); scene.add.existing(this);
  }
  setLoadout(loadout) {
    this.loadout = loadout; this.sprites.forEach(s => s.destroy()); this.sprites = [];
    const parts = [], order = this.manifest.slot_order, po = this.manifest.parts;
    for (const [id, col] of Object.entries(loadout)) {
      const it = this.byId[id]; if (!it) continue;
      for (const [slot, ps] of Object.entries(it.layers))
        for (const part of Object.keys(ps)) parts.push({ slot, part, key: `${id}:${slot}:${part}`, col });
    }
    parts.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot) || po.indexOf(a.part) - po.indexOf(b.part));
    for (const p of parts) {
      const s = this.scene.add.sprite(0, 0, p.key, 0).setOrigin(0.5, this.manifest.origin_y);
      if (p.part === 'main') s.setTint(hex(p.col.main));
      if (p.part === 'accent') s.setTint(hex(p.col.accent || p.col.main));
      this.add(s); this.sprites.push(s);
    }
    this.play(this.current);
  }
  setColor(id, main, accent) { this.loadout[id] = { main, accent: accent ?? this.loadout[id]?.accent }; this.setLoadout(this.loadout); }
  play(name) { this.current = name; for (const s of this.sprites) s.play(`${s.texture.key}_${name}`, true); return this; }
  face(dir) { this.setScale(dir * this.baseScale, this.baseScale); return this; }
}
