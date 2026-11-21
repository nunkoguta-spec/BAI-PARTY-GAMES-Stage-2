// Draws the stage traps (src/game/traps.js). The scene NEVER decides a hit: the server does.
// Every timed trap is a pure function of the SERVER clock, so TV and phones show the same phase.
//
// createTrapVisual(scene, trap) -> { trap, parts, update(now), hit(data) }
import { TRAP, popFrame, rollerX, tramState, icicleState, gullState, pendulumState } from "../game/traps.js";
import { retroAudio } from "../audio/retroAudio.js";

const G = TRAP.groundY;
const DEPTH = { rail: 7.7, back: 7.75, trap: 7.8, top: 7.9, rope: 20.5, front: 21, sky: 22 };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const near = (scene, x, range = 330) => Boolean(scene.player) && Math.abs(scene.player.x - x) < range;
const flash = (scene, parts) => parts.forEach((p) => p?.active && scene.tweens.add({ targets: p, alpha: 0.35, duration: 70, yoyo: true, repeat: 1 }));

function spikes(scene, trap) {
  const parts = [];
  for (let i = 0; i < trap.tiles; i++) parts.push(scene.add.image(trap.x - trap.w / 2 + 16 + i * 32, G, "trap-spikes").setOrigin(0.5, 1).setDepth(DEPTH.trap));
  return { trap, parts, update() {}, hit() { flash(scene, parts); } };
}

function pop(scene, trap) {
  const parts = [];
  for (let i = 0; i < trap.tiles; i++) parts.push(scene.add.sprite(trap.x - trap.w / 2 + 16 + i * 32, G, "trap-pop", 0).setOrigin(0.5, 1).setDepth(DEPTH.trap));
  const obj = {
    trap, parts, frame: 0, shaking: false,
    update(now) {
      const frame = popFrame(trap, now);
      if (frame !== obj.frame) { obj.frame = frame; parts.forEach((p) => p.setFrame(frame)); }
      if (frame === 1) {
        const wob = Math.round(Math.sin(now / 40));
        parts.forEach((p, i) => p.setX(trap.x - trap.w / 2 + 16 + i * 32 + wob));
      } else if (obj.shaking) {
        parts.forEach((p, i) => p.setX(trap.x - trap.w / 2 + 16 + i * 32));
      }
      obj.shaking = frame === 1;
    },
    hit() { flash(scene, parts); }
  };
  return obj;
}

function roller(scene, trap) {
  const rail = scene.add.rectangle((trap.from + trap.to) / 2, G - 1, trap.to - trap.from + 26, 2, 0x000000, 0.18).setDepth(DEPTH.rail);
  const barrel = scene.add.sprite(trap.from, G, "trap-barrel", 0).setOrigin(0.5, 1).setDepth(DEPTH.top);
  const obj = {
    trap, parts: [barrel, rail], travel: 0, lastX: trap.from,
    update(now) {
      const x = rollerX(trap, now);
      obj.travel += x - obj.lastX; obj.lastX = x;
      barrel.setX(x).setFrame(((Math.floor(obj.travel / 5.1) % 8) + 8) % 8);
    },
    hit() { flash(scene, [barrel]); }
  };
  return obj;
}

// TRAM LEWAT -----------------------------------------------------------------------------------
function buildTunnelPortal(scene, x, G, isLeft) {
  // 1. Dark cavern interior behind the tram (depth 7.8, behind body at depth 21)
  const interior = scene.add.graphics().setDepth(DEPTH.trap);
  interior.fillStyle(0x06080e, 1);
  interior.fillRect(x - 24, G - 54, 48, 56);
  interior.fillStyle(0x131924, 0.8);
  interior.fillRect(x - 22, G - 52, 44, 6);

  // 2. Front Arch Facade in FRONT of the tram (depth 21.5, masks the tram entering/exiting)
  const facade = scene.add.graphics().setDepth(21.5);
  const w = 54, h = 64;
  const left = x - w / 2;
  const top = G - h;

  // Solid dark stone archway body
  facade.fillStyle(0x1e2430, 1);
  facade.fillRect(left, top, w, h);

  // Arch header and pillars (leaving 38px width x 48px opening for the 46px tall tram)
  facade.fillStyle(0x2d3648, 1);
  facade.fillRect(left, top, w, 16);             // Arch header
  facade.fillRect(left, top + 16, 8, 48);        // Outer pillar
  facade.fillRect(left + w - 8, top + 16, 8, 48);// Inner pillar

  // Cornice trim on top
  facade.fillStyle(0x0f172a, 1);
  facade.fillRect(left - 3, top - 2, w + 6, 3);
  facade.lineStyle(1, 0x64748b, 0.85);
  facade.lineBetween(left - 3, top - 2, left + w + 3, top - 2);

  // Keystone center block in European arched stone style
  facade.fillStyle(0x94a3b8, 1);
  facade.fillRect(x - 5, top + 3, 10, 9);
  facade.lineStyle(1, 0x000000, 0.7);
  facade.strokeRect(x - 5, top + 3, 10, 9);

  // Stone block mortar lines
  facade.lineStyle(1, 0x111622, 0.85);
  facade.lineBetween(left, top + 8, left + w, top + 8);
  for (let py = top + 16; py < G; py += 12) {
    facade.lineBetween(left, py, left + 8, py);
    facade.lineBetween(left + w - 8, py, left + w, py);
  }

  // Inner shadow rim around the tunnel mouth
  facade.fillStyle(0x0a0d14, 0.95);
  facade.fillRect(left + 8, top + 16, 3, 48);
  facade.fillRect(left + w - 11, top + 16, 3, 48);
  facade.fillRect(left + 8, top + 16, w - 16, 4);

  // Warning Railway Lantern above the portal
  const lantern = scene.add.graphics().setDepth(21.6);
  lantern.fillStyle(0x111827, 1);
  lantern.fillRect(x - 3, top - 9, 6, 7);

  return { interior, facade, lantern, x };
}

function tram(scene, trap) {
  const ext = trap.half + trap.len;
  const rails = scene.add.tileSprite(trap.x, G - 2, ext * 2 + 56, 6, "trap-rails").setOrigin(0.5, 0).setDepth(DEPTH.rail);
  const tunnelL = buildTunnelPortal(scene, trap.x - ext, G, true);
  const tunnelR = buildTunnelPortal(scene, trap.x + ext, G, false);
  const sigL = scene.add.sprite(trap.x - ext - 34, G, "trap-signal", 0).setOrigin(0.5, 1).setDepth(DEPTH.top);
  const sigR = scene.add.sprite(trap.x + ext + 34, G, "trap-signal", 0).setOrigin(0.5, 1).setDepth(DEPTH.top);
  const body = scene.add.image(trap.x, G + 1, "trap-tram").setOrigin(0.5, 1).setDepth(DEPTH.front).setAlpha(0).setVisible(false);
  const beam = scene.add.graphics().setDepth(DEPTH.top);

  const obj = {
    trap, parts: [body, rails, tunnelL.facade, tunnelR.facade], lastBeat: -1, lastActive: false,
    update(now) {
      const s = tramState(trap, now);
      const beat = Math.floor(now / 250);
      const frame = s.lights ? 1 + (beat % 2) : 0;
      sigL.setFrame(frame); sigR.setFrame(frame === 0 ? 0 : 3 - frame);

      // Warning lantern on the tunnel portal header
      const lanternColor = s.lights ? (beat % 2 === 0 ? 0xf59e0b : 0xef4444) : 0x475569;
      tunnelL.lantern.clear();
      tunnelL.lantern.fillStyle(0x111827, 1).fillRect(tunnelL.x - 3, G - 73, 6, 7);
      tunnelL.lantern.fillStyle(lanternColor, 1).fillCircle(tunnelL.x, G - 69, 2.5);

      tunnelR.lantern.clear();
      tunnelR.lantern.fillStyle(0x111827, 1).fillRect(tunnelR.x - 3, G - 73, 6, 7);
      tunnelR.lantern.fillStyle(lanternColor, 1).fillCircle(tunnelR.x, G - 69, 2.5);

      // Headlight warning beam shining out onto the rails from the tunnel portal
      beam.clear();
      if ((s.lights || s.active) && near(scene, trap.x, 420)) {
        const fromX = s.dir > 0 ? (trap.x - ext) : (trap.x + ext);
        const toX = fromX + s.dir * 85;
        const beamY = G - 18;
        beam.fillStyle(0xfff2b0, s.active ? 0.22 : 0.14);
        beam.fillTriangle(fromX, beamY, toX, beamY - 14, toX, beamY + 18);
        beam.fillStyle(0xffffff, s.active ? 0.75 : 0.45);
        beam.fillCircle(fromX + s.dir * 4, beamY, 3);
      }

      if (s.bell && beat !== obj.lastBeat && near(scene, trap.x, 380)) retroAudio.playBell?.();
      obj.lastBeat = beat;

      // Tram is physically masked by the tunnel facade (depth 21.5); keeping alpha solid as it rolls out
      body.setVisible(s.active).setAlpha(s.active ? 1 : 0).setX(s.x).setFlipX(s.dir < 0);
      if (s.active && !obj.lastActive && near(scene, trap.x, 380)) {
        retroAudio.playTrainWhistle?.();
        scene.cameras?.main?.shake(220, 0.0022);
        // Spawn steam/track dust puffs as the tram bursts out of the tunnel mouth
        const mouthX = s.dir > 0 ? (trap.x - ext) : (trap.x + ext);
        for (let i = 0; i < 5; i++) {
          const puff = scene.add.circle(mouthX, G - 12, Phaser.Math.Between(3, 5), 0xdde4ec, 0.75).setDepth(21.7);
          scene.tweens.add({
            targets: puff,
            x: puff.x + s.dir * Phaser.Math.Between(15, 30),
            y: puff.y - Phaser.Math.Between(4, 12),
            alpha: 0,
            scale: 1.8,
            duration: Phaser.Math.Between(320, 500),
            ease: "Quad.easeOut",
            onComplete: () => puff.destroy()
          });
        }
      }
      obj.lastActive = s.active;
    },
    hit() { flash(scene, [body]); }
  };
  return obj;
}

// EISZAPFEN ------------------------------------------------------------------------------------
const CANOPY_Y = 118;
function icicle(scene, trap) {
  const d = TRAP.types.icicle;
  const postH = G - CANOPY_Y + 2;
  const posts = [-1, 1].map((s) => scene.add.rectangle(trap.x + s * (d.halfW + 6), CANOPY_Y - 2, 3, postH, 0x5a4636).setOrigin(0.5, 0).setDepth(7.6));
  const canopy = scene.add.image(trap.x, CANOPY_Y, "trap-canopy").setOrigin(0.5, 1).setDepth(DEPTH.trap);
  const ice = scene.add.sprite(trap.x, CANOPY_Y - 2, "trap-icicle", 0).setOrigin(0.5, 0).setDepth(DEPTH.top);
  const marker = scene.add.ellipse(trap.x, G - 1, 44, 6, 0xe23a3a, 0).setDepth(DEPTH.back);
  const obj = {
    trap, parts: [canopy, ice], burst: false,
    update(now) {
      const s = icicleState(trap, now);
      ice.setVisible(s.phase !== "shatter");
      marker.setAlpha(0);
      if (s.phase === "hang") { ice.setFrame(0).setPosition(trap.x, CANOPY_Y - 2).setAlpha(1); obj.burst = false; }
      else if (s.phase === "regrow") {
        const u = clamp01((s.t - d.shatterToMs) / (d.periodMs - d.shatterToMs));
        ice.setFrame(0).setPosition(trap.x, CANOPY_Y - 2).setAlpha(u).setScale(1, 0.4 + 0.6 * u);
      } else if (s.phase === "warn") {
        ice.setFrame(1).setScale(1, 1).setAlpha(1).setPosition(trap.x + Math.round(Math.sin(now / 32) * (1 + 1.5 * s.u)), CANOPY_Y - 2);
        marker.setAlpha(0.18 + 0.5 * s.u).setScale(0.35 + 0.65 * s.u, 1);
      } else if (s.phase === "fall") {
        ice.setFrame(1).setScale(1, 1).setAlpha(1).setPosition(trap.x, s.tipY - 28);
        marker.setAlpha(0.7).setScale(1, 1);
      } else if (s.phase === "shatter") {
        marker.setAlpha(0.45 * (1 - s.u));
        if (!obj.burst) {
          obj.burst = true;
          ice.setScale(1, 1);
          for (let i = 0; i < 9; i++) {
            const dx = (i - 4) * 7 + (Math.random() * 4 - 2);
            const shard = scene.add.rectangle(trap.x + dx * 0.3, G - 6, 3, 3, i % 2 ? 0xbfe8fa : 0xffffff).setDepth(DEPTH.sky);
            scene.tweens.add({ targets: shard, x: trap.x + dx * 1.15, y: G - 2, alpha: 0, angle: 180, duration: 420 + (i % 3) * 90, ease: "Quad.easeOut", onComplete: () => shard.destroy() });
          }
          if (near(scene, trap.x)) { retroAudio.playShatter?.(); scene.cameras?.main?.shake(90, 0.0035); }
        }
      }
    },
    hit() { flash(scene, [canopy]); }
  };
  obj.parts.push(marker, ...posts);
  return obj;
}

// MÖWE -----------------------------------------------------------------------------------------
function gull(scene, trap) {
  const shadow = scene.add.ellipse(trap.x, G - 1, 16, 4, 0x000000, 0.25).setDepth(DEPTH.back);
  const marker = scene.add.ellipse(trap.x, G - 2, 20, 5, 0xe23a3a, 0).setDepth(DEPTH.back);
  const bang = scene.add.text(trap.x, G - 16, "!", { fontFamily: "'Press Start 2P', monospace, sans-serif", fontSize: "10px", color: "#ff5a4a", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setDepth(DEPTH.sky).setVisible(false);
  const bird = scene.add.sprite(trap.x, 66, "trap-gull", 0).setDepth(DEPTH.sky).setAlpha(0);
  const obj = {
    trap, parts: [bird], lastMode: "",
    update(now) {
      const s = gullState(trap, now);
      const faceLeft = s.dir > 0;                     // approaches from +dir side, skims toward -dir
      bird.setPosition(s.x, s.y).setAlpha(s.alpha).setFlipX(faceLeft);
      const flip = faceLeft ? -1 : 1;
      if (s.mode === "dive") bird.setFrame(4).setRotation(flip * 1.15);
      else if (s.mode === "skim") bird.setFrame(5).setRotation(0);
      else {
        const rate = s.mode === "aim" ? 70 : 120;
        bird.setFrame(Math.floor(now / rate) % 4).setRotation(s.mode === "climb" ? -flip * 0.5 : 0);
      }
      const h = clamp01((s.y - 40) / 180);
      shadow.setPosition(s.x, G - 1).setScale(0.5 + h, 1).setAlpha(0.28 * h * s.alpha);
      if (s.markerOn) {
        marker.setPosition(s.spotX, G - 2).setScale(0.45 + 0.8 * s.markerU, 1).setAlpha(0.3 + 0.3 * Math.abs(Math.sin(now / 90)));
        bang.setPosition(s.spotX, G - 16).setVisible(Math.floor(now / 110) % 2 === 0);
      } else { marker.setAlpha(0); bang.setVisible(false); }
      if (s.mode === "dive" && obj.lastMode !== "dive" && near(scene, s.spotX)) retroAudio.playGull?.();
      obj.lastMode = s.mode;
    },
    hit() { flash(scene, [bird]); }
  };
  obj.parts.push(shadow, marker, bang);
  return obj;
}

// BANDUL ---------------------------------------------------------------------------------------
const SKINS = {
  ball:   { tex: "trap-ball",   frame: 0x3a3d4a, beam: 0xe0b020, post: 0x8a6a10, rope: 0x30343f, origin: [0.5, 0.5], spin: 0 },
  censer: { tex: "trap-censer", frame: 0x6c6877, beam: 0x8c8794, post: 0x6c6877, rope: 0xc9a227, origin: [0.5, 0.62], spin: 0.5 }
};
function pendulum(scene, trap) {
  const d = TRAP.types.pendulum;
  const skin = SKINS[trap.skin] || SKINS.ball;
  const span = trap.len * Math.sin((d.ampDeg * Math.PI) / 180) + 34;
  const beamY = trap.pivotY - 8;
  const posts = [-1, 1].map((s) => scene.add.rectangle(trap.x + s * span, beamY, 5, G - beamY, skin.post).setOrigin(0.5, 0).setDepth(7.6));
  const beam = scene.add.rectangle(trap.x, beamY, span * 2 + 5, 6, skin.beam).setOrigin(0.5, 0).setDepth(7.65);
  const cap = scene.add.circle(trap.x, trap.pivotY, 3, 0x1c1624).setDepth(DEPTH.trap);
  const rope = scene.add.rectangle(trap.x, trap.pivotY, 2, trap.len, skin.rope).setOrigin(0.5, 0).setDepth(DEPTH.rope);
  const ball = scene.add.image(trap.x, trap.pivotY + trap.len, skin.tex).setOrigin(skin.origin[0], skin.origin[1]).setDepth(DEPTH.front);
  const obj = {
    trap, parts: [ball, rope],
    update(now) {
      const s = pendulumState(trap, now);
      rope.setRotation(-s.angle);
      ball.setPosition(s.x, s.y).setRotation(-s.angle * skin.spin);
    },
    hit() { flash(scene, [ball]); }
  };
  obj.parts.push(posts[0], posts[1], beam, cap);
  return obj;
}

const FACTORY = { spikes, pop, roller, tram, icicle, gull, pendulum };

export function createTrapVisual(scene, trap) {
  return (FACTORY[trap.type] || spikes)(scene, trap);
}
