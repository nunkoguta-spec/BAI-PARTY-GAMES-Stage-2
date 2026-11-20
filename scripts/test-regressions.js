// Regression: Question Box sudah dihapus, game tidak berakhir prematur saat pemain keluar,
// battle ditolak saat game belum berjalan, durasi default 10 menit.
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
const PORT = 3499, URL = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const conn = (s) => new Promise((r, j) => { s.on("connect", r); s.on("connect_error", j); });
const results = {};
try {
  await wait(1500);
  const host = io(URL), a = io(URL), b = io(URL), c = io(URL);
  await Promise.all([host, a, b, c].map(conn));
  const { roomCode, hostToken } = await ack(host, "room:create", {});
  const ja = await ack(a, "room:join", { roomCode, name: "   " });
  await ack(b, "room:join", { roomCode, name: "B" });
  await ack(c, "room:join", { roomCode, name: "C" });
  results.emptyNameFallback = ja.playerName === "Player";
  results.noQuestionBoxes = !ja.questionBoxes || ja.questionBoxes.length === 0;
  results.battleRejectedBeforeStart = (await ack(a, "battle:start", { roomCode })).ok === false;
  const st = await ack(host, "room:start", { roomCode, hostToken });
  results.defaultTenMinutes = Math.abs((st.endsAt - st.startedAt) - 10 * 60_000) < 50;
  // A selesai lalu keluar; B selesai -> sesi TIDAK boleh berakhir karena C masih main
  let ended = false; c.on("game:ended", () => { ended = true; });
  a.emit("player:stage", { roomCode, stageIndex: 4, x: 11000, y: 208, teleport: true }); await wait(100);
  a.emit("player:move", { roomCode, x: 11800, y: 208, stageIndex: 4, teleport: true }); await wait(150);
  a.disconnect(); await wait(200);
  b.emit("player:stage", { roomCode, stageIndex: 4, x: 11000, y: 208, teleport: true }); await wait(100);
  b.emit("player:move", { roomCode, x: 11800, y: 208, stageIndex: 4, teleport: true }); await wait(300);
  results.noPrematureEnd = ended === false;
  [host, b, c].forEach((s) => s.disconnect());
} catch (e) { results.error = String(e); }
srv.kill();
console.log("REGRESSION:", JSON.stringify(results));
process.exit(Object.values(results).every((v) => v === true) ? 0 : 1);
