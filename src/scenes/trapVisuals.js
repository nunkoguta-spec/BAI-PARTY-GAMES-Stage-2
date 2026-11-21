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

// TRAM LEWAT — PERLINTASAN SEBIDANG (BAHNÜBERGANG) -------------------------------------------
function tram(scene, trap) {
  const crossingHalfW = 28;
  const crossingW = crossingHalfW * 2;

  // 1. Level Crossing Tracks & Pavement (Perlintasan Sebidang tegak lurus melintasi jalan)
  const crossBase = scene.add.graphics().setDepth(DEPTH.rail);
  // Dark ballast bed across the street (from G - 28 down to G + 8)
  crossBase.fillStyle(0x18202c, 0.95);
  crossBase.fillRect(trap.x - crossingHalfW, G - 28, crossingW, 36);

  // Horizontal wooden cross-ties (sleepers) every 5px
  crossBase.fillStyle(0x453526, 1);
  for (let ty = G - 26; ty <= G + 4; ty += 5) {
    crossBase.fillRect(trap.x - crossingHalfW + 3, ty, crossingW - 6, 3);
    crossBase.fillStyle(0x2d2116, 1);
    crossBase.fillRect(trap.x - crossingHalfW + 3, ty + 2, crossingW - 6, 1);
    crossBase.fillStyle(0x453526, 1);
  }

  // Two vertical steel rails crossing the street perpendicularly
  crossBase.fillStyle(0x94a3b8, 1);
  crossBase.fillRect(trap.x - 14, G - 28, 3, 36);
  crossBase.fillRect(trap.x + 11, G - 28, 3, 36);
  crossBase.fillStyle(0xe2e8f0, 1);
  crossBase.fillRect(trap.x - 13, G - 28, 1, 36);
  crossBase.fillRect(trap.x + 12, G - 28, 1, 36);

  // White road hazard boundary line on both sides of the crossing
  crossBase.fillStyle(0xffffff, 0.85);
  crossBase.fillRect(trap.x - crossingHalfW - 1, G - 2, 2, 8);
  crossBase.fillRect(trap.x + crossingHalfW - 1, G - 2, 2, 8);

  // 2. German Andreaskreuz Warning Signal Posts
  const sigL = scene.add.sprite(trap.x - crossingHalfW - 12, G, "trap-signal", 0).setOrigin(0.5, 1).setDepth(DEPTH.top);
  const sigR = scene.add.sprite(trap.x + crossingHalfW + 12, G, "trap-signal", 0).setOrigin(0.5, 1).setDepth(DEPTH.top);

  // 3. Red & White Automatic Crossing Gates (Schranken / Palang Pintu)
  const gateL = scene.add.graphics().setDepth(DEPTH.front + 1);
  const gateR = scene.add.graphics().setDepth(DEPTH.front + 1);
  const gateLen = 34;

  function drawGateArm(g, postX, angleDeg, isLeft) {
    g.clear();
    // Gate post pivot
    g.fillStyle(0x2d3748, 1);
    g.fillRect(postX - 3, G - 16, 6, 16);
    g.fillStyle(0xe2e8f0, 1);
    g.fillCircle(postX, G - 14, 3.5);

    // Diagonal red/white striped barrier arm
    const rad = Phaser.Math.DegToRad(angleDeg);
    const dir = isLeft ? 1 : -1;
    const endX = postX + Math.cos(rad) * gateLen * dir;
    const endY = (G - 14) + Math.sin(rad) * gateLen;

    g.lineStyle(4, 0xffffff, 1);
    g.lineBetween(postX, G - 14, endX, endY);

    // Red stripes
    const segs = 5;
    for (let i = 1; i < segs; i += 2) {
      const t1 = i / segs;
      const t2 = (i + 1) / segs;
      const x1 = Phaser.Math.Linear(postX, endX, t1);
      const y1 = Phaser.Math.Linear(G - 14, endY, t1);
      const x2 = Phaser.Math.Linear(postX, endX, t2);
      const y2 = Phaser.Math.Linear(G - 14, endY, t2);
      g.lineStyle(4, 0xef4444, 1);
      g.lineBetween(x1, y1, x2, y2);
    }
  }

  // Initial upright open barrier pose (~75 deg up)
  let currentGateAngle = -75;
  drawGateArm(gateL, trap.x - crossingHalfW - 2, currentGateAngle, true);
  drawGateArm(gateR, trap.x + crossingHalfW + 2, currentGateAngle, false);

  // 4. Authentic Front-Facing German Train (Tampak Depan, matching Image 1)
  const textureKey = scene.textures.exists("trap-train-front") ? "trap-train-front" : "trap-tram";
  const body = scene.add.image(trap.x, G - 18, textureKey)
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.front)
    .setScale(0.4)
    .setAlpha(0)
    .setVisible(false);

  // 5. Dual LED Headlight Beams
  const beam = scene.add.graphics().setDepth(DEPTH.top);

  const obj = {
    trap, parts: [body, crossBase, gateL, gateR], lastBeat: -1, lastActive: false,
    update(now) {
      const s = tramState(trap, now);
      const beat = Math.floor(now / 250);
      const frame = s.lights ? 1 + (beat % 2) : 0;
      sigL.setFrame(frame); sigR.setFrame(frame === 0 ? 0 : 3 - frame);

      // Animate crossing barrier gates lowering when train warns or approaches
      const targetAngle = (s.lights || s.active) ? 0 : -75;
      if (Math.abs(currentGateAngle - targetAngle) > 1) {
        currentGateAngle = Phaser.Math.Linear(currentGateAngle, targetAngle, 0.14);
        drawGateArm(gateL, trap.x - crossingHalfW - 2, currentGateAngle, true);
        drawGateArm(gateR, trap.x + crossingHalfW + 2, currentGateAngle, false);
      }

      // Train motion: RUSHES FORWARD ALONG THE VERTICAL TRACKS (perspective Z/Y motion)
      // DOES NOT SLIDE SIDEWAYS! Center X is ALWAYS locked at trap.x!
      if (s.active) {
        const u = s.u; // 0 to 1
        const scale = 0.42 + u * 0.72;
        const currentY = (G - 18) + u * 20;
        const alpha = u < 0.15 ? (u / 0.15) : (u > 0.85 ? (1 - (u - 0.85) / 0.15) : 1);
        body.setPosition(trap.x, currentY).setScale(scale).setAlpha(alpha).setVisible(true);

        // Headlight beams shining forward from the approaching train's headlights
        beam.clear();
        if (near(scene, trap.x, 420)) {
          const beamAlpha = 0.22 + u * 0.15;
          const leftLightX = trap.x - 18 * scale;
          const rightLightX = trap.x + 18 * scale;
          const lightY = currentY - 18 * scale;

          // Left headlight beam
          beam.fillStyle(0xfff2b0, beamAlpha);
          beam.fillTriangle(leftLightX, lightY, leftLightX - 24 * scale, G + 12, leftLightX + 6 * scale, G + 12);
          beam.fillStyle(0xffffff, 0.85);
          beam.fillCircle(leftLightX, lightY, 2.5 * scale);

          // Right headlight beam
          beam.fillStyle(0xfff2b0, beamAlpha);
          beam.fillTriangle(rightLightX, lightY, rightLightX - 6 * scale, G + 12, rightLightX + 24 * scale, G + 12);
          beam.fillStyle(0xffffff, 0.85);
          beam.fillCircle(rightLightX, lightY, 2.5 * scale);
        }
      } else {
        body.setVisible(false).setAlpha(0);
        beam.clear();
        // Warning light pulse when signals are on before the train arrives
        if (s.lights && near(scene, trap.x, 420)) {
          beam.fillStyle(0xfff2b0, 0.12);
          beam.fillTriangle(trap.x, G - 24, trap.x - 22, G + 8, trap.x + 22, G + 8);
        }
      }

      if (s.bell && beat !== obj.lastBeat && near(scene, trap.x, 380)) retroAudio.playBell?.();
      obj.lastBeat = beat;

      if (s.active && !obj.lastActive && near(scene, trap.x, 380)) {
        retroAudio.playTrainWhistle?.();
        scene.cameras?.main?.shake(240, 0.0028);
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
