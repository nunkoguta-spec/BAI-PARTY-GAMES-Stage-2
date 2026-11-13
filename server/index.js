
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { randomInt } from "node:crypto";
import { COURSE } from "../src/game/course.js";

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

const DEFAULT_SETTINGS = Object.freeze({ quizSeconds: 15, gameMinutes: 20, correctPoints: 10, questionLimit: 0, hazardPenalty: COURSE.hazardPenalty, finishBonusSeconds: COURSE.finishBonusSeconds, courseWidth: COURSE.width, finishX: COURSE.finishX });
const WORLD_WIDTH = COURSE.width;
const WORLD_HEIGHT = COURSE.height;
const FINISH_X = COURSE.finishX;
const DEFAULT_QUESTION_BOXES = Object.freeze([
  { x: 360, y: 176, id: "question-box-01", tier: 1 },
  { x: 800, y: 176, id: "question-box-02", tier: 1 },
  { x: 1300, y: 176, id: "question-box-03", tier: 1 },
  { x: 2000, y: 176, id: "question-box-04", tier: 1 },
  { x: 2700, y: 176, id: "question-box-05", tier: 1 },
  { x: 3700, y: 176, id: "question-box-06", tier: 1 },
  { x: 4400, y: 176, id: "question-box-07", tier: 2 },
  { x: 5100, y: 176, id: "question-box-08", tier: 2 },
  { x: 5800, y: 176, id: "question-box-09", tier: 2 },
  { x: 6500, y: 176, id: "question-box-10", tier: 2 },
  { x: 7100, y: 176, id: "question-box-11", tier: 3 },
  { x: 7800, y: 176, id: "question-box-12", tier: 3 },
  { x: 8500, y: 176, id: "question-box-13", tier: 3 },
  { x: 9200, y: 176, id: "question-box-14", tier: 3 }
]);
const BOX_SOURCE = Array.isArray(COURSE.questionBoxes) && COURSE.questionBoxes.length > 0 ? COURSE.questionBoxes : DEFAULT_QUESTION_BOXES;
const QUESTION_BOXES = new Map(BOX_SOURCE.map(box => [box.id, box]));
const SAFE_QUESTION_IDS = new Set(BOX_SOURCE.map(box => box.id));
const COURSE_HAZARDS = COURSE.hazards;
const COURSE_SLUGS = COURSE.slugs || [];

const QUESTION_BANK = [
  { id: "de-001", tier: 1, question: "Was bedeutet „Guten Morgen“?", choices: { A: "Selamat malam", B: "Selamat pagi", C: "Selamat tinggal", D: "Terima kasih" }, answer: "B" },
  { id: "de-002", tier: 1, question: "Wie sagt man „Terima kasih“ auf Deutsch?", choices: { A: "Bitte", B: "Entschuldigung", C: "Danke", D: "Hallo" }, answer: "C" },
  { id: "de-003", tier: 1, question: "Was bedeutet „Buch“?", choices: { A: "Buku", B: "Meja", C: "Kursi", D: "Pintu" }, answer: "A" },
  { id: "de-004", tier: 1, question: "Wie sagt man „Saya makan“ auf Deutsch?", choices: { A: "Ich trinke", B: "Ich schlafe", C: "Ich esse", D: "Ich spiele" }, answer: "C" },
  { id: "de-005", tier: 1, question: "Was ist die richtige Übersetzung für „Hund“?", choices: { A: "Kucing", B: "Burung", C: "Ikan", D: "Anjing" }, answer: "D" },
  { id: "de-017", tier: 1, question: "Was bedeutet „Wasser“?", choices: { A: "Api", B: "Air", C: "Angin", D: "Tanah" }, answer: "B" },
  { id: "de-018", tier: 1, question: "Wie sagt man „Guten Abend“ auf Indonesisch?", choices: { A: "Selamat pagi", B: "Selamat siang", C: "Selamat malam", D: "Sampai jumpa" }, answer: "C" },
  { id: "de-019", tier: 1, question: "Welches Wort bedeutet „Haus“?", choices: { A: "Haus", B: "Maus", C: "Baum", D: "Buch" }, answer: "A" },
  { id: "de-006", tier: 2, question: "Welcher Artikel gehört zu „Mädchen“?", choices: { A: "der", B: "die", C: "das", D: "den" }, answer: "C" },
  { id: "de-007", tier: 2, question: "Wie lautet der Plural von „Buch“?", choices: { A: "Bücher", B: "Buche", C: "Buchs", D: "Buchen" }, answer: "A" },
  { id: "de-008", tier: 2, question: "Was bedeutet „obwohl“?", choices: { A: "karena", B: "meskipun", C: "sebelum", D: "setelah" }, answer: "B" },
  { id: "de-020", tier: 2, question: "Was ist das Gegenteil von „langsam“?", choices: { A: "schnell", B: "klein", C: "ruhig", D: "hell" }, answer: "A" },
  { id: "de-021", tier: 2, question: "Welcher Kasus folgt auf „mit“?", choices: { A: "Nominativ", B: "Akkusativ", C: "Dativ", D: "Genitiv" }, answer: "C" },
  { id: "de-022", tier: 2, question: "Was bedeutet „deshalb“?", choices: { A: "oleh karena itu", B: "walaupun", C: "sebelum", D: "mungkin" }, answer: "A" },
  { id: "de-009", tier: 3, question: "Welcher Satz steht im Perfekt?", choices: { A: "Ich habe gegessen", B: "Ich esse", C: "Ich werde essen", D: "Ich aß" }, answer: "A" },
  { id: "de-010", tier: 3, question: "Er interessiert ___ für Musik.", choices: { A: "sich", B: "ihn", C: "ihm", D: "sein" }, answer: "A" },
  { id: "de-011", tier: 3, question: "Wenn ich mehr Zeit ___, würde ich reisen.", choices: { A: "habe", B: "hatte", C: "hätte", D: "haben" }, answer: "C" },
  { id: "de-012", tier: 3, question: "Trotz ___ Regens gingen wir spazieren.", choices: { A: "der", B: "dem", C: "den", D: "des" }, answer: "D" },
  { id: "de-013", tier: 3, question: "„Es kommt darauf an“ bedeutet ungefähr ...", choices: { A: "ini bergantung", B: "ini terlambat", C: "ini selesai", D: "ini menyenangkan" }, answer: "A" },
  { id: "de-014", tier: 3, question: "Welcher Satz ist ein korrekter Nebensatz?", choices: { A: "..., weil ich bin müde", B: "..., weil ich müde bin", C: "..., weil bin ich müde", D: "..., weil müde ich bin" }, answer: "B" },
  { id: "de-015", tier: 3, question: "Die Entscheidung wurde gestern ___.", choices: { A: "treffen", B: "getroffen", C: "trifft", D: "getrifft" }, answer: "B" },
  { id: "de-016", tier: 3, question: "„Sowohl ... als auch“ bedeutet ...", choices: { A: "bukan ... melainkan", B: "baik ... maupun", C: "meskipun", D: "sebelum" }, answer: "B" },
  { id: "de-023", tier: 3, question: "Wählen Sie die richtige Konjunktiv-II-Form: „Wenn er ___, wäre alles einfacher.“", choices: { A: "kommt", B: "käme", C: "gekommen", D: "kommen" }, answer: "B" },
  { id: "de-024", tier: 3, question: "Was bedeutet „in Betracht ziehen“?", choices: { A: "mempertimbangkan", B: "menghindari", C: "menjelaskan", D: "menyelesaikan" }, answer: "A" },
  { id: "de-025", tier: 3, question: "Er wartete, ___ der Zug endlich ankam.", choices: { A: "bis", B: "obwohl", C: "damit", D: "während" }, answer: "A" },
  { id: "de-026", tier: 3, question: "„Je öfter man übt, desto ___ wird man.“", choices: { A: "gut", B: "besser", C: "am besten", D: "guter" }, answer: "B" },
  { id: "de-027", tier: 3, question: "Welche Präposition verlangt den Genitiv?", choices: { A: "mit", B: "zu", C: "wegen", D: "bei" }, answer: "C" }
];

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

function publicLeaderboard(room) {
  return [...room.players.values()]
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      score: player.score,
      answeredQuestions: player.answeredQuestions,
      finishedAt: player.finishedAt || null,
      finishBonus: player.finishBonus || 0,
      hazardHits: player.hazardHits || 0
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
      connected: true
    }))
  );
  io.to(room.code).emit("room:status", { status: room.status });
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
    hazardHits: player.hazardHits || 0
  };
}

function publicQuestion(question, durationSeconds, questionNumber, deadline, tier = 1, basePoints = 10) {
  const multiplier = tier >= 3 ? 2 : tier === 2 ? 1.5 : 1;
  return {
    questionId: question.id,
    number: questionNumber,
    tier,
    question: question.question,
    choices: question.choices,
    points: Math.round(basePoints * multiplier),
    duration: durationSeconds,
    deadline,
    serverNow: Date.now()
  };
}

// =====================================================
// QUIZ RESULT
// =====================================================

function finishQuiz(room, player, session, timedOut = false) {
  if (!session || session.finished) return;

  session.finished = true;
  clearTimeout(session.timeout);

  player.activeQuiz = null;
  player.answeredQuestions += 1;

  const correct =
    !timedOut &&
    session.selectedAnswer === session.question.answer;
  const tierMultiplier = session.question.tier === 3 ? 2 : session.question.tier === 2 ? 1.5 : 1;
  const correctAward = Math.round(room.settings.correctPoints * tierMultiplier);

  if (correct) {
    player.score += correctAward;
  } else if (!timedOut) {
    player.score -= 5;
  }
  const difficultyTier = session.question.tier || 1;
  const followingTier = difficultyTier === 1 ? 2 : 3;
  io.to(player.id).emit("quiz:progress", {
    answered: player.answeredQuestions,
    nextTier: followingTier,
    nextPoints: Math.round(room.settings.correctPoints * (followingTier === 3 ? 2 : 1.5))
  });

  const result = {
    correct,
    timedOut,
    correctAnswer: session.question.answer,
    scoreChange: correct ? correctAward : timedOut ? 0 : -5,
    totalScore: player.score
  };

  // Hasil quiz hanya untuk HP pemain tersebut.
  io.to(player.id).emit("quiz:result", result);

  // TV hanya menerima status, tidak menerima soal/jawaban.
  io.to(room.code).emit("tv:quiz-status", {
    playerId: player.id,
    playerName: player.name,
    boxId: session.boxId,
    status: timedOut
      ? "timeout"
      : correct
        ? "correct"
        : "wrong",
    score: player.score
  });

  broadcastLeaderboard(room);
  if (room.status === "ended" && room.players.size) {
    const winner = publicLeaderboard(room)[0];
    io.to(room.code).emit("game:ended", { leaderboard: publicLeaderboard(room), winner });
  }
}

function endGame(room, reason = "host") {
  if (room.status === "ended") return;
  clearTimeout(room.gameTimer);
  clearTimeout(room.finishGraceTimer);
  room.status = "ended";
  for (const player of room.players.values()) {
    if (player.activeQuiz) finishQuiz(room, player, player.activeQuiz, true);
  }
  const leaderboard = publicLeaderboard(room);
  const winner = leaderboard[0] || null;
  io.to(room.code).emit("room:status", { status: "ended", reason, leaderboard, winner });
  io.to(room.code).emit("game:ended", { reason, leaderboard, winner });
}

function pauseGame(room) {
  if (room.status !== "playing") return false;
  room.pausedRemaining = Math.max(0, room.endsAt - Date.now());
  clearTimeout(room.gameTimer);
  for (const player of room.players.values()) {
    if (player.activeQuiz) {
      player.activeQuiz.pausedRemaining = Math.max(0, player.activeQuiz.deadline - Date.now());
      clearTimeout(player.activeQuiz.timeout);
    }
  }
  room.status = "paused";
  io.to(room.code).emit("room:status", { status: "paused", remainingMs: room.pausedRemaining });
  for (const player of room.players.values()) {
    if (player.activeQuiz) {
      io.to(player.id).emit("quiz:timer-pause", { remainingMs: player.activeQuiz.pausedRemaining });
    }
  }
  return true;
}

function finishPlayer(room, player) {
  if (!room || !player || player.finished || room.status !== "playing" || player.x < FINISH_X - 110) return null;
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
  for (const player of room.players.values()) {
    const session = player.activeQuiz;
    if (!session || session.finished || !session.pausedRemaining) continue;
    session.deadline = now + session.pausedRemaining;
    session.timeout = setTimeout(() => finishQuiz(room, player, session, true), session.pausedRemaining);
    io.to(player.id).emit("quiz:timer-resume", { deadline: session.deadline, serverNow: now });
  }
  io.to(room.code).emit("room:status", { status: "playing", startedAt: room.startedAt, endsAt: room.endsAt, serverNow: now });
  return true;
}

// =====================================================
// REMOVE PLAYER
// =====================================================

function removePlayer(room, playerId) {
  const player = room.players.get(playerId);

  if (!player) return;

  if (player.activeQuiz) {
    clearTimeout(player.activeQuiz.timeout);
    player.activeQuiz = null;
  }

  room.players.delete(playerId);
  room.members.delete(playerId);

  io.to(room.code).emit("player:left", {
    playerId
  });

  broadcastPlayerList(room);
  broadcastLeaderboard(room);
}

function sanitizeAvatar(input = {}) {
  const limits = { skin:5, bottoms:14, shoes:10, top:29, eyes:4, hair:25 };
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
    const hostToken = randomInt(100000, 999999).toString(36) + "-" + Date.now().toString(36);

    const boxIds = [...QUESTION_BOXES.keys()];
    const shuffledPositions = [...QUESTION_BOXES.values()];
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
    }
    const questionBoxes = boxIds.map((id, index) => ({
      id,
      x: shuffledPositions[index].x,
      y: shuffledPositions[index].y
    }));
    const room = {
      code,
      questionBoxes,
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
      usedQuestions: new Set(),
      finishedPlayers: new Set()
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
    room.finishGraceTimer = null;
    room.finishedPlayers.clear();
    for (const player of room.players.values()) {
      player.finished = false;
      player.finishedAt = null;
      player.finishRank = 0;
      player.finishBonus = 0;
      player.usedHazards?.clear();
      player.lastHazardAt = 0;
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
    room.finishedPlayers.clear();
    room.usedQuestions.clear();
    for (const player of room.players.values()) {
      if (player.activeQuiz?.timeout) clearTimeout(player.activeQuiz.timeout);
      player.score = 0;
      player.answeredQuestions = 0;
      player.usedBoxes.clear();
      player.activeQuiz = null;
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
      player.lastHazardAt = 0;
    }
    room.status = "waiting";
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
    const quizSeconds = Number(settings.quizSeconds);
    const gameMinutes = Number(settings.gameMinutes);
    const correctPoints = Number(settings.correctPoints);
    const hazardPenalty = settings.hazardPenalty === undefined ? room.settings.hazardPenalty : Number(settings.hazardPenalty);
    if (![10, 15, 20, 30, 45, 60].includes(quizSeconds) || !Number.isInteger(gameMinutes) || gameMinutes < 1 || gameMinutes > 60 || !Number.isInteger(correctPoints) || correctPoints < 1 || correctPoints > 100 || !Number.isInteger(hazardPenalty) || hazardPenalty < 0 || hazardPenalty > 50) {
      callback({ ok: false, error: "Pengaturan waktu atau poin tidak valid." });
      return;
    }
    room.settings = { ...room.settings, quizSeconds, gameMinutes, correctPoints, hazardPenalty };
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

    const name = String(payload.name || "Player")
      .trim()
      .slice(0, 24);

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
        status: room.status,
        questionBoxes: room.questionBoxes
      });
      socket.emit("room:settings", room.settings);
      socket.emit("room:status", { status: room.status, startedAt: room.startedAt, endsAt: room.endsAt, serverNow: Date.now() });
      return;
    }

    const player = {
      id: socket.id,
      name,
      avatar: sanitizeAvatar(payload.avatar),
      score: 0,
      answeredQuestions: 0,
      activeQuiz: null,
      usedBoxes: new Set(),
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
      finishedAt: null,
      finishBonus: 0,
      finished: false,
      lastHazardAt: 0
    };

    room.members.add(socket.id);
    room.players.set(socket.id, player);

    socket.join(code);

    callback({
      ok: true,
      roomCode: code,
      playerId: socket.id,
      playerName: name,
      status: room.status,
      course: { width: WORLD_WIDTH, height: WORLD_HEIGHT, finishX: FINISH_X, startedAt: room.startedAt, questionBoxes: room.questionBoxes || COURSE.questionBoxes, hazards: COURSE_HAZARDS, slugs: COURSE_SLUGS },
      questionBoxes: room.questionBoxes || COURSE.questionBoxes
    });
    socket.emit("room:status", { status: room.status, startedAt: room.startedAt, endsAt: room.endsAt, serverNow: Date.now() });
    socket.emit("room:question-boxes", room.questionBoxes || COURSE.questionBoxes);
    io.to(room.code).emit("room:question-boxes", room.questionBoxes || COURSE.questionBoxes);

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
    if (!room || room.status !== "playing" || !player || !hazard || player.activeQuiz || player.finished) return;
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
    if (!room || room.status !== "playing" || !player || !slug || player.finished || player.activeQuiz) return;
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

    if (!player || player.activeQuiz || room.status === "ended" || player.finished) return;

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
    if (["idle", "walk-left", "walk-right", "jump-left", "jump-right", "fall-left", "fall-right", "interact"].includes(payload.state)) player.state = payload.state;
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
    const hitHazard = COURSE_HAZARDS.find(h =>
      Math.abs(player.x - h.x) < 19 && Math.abs(player.y - h.y) < 15 &&
      Number(player.vy) >= -80 &&
      Date.now() - (player.lastHazardAt || 0) > 1800
    );
    if (hitHazard) {
      player.hazardHits = (player.hazardHits || 0) + 1;
      player.lastHazardAt = Date.now();
      player.score -= room.settings.hazardPenalty;
      const hazardResult = {
        hazardId: hitHazard.id,
        penalty: room.settings.hazardPenalty,
        totalScore: player.score,
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

    if (!player.finished && player.x >= FINISH_X - 110 && player.x <= FINISH_X + 80) {
      finishPlayer(room, player);
    }
  });

  // =====================================================
  // REQUEST QUIZ
  // =====================================================

  socket.on(
    "quiz:request",
    (payload = {}, callback = () => {}) => {
      const room = getRoom(socket, payload.roomCode);

      if (!room) {
        callback({
          ok: false,
          error: "Room tidak valid."
        });
        return;
      }

      if (room.status !== "playing") {
        callback({ ok: false, error: "Game belum dimulai oleh host." });
        return;
      }

      const player = room.players.get(socket.id);

      if (!player) {
        callback({
          ok: false,
          error: "Pemain tidak ditemukan."
        });
        return;
      }

      if (player.activeQuiz) {
        callback({ ok: false, error: "Selesaikan quiz yang sedang aktif." });
        return;
      }

      if (player.finished) {
        callback({ ok: false, error: "Pemain sudah mencapai finish." });
        return;
      }

      const boxId = String(payload.boxId || "").trim();

      const boxPosition = room.questionBoxes?.find((box) => box.id === boxId) || QUESTION_BOXES.get(boxId);
      if (!boxPosition || (!SAFE_QUESTION_IDS.has(boxId) && !room.questionBoxes?.some((box) => box.id === boxId))) {
        callback({
          ok: false,
          error: "Question Block tidak valid."
        });
        return;
      }

      // Validate reported position against actual box location (server authority).
      if (Math.abs(player.x - boxPosition.x) > 64 || Math.abs(player.y - boxPosition.y) > 80) {
        callback({ ok: false, error: "Pemain terlalu jauh dari Question Block." });
        return;
      }
      if (Math.abs(player.x - boxPosition.x) > 40 || player.y < boxPosition.y - 16 || player.y > boxPosition.y + 72) {
        callback({ ok: false, error: "Question Block hanya aktif saat dipukul dari bawah." });
        return;
      }

      if (player.usedBoxes.has(boxId)) {
        callback({
          ok: false,
          error: "Question Block sudah digunakan."
        });
        return;
      }

      const boxTier = boxPosition.tier || 1;
      // Use exact course tier first so questions grow harder later; prior tiers only refill exhausted tier pools.
      const tierPool = QUESTION_BANK.filter(question => (question.tier || 1) === boxTier);
      const answeredIds = room.usedQuestions;
      const available = tierPool.filter(question => !answeredIds.has(`${player.id}:${question.id}`));
      const questionPool = available.length
        ? available
        : QUESTION_BANK.filter(question => (question.tier || 1) <= boxTier && !answeredIds.has(`${player.id}:${question.id}`));

      if (!questionPool.length) {
        callback({ ok: false, error: "Semua pertanyaan quiz telah dijawab." });
        return;
      }

      const question = questionPool[randomInt(questionPool.length)];

      room.usedQuestions.add(`${player.id}:${question.id}`);
      player.usedBoxes.add(boxId);

      const durationSeconds = room.settings.quizSeconds;
      const session = {
        question,
        boxId,
        selectedAnswer: null,
        finished: false,
        deadline: Date.now() + durationSeconds * 1000,
        pausedRemaining: 0,
        timeout: null
      };

      player.activeQuiz = session;

      session.timeout = setTimeout(() => {
        finishQuiz(room, player, session, true);
      }, durationSeconds * 1000);

      // Soal hanya dikirim ke HP pemain yang menabrak.
      socket.emit(
        "quiz:show",
        publicQuestion(question, durationSeconds, player.answeredQuestions + 1, session.deadline, question.tier, room.settings.correctPoints)
      );
      session.progressHandler = payload => {
        if (payload?.status === "paused") io.to(player.id).emit("quiz:timer-pause", { remainingMs: session.pausedRemaining });
      };

      // TV hanya menerima status quiz.
      io.to(room.code).emit("tv:quiz-status", {
        playerId: player.id,
        playerName: player.name,
        status: "answering"
      });

      callback({
        ok: true
      });
    }
  );

  // =====================================================
  // ANSWER QUIZ
  // =====================================================

  socket.on(
    "quiz:answer",
    (payload = {}, callback = () => {}) => {
      const room = getRoom(socket, payload.roomCode);

      if (!room) {
        callback({
          ok: false,
          error: "Room tidak valid."
        });
        return;
      }

      if (room.status !== "playing") {
        callback({ ok: false, error: "Game belum dimulai oleh host." });
        return;
      }

      const player = room.players.get(socket.id);
      const session = player?.activeQuiz;

      if (!player || !session || session.finished) {
        callback({
          ok: false,
          error: "Tidak ada quiz aktif."
        });
        return;
      }

      if (Date.now() >= session.deadline) {
        finishQuiz(room, player, session, true);
        callback({ ok: true, timedOut: true });
        return;
      }

      const answer = String(payload.answer || "").toUpperCase();

      if (!["A", "B", "C", "D"].includes(answer)) {
        callback({
          ok: false,
          error: "Pilihan jawaban tidak valid."
        });
        return;
      }

      session.selectedAnswer = answer;

      finishQuiz(room, player, session, false);

      callback({
        ok: true
      });
    }
  );

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

      room.members.add(socket.id);
      socket.join(code);

      callback({
        ok: true,
        roomCode: code,
        status: room.status,
        endsAt: room.endsAt,
        settings: room.settings,
        course: { width: WORLD_WIDTH, height: WORLD_HEIGHT, finishX: FINISH_X, startedAt: room.startedAt, questionBoxes: COURSE.questionBoxes, hazards: COURSE_HAZARDS, slugs: COURSE_SLUGS },
        players: publicLeaderboard(room),
        avatars: [...room.players.values()].map(publicPlayerPosition)
      });

      socket.emit("players:state", [...room.players.values()].map(publicPlayerPosition));
      socket.emit("room:settings", room.settings);
      socket.emit("room:status", { status: room.status, endsAt: room.endsAt, serverNow: Date.now() });
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

    for (const room of rooms.values()) {
      if (room.players.has(socket.id)) {
        removePlayer(room, socket.id);
      } else if (room.hostId === socket.id) {
        room.hostId = null;
        room.members.delete(socket.id);
      } else {
        room.members.delete(socket.id);
      }

      if (room.members.size === 0) {
        for (const player of room.players.values()) {
          if (player.activeQuiz) {
            clearTimeout(player.activeQuiz.timeout);
          }
        }

        rooms.delete(room.code);

        console.log(`[ROOM] Deleted ${room.code}`);
      }
    }
  });
});

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
