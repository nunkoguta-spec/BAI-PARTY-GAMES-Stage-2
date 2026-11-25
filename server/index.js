
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { randomInt, randomBytes } from "node:crypto";
import { COURSE } from "../src/game/course.js";
import { QUEST, questNpcById } from "../src/game/quests.js";
import { BATTLE, TIER_LABELS, battleConfig, battleEnemyX, battlePlan } from "../src/game/battle.js";
import { BATTLE_QUESTIONS, BATTLE_TIERS } from "./battleQuestions.js";
import { TRAP, findTrapHit, trapCenterX } from "../src/game/traps.js";

const app = express();
const httpServer = http.createServer(app);

const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Keep local development working while restricting hosted access to configured frontend URLs.
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length
      ? [...allowedOrigins, "http://localhost:5173", "http://127.0.0.1:5173"]
      : true,
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

const rooms = new Map();

// Refresh / reconnect support:
// - a disconnected player keeps their slot (stage, position, score, HP, quests) for this long
// - a room with nobody connected (host included) is kept this long so the host can come back
const PLAYER_GRACE_MS = Number(process.env.PLAYER_GRACE_MS) || 3 * 60_000;
const ROOM_IDLE_MS = Number(process.env.ROOM_IDLE_MS) || 20 * 60_000;
const makeToken = () => randomBytes(16).toString("hex");

const DEFAULT_SETTINGS = Object.freeze({ gameMinutes: 10, correctPoints: 10, questionLimit: 0, hazardPenalty: COURSE.hazardPenalty, finishBonusSeconds: COURSE.finishBonusSeconds, courseWidth: COURSE.width, finishX: COURSE.finishX });
const WORLD_WIDTH = COURSE.width;
const WORLD_HEIGHT = COURSE.height;
const FINISH_X = COURSE.finishX;
const COURSE_HAZARDS = COURSE.hazards;
const COURSE_SLUGS = COURSE.slugs || [];

// =====================================================
// HTTP HEALTH CHECK
// =====================================================

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "BAI PARTY GAMES Server",
    rooms: rooms.size
  });
});

// =====================================================
// ROOM HELPERS
// =====================================================

function createRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code;

  do {
    code = Array.from(
      { length: 6 },
      () => chars[randomInt(chars.length)]
    ).join("");
  } while (rooms.has(code));

  return code;
}

function getRoom(socket, roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  const room = rooms.get(code);

  if (!room) return null;
  if (!room.members.has(socket.id)) return null;

  return room;
}

function resolveHostRoom(socket, payload = {}) {
  const code = String(payload.roomCode || "").trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return null;
  if (room.hostId === socket.id) return room;
  if (payload.hostToken && payload.hostToken === room.hostToken) {
    room.hostId = socket.id;
    room.members.add(socket.id);
    socket.join(room.code);
    return room;
  }
  return null;
}

// Status payload for ONE socket that (re)joins: includes the final result when the game already ended,
// and remainingMs while paused, so a refreshed host / phone lands in the right screen immediately.
function statusPayload(room) {
  const payload = { status: room.status, startedAt: room.startedAt, endsAt: room.endsAt, serverNow: Date.now() };
  if (room.status === "paused") payload.remainingMs = room.pausedRemaining;
  if (room.status === "ended" && room.result) Object.assign(payload, room.result);
  return payload;
}

function cancelRoomCleanup(room) {
  clearTimeout(room.idleTimer);
  room.idleTimer = null;
}

function destroyRoom(room) {
  cancelRoomCleanup(room);
  for (const player of room.players.values()) {
    clearTimeout(player.koTimer);
    clearTimeout(player.disconnectTimer);
  }
  clearTimeout(room.gameTimer);
  clearTimeout(room.finishGraceTimer);
  rooms.delete(room.code);
  console.log(`[ROOM] Deleted ${room.code}`);
}

function scheduleRoomCleanup(room) {
  if (!rooms.has(room.code) || room.members.size > 0 || room.idleTimer) return;
  room.idleTimer = setTimeout(() => {
    room.idleTimer = null;
    if (room.members.size === 0) destroyRoom(room);
  }, ROOM_IDLE_MS);
}

// Player ids are socket ids, and a reconnect gets a NEW socket id. Re-key the existing player
// so the same player object (stage, score, HP, quests, battles) continues under the new id.
function rekeyPlayer(room, player, newId) {
  const oldId = player.id;
  if (oldId === newId) return oldId;
  room.players.delete(oldId);
  room.members.delete(oldId);
  if (room.finishedPlayers.delete(oldId)) room.finishedPlayers.add(newId);
  player.id = newId;
  room.players.set(newId, player);
  room.members.add(newId);
  return oldId;
}

function publicLeaderboard(room) {
  return [...room.players.values()]
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      score: player.score,
      answeredQuestions: player.answeredQuestions,
      finishedAt: player.finishedAt || null,
      finishBonus: player.finishBonus || 0,
      hazardHits: player.hazardHits || 0,
      questsDone: player.quests ? player.quests.size : 0,
      hp: player.hp,
      maxHp: BATTLE.playerMaxHp,
      kos: player.koCount || 0
    }))
    .sort((a, b) => b.score - a.score);
}

function broadcastLeaderboard(room) {
  io.to(room.code).emit(
    "tv:leaderboard",
    publicLeaderboard(room)
  );
}

function broadcastPlayerList(room) {
  io.to(room.code).emit(
    "room:players",
    [...room.players.values()].map((player) => ({
      playerId: player.id,
      name: player.name,
      score: player.score,
      hp: player.hp,
      maxHp: BATTLE.playerMaxHp,
      ko: Boolean(player.ko),
      connected: player.connected !== false
    }))
  );
  // Ended rooms keep carrying the final result so a refreshed host/phone never loses the podium.
  io.to(room.code).emit("room:status", room.status === "ended" ? statusPayload(room) : { status: room.status });
}

// Data publik avatar untuk multiplayer.
function publicPlayerPosition(player) {
  return {
    playerId: player.id,
    name: player.name,
    avatar: player.avatar || sanitizeAvatar(),
    stageIndex: Number.isInteger(player.stageIndex) ? player.stageIndex : 0,
    x: player.x,
    y: player.y,
    facing: player.facing,
    serverNow: Date.now(),
    vx: player.vx || 0,
    vy: player.vy || 0,
    state: player.state || "idle",
    grounded: player.grounded !== false,
    finished: Boolean(player.finished),
    finishBonus: player.finishBonus || 0,
    hazardHits: player.hazardHits || 0,
    hp: player.hp,
    maxHp: BATTLE.playerMaxHp,
    ko: Boolean(player.ko)
  };
}

// =====================================================
// PLAYER HP / DAMAGE / K.O. (server-authoritative)
// HP lives only here: it is NOT reset on stage change, only on a new
// session (room:start / room:restart) or after a K.O. respawn.
// =====================================================

// True while the player has an unanswered battle question open (they stand still to answer).
function inBattle(player) {
  return Object.values(player.battles || {}).some((b) => b && b.current);
}

function publicHp(player, extra = {}) {
  return {
    playerId: player.id,
    name: player.name,
    hp: player.hp,
    maxHp: BATTLE.playerMaxHp,
    ko: Boolean(player.ko),
    kos: player.koCount || 0,
    score: player.score,
    ...extra
  };
}

function broadcastPlayerHp(room, player, extra = {}) {
  const payload = publicHp(player, extra);
  io.to(room.code).emit("player:hp", payload);
  return payload;
}

function resetPlayerHp(player) {
  clearTimeout(player.koTimer);
  player.koTimer = null;
  player.hp = BATTLE.playerMaxHp;
  player.ko = false;
  player.koCount = 0;
  player.lastContactAt = 0;
}

// Reduces HP. When it reaches 0 the player is K.O.'d: the -25 penalty is applied
// exactly once for that K.O. (player.ko guards against any second hit before respawn).
function damagePlayerHp(room, player, amount, source = "enemy") {
  if (!room || !player || player.ko || player.hp <= 0) return { applied: 0, ko: false, penalty: 0 };
  const applied = Math.min(player.hp, Math.max(0, Math.floor(Number(amount) || 0)));
  if (applied <= 0) return { applied: 0, ko: false, penalty: 0 };
  player.hp -= applied;
  let penalty = 0;
  let ko = false;
  if (player.hp <= 0) {
    player.hp = 0;
    player.ko = true;
    player.koCount = (player.koCount || 0) + 1;
    player.score -= BATTLE.koPenalty;
    penalty = BATTLE.koPenalty;
    ko = true;
    player.koTimer = setTimeout(() => respawnPlayer(room, player), BATTLE.koRespawnMs);
  }
  broadcastPlayerHp(room, player, { damage: applied, source, ko, penalty });
  if (ko) {
    io.to(room.code).emit("tv:player-ko", { playerId: player.id, name: player.name, penalty, score: player.score });
    broadcastLeaderboard(room);
    broadcastPlayerList(room);
  }
  return { applied, ko, penalty };
}

// After a K.O.: full HP again, back to the start of the CURRENT stage. Enemy/quiz
// progress is kept. Only runs when the player really is K.O.'d, so it can't heal anyone.
function respawnPlayer(room, player) {
  clearTimeout(player.koTimer);
  player.koTimer = null;
  if (!room || !player || !player.ko || !room.players.has(player.id)) return;
  const stage = COURSE.stages[player.stageIndex] || COURSE.stages[0];
  player.hp = BATTLE.playerMaxHp;
  player.ko = false;
  player.x = stage.startX + 175;
  player.y = 208;
  player.vx = 0;
  player.vy = 0;
  player.state = "idle";
  broadcastPlayerHp(room, player, { respawn: true, respawnX: player.x, respawnY: player.y });
  io.to(room.code).emit("player:moved", publicPlayerPosition(player));
  io.to(room.code).emit("tv:player-move", publicPlayerPosition(player));
  broadcastPlayerList(room);
}

function endGame(room, reason = "host") {
  if (room.status === "ended") return;
  clearTimeout(room.gameTimer);
  clearTimeout(room.finishGraceTimer);
  room.status = "ended";
  const leaderboard = publicLeaderboard(room);
  const winner = leaderboard[0] || null;
  room.result = { reason, leaderboard, winner };
  io.to(room.code).emit("room:status", { status: "ended", reason, leaderboard, winner });
  io.to(room.code).emit("game:ended", { reason, leaderboard, winner });
}

function pauseGame(room) {
  if (room.status !== "playing") return false;
  room.pausedRemaining = Math.max(0, room.endsAt - Date.now());
  clearTimeout(room.gameTimer);
  room.status = "paused";
  io.to(room.code).emit("room:status", { status: "paused", remainingMs: room.pausedRemaining });
  return true;
}

// Pemain hanya boleh meninggalkan stage kalau enemy stage itu sudah DIA kalahkan sendiri
// (hasil pemain lain tidak dihitung). Stage tanpa enemy (Köln) selalu boleh.
function hasClearedStage(player, stageIndex = player?.stageIndex) {
  const stage = COURSE.stages[stageIndex];
  if (!stage || !battleConfig(stage.id)) return true;
  return Boolean(player?.battlesWon?.has(stage.id));
}

function finishPlayer(room, player) {
  if (!room || !player || player.finished || room.status !== "playing" || player.x < FINISH_X - 110) return null;
  if (!hasClearedStage(player)) return null;
  const finishedAt = Date.now();
  player.finished = true;
  player.finishedAt = finishedAt;
  room.finishedPlayers.add(player.id);
  const elapsedMs = Math.max(0, finishedAt - (room.startedAt || finishedAt));
  const remainingSeconds = Math.max(0, Math.floor((room.endsAt - finishedAt) / 1000));
  player.finishRank = room.finishedPlayers.size;
  player.finishBonus = Math.min(25, Math.floor(remainingSeconds * room.settings.finishBonusSeconds));
  player.score += player.finishBonus;
  const result = { playerId: player.id, name: player.name, score: player.score, finishBonus: player.finishBonus, elapsedMs, rank: player.finishRank };
  io.to(room.code).emit("player:finished", result);
  io.to(room.code).emit("tv:player-finished", result);
  broadcastLeaderboard(room);
  broadcastPlayerList(room);
  if (room.finishedPlayers.size >= room.players.size) {
    endGame(room, "finish");
  } else if (!room.finishGraceTimer) {
    room.finishGraceTimer = setTimeout(() => endGame(room, "finish-grace"), COURSE.finishGraceMs);
  }
  return result;
}

function resumeGame(room) {
  if (room.status !== "paused") return false;
  const now = Date.now();
  room.status = "playing";
  room.startedAt = now - (room.settings.gameMinutes * 60_000 - room.pausedRemaining);
  room.endsAt = now + room.pausedRemaining;
  room.gameTimer = setTimeout(() => endGame(room, "timeout"), room.pausedRemaining);
  io.to(room.code).emit("room:status", { status: "playing", startedAt: room.startedAt, endsAt: room.endsAt, serverNow: now });
  return true;
}

// =====================================================
// REMOVE PLAYER
// =====================================================

function removePlayer(room, playerId) {
  const player = room.players.get(playerId);

  if (!player) return;

  clearTimeout(player.koTimer);
  clearTimeout(player.disconnectTimer);

  room.players.delete(playerId);
  room.members.delete(playerId);
  // Pemain yang keluar tidak boleh ikut dihitung "sudah finish", kalau tidak sesi bisa berakhir terlalu cepat.
  room.finishedPlayers.delete(playerId);

  io.to(room.code).emit("player:left", {
    playerId
  });

  broadcastPlayerList(room);
  broadcastLeaderboard(room);

  if (room.status === "playing" && room.players.size > 0 && room.finishedPlayers.size >= room.players.size) {
    endGame(room, "finish");
  }
}

function sanitizeAvatar(input = {}) {
  const limits = { skin:5, bottoms:64, shoes:10, top:79, eyes:4, hair:25, glasses:82, hat:81, weapon:91 };
  const output = {};
  for (const [key, limit] of Object.entries(limits)) {
    const value = Number(input?.[key]);
    output[key] = Number.isInteger(value) && value >= 0 && value < limit ? value : 0;
  }
  return output;
}

// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", (socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // =====================================================
  // CREATE ROOM
  // =====================================================

  socket.on("room:create", (payload = {}, callback = () => {}) => {
    const code = createRoomCode();
    const hostToken = makeToken();

    const room = {
      code,
      hostId: socket.id,
      hostToken,
      members: new Set([socket.id]),
      players: new Map(),
      status: "waiting",
      settings: { ...DEFAULT_SETTINGS },
      gameTimer: null,
      endsAt: null,
      startedAt: null,
      pausedRemaining: 0,
      finishGraceTimer: null,
      finishedPlayers: new Set(),
      result: null,
      idleTimer: null
    };

    rooms.set(code, room);

    socket.join(code);

    callback({
      ok: true,
      roomCode: code,
      hostId: socket.id,
      hostToken
    });

    console.log(`[ROOM] Created ${code} (host: ${socket.id})`);
  });

  // =====================================================
  // HOST REFRESHED -> RESUME THE SAME ROOM (validated by hostToken)
  // =====================================================

  socket.on("room:resume-host", (payload = {}, callback = () => {}) => {
    const code = String(payload.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || !payload.hostToken || payload.hostToken !== room.hostToken) {
      callback({ ok: false, error: "Room tidak ditemukan atau sudah ditutup." });
      return;
    }
    cancelRoomCleanup(room);
    room.hostId = socket.id;
    room.members.add(socket.id);
    socket.join(room.code);
    callback({
      ok: true,
      resumed: true,
      roomCode: room.code,
      hostToken: room.hostToken,
      hostId: socket.id,
      settings: room.settings,
      ...statusPayload(room)
    });
    console.log(`[ROOM] Host resumed ${room.code} (host: ${socket.id})`);
  });

  // =====================================================
  // HOST STARTS GAME
  // =====================================================

  socket.on("room:start", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room) {
      callback({ ok: false, error: "Hanya host yang dapat memulai game." });
      return;
    }
    if (room.status === "playing") {
      callback({ ok: true, status: room.status, endsAt: room.endsAt, serverNow: Date.now() });
      return;
    }
    if (room.status === "paused") {
      callback({ ok: false, error: "Game sedang dijeda. Lanjutkan sesi sebelum mulai ulang." });
      return;
    }
    if (room.status === "ended") {
      callback({ ok: false, error: "Tekan MULAI ULANG untuk reset sesi terlebih dahulu." });
      return;
    }
    room.status = "playing";
    room.startedAt = Date.now();
    room.battleCounts = {}; // berapa kali tiap soal sudah dibagikan ke pemain di game ini
    room.finishGraceTimer = null;
    room.finishedPlayers.clear();
    for (const player of room.players.values()) {
      player.finished = false;
      player.finishedAt = null;
      player.finishRank = 0;
      player.finishBonus = 0;
      player.usedHazards?.clear();
      player.quests?.clear();
      player.battles = {};
      player.battlesWon?.clear();
      player.lastHazardAt = 0;
      player.lastTrapAt = 0;
      player.trapHits = 0;
      resetPlayerHp(player);
    }
    room.endsAt = room.startedAt + room.settings.gameMinutes * 60_000;
    room.gameTimer = setTimeout(() => endGame(room, "timeout"), room.settings.gameMinutes * 60_000);
    io.to(room.code).emit("room:settings", room.settings);
    io.to(room.code).emit("room:status", { status: room.status, startedAt: room.startedAt, endsAt: room.endsAt, serverNow: Date.now() });
    callback({ ok: true, status: room.status, startedAt: room.startedAt, endsAt: room.endsAt, serverNow: Date.now() });
  });

  socket.on("room:restart", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room || room.status !== "ended") {
      callback({ ok: false, error: "Mulai ulang hanya tersedia setelah sesi berakhir." });
      return;
    }
    clearTimeout(room.finishGraceTimer);
    room.finishGraceTimer = null;
    room.battleCounts = {};
    room.finishedPlayers.clear();
    for (const player of room.players.values()) {
      player.score = 0;
      player.answeredQuestions = 0;
      player.stageIndex = 0;
      player.x = COURSE.startX;
      player.y = COURSE.startY;
      player.vx = 0;
      player.vy = 0;
      player.state = "idle";
      player.finished = false;
      player.finishedAt = null;
      player.finishBonus = 0;
      player.hazardHits = 0;
      player.quests?.clear();
      player.battles = {};
      player.battlesWon?.clear();
      player.lastHazardAt = 0;
      player.lastTrapAt = 0;
      player.trapHits = 0;
      resetPlayerHp(player);
    }
    room.status = "waiting";
    room.result = null;
    room.startedAt = null;
    room.endsAt = null;
    room.pausedRemaining = 0;
    broadcastPlayerList(room);
    broadcastLeaderboard(room);
    io.to(room.code).emit("room:status", { status: "waiting", reset: true, serverNow: Date.now() });
    for (const player of room.players.values()) {
      io.to(player.id).emit("player:reset", { x: COURSE.startX, y: COURSE.startY, score: 0 });
    }
    callback({ ok: true });
  });

  socket.on("room:settings", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room || room.status !== "waiting") {
      callback({ ok: false, error: "Pengaturan hanya dapat diubah host sebelum game dimulai." });
      return;
    }
    const settings = payload.settings || {};
    const gameMinutes = Number(settings.gameMinutes);
    const correctPoints = Number(settings.correctPoints);
    const hazardPenalty = settings.hazardPenalty === undefined ? room.settings.hazardPenalty : Number(settings.hazardPenalty);
    if (!Number.isInteger(gameMinutes) || gameMinutes < 1 || gameMinutes > 60 || !Number.isInteger(correctPoints) || correctPoints < 1 || correctPoints > 100 || !Number.isInteger(hazardPenalty) || hazardPenalty < 0 || hazardPenalty > 50) {
      callback({ ok: false, error: "Pengaturan waktu atau poin tidak valid." });
      return;
    }
    room.settings = { ...room.settings, gameMinutes, correctPoints, hazardPenalty };
    io.to(room.code).emit("room:settings", room.settings);
    callback({ ok: true, settings: room.settings });
  });

  socket.on("room:pause", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room || !pauseGame(room)) {
      callback({ ok: false, error: "Game tidak dapat dijeda." });
      return;
    }
    callback({ ok: true, remainingMs: room.pausedRemaining });
  });

  socket.on("room:resume", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room || !resumeGame(room)) {
      callback({ ok: false, error: "Game tidak dapat dilanjutkan." });
      return;
    }
    callback({ ok: true, endsAt: room.endsAt });
  });

  socket.on("room:end", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room || room.status === "ended") {
      callback({ ok: false, error: "Game tidak dapat diakhiri." });
      return;
    }
    endGame(room, "host");
    callback({ ok: true });
  });

  socket.on("room:kick", (payload = {}, callback = () => {}) => {
    const room = resolveHostRoom(socket, payload);
    if (!room) {
      callback({ ok: false, error: "Hanya host yang dapat mengeluarkan pemain." });
      return;
    }
    const targetId = String(payload.playerId || "");
    if (!room.players.has(targetId)) {
      callback({ ok: false, error: "Pemain tidak ditemukan." });
      return;
    }
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit("player:kicked", { reason: "Dikeluarkan oleh host." });
      targetSocket.leave(room.code);
    }
    removePlayer(room, targetId);
    if (room.status === "playing" && room.players.size > 0 && room.finishedPlayers.size >= room.players.size) {
      endGame(room, "finish");
    }
    callback({ ok: true });
  });

  // =====================================================
  // JOIN ROOM
  // =====================================================

  socket.on("room:join", (payload = {}, callback = () => {}) => {
    const code = String(payload.roomCode || "")
      .trim()
      .toUpperCase();

    const name = String(payload.name || "").trim().slice(0, 24) || "Player";

    const room = rooms.get(code);

    if (!room) {
      callback({
        ok: false,
        error: "Room tidak ditemukan."
      });
      return;
    }

    if (room.players.has(socket.id)) {
      callback({
        ok: true,
        roomCode: code,
        playerId: socket.id,
        playerToken: room.players.get(socket.id).token,
        status: room.status,
        });
      socket.emit("room:settings", room.settings);
      socket.emit("room:status", statusPayload(room));
      return;
    }

    // REJOIN: same playerToken = same player, even though the socket id is new
    // (page refresh, phone slept, network dropped). Everything is kept.
    const playerToken = String(payload.playerToken || "");
    const existing = playerToken ? [...room.players.values()].find((p) => p.token === playerToken) : null;
    if (existing) {
      cancelRoomCleanup(room);
      clearTimeout(existing.disconnectTimer);
      existing.disconnectTimer = null;
      existing.connected = true;

      const oldId = existing.id;
      const oldSocket = io.sockets.sockets.get(oldId);
      if (oldSocket && oldSocket.id !== socket.id) {
        // Same player opened in a second tab: the old tab must stop (and not auto-rejoin).
        oldSocket.emit("player:replaced", { reason: "Sesi dibuka di tab / perangkat lain." });
        oldSocket.leave(room.code);
      }
      rekeyPlayer(room, existing, socket.id);
      socket.join(code);
      io.to(code).emit("player:left", { playerId: oldId, rejoin: true });

      callback({
        ok: true,
        resumed: true,
        roomCode: code,
        playerId: socket.id,
        playerName: existing.name,
        playerToken: existing.token,
        status: room.status,
        course: { width: WORLD_WIDTH, height: WORLD_HEIGHT, finishX: FINISH_X, startedAt: room.startedAt, hazards: COURSE_HAZARDS, slugs: COURSE_SLUGS },
        player: {
          stageIndex: Number.isInteger(existing.stageIndex) ? existing.stageIndex : 0,
          x: existing.x,
          y: existing.y,
          facing: existing.facing,
          score: existing.score,
          hp: existing.hp,
          maxHp: BATTLE.playerMaxHp,
          ko: Boolean(existing.ko),
          finished: Boolean(existing.finished)
        }
      });
      socket.emit("room:settings", room.settings);
      socket.emit("room:status", statusPayload(room));
      socket.emit("players:state", [...room.players.values()].filter((other) => other.id !== socket.id).map(publicPlayerPosition));
      socket.to(code).emit("player:joined", publicPlayerPosition(existing));
      broadcastPlayerList(room);
      broadcastLeaderboard(room);
      console.log(`[REJOIN] ${existing.name} resumed ${code}`);
      return;
    }

    const player = {
      id: socket.id,
      token: makeToken(),
      connected: true,
      disconnectTimer: null,
      name,
      avatar: sanitizeAvatar(payload.avatar),
      score: 0,
      answeredQuestions: 0,
      stageIndex: 0,
      x: 240,
      y: 208,
      facing: "right",
      vx: 0,
      vy: 0,
      state: "idle",
      grounded: true,
      hazardHits: 0,
      usedHazards: new Set(),
      quests: new Set(),
      battles: {},
      battlesWon: new Set(),
      hp: BATTLE.playerMaxHp,
      ko: false,
      koCount: 0,
      koTimer: null,
      lastContactAt: 0,
      finishedAt: null,
      finishBonus: 0,
      finished: false,
      lastHazardAt: 0,
      lastTrapAt: 0
    };

    cancelRoomCleanup(room);
    room.members.add(socket.id);
    room.players.set(socket.id, player);

    socket.join(code);

    callback({
      ok: true,
      roomCode: code,
      playerId: socket.id,
      playerToken: player.token,
      playerName: name,
      status: room.status,
      course: { width: WORLD_WIDTH, height: WORLD_HEIGHT, finishX: FINISH_X, startedAt: room.startedAt, hazards: COURSE_HAZARDS, slugs: COURSE_SLUGS },
      });
    socket.emit("room:status", statusPayload(room));

    // Kirim posisi pemain lama ke HP pemain baru.
    socket.emit(
      "players:state",
      [...room.players.values()]
        .filter((other) => other.id !== socket.id)
        .map(publicPlayerPosition)
    );

    // Beritahu pemain lama bahwa ada pemain baru.
    socket.to(room.code).emit(
      "player:joined",
      publicPlayerPosition(player)
    );

    broadcastPlayerList(room);
    broadcastLeaderboard(room);

    console.log(`[JOIN] ${name} joined ${code}`);
  });

  // =====================================================
  // REQUEST SNAPSHOT PEMAIN UNTUK HP
  // =====================================================

  socket.on(
    "players:request",
    (payload = {}, callback = () => {}) => {
      const room = getRoom(socket, payload.roomCode);

      if (!room) {
        callback({
          ok: false,
          error: "Room tidak valid."
        });
        return;
      }

      const players = [...room.players.values()]
        .filter((player) => player.id !== socket.id)
        .map(publicPlayerPosition);

      socket.emit("players:state", players);

      callback({
        ok: true,
        count: players.length
      });
    }
  );

  // =====================================================
  // SINKRONISASI POSISI AVATAR
  // =====================================================

  socket.on("hazard:request", (payload = {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    const hazard = COURSE_HAZARDS.find(item => item.id === payload.hazardId);
    if (!room || room.status !== "playing" || !player || !hazard || player.finished || player.ko) return;
    const recentHit = Date.now() - (player.lastHazardAt || 0) < 1600;
    // Match player center with hazard body and player Arcade body, not nearby decoration.
    const near = Math.abs(player.x - hazard.x) < 19 && Math.abs(player.y - hazard.y) < 15 && Number(player.vy) >= -80;
    if (!near || recentHit) return;
    player.lastHazardAt = Date.now();
    player.hazardHits = (player.hazardHits || 0) + 1;
    player.score -= room.settings.hazardPenalty;
    player.x = Math.max(COURSE.startX, player.x - 96);
    player.y = COURSE.startY;
    player.vx = 0;
    player.vy = 0;
    player.state = "hurt";
    const result = { hazardId: hazard.id, penalty: room.settings.hazardPenalty, totalScore: player.score, respawnX: player.x, respawnY: player.y };
    io.to(room.code).emit("hazard:hit", { playerId: player.id, ...result });
    io.to(room.code).emit("hazard:score", { playerId: player.id, name: player.name, score: player.score, penalty: room.settings.hazardPenalty });
    socket.to(room.code).emit("player:moved", publicPlayerPosition(player));
    socket.to(room.code).emit("tv:player-move", publicPlayerPosition(player));
    broadcastLeaderboard(room);
    broadcastPlayerList(room);
  });

  socket.on("slug:hit", (payload = {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    const slug = COURSE_SLUGS.find(item => item.id === payload.slugId);
    if (!room || room.status !== "playing" || !player || !slug || player.finished || player.ko) return;
    if (Date.now() - (player.lastSlugAt || 0) < 2200) return;
    if (Math.abs(player.x - slug.x) > 24 || Math.abs(player.y - slug.y) > 16 || Number(player.vy) < -80) return;
    player.lastSlugAt = Date.now();
    player.hazardHits = (player.hazardHits || 0) + 1;
    player.score -= room.settings.hazardPenalty;
    player.x = Math.max(COURSE.startX, player.x - 120);
    player.y = COURSE.startY;
    player.vx = player.vy = 0;
    player.state = "hurt";
    const result = { slugId: slug.id, penalty: room.settings.hazardPenalty, totalScore: player.score, respawnX: player.x, respawnY: player.y };
    io.to(room.code).emit("hazard:hit", { playerId: player.id, ...result });
    io.to(room.code).emit("hazard:score", { playerId: player.id, name: player.name, score: player.score, penalty: room.settings.hazardPenalty });
    socket.to(room.code).emit("player:moved", publicPlayerPosition(player));
    socket.to(room.code).emit("tv:player-move", publicPlayerPosition(player));
    broadcastLeaderboard(room);
    broadcastPlayerList(room);
  });

  socket.on("player:board-train", (payload = {}) => {
    const room = getRoom(socket, payload.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    const nextStageIndex = Number(payload.nextStageIndex);
    if (Number.isInteger(nextStageIndex) && nextStageIndex >= 0 && nextStageIndex < COURSE.stages.length) {
      // Naik kereta ke stage berikutnya hanya setelah enemy stage ini dikalahkan pemain itu sendiri.
      if (nextStageIndex > player.stageIndex && !hasClearedStage(player)) {
        socket.emit("player:correction", publicPlayerPosition(player));
        return;
      }
      player.stageIndex = nextStageIndex;
      const stage = COURSE.stages[nextStageIndex];
      const targetX = stage.startX + 160;
      const targetY = 208;
      player.x = targetX;
      player.y = targetY;
      player.lastMoveAt = Date.now();
      const eventData = {
        playerId: player.id,
        name: player.name,
        fromIndex: Number(payload.stageIndex) || 0,
        toIndex: nextStageIndex,
        destination: stage.name,
        x: targetX,
        y: targetY
      };
      io.to(room.code).emit("tv:player-board-train", eventData);
      const movementData = publicPlayerPosition(player);
      socket.to(room.code).emit("player:moved", movementData);
      socket.to(room.code).emit("tv:player-move", movementData);
    }
  });

  // =====================================================
  // STAGE 5 NPC QUESTS (see src/game/quests.js)
  // Optional social side quest: the player confirms completion honestly.
  // It is separate from the main route and never awards score points.
  // =====================================================

  socket.on("quest:state", (payload = {}, callback = () => {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      callback({ ok: false, error: "Room tidak ditemukan." });
      return;
    }
    callback({ ok: true, completed: [...player.quests], total: QUEST.npcs.length, points: QUEST.points });
  });

  socket.on("quest:complete", (payload = {}, callback = () => {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      callback({ ok: false, error: "Room tidak ditemukan." });
      return;
    }
    if (room.status !== "playing") {
      callback({ ok: false, error: "Misi hanya bisa diselesaikan saat game berjalan." });
      return;
    }
    const npc = questNpcById(String(payload.npcId || ""));
    const stage = COURSE.stages[player.stageIndex];
    if (!npc || !stage || stage.id !== QUEST.stageId) {
      callback({ ok: false, error: "Misi ini hanya ada di stage Köln." });
      return;
    }
    // Position updates lag a little behind the phone, so allow some slack.
    if (Math.abs(player.x - npc.x) > QUEST.interactRange + 140) {
      callback({ ok: false, error: "Kamu terlalu jauh dari NPC." });
      return;
    }
    const targets = payload.targets || {};
    const female = Number(targets.female);
    const male = Number(targets.male);
    if (!Number.isInteger(female) || !Number.isInteger(male) ||
        female < QUEST.minFemale || male < QUEST.minMale) {
      callback({ ok: false, error: `Minimal ${QUEST.minFemale} cewe dan ${QUEST.minMale} cowo dari kelas lain.` });
      return;
    }
    if (player.quests.has(npc.id)) {
      callback({ ok: false, alreadyDone: true, completed: [...player.quests], error: "Misi ini sudah selesai." });
      return;
    }
    player.quests.add(npc.id);
    const result = {
      playerId: player.id,
      name: player.name,
      npcId: npc.id,
      npcName: npc.name,
      points: 0,
      done: player.quests.size,
      total: QUEST.npcs.length,
      totalScore: player.score
    };
    io.to(room.code).emit("tv:quest-complete", result);
    callback({ ok: true, completed: [...player.quests], ...result });
  });

  // =====================================================
  // ENEMY BATTLES (see src/game/battle.js)
  // The enemy dies after `total` correct answers. Questions and answers stay
  // on the server. Correct = +points for the player and the enemy loses HP.
  // Wrong = no points, the question is replaced by a new one and the enemy hits the player
  // (player HP + K.O. penalty are server-authoritative, see damagePlayerHp()).
  // =====================================================

  const shuffled = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const tierOf = (stageId, index) => [1, 2, 3].find((t) => BATTLE_TIERS[stageId][t].includes(index)) || 1;

  // Next question = random UNUSED question of the tier this step of the fight needs (easy -> hard).
  // If that tier is used up it falls back to the closest tier, and only when the whole stage pool
  // has been used does it start over (never the question that was just asked).
  const pickBattleQuestion = (battle) => {
    const wanted = battle.plan[Math.min(battle.solved, battle.plan.length - 1)];
    const pool = BATTLE_QUESTIONS[battle.stageId].map((_, i) => i);
    const seen = battle.seen || new Set();   // soal yang pernah keluar untuk pemain ini (lintas game)
    const counts = battle.counts || null;    // soal yang sudah dibagikan ke pemain lain di game ini
    const order = [wanted, wanted - 1, wanted + 1, wanted - 2, wanted + 2].filter((t) => t >= 1 && t <= 3);
    const fromTiers = (skipSeen) => {
      for (const tier of order) {
        const found = BATTLE_TIERS[battle.stageId][tier].filter((i) => !battle.used.has(i) && !(skipSeen && seen.has(i)));
        if (found.length) return found;
      }
      return [];
    };
    let candidates = fromTiers(true);
    if (!candidates.length) { seen.clear(); candidates = fromTiers(false); } // seluruh bank sudah pernah keluar: putaran baru
    if (!candidates.length) {
      const last = battle.current;
      battle.used = new Set(last === null ? [] : [last]);
      candidates = pool.filter((i) => !battle.used.has(i) && tierOf(battle.stageId, i) === wanted);
      if (!candidates.length) candidates = pool.filter((i) => !battle.used.has(i));
    }
    if (!candidates.length) candidates = pool; // jaga-jaga: jangan pernah mengembalikan undefined
    // Utamakan soal yang paling jarang dibagikan ke pemain lain, supaya tiap orang dapat soal berbeda.
    if (counts) {
      const min = Math.min(...candidates.map((i) => counts.get(i) || 0));
      candidates = candidates.filter((i) => (counts.get(i) || 0) === min);
    }
    return candidates[randomInt(candidates.length)];
  };

  // The question being shown. Its choices are shuffled every time and the correct letter is
  // remembered on the server (battle.shown), so answer positions are random too.
  const battleQuestionPayload = (battle, cfg = battleConfig(battle.stageId)) => {
    if (battle.current === null || battle.current === undefined) {
      battle.current = pickBattleQuestion(battle);
      battle.used.add(battle.current);
      battle.seen?.add(battle.current);
      battle.counts?.set(battle.current, (battle.counts.get(battle.current) || 0) + 1);
    }
    const item = BATTLE_QUESTIONS[battle.stageId][battle.current];
    const letters = ["A", "B", "C", "D"];
    const order = shuffled(letters); // order[i] = original letter shown at position i
    const choices = {};
    letters.forEach((letter, i) => { choices[letter] = item.choices[order[i]]; });
    battle.shown = { index: battle.current, answer: letters[order.indexOf(item.answer)] };
    const tier = tierOf(battle.stageId, battle.current);
    return {
      number: battle.solved + 1, solved: battle.solved, total: battle.total, question: item.question, choices,
      tier, tierLabel: TIER_LABELS[tier], level: cfg.level, levelLabel: cfg.levelLabel, cefr: cfg.cefr,
      points: Math.round(battle.basePoints * cfg.pointsMultiplier)
    };
  };

  // Enemy HP is derived from the answers solved so far (each correct answer = 1/total of its HP).
  const enemyHpPayload = (battle, cfg, defeated = false) => {
    const total = cfg.total;
    const solved = defeated ? total : battle.solved;
    return { enemyMaxHp: cfg.maxHp, enemyHp: Math.max(0, Math.round(cfg.maxHp * (total - solved) / total)), enemyDamage: Math.round(cfg.maxHp / total) };
  };

  socket.on("battle:state", (payload = {}, callback = () => {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player) { callback({ ok: false, error: "Room tidak ditemukan." }); return; }
    const progress = {};
    for (const [stageId, battle] of Object.entries(player.battles)) progress[stageId] = { solved: battle.solved, total: battle.total };
    callback({ ok: true, won: [...player.battlesWon], progress, ...publicHp(player) });
  });

  socket.on("battle:start", (payload = {}, callback = () => {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player) { callback({ ok: false, error: "Room tidak ditemukan." }); return; }
    if (room.status !== "playing") { callback({ ok: false, error: "Game belum berjalan." }); return; }
    if (Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
      player.x = payload.x;
      player.y = payload.y;
    }
    if (Number.isInteger(payload.stageIndex)) {
      player.stageIndex = payload.stageIndex;
    }

    const stage = COURSE.stages[player.stageIndex];
    const cfg = stage && battleConfig(stage.id);
    if (!cfg || !BATTLE_QUESTIONS[stage.id]) { callback({ ok: false, error: "Tidak ada musuh di stage ini." }); return; }
    if (player.ko) { callback({ ok: false, error: "Kamu K.O. Tunggu respawn." }); return; }
    if (Math.abs(player.x - battleEnemyX(stage.id)) > BATTLE.reach + 250) {
      callback({ ok: false, error: "Kamu terlalu jauh dari musuh." });
      return;
    }
    if (player.battlesWon.has(stage.id)) { callback({ ok: false, defeated: true, error: "Musuh ini sudah dikalahkan." }); return; }
    let battle = player.battles[stage.id];
    if (!battle) {
      battle = { stageId: stage.id, plan: battlePlan(cfg.total), used: new Set(), current: null, solved: 0, total: cfg.total, shown: null, basePoints: room.settings.correctPoints };
      player.seenBattle = player.seenBattle || {};
      room.battleCounts = room.battleCounts || {};
      battle.seen = player.seenBattle[stage.id] = player.seenBattle[stage.id] || new Set();
      battle.counts = room.battleCounts[stage.id] = room.battleCounts[stage.id] || new Map();
      player.battles[stage.id] = battle;
    }
    const firstQuestion = battleQuestionPayload(battle);
    io.to(room.code).emit("tv:battle-start", { playerId: player.id, name: player.name, stageId: stage.id, boss: Boolean(cfg.boss), ...enemyHpPayload(battle, cfg) });
    if (cfg.boss) {
      io.to(room.code).emit("tv:final-boss-intro", {
        playerId: player.id,
        name: player.name,
        bossName: cfg.name,
        maxHp: cfg.maxHp
      });
    }
    callback({ ok: true, stageId: stage.id, wrongDamage: cfg.wrongDamage, hp: player.hp, maxHp: BATTLE.playerMaxHp, ...enemyHpPayload(battle, cfg), ...firstQuestion });
  });

  socket.on("battle:answer", (payload = {}, callback = () => {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player) { callback({ ok: false, error: "Room tidak ditemukan." }); return; }
    if (room.status !== "playing") { callback({ ok: false, error: "Game tidak sedang berjalan." }); return; }
    if (player.ko) { callback({ ok: false, error: "Kamu K.O. Tunggu respawn." }); return; }
    const stage = COURSE.stages[player.stageIndex];
    const battle = stage && player.battles[stage.id];
    if (!battle) { callback({ ok: false, error: "Tidak ada pertarungan aktif." }); return; }
    const cfg = battleConfig(stage.id);
    const choice = String(payload.choice || "").toUpperCase();
    if (!["A", "B", "C", "D"].includes(choice)) { callback({ ok: false, error: "Pilihan tidak valid." }); return; }
    if (!battle.shown || battle.shown.index !== battle.current) { callback({ ok: false, error: "Soal belum ditampilkan." }); return; }

    if (choice === battle.shown.answer) {
      // Correct: points for the player (scaled by the stage's level, never stage 5), enemy loses HP.
      const points = Math.round(battle.basePoints * cfg.pointsMultiplier);
      player.score += points;
      battle.solved += 1;
      battle.current = null;
      battle.shown = null;
      const defeated = battle.solved >= battle.total;
      const enemy = enemyHpPayload(battle, cfg, defeated);
      if (defeated) {
        delete player.battles[stage.id];
        player.battlesWon.add(stage.id);
        io.to(room.code).emit("tv:enemy-defeated", { playerId: player.id, name: player.name, stageId: stage.id, boss: cfg.boss });
      }
      broadcastPlayerHp(room, player, { source: "battle-correct", points });
      broadcastLeaderboard(room);
      broadcastPlayerList(room);
      io.to(room.code).emit("tv:enemy-hit", { playerId: player.id, stageId: stage.id, damage: enemy.enemyDamage, enemyHp: enemy.enemyHp, enemyMaxHp: enemy.enemyMaxHp });
      io.to(room.code).emit("battle:player-strike", { playerId: player.id, stageId: stage.id, damage: enemy.enemyDamage, enemyHp: enemy.enemyHp, enemyMaxHp: enemy.enemyMaxHp, defeated, solved: battle.solved, total: battle.total });
      callback({
        ok: true, correct: true, defeated, solved: battle.solved, total: battle.total,
        points, totalScore: player.score, hp: player.hp, maxHp: BATTLE.playerMaxHp, ko: false, ...enemy,
        ...(defeated ? {} : { next: battleQuestionPayload(battle) })
      });
      return;
    }
    // Wrong: no points (the correct answer is NOT revealed) and the enemy hits the player. A wrong question is replaced by a NEW one of the same tier (not re-queued).
    // Reaching 0 HP is a K.O. with a one-time -25 penalty.
    battle.current = null; // the missed question stays in `used`; the next one is NEW and of the same tier
    battle.shown = null;
    const wrongPenalty = cfg.boss ? 10 : (cfg.level >= 3 ? 8 : 5);
    player.score = Math.max(0, player.score - wrongPenalty);
    broadcastLeaderboard(room);
    broadcastPlayerList(room);
    const hit = damagePlayerHp(room, player, cfg.wrongDamage, "battle-wrong");
    const enemy = enemyHpPayload(battle, cfg);
    io.to(room.code).emit("battle:enemy-strike", { playerId: player.id, stageId: stage.id, damage: hit.applied, playerHp: player.hp, ko: hit.ko });
    callback({
      ok: true, correct: false, defeated: false, solved: battle.solved, total: battle.total,
      points: 0, scorePenalty: wrongPenalty, wrongDamage: hit.applied, ko: hit.ko, koPenalty: hit.penalty, respawnMs: BATTLE.koRespawnMs,
      totalScore: player.score, hp: player.hp, maxHp: BATTLE.playerMaxHp, ...enemy,
      next: battleQuestionPayload(battle)
    });
  });

  // Walking into the enemy outside a quiz still hurts. The server checks the distance,
  // the stage and a cooldown so a client can't spam or fake damage.
  // Clients measure their offset to the server clock so traps (timed spikes, rolling barrels)
  // are drawn in the same phase the server uses to judge hits.
  socket.on("clock:sync", (payload = {}, callback = () => {}) => {
    callback({ ok: true, serverNow: Date.now() });
  });

  socket.on("enemy:contact", (payload = {}, callback = () => {}) => {
    const room = getRoom(socket, payload.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.status !== "playing" || player.ko || player.finished) { callback({ ok: false }); return; }
    const stage = COURSE.stages[player.stageIndex];
    const cfg = stage && battleConfig(stage.id);
    if (!cfg || player.battlesWon.has(stage.id)) { callback({ ok: false }); return; }
    if (Math.abs(player.x - battleEnemyX(stage.id)) > 90) { callback({ ok: false }); return; }
    const now = Date.now();
    if (now - (player.lastContactAt || 0) < BATTLE.contactCooldownMs) { callback({ ok: false }); return; }
    player.lastContactAt = now;
    const hit = damagePlayerHp(room, player, cfg.boss ? 20 : 10, "enemy-contact");
    callback({ ok: true, damage: hit.applied, ko: hit.ko, hp: player.hp, totalScore: player.score });
  });

  socket.on("player:stage", (payload = {}) => {
    const room = getRoom(socket, payload.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    const stageIndex = Number(payload.stageIndex);
    if (Number.isInteger(stageIndex) && stageIndex >= 0 && stageIndex < COURSE.stages.length) {
      player.stageIndex = stageIndex;
      const stage = COURSE.stages[stageIndex];
      const targetX = Number.isFinite(Number(payload.x)) ? Number(payload.x) : stage.startX + 160;
      const targetY = Number.isFinite(Number(payload.y)) ? Number(payload.y) : 208;
      player.x = targetX;
      player.y = targetY;
      player.lastMoveAt = Date.now();
      const movementData = publicPlayerPosition(player);
      socket.to(room.code).emit("player:moved", movementData);
      socket.to(room.code).emit("tv:player-move", movementData);
    }
  });

  socket.on("player:move", (payload = {}) => {
    const room = getRoom(socket, payload.roomCode);

    if (!room) return;

    const player = room.players.get(socket.id);

    if (!player || room.status === "ended" || player.finished) return;
    // K.O.'d players stay where they fell until the server respawns them.
    if (player.ko) return;

    const stageIndex = Number.isInteger(payload.stageIndex) ? payload.stageIndex : undefined;
    const isStageChange = payload.teleport === true || (stageIndex !== undefined && stageIndex !== player.stageIndex);
    if (stageIndex !== undefined) {
      player.stageIndex = stageIndex;
    }

    const x = Number(payload.x);
    const y = Number(payload.y);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      const currentStage = COURSE.stages[player.stageIndex];
      const inCurrentStage = currentStage && x >= currentStage.startX && x <= currentStage.endX;
      const distance = Math.hypot(x - player.x, y - player.y);
      const elapsed = Math.max(16, Date.now() - (player.lastMoveAt || Date.now() - 100));
      // Allow stage transitions (e.g. train arrival) without sending cheat corrections
      if (!isStageChange && !inCurrentStage && distance > Math.max(140, 1.2 * elapsed + 80)) {
        socket.emit("player:correction", publicPlayerPosition(player));
        return;
      }
      player.x = Math.max(0, Math.min(WORLD_WIDTH, x));
      player.y = Math.max(0, Math.min(WORLD_HEIGHT, y));
      player.lastMoveAt = Date.now();
    }

    if (payload.facing === "left" || payload.facing === "right") player.facing = payload.facing;
    if ([-1, 0, 1].includes(Math.sign(Number(payload.vx)))) player.vx = Math.max(-500, Math.min(500, Number(payload.vx) || 0));
    if (Number.isFinite(Number(payload.vy))) player.vy = Math.max(-700, Math.min(700, Number(payload.vy)));
    if (["idle", "walk-left", "walk-right", "jump-left", "jump-right", "fall-left", "fall-right", "interact", "punch-left", "punch-right", "sword-left", "sword-right", "hurt-left", "hurt-right"].includes(payload.state)) player.state = payload.state;
    if (typeof payload.grounded === "boolean") player.grounded = payload.grounded;

    const movementData = publicPlayerPosition(player);
    movementData.serverNow = Date.now();

    // HP pemain lain.
    socket.to(room.code).emit(
      "player:moved",
      movementData
    );

    // TV Live Spectator and all other player clients receive same authoritative state.
    socket.to(room.code).emit("tv:player-move", movementData);

    // Server authoritative hazard collision; a hit deducts points once per hit window.
    const hitHazard = room.status === "playing" && COURSE_HAZARDS.find(h =>
      Math.abs(player.x - h.x) < 19 && Math.abs(player.y - h.y) < 15 &&
      Number(player.vy) >= -80 &&
      Date.now() - (player.lastHazardAt || 0) > 1800
    );
    if (hitHazard) {
      player.hazardHits = (player.hazardHits || 0) + 1;
      player.lastHazardAt = Date.now();
      player.score -= room.settings.hazardPenalty;
      const hit = damagePlayerHp(room, player, 20, "hazard");
      const hazardResult = {
        hazardId: hitHazard.id,
        penalty: room.settings.hazardPenalty,
        totalScore: player.score,
        damage: hit.applied,
        ko: hit.ko,
        respawnX: Math.max(COURSE.startX, player.x - 90),
        respawnY: COURSE.startY
      };
      player.x = hazardResult.respawnX;
      player.y = hazardResult.respawnY;
      player.vx = 0;
      player.vy = 0;
      player.state = "hurt";
      socket.emit("hazard:hit", hazardResult);
      io.to(room.code).emit("tv:hazard-hit", { playerId: player.id, ...hazardResult });
      io.to(room.code).emit("hazard:score", { playerId: player.id, name: player.name, score: player.score, penalty: room.settings.hazardPenalty });
      socket.emit("player:moved", publicPlayerPosition(player));
      socket.emit("tv:player-move", publicPlayerPosition(player));
      socket.to(room.code).emit("player:moved", publicPlayerPosition(player));
      socket.to(room.code).emit("tv:player-move", publicPlayerPosition(player));
      broadcastPlayerList(room);
      broadcastLeaderboard(room);
    }

    // Stage traps (src/game/traps.js): the server alone decides a hit, from the position the
    // client reports and the server clock. Never while standing in a quiz / battle, after K.O.,
    // or inside the 1.5 s invulnerability window of the previous hit.
    if (room.status === "playing" && !player.ko && !player.finished && !inBattle(player)) {
      const nowTrap = Date.now();
      const trapStage = COURSE.stages[player.stageIndex];
      if (trapStage && nowTrap - (player.lastTrapAt || 0) > TRAP.hitCooldownMs) {
        const trap = findTrapHit(trapStage.id, player.x, player.y, nowTrap);
        if (trap) {
          player.lastTrapAt = nowTrap;
          player.trapHits = (player.trapHits || 0) + 1;
          const hit = damagePlayerHp(room, player, trap.damage, "trap");
          io.to(room.code).emit("trap:hit", {
            playerId: player.id, trapId: trap.id, type: trap.type, damage: hit.applied, ko: hit.ko,
            dir: player.x >= trapCenterX(trap, nowTrap) ? 1 : -1
          });
        }
      }
    }

    if (!player.finished && player.x >= FINISH_X - 110 && player.x <= FINISH_X + 80) {
      finishPlayer(room, player);
    }
  });

  // =====================================================
  // TV SUBSCRIBE
  // =====================================================

  socket.on(
    "tv:subscribe",
    (payload = {}, callback = () => {}) => {
      const code = String(payload.roomCode || "")
        .trim()
        .toUpperCase();

      const room = rooms.get(code);

      if (!room) {
        callback({
          ok: false,
          error: "Room tidak ditemukan."
        });
        return;
      }

      if (payload.hostToken && payload.hostToken === room.hostToken) {
        room.hostId = socket.id;
      }

      cancelRoomCleanup(room);
      room.members.add(socket.id);
      socket.join(code);

      callback({
        ok: true,
        roomCode: code,
        status: room.status,
        endsAt: room.endsAt,
        settings: room.settings,
        course: { width: WORLD_WIDTH, height: WORLD_HEIGHT, finishX: FINISH_X, startedAt: room.startedAt, hazards: COURSE_HAZARDS, slugs: COURSE_SLUGS },
        players: publicLeaderboard(room),
        avatars: [...room.players.values()].map(publicPlayerPosition)
      });

      socket.emit("players:state", [...room.players.values()].map(publicPlayerPosition));
      socket.emit("room:settings", room.settings);
      socket.emit("room:status", statusPayload(room));
      broadcastPlayerList(room);
      broadcastLeaderboard(room);
    }
  );

  // =====================================================
  // TV WATCH PLAYER
  // =====================================================

  socket.on(
    "tv:watch",
    (payload = {}, callback = () => {}) => {
      const room = getRoom(socket, payload.roomCode);

      if (!room) {
        callback({
          ok: false,
          error: "Room tidak valid."
        });
        return;
      }

      const player = room.players.get(
        String(payload.playerId || "")
      );

      if (!player) {
        callback({
          ok: false,
          error: "Pemain tidak ditemukan."
        });
        return;
      }

      callback({
        ok: true,
        player: publicPlayerPosition(player)
      });
    }
  );

  // =====================================================
  // DISCONNECT
  // =====================================================

  socket.on("disconnect", () => {
    console.log(`[DISCONNECT] ${socket.id}`);

    for (const room of [...rooms.values()]) {
      const player = room.players.get(socket.id);

      if (player) {
        // Do NOT delete the player: keep the slot for PLAYER_GRACE_MS so a refresh /
        // reconnect with the same playerToken continues exactly where they were.
        const playerId = player.id;
        player.connected = false;
        player.vx = 0;
        player.state = "idle";
        room.members.delete(socket.id);
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = setTimeout(() => {
          const current = room.players.get(playerId);
          if (!current || current.connected) return;
          removePlayer(room, playerId);
          scheduleRoomCleanup(room);
        }, PLAYER_GRACE_MS);
        broadcastPlayerList(room);
      } else if (room.hostId === socket.id) {
        room.hostId = null;
        room.members.delete(socket.id);
      } else {
        room.members.delete(socket.id);
      }

      // Nobody connected (host included): keep the room for ROOM_IDLE_MS so the host can resume.
      scheduleRoomCleanup(room);
    }
  });
});

// Satu error di handler tidak boleh mematikan server (dan semua room yang sedang main).
process.on("uncaughtException", (error) => console.error("[UNCAUGHT]", error));
process.on("unhandledRejection", (reason) => console.error("[UNHANDLED]", reason));

// =====================================================
// START SERVER
// =====================================================

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("==================================");
  console.log(" BAI PARTY GAMES MULTIPLAYER SERVER");
  console.log(` http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log("==================================");
});
