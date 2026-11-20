// Server-side check of the stage 5 NPC quests (quest:complete rules).
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import { QUEST } from "../src/game/quests.js";
import { COURSE } from "../src/game/course.js";

const PORT = 3492;
const server = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (s, e, d) => new Promise((r) => s.emit(e, d, r));
const connect = (s) => new Promise((res, rej) => { s.once("connect", res); s.once("connect_error", rej); });

async function run() {
  await wait(1000);
  const host = io(`http://127.0.0.1:${PORT}`), p = io(`http://127.0.0.1:${PORT}`);
  await Promise.all([connect(host), connect(p)]);
  const { roomCode, hostToken } = await ack(host, "room:create", { name: "Host" });
  await ack(p, "room:join", { roomCode, name: "Tester" });
  await ack(host, "room:start", { roomCode, hostToken });
  const npc = QUEST.npcs[0];
  const results = {};

  results.wrongStage = (await ack(p, "quest:complete", { roomCode, npcId: npc.id })).ok === false;
  p.emit("player:stage", { roomCode, stageIndex: 4, x: npc.x, y: 208, teleport: true });
  await wait(150);
  results.badNpc = (await ack(p, "quest:complete", { roomCode, npcId: "npc-x" })).ok === false;
  p.emit("player:stage", { roomCode, stageIndex: 4, x: npc.x + 1000, y: 208, teleport: true });
  await wait(150);
  results.tooFar = (await ack(p, "quest:complete", { roomCode, npcId: npc.id })).ok === false;
  p.emit("player:stage", { roomCode, stageIndex: 4, x: npc.x, y: 208, teleport: true });
  await wait(150);
  results.needsTargets = (await ack(p, "quest:complete", { roomCode, npcId: npc.id, targets: { female: 1, male: 2 } })).ok === false;
  const ok = await ack(p, "quest:complete", { roomCode, npcId: npc.id, targets: { female: 2, male: 2 } });
  results.noPoints = ok.ok === true && ok.points === 0 && ok.totalScore === 0 && ok.done === 1;
  const dup = await ack(p, "quest:complete", { roomCode, npcId: npc.id, targets: { female: 2, male: 2 } });
  results.noDuplicate = dup.ok === false && dup.alreadyDone === true;
  results.noQuestionBoxInKoeln = !(COURSE.questionBoxes || []).some((b) => b.x >= 9600);
  results.noQuestionBoxes = (COURSE.questionBoxes || []).length === 0;
  const state = await ack(p, "quest:state", { roomCode });
  results.state = state.ok && state.completed.length === 1 && state.total === 1;

  console.log("QUEST_TEST:" + JSON.stringify(results));
  const pass = Object.values(results).every(Boolean);
  host.disconnect(); p.disconnect(); server.kill();
  process.exit(pass ? 0 : 1);
}
run().catch((e) => { console.error(e); server.kill(); process.exit(1); });
