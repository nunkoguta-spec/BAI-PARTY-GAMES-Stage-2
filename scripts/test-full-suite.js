import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const PORT = 3456;
process.env.PORT = String(PORT);

const serverProcess = spawn(process.execPath, ["server/index.js"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "pipe"
});

serverProcess.stdout.on("data", (d) => {
  console.log("[SERVER]", d.toString().trim());
});

serverProcess.stderr.on("data", (d) => {
  console.error("[SERVER ERR]", d.toString().trim());
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitConnect = (sock) => new Promise((resolve, reject) => {
  sock.once("connect", resolve);
  sock.once("connect_error", reject);
});

async function run() {
  await wait(2500);
  const host = io(`http://127.0.0.1:${PORT}`, { timeout: 3000 });
  await waitConnect(host);

  // 1. Create Room
  const room = await new Promise((r) => host.emit("room:create", { name: "HostTV" }, r));
  if (!room?.ok) throw new Error("room:create failed");
  const code = room.roomCode;
  const token = room.hostToken;

  // 2. Player 1 & 2 Join
  const p1 = io(`http://127.0.0.1:${PORT}`, { timeout: 3000 });
  await waitConnect(p1);
  const j1 = await new Promise((r) => p1.emit("room:join", { roomCode: code, name: "Alice" }, r));

  const p2 = io(`http://127.0.0.1:${PORT}`, { timeout: 3000 });
  await waitConnect(p2);
  const j2 = await new Promise((r) => p2.emit("room:join", { roomCode: code, name: "Bob" }, r));

  // Host subscribes to room as TV
  const tvSubRes = await new Promise((r) => host.emit("tv:subscribe", { roomCode: code, hostToken: token }, r));

  // 3. Update Settings from Host
  const settingsRes = await new Promise((r) =>
    host.emit("room:settings", { roomCode: code, hostToken: token, settings: { quizSeconds: 20, gameMinutes: 5, correctPoints: 15 } }, r)
  );

  // 4. Movement and Animation sync from p1 to host & p2
  const hostReceivedMovePromise = new Promise((resolve) => host.once("player:moved", resolve));
  const p2MovePromise = new Promise((resolve) => p2.once("player:moved", resolve));
  p1.emit("player:move", {
    roomCode: code,
    x: 260,
    y: 208,
    vx: 145,
    vy: -430,
    facing: "right",
    state: "jump-right",
    grounded: false
  });
  const [hostReceivedMove, p2ReceivedMove] = await Promise.all([hostReceivedMovePromise, p2MovePromise]);

  // Walk p1 to question-box-01 (x: 360, y: 176)
  for (const stepX of [290, 320, 355]) {
    await wait(110);
    p1.emit("player:move", { roomCode: code, x: stepX, y: 176, vx: 145, vy: 0, facing: "right", state: "walk-right", grounded: true });
  }

  // 5. Start Game
  const startRes = await new Promise((r) => host.emit("room:start", { roomCode: code, hostToken: token }, r));

  // 6. Request Quiz
  const qShownPromise = new Promise((resolve) => p1.once("quiz:show", resolve));
  const qReqRes = await new Promise((r) => p1.emit("quiz:request", { roomCode: code, boxId: "question-box-01" }, r));
  const qData = await qShownPromise;

  // 7. Answer Quiz
  const qResultPromise = new Promise((resolve) => p1.once("quiz:result", resolve));
  const qAnsRes = await new Promise((r) => p1.emit("quiz:answer", { roomCode: code, answer: "A" }, r));
  const qResult = await qResultPromise;

  // 8. Pause & Resume Game
  const pauseRes = await new Promise((r) => host.emit("room:pause", { roomCode: code, hostToken: token }, r));
  const resumeRes = await new Promise((r) => host.emit("room:resume", { roomCode: code, hostToken: token }, r));

  // 9. Kick Player
  const kickedPromise = new Promise((resolve) => p2.once("player:kicked", resolve));
  const kickRes = await new Promise((r) => host.emit("room:kick", { roomCode: code, hostToken: token, playerId: p2.id }, r));
  const kickedEvent = await kickedPromise;

  // 10. End Game
  const gameEndedPromise = new Promise((resolve) => p1.once("game:ended", resolve));
  const endRes = await new Promise((r) => host.emit("room:end", { roomCode: code, hostToken: token }, r));
  const gameEndedEvent = await gameEndedPromise;

  console.log("SUITE_VERIFIED:" + JSON.stringify({
    roomCreated: room.ok,
    playersJoined: j1.ok && j2.ok,
    hostSubscribed: tvSubRes.ok && Array.isArray(tvSubRes.players),
    settingsUpdated: settingsRes.ok,
    animationStateSyncedToHost: hostReceivedMove?.state === "jump-right" && hostReceivedMove?.vy === -430,
    animationStateSyncedToPeer: p2ReceivedMove?.state === "jump-right" && p2ReceivedMove?.vy === -430,
    gameStarted: startRes.ok && !!startRes.endsAt,
    quizDelivered: !!qData.question && qData.duration === 20,
    quizResultScored: typeof qResult?.totalScore === "number",
    pauseResumeWorking: pauseRes.ok && resumeRes.ok,
    kickWorking: kickRes.ok && !!kickedEvent,
    gameEndedWithPodium: endRes.ok && !!gameEndedEvent?.winner
  }));

  p1.disconnect();
  p2.disconnect();
  host.disconnect();
}

run()
  .then(() => {
    serverProcess.kill();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    serverProcess.kill();
    process.exit(1);
  });
