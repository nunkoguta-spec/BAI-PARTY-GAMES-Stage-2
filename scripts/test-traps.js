// Stage traps: pure logic (placement + timing + hit boxes) and the real server (HP, cooldown, K.O.).
// Run: node scripts/test-traps.js
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import { COURSE } from "../src/game/course.js";
import { BATTLE, battleEnemyX } from "../src/game/battle.js";
import { QUEST } from "../src/game/quests.js";
import { TRAP, TRAPS, TRAP_DAMAGE, trapsForStage, popFrame, popDangerous, rollerX, trapHits, trapExtent, tramState, icicleState, gullState, pendulumState } from "../src/game/traps.js";

const checks = [];
const check = (name, ok, extra = "") => { checks.push([name, Boolean(ok)]); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); };

// ---------- 1. placement ----------
const boxes = COURSE.questionBoxes.map((b) => b.x);
for (const stage of COURSE.stages) {
  const list = trapsForStage(stage.id);
  check(`${stage.id}: has traps`, list.length >= 4, `got ${list.length}`);
  const enemy = BATTLE.stages[stage.id] ? battleEnemyX(stage.id) : null;
  const npc = stage.id === QUEST.stageId ? QUEST.npcs.map((n) => n.x) : [];
  let clear = true, why = "";
  for (const t of list) {
    const [lo, hi] = trapExtent(t);
    const bad = (x, m, label) => { if (x > lo - m && x < hi + m) { clear = false; why = `${t.id} near ${label} ${x}`; } };
    if (lo < stage.startX + 300 || hi > stage.endX - 330) { clear = false; why = `${t.id} too close to a station`; }
    boxes.forEach((b) => bad(b, 70, "question box"));
    if (enemy) bad(enemy, BATTLE.reach + 140 + 20, "enemy fight zone");
    npc.forEach((n) => bad(n, 140, "NPC"));
  }
  check(`${stage.id}: traps keep clear of stations / boxes / enemy / NPC`, clear, why);
}
check("all trap ids unique", new Set(TRAPS.map((t) => t.id)).size === TRAPS.length);
check("damage table covers every stage", COURSE.stages.every((s) => TRAP_DAMAGE[s.id]));

// ---------- 2. timing + hit boxes ----------
const pop = TRAPS.find((t) => t.type === "pop");
const stand = 224 - TRAP.heroFeet;                      // player.y while standing on the street
const t0 = 1_700_000_000_000 - (1_700_000_000_000 % 2400) - pop.phaseMs;   // start of a cycle for `pop`
check("pop: retracted at cycle start", popFrame(pop, t0 + 100) === 0 && !popDangerous(pop, t0 + 100));
check("pop: warning is NOT dangerous", popFrame(pop, t0 + 1200) === 1 && !trapHits(pop, pop.x, stand, t0 + 1200));
check("pop: dangerous only in the extended window", trapHits(pop, pop.x, stand, t0 + 2000) && !trapHits(pop, pop.x, stand, t0 + 1650));
check("pop: jump clears it while extended", !trapHits(pop, pop.x, stand - 30, t0 + 2000));
const sp = TRAPS.find((t) => t.type === "spikes");
check("spikes: standing on them hurts, jumping 20px clears", trapHits(sp, sp.x, stand, 0) && !trapHits(sp, sp.x, stand - 20, 0));
check("spikes: 1 body width away is safe", !trapHits(sp, sp.x + sp.w / 2 + TRAP.bodyHalfW + 1, stand, 0));
const rl = TRAPS.find((t) => t.type === "roller");
check("roller: ping-pong stays inside its range", [0, 500, 1100, 2000, 3300].every((ms) => { const x = rollerX(rl, ms); return x >= rl.from - 0.01 && x <= rl.to + 0.01; }));
check("roller: hits at the barrel, safe when jumping over", trapHits(rl, rollerX(rl, 700), stand, 700) && !trapHits(rl, rollerX(rl, 700), stand - 26, 700));
const jumpApex = 430 * 430 / (2 * 900), airDist = 185 * 2 * 430 / 900;
check("every spikes/pop/roller is clearable with one jump", TRAPS.filter((t) => ["spikes", "pop", "roller"].includes(t.type)).every((t) => (t.type === "roller" ? 24 : t.type === "pop" ? 16 : 12) + 4 < jumpApex && (t.type === "roller" ? 24 : t.w) + 18 < airDist));


// ---------- 2b. the "not ordinary" traps: logic ----------
const kinds = new Set(TRAPS.map((t) => t.type));
check("all 7 trap types are used somewhere", ["spikes", "pop", "roller", "tram", "icicle", "gull", "pendulum"].every((k) => kinds.has(k)), [...kinds].join());
check("damage table has every type for every stage", COURSE.stages.every((s) => [...kinds].every((k) => Number.isFinite(TRAP_DAMAGE[s.id][k]))));

const tr = TRAPS.find((x) => x.type === "tram");
const tc = 1_700_000_000_000 - (1_700_000_000_000 % 5000) - tr.phaseMs;      // start of a tram cycle
check("tram: lights come on BEFORE the tram, bell too", tramState(tr, tc + 3000).lights && !tramState(tr, tc + 3000).active && tramState(tr, tc + 3000).bell);
check("tram: dangerous only while the tram is on the street", trapHits(tr, tramState(tr, tc + 4150).x, stand, tc + 4150) && !trapHits(tr, tr.x, stand, tc + 1000) && !trapHits(tr, tr.x, stand, tc + 3000));
check("tram: you can jump over the roof", !trapHits(tr, tramState(tr, tc + 4150).x, stand - 60, tc + 4150));
check("tram: direction alternates each cycle", tramState(tr, tc + 4150).dir === -tramState(tr, tc + 5000 + 4150).dir);
const dbl = TRAPS.find((x) => x.type === "tram" && x.double);
check("double tram: lights stay on until BOTH trams are gone", dbl && (() => { const c0 = 1_700_000_000_000 - (1_700_000_000_000 % 6200) - dbl.phaseMs; const a = tramState(dbl, c0 + 3300), b = tramState(dbl, c0 + 5250); return a.lights && !a.active && b.active && b.dir === -tramState(dbl, c0 + 4150).dir && tramState(dbl, c0 + 5850).lights; })());

const ic = TRAPS.find((x) => x.type === "icicle");
const ic0 = 1_700_000_000_000 - (1_700_000_000_000 % 3000) - ic.phaseMs;
check("icicle: warns for 0.8 s before it falls", icicleState(ic, ic0 + 1500).phase === "warn" && !trapHits(ic, ic.x, stand, ic0 + 1500));
check("icicle: shard ring hurts, hopping it is safe, far away is safe", trapHits(ic, ic.x, stand, ic0 + 2250) && !trapHits(ic, ic.x, stand - 30, ic0 + 2250) && !trapHits(ic, ic.x + 80, stand, ic0 + 2250));

const gl = TRAPS.find((x) => x.type === "gull");
const spots = new Set(); for (let c = 0; c < 40; c++) spots.add(gullState(gl, c * 3600 - gl.phaseMs).spotX);
check("gull: the dive spot varies between cycles", spots.size >= 3, [...spots].join());
check("gull: hovering / cruising never hurts", [200, 1000, 1700].every((ms) => !trapHits(gl, gullState(gl, ms - gl.phaseMs).x, stand, ms - gl.phaseMs)));
const gDive = 2345 - gl.phaseMs, gs = gullState(gl, gDive);
check("gull: the dive hits a player at the spot (not one that hopped)", gs.mode === "dive" && trapHits(gl, gs.x, stand, gDive) && !trapHits(gl, gs.x + 60, stand, gDive));

const pd = TRAPS.find((x) => x.type === "pendulum");
const swing = [0, 700, 1400, 2100].map((ms) => pendulumState(pd, ms));
check("pendulum: ball touches the street at the lowest point, swings both ways", swing.some((p) => p.y + 13 > 223) && swing.some((p) => p.x > pd.x + 20) && swing.some((p) => p.x < pd.x - 20));
check("pendulum: standing under the low ball hurts, hopping over it is safe", (() => { const ms = [...Array(280).keys()].map((i) => i * 10).find((m) => Math.abs(pendulumState(pd, m).x - pd.x) < 3); return trapHits(pd, pendulumState(pd, ms).x, stand, ms) && !trapHits(pd, pendulumState(pd, ms).x, stand - 40, ms); })());

// ---------- 2c. FAIRNESS: simulate a running / jumping player against every trap ----------
// For EVERY arrival moment there must be a way through (run, or hop at some spot) after waiting at most
// MAX_WAIT ms outside the trap. Hit boxes use the exact same functions the server uses.
const SPEED = 185, JUMP = 430, GRAV = 900, STEP = 16, MAX_WAIT = { tram: 3200, pendulum: 1500, icicle: 1500, gull: 1500 };
function passes(trap, ext, t0, jx) {
  let x = ext[0] - 24, t = 0, y = stand, vy = 0, air = false;
  while (x < ext[1] + 24 && t < 12000) {
    if (!air && jx !== null && x >= jx) { air = true; vy = -JUMP; jx = null; }
    if (air) { vy += GRAV * STEP / 1000; y += vy * STEP / 1000; if (y >= stand) { y = stand; air = false; vy = 0; } }
    if (trapHits(trap, x, y, t0 + t)) return false;
    x += SPEED * STEP / 1000; t += STEP;
  }
  return true;
}
for (const type of ["tram", "icicle", "gull", "pendulum"]) {
  let worst = 0, stuck = 0, n = 0;
  for (const trap of TRAPS.filter((x) => x.type === type)) {
    const ext = trapExtent(trap);
    const period = type === "tram" ? (trap.double ? TRAP.types.tram.doublePeriodMs : TRAP.types.tram.periodMs) : TRAP.types[type].periodMs || 3000;
    const jumps = [null]; for (let j = ext[0] - 24; j <= ext[1] + 24; j += 12) jumps.push(j);
    for (let t0 = 0; t0 < period * (type === "gull" ? 6 : 1); t0 += 150) {
      n++;
      let found = false;
      for (let w = 0; w <= 6000 && !found; w += 100) if (jumps.some((jx) => passes(trap, ext, t0 + w, jx))) { found = true; worst = Math.max(worst, w); }
      if (!found) stuck++;
    }
  }
  check(`fair: ${type}: every arrival moment has a way through (${n} sampled, worst wait ${worst} ms)`, stuck === 0 && worst <= MAX_WAIT[type], `stuck ${stuck}, worst ${worst}`);
}

// ---------- 3. real server ----------
const PORT = 3496;
const server = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (s, e, d) => new Promise((r) => s.emit(e, d, r));
const connect = (s) => new Promise((res, rej) => { s.once("connect", res); s.once("connect_error", rej); });

async function integration() {
  await wait(1200);
  const host = io(`http://127.0.0.1:${PORT}`); let p = io(`http://127.0.0.1:${PORT}`);
  await Promise.all([connect(host), connect(p)]);
  const clock = await ack(p, "clock:sync", {});
  check("clock:sync returns server time", clock?.ok && Math.abs(clock.serverNow - Date.now()) < 2000);
  const { roomCode, hostToken } = await ack(host, "room:create", { name: "Host" });
  await ack(p, "room:join", { roomCode, name: "Tester" });
  await ack(host, "room:start", { roomCode, hostToken });
  const hits = [], hps = [];
  const listen = () => { p.on("trap:hit", (d) => hits.push(d)); p.on("player:hp", (d) => hps.push(d)); };
  listen();
  const move = async (stageIndex, x, y, ms = 120) => { p.emit("player:move", { roomCode, stageIndex, x, y, vx: 0, vy: 0, teleport: true }); await wait(ms); };

  // München: first static spikes
  const m = trapsForStage("munich").find((t) => t.type === "spikes");
  await move(0, m.x - 150, stand);
  await move(0, m.x, stand - 60);                         // in the air above: no hit
  check("server: airborne over spikes = no damage", hits.length === 0);
  await move(0, m.x, stand);                              // on the spikes
  check("server: spikes hit once, HP -8, trap:hit sent", hits.length === 1 && hits[0].trapId === m.id && hps.at(-1)?.hp === 100 - TRAP_DAMAGE.munich.spikes && hps.at(-1)?.source === "trap", JSON.stringify(hits[0]));
  await move(0, m.x, stand);
  check("server: no second hit inside the cooldown", hits.length === 1);
  await wait(TRAP.hitCooldownMs + 100);
  await move(0, m.x, stand);
  check("server: hits again after the cooldown", hits.length === 2 && hps.at(-1).hp === 100 - 2 * TRAP_DAMAGE.munich.spikes);

  // Köln spikes are lighter
  const k = trapsForStage("koeln").find((t) => t.type === "spikes");
  await wait(TRAP.hitCooldownMs + 100);
  const before = hps.at(-1).hp;
  await move(4, k.x, stand);
  check("server: Köln trap is lighter (-6)", before - hps.at(-1).hp === TRAP_DAMAGE.koeln.spikes, `${before} -> ${hps.at(-1).hp}`);

  // a trap of another stage never hurts
  await wait(TRAP.hitCooldownMs + 100);
  const n = hits.length;
  await move(1, m.x, stand);                              // Frankfurt index but München x -> not in that stage
  check("server: traps only count in their own stage", hits.length === n);


  // New trap types go through the same server path (HP, cooldown, own-stage only)
  async function serverHit(type, stageIdx, stageId, find, label) {
    await wait(TRAP.hitCooldownMs + 100);
    const t = find(trapsForStage(stageId).find((x) => x.type === type));
    const before = hps.at(-1).hp, n = hits.length;
    for (let i = 0; i < 170 && hits.length === n; i++) { const pos = t.at(Date.now()); await move(stageIdx, pos.x, pos.y, 60); }
    check(`server: ${label} hurts (-${TRAP_DAMAGE[stageId][type]}) and sends trap:hit`, hits.length === n + 1 && hits.at(-1).type === type && before - hps.at(-1).hp === TRAP_DAMAGE[stageId][type], JSON.stringify(hits.at(-1)));
  }
  await serverHit("tram", 0, "munich", (t) => ({ at: (now) => { const s = tramState(t, now + 80); return { x: s.active ? s.x : t.x, y: stand }; } }), "tram");
  await serverHit("pendulum", 1, "frankfurt", (t) => ({ at: (now) => { const s = pendulumState(t, now + 80); return { x: s.x, y: stand }; } }), "pendulum");
  await serverHit("icicle", 2, "berlin", (t) => ({ at: (now) => ({ x: t.x, y: stand }) }), "icicle");
  // Damage is higher now: use a fresh player (full HP) for the last checks so the HP budget never hides a result.
  p.close(); p = io(`http://127.0.0.1:${PORT}`); await connect(p);
  await ack(p, "room:join", { roomCode, name: "Tester2" }); listen();
  hits.length = 0; hps.length = 0;
  hps.push({ hp: BATTLE.playerMaxHp });
  await serverHit("gull", 3, "hamburg", (t) => ({ at: (now) => { const s = gullState(t, now + 80); return { x: s.mode === "dive" || s.mode === "skim" ? s.x : t.x - 150, y: stand }; } }), "gull");

  // K.O. through traps: -25 once
  await wait(TRAP.hitCooldownMs + 100);
  const hb = trapsForStage("hamburg").find((t) => t.type === "spikes");
  let ko = null, guard = 0;
  const scoreBefore = (await ack(p, "battle:state", { roomCode })).score;
  while (!ko && guard++ < 12) {
    await move(3, hb.x, stand, 150);
    ko = hps.find((h) => h.ko && h.source === "trap");
    if (!ko) await wait(TRAP.hitCooldownMs + 50);
  }
  check("server: repeated traps eventually K.O. (once)", ko && hps.filter((h) => h.ko && h.source === "trap").length === 1);
  check("server: K.O. penalty -25 applied once", ko && ko.penalty === BATTLE.koPenalty);
  await wait(BATTLE.koRespawnMs + 400);
  check("server: respawn after K.O. with full HP", hps.at(-1)?.respawn === true && hps.at(-1).hp === BATTLE.playerMaxHp, JSON.stringify(hps.at(-1)));
  host.close(); p.close();
}

try { await integration(); } catch (e) { console.error(e); check("integration ran", false, String(e)); }
server.kill();
const failed = checks.filter(([, ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
