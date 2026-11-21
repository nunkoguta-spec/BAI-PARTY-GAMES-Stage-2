import { io } from "socket.io-client";
import { fork } from "child_process";
import { BATTLE_QUESTIONS } from "../server/battleQuestions.js";

const SERVER_PORT = 3479;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const answerFor = (stageId, q) => {
  const item = BATTLE_QUESTIONS[stageId].find((x) => x.question === q.question && Object.values(x.choices).every((t) => Object.values(q.choices).includes(t)));
  return Object.keys(q.choices).find((l) => q.choices[l] === item.choices[item.answer]);
};

async function run() {
  console.log("[BATTLE TEST] Starting test server on port " + SERVER_PORT);
  const serverProcess = fork("server/index.js", [], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: "pipe"
  });

  serverProcess.stdout.on("data", d => process.stdout.write("[SERVER] " + d));
  serverProcess.stderr.on("data", d => process.stderr.write("[SERVER-ERR] " + d));

  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/health`);
      if (res.ok) break;
    } catch {}
    await wait(100);
  }

  // Host connects
  const host = io(`http://127.0.0.1:${SERVER_PORT}`, { reconnection: true, reconnectionAttempts: 10 });
  await new Promise(res => host.once("connect", res));

  const roomRes = await new Promise(res => host.emit("room:create", {}, res));
  const code = roomRes.roomCode;
  const token = roomRes.hostToken;

  // TV subscribes
  await new Promise(res => host.emit("tv:subscribe", { roomCode: code, hostToken: token }, res));

  // Player connects and joins
  const player = io(`http://127.0.0.1:${SERVER_PORT}`, { reconnection: true, reconnectionAttempts: 10 });
  await new Promise(res => player.once("connect", res));
  await new Promise(res => player.emit("room:join", { roomCode: code, name: "Hero" }, res));

  // Host starts game
  await new Promise(res => host.emit("room:start", { roomCode: code, hostToken: token }, res));

  console.log("[BATTLE TEST] 1. Player starts battle with München enemy...");
  // Player moves near Munich enemy (x = 850)
  player.emit("player:move", { roomCode: code, stageIndex: 0, x: 840, y: 208 });
  await wait(100);

  const startRes = await new Promise(res => player.emit("battle:start", { roomCode: code, x: 840, y: 208, stageIndex: 0 }, res));
  if (!startRes?.ok) throw new Error("Failed to start battle: " + startRes?.error);
  console.log("[BATTLE TEST] Battle started successfully! First question:", startRes.question);

  console.log("[BATTLE TEST] 2. Test wrong answer & health reduction...");
  const correctLetter = answerFor("munich", startRes);
  const wrongLetter = ["A", "B", "C", "D"].find((l) => l !== correctLetter);
  const wrongRes = await new Promise(r => player.emit("battle:answer", { roomCode: code, choice: wrongLetter }, r));
  console.log("[BATTLE TEST] Wrong answer response:", { correct: wrongRes.correct, damage: wrongRes.wrongDamage, remainingHp: wrongRes.hp });
  if (wrongRes.correct) throw new Error("Expected wrong answer to fail!");
  if (wrongRes.hp >= startRes.hp) throw new Error("Expected HP to decrease!");

  console.log("[BATTLE TEST] 3. Test lethal damage, -25 penalty & respawn at Bahnhof...");
  // Deal multiple wrong answers to reach K.O.
  let curHp = wrongRes.hp;
  let koTriggered = false;
  player.on("player:hp", (state) => {
    if (state.ko) {
      console.log("[BATTLE TEST] K.O. event received! Penalty:", state.penalty);
      koTriggered = true;
    }
  });

  console.log("[BATTLE TEST] 3. Test lethal damage, -25 penalty & respawn at Bahnhof...");
  // Reduce HP to 0 using enemy damage
  while (curHp > 0) {
    const contactRes = await new Promise(res => player.emit("enemy:contact", { roomCode: code }, res));
    if (contactRes?.ok) {
      curHp = contactRes.hp;
      if (contactRes.ko) {
        koTriggered = true;
        break;
      }
    }
    await wait(50);
  }

  if (!koTriggered) throw new Error("Expected K.O. with -25 penalty to trigger!");

  console.log("[BATTLE TEST] Waiting for server respawn at Bahnhof...");
  const respawnEvent = await new Promise(res => {
    player.on("player:hp", (state) => {
      if (state.respawn) res(state);
    });
  });

  console.log("[BATTLE TEST] Respawn confirmed at:", { x: respawnEvent.respawnX, y: respawnEvent.respawnY, hp: respawnEvent.hp });
  // Munich Bahnhof entrance is around x = 175
  if (Math.abs(respawnEvent.respawnX - 175) > 10) throw new Error("Expected respawn at Bahnhof München (x=175)!");

  console.log("[BATTLE TEST] 4. Test defeating enemy with correct answers...");
  // Reset battle and answer all questions correctly
  let defeated = false;
  while (!defeated) {
    const qState = await new Promise(res => player.emit("battle:start", { roomCode: code, x: 840, y: 208, stageIndex: 0 }, res));
    if (qState.defeated) {
      defeated = true;
      break;
    }
    const cLetter = answerFor("munich", qState);
    const ans = await new Promise(res => player.emit("battle:answer", { roomCode: code, choice: cLetter }, res));
    if (ans.correct) {
      console.log(`[BATTLE TEST] Correct answer! Progress: ${ans.solved}/${ans.total}, Enemy HP: ${ans.enemyHp}`);
      if (ans.defeated) defeated = true;
    }
  }

  console.log("[BATTLE TEST] ALL BATTLE TESTS PASSED!");
  host.disconnect();
  player.disconnect();
  serverProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("[BATTLE TEST] FAILED:", err);
  process.exit(1);
});
