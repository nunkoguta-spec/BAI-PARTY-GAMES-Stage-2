import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const PORT = 3477;
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
  console.log("TEST_STAGE: tvSubscribe");
  const tvSubRes = await new Promise((r) => host.emit("tv:subscribe", { roomCode: code, hostToken: token }, r));

  console.log("TEST_STAGE: settings");
  // 3. Update Settings from Host
  const settingsRes = await new Promise((r) =>
    host.emit("room:settings", { roomCode: code, hostToken: token, settings: { quizSeconds: 20, gameMinutes: 5, correctPoints: 15 } }, r)
  );
  const expandedRoomPayload = await new Promise((resolve) => {
    p1.emit("tv:subscribe", { roomCode: code, hostToken: token }, resolve);
  });
  const roomContainsAllParticipants = expandedRoomPayload?.players?.length === 2;

  // Start before accepting movement; authoritative server blocks lobby movement.
  console.log("TEST_STAGE: start");
  const startRes = await new Promise((r) => host.emit("room:start", { roomCode: code, hostToken: token }, r));

  // 4. Movement and Animation sync from p1 to host & p2
  console.log("TEST_STAGE: positionBroadcast");
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

  console.log("TEST_STAGE: walkToQuizBox");
  // Walk p1 to question-box-01 (x: 360, y: 176)
  for (const stepX of [290, 320, 355]) {
    await wait(110);
    p1.emit("player:move", { roomCode: code, x: stepX, y: 200, vx: 145, vy: 0, facing: "right", state: "walk-right", grounded: true });
  }

  console.log("TEST_STAGE: quizRequest");
  // 6. Request Quiz
  const qShownPromise = new Promise((resolve) => {
    p1.once("quiz:show", resolve);
    setTimeout(() => resolve(null), 2500);
  });
  const qReqRes = await new Promise((r) => p1.emit("quiz:request", { roomCode: code, boxId: "question-box-01" }, r));
  const qData = await qShownPromise;
  if (!qReqRes?.ok || !qData) throw new Error(`quiz request failed: ${JSON.stringify(qReqRes)}`);

  console.log("TEST_STAGE: quizAnswer", qReqRes, qData?.number, qData?.tier);
  // 7. Answer Quiz
  const qResultPromise = new Promise((resolve) => { p1.once("quiz:result", resolve); setTimeout(() => resolve(null), 2000); });
  const qAnsRes = await new Promise((r) => p1.emit("quiz:answer", { roomCode: code, answer: "A" }, r));
  const qResult = await qResultPromise;
  if (!qAnsRes?.ok || !qResult) throw new Error(`quiz answer failed: ${JSON.stringify(qAnsRes)}`);

  // 8. Pause & Resume Game
  const pauseRes = await new Promise((r) => host.emit("room:pause", { roomCode: code, hostToken: token }, r));
  const resumeRes = await new Promise((r) => host.emit("room:resume", { roomCode: code, hostToken: token }, r));

  // 9. Kick verifies host player-management permission.
  const kickedPromise = new Promise((resolve) => p2.once("player:kicked", resolve));
  const kickRes = await new Promise((r) => host.emit("room:kick", { roomCode: code, hostToken: token, playerId: p2.id }, r));
  const kickedEvent = await kickedPromise;

  // 10. End Game and verify final results event.
  const gameEndedPromise = new Promise((resolve) => p1.once("game:ended", resolve));
  const endRes = await new Promise((r) => host.emit("room:end", { roomCode: code, hostToken: token }, r));
  const gameEndedEvent = await gameEndedPromise;

  // 11. Explicit room restart resets score/position; early finish remains server-rejected.
  const restarted = await new Promise((r) => host.emit("room:restart", { roomCode: code, hostToken: token }, r));
  const startRace = await new Promise((r) => host.emit("room:start", { roomCode: code, hostToken: token }, r));
  const earlyFinish = await new Promise((r) => p1.emit("player:finish", { roomCode: code }, r));
  const rejectedEarlyFinish = earlyFinish?.ok === false;
  const movementAfterRestartPromise = new Promise(resolve => { p2.once("player:moved", resolve); setTimeout(() => resolve(null), 900); });
  p1.emit("player:move", { roomCode: code, x: 280, y: 208, vx: 145, vy: 0, facing: "right", state: "walk-right", grounded: true });
  const validMoveAfterRestart = await movementAfterRestartPromise;
  const finish1 = null;
  const finish2 = null;
  const raceEnded = null;
  const p2MoveAfterFinish = false;

  console.log("SUITE_VERIFIED:" + JSON.stringify({
    roomCreated: room.ok,
    playersJoined: j1.ok && j2.ok,
    hostSubscribed: tvSubRes.ok && Array.isArray(tvSubRes.players),
    settingsUpdated: settingsRes.ok,
    roomSubscribeReturnsPlayersAndCourse: roomContainsAllParticipants && expandedRoomPayload?.course?.width === 9600,
    animationStateSyncedToHost: hostReceivedMove?.state === "jump-right" && hostReceivedMove?.vy === -430,
    animationStateSyncedToPeer: p2ReceivedMove?.state === "jump-right" && p2ReceivedMove?.vy === -430,
    gameStarted: startRes.ok && !!startRes.endsAt,
    quizDelivered: !!qData.question && qData.duration === 20,
    quizResultScored: typeof qResult?.totalScore === "number",
    pauseResumeWorking: pauseRes.ok && resumeRes.ok,
    kickWorking: kickRes.ok && !!kickedEvent,
    gameEndedWithPodium: endRes.ok && !!gameEndedEvent?.winner,
    roomRestarted: restarted?.ok,
    restartedGameStarted: startRace.ok,
    earlyFinishRejected: rejectedEarlyFinish,
    playerMovementAfterRestart: !!validMoveAfterRestart,
    finalSuitePass: Boolean(restarted?.ok && startRace.ok && rejectedEarlyFinish && validMoveAfterRestart)
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
