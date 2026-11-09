import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const PORT = 3491;
const server = spawn(process.execPath, ["server/index.js"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore"
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitConnect = (socket) => new Promise((resolve, reject) => {
  socket.once("connect", resolve);
  socket.once("connect_error", reject);
});
const ack = (socket, event, data) => new Promise((resolve) => socket.emit(event, data, resolve));

async function run() {
  await wait(1000);
  const host = io(`http://127.0.0.1:${PORT}`, { timeout: 3000 });
  const player = io(`http://127.0.0.1:${PORT}`, { timeout: 3000 });
  const spectator = io(`http://127.0.0.1:${PORT}`, { timeout: 3000 });
  await Promise.all([waitConnect(host), waitConnect(player), waitConnect(spectator)]);

  const created = await ack(host, "room:create", { name: "Host" });
  if (!created?.ok) throw new Error("Room creation failed");
  const { roomCode, hostToken } = created;
  const joined = await ack(player, "room:join", { roomCode, name: "Runner" });
  const joined2 = await ack(spectator, "room:join", { roomCode, name: "Observer" });
  const configured = await ack(host, "room:settings", {
    roomCode, hostToken, settings: { quizSeconds: 15, gameMinutes: 20, correctPoints: 10 }
  });
  const started = await ack(host, "room:start", { roomCode, hostToken });

  const nearFinish = await ack(player, "player:finish", { roomCode });
  if (nearFinish?.ok) throw new Error("Server accepted early finish");

  // Exercise server movement limit with legal steps. Stay above spike collision height.
  const finishPromise = new Promise((resolve) => {
    player.once("player:finished", resolve);
    setTimeout(() => resolve(null), 25000);
  });
  let x = 280;
  let y = 190;
  player.emit("player:move", { roomCode, x, y, vx: 145, vy: 0, state: "walk-right", facing: "right", grounded: true });
  for (x = 335; x < 9320; x += 55) {
    y = x === 335 ? 160 : 160;
    player.emit("player:move", { roomCode, x, y, vx: 145, vy: 0, state: "walk-right", facing: "right", grounded: false });
    await wait(105);
  }
  for (x of [9340, 9360, 9380, 9400, 9420, 9440]) {
    player.emit("player:move", { roomCode, x, y: 160, vx: 145, vy: 0, state: "walk-right", facing: "right", grounded: false });
    await wait(105);
  }
  const finish = await finishPromise;

  const observerMovePromise = new Promise((resolve) => {
    observer.once("player:moved", resolve);
    setTimeout(() => resolve(null), 1500);
  });
  spectator.emit("player:move", { roomCode, x: 280, y: 208, vx: 0, vy: 0, state: "idle", facing: "right", grounded: true });
  const observerMove = await observerMovePromise;

  const tests = {
    created: created.ok,
    joined: joined.ok && joined2.ok,
    settings: configured.ok,
    started: started.ok && Number.isFinite(started.endsAt),
    earlyFinishRejected: !nearFinish.ok,
    finishAwarded: !!finish && Number.isFinite(finish.finishBonus),
    roomContinuesForOtherPlayer: Boolean(observerMove)
  };
  console.log("COURSE_TESTS:" + JSON.stringify(tests));
  host.disconnect();
  player.disconnect();
  spectator.disconnect();
  if (Object.values(tests).some((value) => !value)) throw new Error("Course server checks failed");
}

run()
  .catch((error) => {
    console.error("Course server test failed:", error);
    process.exitCode = 1;
  })
  .finally(() => server.kill());
