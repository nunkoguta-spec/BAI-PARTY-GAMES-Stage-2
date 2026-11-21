// Server-side check of the enemy battles (battle:start / battle:answer).
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import { BATTLE, battleEnemyX } from "../src/game/battle.js";
import { BATTLE_QUESTIONS } from "../server/battleQuestions.js";

const PORT = 3493;
const server = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (s, e, d) => new Promise((r) => s.emit(e, d, r));
const connect = (s) => new Promise((res, rej) => { s.once("connect", res); s.once("connect_error", rej); });
// Choices are shuffled by the server, so find the correct letter by the correct choice's TEXT.
const answerFor = (stageId, q) => {
  const item = BATTLE_QUESTIONS[stageId].find((x) => x.question === q.question && Object.values(x.choices).every((t) => Object.values(q.choices).includes(t)));
  return Object.keys(q.choices).find((l) => q.choices[l] === item.choices[item.answer]);
};

async function run() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (res.ok) break;
    } catch {}
    await wait(100);
  }
  const host = io(`http://127.0.0.1:${PORT}`), p = io(`http://127.0.0.1:${PORT}`);
  await Promise.all([connect(host), connect(p)]);
  const { roomCode, hostToken } = await ack(host, "room:create", { name: "Host" });
  await ack(p, "room:join", { roomCode, name: "Tester" });
  await ack(host, "room:start", { roomCode, hostToken });
  const r = {};
  const stageIds = ["munich", "frankfurt", "berlin", "hamburg"];
  r.counts = stageIds.map((id) => BATTLE.stages[id].total).join() === "3,5,8,10" &&
    stageIds.every((id) => BATTLE_QUESTIONS[id].length > BATTLE.stages[id].total) &&
    stageIds.reduce((n, id) => n + BATTLE_QUESTIONS[id].length, 0) === 100;

  r.farRejected = (await ack(p, "battle:start", { roomCode })).ok === false;

  for (let i = 0; i < stageIds.length; i++) {
    const id = stageIds[i];
    p.emit("player:stage", { roomCode, stageIndex: i, x: battleEnemyX(id), y: 208, teleport: true });
    await wait(150);
    let res = await ack(p, "battle:start", { roomCode });
    if (!res.ok) { r[`${id}_start`] = false; continue; }
    if (i === 0) {
      // wrong answer: no reveal, question re-queued, still needs `total` correct answers
      const wrongLetter = ["A", "B", "C", "D"].find((l) => l !== answerFor(id, res));
      const wrong = await ack(p, "battle:answer", { roomCode, choice: wrongLetter });
      r.wrongKeepsFighting = wrong.ok && wrong.correct === false && wrong.solved === 0 && !("correctAnswer" in wrong) && wrong.wrongDamage === 10;
      // HP / points rules: wrong = -HP and no points; HP never resets between stages
      r.wrongHurtsNoPoints = wrong.hp === 90 && wrong.points === 0 && wrong.totalScore === 0;
      res = { ...wrong.next };
    }
    let defeated = false, correctCount = 0, guard = 0;
    while (!defeated && guard++ < 30) {
      const out = await ack(p, "battle:answer", { roomCode, choice: answerFor(id, res) });
      if (!out.ok || !out.correct) break;
      correctCount++;
      defeated = out.defeated;
      res = out.next;
    }
    r[`${id}_defeatedAfter${BATTLE.stages[id].total}`] = defeated && correctCount === BATTLE.stages[id].total;
  }
  p.emit("player:stage", { roomCode, stageIndex: 0, x: battleEnemyX("munich"), y: 208, teleport: true });
  await wait(150);
  r.noRepeat = (await ack(p, "battle:start", { roomCode })).defeated === true;
  const state = await ack(p, "battle:state", { roomCode });
  r.state = state.ok && state.won.length === 4;
  p.emit("player:stage", { roomCode, stageIndex: 4, x: 11000, y: 208, teleport: true });
  await wait(150);
  r.koelnNoEnemy = (await ack(p, "battle:start", { roomCode })).ok === false;
  // correct answers gave points (per stage level) and HP carried over all 4 stages
  const after = await ack(p, "battle:state", { roomCode });
  // points scale with the stage level: x1 / x1.5 / x2 / x3
  r.pointsAwarded = after.score === 3 * 10 + 5 * 15 + 8 * 20 + 10 * 30;
  r.hpCarriedOver = after.hp === 90 && after.maxHp === 100 && after.ko === false;
  console.log("BATTLE_TEST:" + JSON.stringify(r));
  const pass = Object.values(r).every(Boolean);
  host.disconnect(); p.disconnect(); server.kill();
  process.exit(pass ? 0 : 1);
}
run().catch((e) => { console.error(e); server.kill(); process.exit(1); });
