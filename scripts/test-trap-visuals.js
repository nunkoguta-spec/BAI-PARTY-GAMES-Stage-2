// Headless smoke test of src/scenes/trapVisuals.js: a stub scene runs every trap's visual for a few
// cycles and fires hit(). Catches typos / missing methods without a browser. (It cannot judge how it LOOKS.)
// Run: node scripts/test-trap-visuals.js
import { TRAPS } from "../src/game/traps.js";
import { createTrapVisual } from "../src/scenes/trapVisuals.js";
import { retroAudio } from "../src/audio/retroAudio.js";

// no Web Audio in Node: just record which sounds would play
const sounds = new Set();
for (const k of ["playBell", "playShatter", "playGull", "playTrainWhistle"]) { if (typeof retroAudio[k] !== "function") throw new Error("retroAudio." + k + " missing"); retroAudio[k] = () => sounds.add(k); }

const calls = new Set();
const stub = () => new Proxy(function () {}, {
  get(_t, k) { if (k === "active") return true; if (k === "then") return undefined; return (...a) => { calls.add(String(k)); return stub(); }; }
});
const scene = {
  player: { x: 0 },
  add: new Proxy({}, { get: (_t, k) => (...a) => { calls.add("add." + String(k)); return stub(); } }),
  tweens: { add: (cfg) => { calls.add("tween"); cfg.onComplete?.(); } },
  cameras: { main: { shake() {} } },
  getServerNow: () => Date.now()
};
let n = 0, errors = [];
for (const trap of TRAPS) {
  scene.player.x = trap.x;                          // "near" so the sound / shake branches run too
  try {
    const v = createTrapVisual(scene, trap);
    if (typeof v.update !== "function" || !Array.isArray(v.parts)) throw new Error("bad visual object");
    for (let ms = 0; ms < 16000; ms += 40) { v.update(1_700_000_000_000 + ms); n++; }
    v.hit({ playerId: "x", trapId: trap.id });
  } catch (e) { errors.push(`${trap.id} (${trap.type}): ${e.message}`); }
}
errors.forEach((e) => console.log("FAIL  " + e));
console.log(`sounds used: ${[...sounds].join(", ")}`);
console.log(`${errors.length ? "FAIL" : "PASS"}  ${TRAPS.length} trap visuals, ${n} updates, ${errors.length} errors`);
process.exit(errors.length ? 1 : 0);
