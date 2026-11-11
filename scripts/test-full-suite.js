import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const PORT = 3477;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TIMEOUT_MS = 7000;
process.env.PORT = String(PORT);

const serverProcess = spawn(process.execPath, ["server/index.js"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "pipe"
});

serverProcess.stdout.on("data", (data) => {
  for (const line of data.toString().split(/\r?\n/).filter(Boolean)) {
    console.log("[SERVER]", line);
  }
});
serverProcess.stderr.on("data", (data) => {
  for (const line of data.toString().split(/\r?\n/).filter(Boolean)) {
    console.error("[SERVER ERR]", line);
  }
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLegacy() {
  await wait(2500);
  const host = io(BASE_URL, { timeout: 3000, reconnection: false });
  await waitConnect(host, "host");

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
    host.emit("room:settings", { roomCode: code, hostToken: token, settings: { quizSeconds: 20, gameMinutes: 10, correctPoints: 15 } }, r)
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

function withTimeout(promise, label, ms = TIMEOUT_MS) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout menunggu: ${label} (${ms} ms)`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

function waitForEvent(socket, eventName, label = eventName, ms = TIMEOUT_MS) {
  return withTimeout(new Promise((resolve) => {
    socket.once(eventName, resolve);
  }), label, ms);
}

function emitAck(socket, eventName, payload, label = eventName, ms = TIMEOUT_MS) {
  return withTimeout(new Promise((resolve, reject) => {
    socket.timeout(ms).emit(eventName, payload, (error, response) => {
      if (error) {
        reject(new Error(`${label}: server tidak memberi ACK dalam ${ms} ms`));
        return;
      }
      resolve(response);
    });
  }), `${label} ACK`, ms + 500);
}

async function connectSocket(label) {
  const socket = io(BASE_URL, {
    timeout: 3000,
    reconnection: false,
    transports: ["websocket", "polling"]
  });
  try {
    await withTimeout(new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    }), `${label} connect`, 8000);
    console.log(`[TEST] ${label} connected`);
    return socket;
  } catch (error) {
    socket.disconnect();
    throw error;
  }
}

function assertOk(response, label) {
  if (!response?.ok) {
    throw new Error(`${label} gagal: ${response?.error || "respons tidak valid"}`);
  }
  return response;
}

async function movePlayerTo(p1, target) {
  const start = { x: 260, y: 208 };
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 55));

  for (let i = 1; i <= steps; i++) {
    const x = Math.round(start.x + (dx * i) / steps);
    const y = Math.round(start.y + (dy * i) / steps);
    await wait(130);
    p1.emit("player:move", {
      roomCode: p1.roomCode,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: x < start.x ? "left" : "right",
      state: "walk-right",
      grounded: true
    });
  }
}

async function run() {
  let host;
  let p1;
  let p2;

  try {
    console.log("[TEST] Waiting for multiplayer server...");
    await withTimeout(new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = async () => {
        if (serverProcess.exitCode !== null) {
          reject(new Error(`Server berhenti dengan exit code ${serverProcess.exitCode}`));
          return;
        }
        try {
          const response = await fetch(`${BASE_URL}/health`);
          if (response.ok) return resolve();
        } catch {}
        if (Date.now() - startedAt > 12000) {
          reject(new Error("Server tidak siap pada http://127.0.0.1:3456/health"));
          return;
        }
        setTimeout(poll, 200);
      };
      poll();
    }), "server health", 13000);

    host = await connectSocket("HOST");

    console.log("[TEST] 1. Create room");
    const room = assertOk(
      await emitAck(host, "room:create", { name: "HostTV" }, "room:create"),
      "room:create"
    );
    const code = room.roomCode;
    const token = room.hostToken;

    console.log("[TEST] 2. Join Alice and Bob");
    p1 = await connectSocket("Alice");
    const j1 = assertOk(
      await emitAck(p1, "room:join", { roomCode: code, name: "Alice" }, "Alice room:join"),
      "Alice room:join"
    );
    p1.roomCode = code;

    p2 = await connectSocket("Bob");
    const j2 = assertOk(
      await emitAck(p2, "room:join", { roomCode: code, name: "Bob" }, "Bob room:join"),
      "Bob room:join"
    );

    if (!Array.isArray(j1.questionBoxes) || j1.questionBoxes.length === 0) {
      throw new Error("room:join tidak mengirim daftar questionBoxes aktual.");
    }

    console.log("[TEST] 3. Host subscribes as TV");
    const tvSubRes = assertOk(
      await emitAck(host, "tv:subscribe", { roomCode: code, hostToken: token }, "tv:subscribe"),
      "tv:subscribe"
    );

    const defaultDuration12Min = tvSubRes.settings?.gameMinutes === 12;
    const fourConnectedCityStages = Array.isArray(tvSubRes.course?.stages)
      && tvSubRes.course.stages.length === 4
      && tvSubRes.course.stages[0].startX === 0
      && tvSubRes.course.stages.every((stage, index, stages) =>
        index === 0 || stages[index - 1].endX === stage.startX
      );

    console.log("[TEST] 4. Host updates settings");
    const settingsRes = assertOk(
      await emitAck(host, "room:settings", {
        roomCode: code,
        hostToken: token,
        settings: { quizSeconds: 20, gameMinutes: 10, correctPoints: 15 }
      }, "room:settings"),
      "room:settings"
    );

    console.log("[TEST] 5. Start game before movement (server intentionally locks lobby movement)");
    const startRes = assertOk(
      await emitAck(host, "room:start", { roomCode: code, hostToken: token }, "room:start"),
      "room:start"
    );

    console.log("[TEST] 6. Verify movement sync");
    const hostReceivedMovePromise = waitForEvent(host, "player:moved", "host player:moved");
    const p2MovePromise = waitForEvent(p2, "player:moved", "Bob player:moved");
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
    const [hostReceivedMove, p2ReceivedMove] = await Promise.all([
      hostReceivedMovePromise,
      p2MovePromise
    ]);

    console.log("[TEST] 7. Move Alice to a real server-provided Question Block");
    // The server shuffles Question Block positions per room. Never assume a fixed
    // coordinate for question-box-01; use the room snapshot returned by room:join.
    const nearestBox = [...j1.questionBoxes].sort((a, b) =>
      Math.hypot(a.x - 260, a.y - 208) - Math.hypot(b.x - 260, b.y - 208)
    )[0];

    await movePlayerTo(p1, { x: nearestBox.x, y: nearestBox.y + 20 });

    console.log(`[TEST] 8. Request quiz from ${nearestBox.id} at (${nearestBox.x}, ${nearestBox.y})`);
    const qShownPromise = waitForEvent(p1, "quiz:show", "Alice quiz:show");
    const qReqRes = assertOk(
      await emitAck(p1, "quiz:request", { roomCode: code, boxId: nearestBox.id }, "quiz:request"),
      "quiz:request"
    );
    const qData = await qShownPromise;

    console.log("[TEST] 9. Answer quiz");
    const qResultPromise = waitForEvent(p1, "quiz:result", "Alice quiz:result");
    const qAnsRes = assertOk(
      await emitAck(p1, "quiz:answer", { roomCode: code, answer: "A" }, "quiz:answer"),
      "quiz:answer"
    );
    const qResult = await qResultPromise;

    console.log("[TEST] 10. Pause and resume");
    const pauseRes = assertOk(
      await emitAck(host, "room:pause", { roomCode: code, hostToken: token }, "room:pause"),
      "room:pause"
    );
    const resumeRes = assertOk(
      await emitAck(host, "room:resume", { roomCode: code, hostToken: token }, "room:resume"),
      "room:resume"
    );

    console.log("[TEST] 11. Kick Bob");
    const kickedPromise = waitForEvent(p2, "player:kicked", "Bob player:kicked");
    const kickRes = assertOk(
      await emitAck(host, "room:kick", {
        roomCode: code,
        hostToken: token,
        playerId: p2.id
      }, "room:kick"),
      "room:kick"
    );
    const kickedEvent = await kickedPromise;

    console.log("[TEST] 12. End game");
    const gameEndedPromise = waitForEvent(p1, "game:ended", "Alice game:ended");
    const endRes = assertOk(
      await emitAck(host, "room:end", { roomCode: code, hostToken: token }, "room:end"),
      "room:end"
    );
    const gameEndedEvent = await gameEndedPromise;

    const results = {
      roomCreated: room.ok,
      playersJoined: j1.ok && j2.ok,
      hostSubscribed: tvSubRes.ok && Array.isArray(tvSubRes.players),
      settingsUpdated: settingsRes.ok,
      defaultDuration12Min,
      fourConnectedCityStages,
      animationStateSyncedToHost: hostReceivedMove?.state === "jump-right" && hostReceivedMove?.vy === -430,
      animationStateSyncedToPeer: p2ReceivedMove?.state === "jump-right" && p2ReceivedMove?.vy === -430,
      gameStarted: startRes.ok && !!startRes.endsAt,
      quizDelivered: !!qData?.question && qData.duration === 20 && qReqRes.ok,
      quizResultScored: qAnsRes.ok && typeof qResult?.totalScore === "number",
      pauseResumeWorking: pauseRes.ok && resumeRes.ok,
      kickWorking: kickRes.ok && !!kickedEvent,
      gameEndedWithPodium: endRes.ok && !!gameEndedEvent?.winner
    };

    const failed = Object.entries(results).filter(([, passed]) => !passed).map(([name]) => name);
    console.log("SUITE_VERIFIED:" + JSON.stringify(results));
    if (failed.length) throw new Error(`Assertion gagal: ${failed.join(", ")}`);
    console.log("[TEST] ALL INTEGRATION CHECKS PASSED");
  } finally {
    p1?.disconnect();
    p2?.disconnect();
    host?.disconnect();
    serverProcess.kill();
  }
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});
