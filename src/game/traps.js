// Traps ("jebakan") — every stage has its own set. Shared by the server (which decides every
// hit) and the client (which only draws them), so positions and timing are identical.
//
// Seven mechanics. Everything is a pure function of the SERVER clock (no per-player state), so the
// server, the TV and every phone see the same thing:
//   spikes    static floor spikes, always dangerous
//   pop       spikes that retract: safe -> warning -> rise -> DANGER -> retract
//   roller    a barrel that rolls back and forth along a patrol range
//   -- the "not ordinary" ones --
//   tram      TRAM LEWAT: signal lights + bell start ~1.5 s before a tram races along the street rails
//             (comes from the other side every 2nd cycle). Wait it out, or jump over the roof.
//   icicle    EISZAPFEN: a snowy canopy; its icicles shake + a red marker grows on the ground, then they
//             drop and shatter into a low shard ring. Step out from under it (or hop the shards).
//   gull      MÖWE: a gull circles high, hovers over a marker (the dive spot changes every cycle), dives,
//             then skims along the ground. Dodge the dive sideways, hop the skim.
//   pendulum  BANDUL: a heavy ball (Frankfurt wrecking ball, Köln incense censer) swings through the street.
//             Time it, or hop over the low part of the swing.
//
// A hit costs HP (never directly points; a K.O. costs the usual -25 once, see battle.js).
// Placement keeps clear of: the arrival station / Bahnhof, question boxes, the enemy fight zone and the
// Köln NPC (checked in scripts/test-traps.js, which also simulates a player to prove every trap is passable).
import { COURSE } from "./course.js";

export const TRAP = Object.freeze({
  groundY: 224,          // top of the street
  heroFeet: 15,          // player.y (sprite centre) + heroFeet = feet
  bodyHalfW: 9,          // Arcade body is 18px wide
  bodyH: 22,             // ... and 22px tall (feet - bodyH = head)
  tolerance: 2,          // px of leniency on every side (feels fair, never hits "near misses")
  hitCooldownMs: 1200,   // invulnerability after any trap hit (was 1500: shorter = less room to "tank" a gauntlet)
  knockbackX: 170,
  knockbackY: 250,
  types: Object.freeze({
    spikes: Object.freeze({ tileW: 32, height: 12, label: "PAKU" }),
    pop: Object.freeze({
      tileW: 32, height: 16, label: "PAKU MUNCUL",
      periodMs: 2400, warnFromMs: 1000, riseFromMs: 1550, activeFromMs: 1700, activeToMs: 2250
    }),
    roller: Object.freeze({ radius: 12, label: "TONG GULING" }),
    tram: Object.freeze({
      label: "TRAM LEWAT",
      periodMs: 5000,
      warnFromMs: 2800,        // lights + bell start (1 s of warning, was 1.5 s)
      trainFromMs: 3800,       // tram enters
      trainToMs: 4500,         // tram has left
      lightsOffMs: 4800,
      // "double" tram (Hamburg): a second tram from the OTHER side follows right behind the first.
      // The lights stay on until BOTH are gone, so "lights on = do not cross" is always true.
      train2FromMs: 4900,
      train2ToMs: 5600,
      lightsOff2Ms: 5900,
      doublePeriodMs: 6200,
      half: 70,                // default half-length of the rail segment the tram crosses
      len: 100,                // tram body length
      height: 46               // roof height above the street: a jump clears it
    }),
    icicle: Object.freeze({
      label: "EISZAPFEN",
      periodMs: 3000,
      warnFromMs: 1100,        // shake + ground marker
      fallFromMs: 1900,
      shatterFromMs: 2100,     // low shard ring (dangerous until shatterToMs)
      shatterToMs: 2450,
      halfW: 24,               // canopy / icicle row half width
      tipY0: 144,              // tip height while hanging
      len: 28,
      shatterHalfW: 30,
      shatterH: 14
    }),
    gull: Object.freeze({
      label: "MÖWE",
      periodMs: 3600,
      aimFromMs: 1300,         // hovers over the dive spot (marker on the ground)
      diveFromMs: 2050,
      skimFromMs: 2350,
      climbFromMs: 2800,
      offsets: Object.freeze([-40, 0, 40]),   // dive spot relative to the trap x, picked per cycle
      cruiseY: 66,
      diveY: 212,
      radius: 8,
      skim: 50,                // ground skim distance
      climbDx: 60,
      approachDx: 240
    }),
    pendulum: Object.freeze({
      label: "BANDUL",
      periodMs: 2300,
      ampDeg: 58,
      len: 92,
      ballR: 13
    })
  })
});

// HP damage per hit. Escalates with the stage; Köln (peaceful side-quest stage) is lighter.
export const TRAP_DAMAGE = Object.freeze({
  munich:    Object.freeze({ spikes: 10, pop: 15, roller: 12, tram: 15, icicle: 11, gull: 12, pendulum: 12 }),
  frankfurt: Object.freeze({ spikes: 10, pop: 15, roller: 12, tram: 15, icicle: 11, gull: 12, pendulum: 15 }),
  berlin:    Object.freeze({ spikes: 12, pop: 18, roller: 15, tram: 18, icicle: 15, gull: 15, pendulum: 18 }),
  hamburg:   Object.freeze({ spikes: 15, pop: 22, roller: 18, tram: 22, icicle: 18, gull: 20, pendulum: 20 }),
  koeln:     Object.freeze({ spikes: 7,  pop: 11, roller: 9,  tram: 10, icicle: 8,  gull: 9, pendulum: 9 })
});

// Local x = distance from the stage's start. `tiles` = how many 32px blocks (spikes / pop).
// Roller: `from`/`to` = patrol range, `periodMs` = one trip there and back.
// tram: `half` = half length of the rail segment, `double` = a second tram from the other side. pendulum: `skin` "ball" | "censer", optional `len`.
// gull: `dir` = which way it skims (1 = toward -x). Any type: `phaseMs` shifts its cycle.
const LAYOUT = Object.freeze({
  munich: [
    { type: "spikes", x: 380, tiles: 2 },
    { type: "tram", x: 1325 },
    { type: "roller", from: 1690, to: 1800, periodMs: 3200 },
    { type: "pop", x: 1890 },
    { type: "spikes", x: 2020, tiles: 2 }
  ],
  frankfurt: [
    { type: "spikes", x: 380, tiles: 2 },
    { type: "pendulum", x: 1330, skin: "ball" },
    { type: "spikes", x: 1500 },
    { type: "pop", x: 1620, tiles: 2 },
    { type: "pop", x: 1700, phaseMs: 1200 },
    { type: "roller", from: 1890, to: 2030, periodMs: 3000 }
  ],
  berlin: [
    { type: "spikes", x: 380, tiles: 2 },
    { type: "icicle", x: 1330, phaseMs: 0 },
    { type: "icicle", x: 1425, phaseMs: 600 },
    { type: "icicle", x: 1520, phaseMs: 1200 },
    { type: "icicle", x: 1615, phaseMs: 1800 },
    { type: "pop", x: 1700 },
    { type: "pop", x: 1780, tiles: 2, phaseMs: 1200 },
    { type: "spikes", x: 2000 }
  ],
  hamburg: [
    { type: "spikes", x: 370, tiles: 2 },
    { type: "gull", x: 700 },
    { type: "tram", x: 910, half: 60, double: true },
    { type: "spikes", x: 1240 },
    { type: "gull", x: 2000, phaseMs: 1800 }
  ],
  koeln: [
    { type: "spikes", x: 520 },
    { type: "pendulum", x: 860, skin: "censer" },
    { type: "roller", from: 1100, to: 1260, periodMs: 4000 },
    { type: "spikes", x: 1700 },
    { type: "tram", x: 1900 }
  ]
});

function seedOf(id) {
  let h = 17;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

function build() {
  const out = [];
  for (const stage of COURSE.stages) {
    (LAYOUT[stage.id] || []).forEach((t, i) => {
      const def = TRAP.types[t.type];
      const id = `trap-${stage.id}-${String(i + 1).padStart(2, "0")}`;
      const base = { id, stageId: stage.id, type: t.type, phaseMs: t.phaseMs || 0, damage: TRAP_DAMAGE[stage.id][t.type], seed: seedOf(id) };
      if (t.type === "roller") {
        out.push(Object.freeze({
          ...base, x: stage.startX + t.from, from: stage.startX + t.from, to: stage.startX + t.to, periodMs: t.periodMs
        }));
      } else if (t.type === "spikes" || t.type === "pop") {
        const tiles = t.tiles || 1;
        out.push(Object.freeze({ ...base, x: stage.startX + t.x, tiles, w: tiles * def.tileW }));
      } else if (t.type === "tram") {
        out.push(Object.freeze({ ...base, x: stage.startX + t.x, half: t.half || def.half, len: def.len, double: Boolean(t.double) }));
      } else if (t.type === "gull") {
        out.push(Object.freeze({ ...base, x: stage.startX + t.x, dir: t.dir || 1 }));
      } else if (t.type === "pendulum") {
        const len = t.len || def.len;
        out.push(Object.freeze({
          ...base, x: stage.startX + t.x, len, skin: t.skin || "ball",
          pivotY: TRAP.groundY - len - def.ballR       // ball bottom just touches the street at the lowest point
        }));
      } else {
        out.push(Object.freeze({ ...base, x: stage.startX + t.x }));
      }
    });
  }
  return Object.freeze(out);
}

export const TRAPS = build();

export function trapsForStage(stageId) {
  return TRAPS.filter((t) => t.stageId === stageId);
}

// ---- timing helpers (serverNow = epoch ms on the SERVER clock) -------------------------------

const mod = (a, n) => ((a % n) + n) % n;

function cycleHash(n, seed) {
  let h = Math.imul(n ^ seed, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const u = clamp01((v - a) / (b - a)); return u * u * (3 - 2 * u); };

// 0 = retracted, 1 = warning, 2 = rising/retracting, 3 = extended (frame index of pop-spikes.png)
export function popFrame(trap, serverNow) {
  const d = TRAP.types.pop;
  const t = mod(serverNow + trap.phaseMs, d.periodMs);
  if (t < d.warnFromMs) return 0;
  if (t < d.riseFromMs) return 1;
  if (t < d.activeFromMs) return 2;
  if (t < d.activeToMs) return 3;
  return 2;
}

// Server uses the shrunk window [activeFromMs, activeToMs) so a trap that LOOKS retracted never hurts.
export function popDangerous(trap, serverNow) {
  const d = TRAP.types.pop;
  const t = mod(serverNow + trap.phaseMs, d.periodMs);
  return t >= d.activeFromMs && t < d.activeToMs;
}

// Ping-pong patrol: x(t) between from and to, constant speed.
export function rollerX(trap, serverNow) {
  const u = mod(serverNow + trap.phaseMs, trap.periodMs) / trap.periodMs;
  const tri = u < 0.5 ? u * 2 : 2 - u * 2;
  return trap.from + (trap.to - trap.from) * tri;
}

// TRAM: lights on, tram position (centre), direction (+1 = moving right). Direction flips every cycle
// (and the 2nd tram of a "double" runs the other way).
export function tramState(trap, serverNow) {
  const d = TRAP.types.tram;
  const period = trap.double ? d.doublePeriodMs : d.periodMs;
  const total = serverNow + trap.phaseMs;
  const cycle = Math.floor(total / period);
  const t = total - cycle * period;
  const R = trap.half + trap.len / 2;
  const passes = trap.double ? [[d.trainFromMs, d.trainToMs], [d.train2FromMs, d.train2ToMs]] : [[d.trainFromMs, d.trainToMs]];
  let active = false, u = 0, pass = 0;
  passes.forEach(([a, b], i) => { if (t >= a && t < b) { active = true; u = (t - a) / (b - a); pass = i; } });
  const dir = (cycle % 2 === 0 ? 1 : -1) * (pass === 0 ? 1 : -1);
  const lightsOff = trap.double ? d.lightsOff2Ms : d.lightsOffMs;
  return {
    cycle, t, dir, active, pass, period,
    lights: t >= d.warnFromMs && t < lightsOff,
    bell: t >= d.warnFromMs && t < (trap.double ? d.train2ToMs : d.trainToMs),
    u,
    x: trap.x + dir * (-R + 2 * R * u),
    // the tram fades in / out at the ends of its path so it never "pops" into view
    alpha: active ? smooth(0, 0.14, u) * (1 - smooth(0.86, 1, u)) : 0
  };
}

// ICICLE: phase = hang | warn | fall | shatter | regrow, tip height of the falling row.
export function icicleState(trap, serverNow) {
  const d = TRAP.types.icicle;
  const t = mod(serverNow + trap.phaseMs, d.periodMs);
  let phase = "hang";
  let tipY = d.tipY0;
  let u = 0;
  if (t >= d.shatterToMs) phase = "regrow";
  else if (t >= d.shatterFromMs) { phase = "shatter"; tipY = TRAP.groundY; u = (t - d.shatterFromMs) / (d.shatterToMs - d.shatterFromMs); }
  else if (t >= d.fallFromMs) {
    phase = "fall";
    u = (t - d.fallFromMs) / (d.shatterFromMs - d.fallFromMs);
    tipY = d.tipY0 + (TRAP.groundY - d.tipY0) * u * u;
  } else if (t >= d.warnFromMs) { phase = "warn"; u = (t - d.warnFromMs) / (d.fallFromMs - d.warnFromMs); }
  return { t, phase, tipY, u };
}

// GULL: position (centre) and mode. The dive spot changes every cycle (deterministic pick).
export function gullState(trap, serverNow) {
  const d = TRAP.types.gull;
  const total = serverNow + trap.phaseMs;
  const cycle = Math.floor(total / d.periodMs);
  const t = total - cycle * d.periodMs;
  const dir = trap.dir || 1;
  const spotX = trap.x + d.offsets[cycleHash(cycle, trap.seed) % d.offsets.length];
  let x, y, mode, alpha = 1;
  if (t < d.aimFromMs) {
    const u = t / d.aimFromMs;
    mode = "cruise"; x = spotX + dir * d.approachDx * (1 - u); y = d.cruiseY; alpha = smooth(0, 0.25, u);
  } else if (t < d.diveFromMs) {
    mode = "aim"; x = spotX; y = d.cruiseY + Math.round(Math.sin(t / 55) * 2);
  } else if (t < d.skimFromMs) {
    const u = (t - d.diveFromMs) / (d.skimFromMs - d.diveFromMs);
    mode = "dive"; x = spotX; y = d.cruiseY + (d.diveY - d.cruiseY) * u * u;
  } else if (t < d.climbFromMs) {
    const u = (t - d.skimFromMs) / (d.climbFromMs - d.skimFromMs);
    mode = "skim"; x = spotX - dir * d.skim * u; y = d.diveY;
  } else {
    const u = (t - d.climbFromMs) / (d.periodMs - d.climbFromMs);
    const e = 1 - Math.pow(1 - u, 3);
    mode = "climb"; x = spotX - dir * (d.skim + d.climbDx * u); y = d.diveY - (d.diveY - d.cruiseY) * e; alpha = 1 - smooth(0.55, 1, u);
  }
  return { cycle, t, mode, x, y, spotX, dir, alpha, markerOn: t >= d.aimFromMs && t < d.diveFromMs + 120, markerU: clamp01((t - d.aimFromMs) / (d.diveFromMs - d.aimFromMs)) };
}

// PENDULUM: angle (rad, +angle = ball to +x) and ball centre.
export function pendulumState(trap, serverNow) {
  const d = TRAP.types.pendulum;
  const t = mod(serverNow + trap.phaseMs, d.periodMs);
  const angle = (d.ampDeg * Math.PI / 180) * Math.sin((2 * Math.PI * t) / d.periodMs);
  return { angle, x: trap.x + trap.len * Math.sin(angle), y: trap.pivotY + trap.len * Math.cos(angle) };
}

// Where the trap "is" right now (used for knock-back direction).
export function trapCenterX(trap, serverNow) {
  switch (trap.type) {
    case "roller": return rollerX(trap, serverNow);
    case "tram": { const s = tramState(trap, serverNow); return s.active ? s.x : trap.x; }
    case "gull": return gullState(trap, serverNow).x;
    case "pendulum": return pendulumState(trap, serverNow).x;
    default: return trap.x;
  }
}

// ---- hit tests (player.x / player.y as sent by the client: sprite centre) --------------------

function bodyBox(px, py) {
  const tol = TRAP.tolerance;
  return { l: px - (TRAP.bodyHalfW - tol), r: px + (TRAP.bodyHalfW - tol), t: py + TRAP.heroFeet - TRAP.bodyH + tol, b: py + TRAP.heroFeet - tol };
}
const rectHits = (box, l, r, t, b) => box.r > l && box.l < r && box.b > t && box.t < b;
function circleHits(box, cx, cy, rad) {
  const nx = Math.max(box.l, Math.min(cx, box.r));
  const ny = Math.max(box.t, Math.min(cy, box.b));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < rad * rad;
}

export function trapHits(trap, px, py, serverNow) {
  const feet = py + TRAP.heroFeet;
  const reach = TRAP.bodyHalfW - TRAP.tolerance;
  const g = TRAP.groundY;
  switch (trap.type) {
    case "roller": {
      const r = TRAP.types.roller.radius;
      const bx = rollerX(trap, serverNow);
      return Math.abs(px - bx) < r + reach && feet > g - r * 2 + 4;
    }
    case "spikes":
    case "pop": {
      const def = TRAP.types[trap.type];
      if (trap.type === "pop" && !popDangerous(trap, serverNow)) return false;
      return Math.abs(px - trap.x) < trap.w / 2 + reach && feet > g - def.height + 3;
    }
    case "tram": {
      const s = tramState(trap, serverNow);
      if (!s.active) return false;
      const d = TRAP.types.tram;
      return rectHits(bodyBox(px, py), s.x - trap.len / 2, s.x + trap.len / 2, g - d.height + 2, g);
    }
    case "icicle": {
      const d = TRAP.types.icicle;
      const s = icicleState(trap, serverNow);
      const box = bodyBox(px, py);
      if (s.phase === "fall") return rectHits(box, trap.x - d.halfW, trap.x + d.halfW, s.tipY - d.len, s.tipY);
      if (s.phase === "shatter") return rectHits(box, trap.x - d.shatterHalfW, trap.x + d.shatterHalfW, g - d.shatterH, g);
      return false;
    }
    case "gull": {
      const s = gullState(trap, serverNow);
      if (s.mode === "cruise" || s.mode === "aim") return false;
      return circleHits(bodyBox(px, py), s.x, s.y, TRAP.types.gull.radius);
    }
    case "pendulum": {
      const s = pendulumState(trap, serverNow);
      return circleHits(bodyBox(px, py), s.x, s.y, TRAP.types.pendulum.ballR - 1);
    }
    default:
      return false;
  }
}

// First trap that hurts a player standing at (px, py) on this stage, or null.
export function findTrapHit(stageId, px, py, serverNow) {
  for (const trap of trapsForStage(stageId)) {
    if (trapHits(trap, px, py, serverNow)) return trap;
  }
  return null;
}

// ---- horizontal extent a trap can ever hurt in (used by placement tests) ---------------------

const extentCache = new Map();
export function trapExtent(trap) {
  if (extentCache.has(trap.id)) return extentCache.get(trap.id);
  const reach = TRAP.bodyHalfW - TRAP.tolerance;
  let lo, hi;
  switch (trap.type) {
    case "spikes": case "pop": lo = trap.x - trap.w / 2; hi = trap.x + trap.w / 2; break;
    case "roller": lo = trap.from - 20; hi = trap.to + 20; break;
    case "tram": lo = trap.x - trap.half - trap.len; hi = trap.x + trap.half + trap.len; break;
    case "icicle": { const d = TRAP.types.icicle; lo = trap.x - d.shatterHalfW - reach; hi = trap.x + d.shatterHalfW + reach; break; }
    case "pendulum": {
      const d = TRAP.types.pendulum;
      const r = trap.len * Math.sin(d.ampDeg * Math.PI / 180) + d.ballR + reach;
      lo = trap.x - r; hi = trap.x + r; break;
    }
    case "gull": {
      // sample two full cycles: only the part of the flight a player can actually touch counts
      const d = TRAP.types.gull;
      lo = Infinity; hi = -Infinity;
      for (let ms = 0; ms < d.periodMs * 8; ms += 20) {
        const s = gullState(trap, ms - trap.phaseMs);
        if (s.y + d.radius < TRAP.groundY - TRAP.bodyH - 100 + 14) continue;     // above any head height
        lo = Math.min(lo, s.x - d.radius - reach); hi = Math.max(hi, s.x + d.radius + reach);
      }
      break;
    }
    default: lo = trap.x; hi = trap.x;
  }
  const ext = Object.freeze([Math.floor(lo), Math.ceil(hi)]);
  extentCache.set(trap.id, ext);
  return ext;
}
