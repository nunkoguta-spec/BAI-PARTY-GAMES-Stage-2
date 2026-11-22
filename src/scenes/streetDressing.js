// Purely decorative, per-city street dressing + mood. No physics, no network.
// Deterministic (seeded) so the TV and every phone draw the same street.
const CITY = {
  munich:    { props: ["bhf-lamp-b", "deco-barrel", "bhf-bench", "bhf-plant", "bhf-kiosk", "bhf-lamp-b", "deco-barrel", "bhf-trash"], mood: [0xffb35a, 0.07] },
  frankfurt: { props: ["bhf-lamp-tall", "bhf-kiosk", "bhf-plant", "bhf-bench", "bhf-direction-sign", "bhf-lamp-tall", "bhf-plant"], mood: [0x7fc4ff, 0.04] },
  berlin:    { props: ["bhf-lamp-a", "bhf-bench", "bhf-kiosk", "bhf-trash", "bhf-lamp-a", "bhf-warning-sign", "bhf-bench"], mood: [0x9db8ff, 0.08] },
  hamburg:   { props: ["bhf-crates", "deco-barrel", "bhf-lamp-a", "bhf-fence", "bhf-crates", "bhf-lamp-b", "deco-barrel", "bhf-fence"], mood: [0xbfd6ee, 0.07] },
  koeln:     { props: ["bhf-plant", "bhf-lamp-b", "deco-flower-2", "bhf-bench", "deco-flower-4", "bhf-lamp-b", "bhf-plant", "bhf-fence"], mood: [0xffc2de, 0.05] }
};

const rnd = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };

export function createStreetDressing(scene, stage, { avoid = [], groundY = 224, tint = 0xffffff } = {}) {
  const cfg = CITY[stage.id] || CITY.munich;
  const x0 = stage.startX + 330;
  const x1 = stage.endX - 380;
  const objs = [];
  let i = 0;
  for (let x = x0; x < x1; x += 120 + Math.floor(rnd(x) * 70), i++) {
    const key = cfg.props[i % cfg.props.length];
    if (!scene.textures.exists(key)) continue;
    let px = x;
    if (avoid.some((a) => Math.abs(a - px) < 55)) px += 70;
    if (avoid.some((a) => Math.abs(a - px) < 55)) continue;
    const img = scene.add.image(Math.round(px), groundY + (key.startsWith("deco-flower") ? 1 : 0), key)
      .setOrigin(0.5, 1).setDepth(7.7 + (i % 3) * 0.01).setTint(tint);
    if (rnd(px + 3) > 0.7 && !key.includes("lamp")) img.setFlipX(true);
    objs.push(img);
  }

  // Hamburg: iron mooring bollards along the quay edge.
  if (stage.id === "hamburg") {
    const g = scene.add.graphics().setDepth(7.65);
    for (let x = x0 + 40; x < x1; x += 210) {
      g.fillStyle(0x2c3440, 1); g.fillRect(x, groundY - 7, 5, 7);
      g.fillStyle(0x56627a, 1); g.fillRect(x - 1, groundY - 8, 7, 2);
      g.fillStyle(0x9aa6bd, 1); g.fillRect(x + 1, groundY - 7, 1, 5);
    }
    objs.push(g);
  }

  // Mood tint + soft vignette, fixed to the camera (drawn once per scene).
  const [moodColor, moodAlpha] = cfg.mood;
  const mood = scene.add.rectangle(0, 0, 480, 270, moodColor, moodAlpha).setOrigin(0).setScrollFactor(0).setDepth(90);
  objs.push(mood);
  if (!scene.textures.exists("bai-vignette")) {
    const tex = scene.textures.createCanvas("bai-vignette", 480, 270);
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(240, 135, 110, 240, 135, 310);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(5,8,20,0.38)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 480, 270);
    tex.refresh();
  }
  objs.push(scene.add.image(0, 0, "bai-vignette").setOrigin(0).setScrollFactor(0).setDepth(91));
  return objs;
}
