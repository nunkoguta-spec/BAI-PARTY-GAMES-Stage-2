// Automated test for multi-stage train progression and server state
import { io } from "socket.io-client";
import { fork } from "child_process";

const SERVER_PORT = 3478;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("[STAGE TEST] Starting test server on port " + SERVER_PORT);
  const serverProcess = fork("server/index.js", [], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: "pipe"
  });

  serverProcess.stdout.on("data", d => process.stdout.write("[SERVER] " + d));
  serverProcess.stderr.on("data", d => process.stderr.write("[SERVER-ERR] " + d));

  await wait(1200);

  const socket = io(`http://localhost:${SERVER_PORT}`, {
    transports: ["websocket"],
    reconnection: false
  });

  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });

  console.log("[STAGE TEST] Connected to server. Creating room...");
  const createRes = await new Promise(resolve => {
    socket.emit("room:create", {}, resolve);
  });
  if (!createRes?.ok) throw new Error("Failed to create room: " + createRes?.error);
  const code = createRes.roomCode;
  const token = createRes.hostToken;

  // Player joins
  const playerSocket = io(`http://localhost:${SERVER_PORT}`, {
    transports: ["websocket"],
    reconnection: false
  });
  await new Promise(resolve => playerSocket.once("connect", resolve));

  const joinRes = await new Promise(resolve => {
    playerSocket.emit("room:join", { roomCode: code, name: "Conductor" }, resolve);
  });
  if (!joinRes?.ok) throw new Error("Failed to join room: " + joinRes?.error);

  // Host starts game
  const startRes = await new Promise(resolve => {
    socket.emit("room:start", { roomCode: code, hostToken: token }, resolve);
  });
  if (!startRes?.ok) throw new Error("Failed to start room: " + startRes?.error);

  console.log("[STAGE TEST] Game started. Testing Stage 0 (München)...");

  // Track corrections: should be 0!
  let corrections = 0;
  playerSocket.on("player:correction", (data) => {
    console.error("[STAGE TEST] UNEXPECTED CORRECTION RECEIVED:", data);
    corrections++;
  });

  // 1. Move player in Munich
  playerSocket.emit("player:move", {
    roomCode: code,
    stageIndex: 0,
    x: 250,
    y: 208,
    vx: 145,
    vy: 0,
    state: "walk-right",
    facing: "right",
    grounded: true
  });
  await wait(200);

  // 2. Board train to Frankfurt (Stage 1)
  console.log("[STAGE TEST] Boarding train -> Stage 1 (Frankfurt)...");
  playerSocket.emit("player:stage", {
    roomCode: code,
    stageIndex: 1,
    x: 2640,
    y: 208,
    teleport: true
  });
  await wait(200);

  // Move in Frankfurt
  playerSocket.emit("player:move", {
    roomCode: code,
    stageIndex: 1,
    x: 2655,
    y: 208,
    vx: 145,
    vy: 0,
    state: "walk-right",
    facing: "right",
    grounded: true
  });
  await wait(200);

  // 3. Board train to Berlin (Stage 2)
  console.log("[STAGE TEST] Boarding train -> Stage 2 (Berlin)...");
  playerSocket.emit("player:stage", {
    roomCode: code,
    stageIndex: 2,
    x: 5040,
    y: 208,
    teleport: true
  });
  await wait(200);

  // Move in Berlin
  playerSocket.emit("player:move", {
    roomCode: code,
    stageIndex: 2,
    x: 5055,
    y: 208,
    vx: 145,
    vy: 0,
    state: "walk-right",
    facing: "right",
    grounded: true
  });
  await wait(200);

  // 4. Board train to Hamburg (Stage 3)
  console.log("[STAGE TEST] Boarding train -> Stage 3 (Hamburg)...");
  playerSocket.emit("player:stage", {
    roomCode: code,
    stageIndex: 3,
    x: 7440,
    y: 208,
    teleport: true
  });
  await wait(200);

  // Move in Hamburg towards finish line
  playerSocket.emit("player:move", {
    roomCode: code,
    stageIndex: 3,
    x: 7455,
    y: 208,
    vx: 145,
    vy: 0,
    state: "walk-right",
    facing: "right",
    grounded: true
  });
  await wait(300);

  if (corrections > 0) {
    throw new Error(`Test failed: ${corrections} illegal corrections triggered during stage progression!`);
  }

  console.log("[STAGE TEST] SUCCESS: All 4 stages traversed without rubberbanding or returning to start!");

  socket.disconnect();
  playerSocket.disconnect();
  serverProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("[STAGE TEST] FAILED:", err);
  process.exit(1);
});
