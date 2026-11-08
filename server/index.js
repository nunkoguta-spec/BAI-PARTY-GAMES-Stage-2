
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { randomInt } from "node:crypto";

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

const DEFAULT_SETTINGS = Object.freeze({ quizSeconds: 15, gameMinutes: 10, correctPoints: 10, questionLimit: 0 });
const QUESTION_BOXES = new Map([
  ["question-box-01", { x: 360, y: 176 }],
  ["question-box-02", { x: 800, y: 176 }],
  ["question-box-03", { x: 1300, y: 176 }],
  ["question-box-04", { x: 1800, y: 144 }],
  ["question-box-05", { x: 2400, y: 176 }],
  ["question-box-06", { x: 2900, y: 144 }],
  ["question-box-07", { x: 3400, y: 176 }]
]);

const QUESTION_BANK = [
  {
    id: "de-001",
    question: "Was bedeutet „Guten Morgen“?",
    choices: {
      A: "Selamat malam",
      B: "Selamat pagi",
      C: "Selamat tinggal",
      D: "Terima kasih"
    },
    answer: "B"
  },
  {
    id: "de-002",
    question: "Wie sagt man „Terima kasih“ auf Deutsch?",
    choices: {
      A: "Bitte",
      B: "Entschuldigung",
      C: "Danke",
      D: "Hallo"
    },
    answer: "C"
  },
  {
    id: "de-003",
    question: "Was bedeutet „Buch“?",
    choices: {
      A: "Buku",
      B: "Meja",
      C: "Kursi",
      D: "Pintu"
    },
    answer: "A"
  },
  {
    id: "de-004",
    question: "Wie sagt man „Saya makan“ auf Deutsch?",
    choices: {
      A: "Ich trinke",
      B: "Ich schlafe",
      C: "Ich esse",
      D: "Ich spiele"
    },
    answer: "C"
  },
  {
    id: "de-005",
    question: "Was ist die richtige Übersetzung für „Hund“?",
    choices: {
      A: "Kucing",
      B: "Burung",
      C: "Ikan",
      D: "Anjing"
    },
    answer: "D"
  }
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
      answeredQuestions: player.answeredQuestions
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
    x: player.x,
    y: player.y,
    facing: player.facing,
    vx: player.vx || 0,
    vy: player.vy || 0,
    state: player.state || "idle",
    grounded: player.grounded !== false
  };
}

function publicQuestion(question, durationSeconds, questionNumber, deadline) {
  return {
    questionId: question.id,
    number: questionNumber,
    question: question.question,
    choices: question.choices,
    points: 10,
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

  if (correct) {
    player.score += room.settings.correctPoints;
  } else if (!timedOut) {
    player.score -= 5;
  }

  const result = {
    correct,
    timedOut,
    correctAnswer: session.question.answer,
    scoreChange: correct ? room.settings.correctPoints : timedOut ? 0 : -5,
    totalScore: player.score
  };

  // Hasil quiz hanya untuk HP pemain tersebut.
  io.to(player.id).emit("quiz:result", result);

  // TV hanya menerima status, tidak menerima soal/jawaban.
  io.to(room.code).emit("tv:quiz-status", {
    playerId: player.id,
    playerName: player.name,
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
  room.status = "ended";
  for (const player of room.players.values()) {
    if (player.activeQuiz) finishQuiz(room, player, player.activeQuiz, true);
  }
  const leaderboard = publicLeaderboard(room);
  io.to(room.code).emit("room:status", { status: "ended", reason, leaderboard, winner: leaderboard[0] || null });
  io.to(room.code).emit("game:ended", { reason, leaderboard, winner: leaderboard[0] || null });
}

function pauseGame(room) {
  if (room.status !== "playing") return false;
  room.pausedRemaining = Math.max(0, room.endsAt - Date.now());
  clearTimeout(room.gameTimer);
  room.status = "paused";
  io.to(room.code).emit("room:status", { status: "paused", remainingMs: room.pausedRemaining });
  return true;
}

function resumeGame(room) {
  if (room.status !== "paused") return false;
  room.status = "playing";
  room.endsAt = Date.now() + room.pausedRemaining;
  room.gameTimer = setTimeout(() => endGame(room, "timeout"), room.pausedRemaining);
  io.to(room.code).emit("room:status", { status: "playing", endsAt: room.endsAt });
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
      pausedRemaining: 0,
      usedQuestions: new Set()
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
    if (room.status === "ended") {
      callback({ ok: false, error: "Game sudah selesai. Buat room baru untuk bermain lagi." });
      return;
    }
    room.status = "playing";
    room.endsAt = Date.now() + room.settings.gameMinutes * 60_000;
    room.gameTimer = setTimeout(() => endGame(room, "timeout"), room.settings.gameMinutes * 60_000);
    io.to(room.code).emit("room:settings", room.settings);
    io.to(room.code).emit("room:status", { status: room.status, endsAt: room.endsAt, serverNow: Date.now() });
    callback({ ok: true, status: room.status, endsAt: room.endsAt, serverNow: Date.now() });
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
    if (![10, 15, 20, 30, 45, 60].includes(quizSeconds) || !Number.isInteger(gameMinutes) || gameMinutes < 1 || gameMinutes > 60 || !Number.isInteger(correctPoints) || correctPoints < 1 || correctPoints > 100) {
      callback({ ok: false, error: "Pengaturan waktu atau poin tidak valid." });
      return;
    }
    room.settings = { ...room.settings, quizSeconds, gameMinutes, correctPoints };
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
      socket.emit("room:status", { status: room.status });
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
      x: 240,
      y: 208,
      facing: "right",
      vx: 0,
      vy: 0,
      state: "idle",
      grounded: true
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
      questionBoxes: room.questionBoxes
    });
    socket.emit("room:status", { status: room.status });
    socket.emit("room:question-boxes", room.questionBoxes);
    io.to(room.code).emit("room:question-boxes", room.questionBoxes);

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

  socket.on("player:move", (payload = {}) => {
    const room = getRoom(socket, payload.roomCode);

    if (!room) return;

    const player = room.players.get(socket.id);

    if (!player || player.activeQuiz) return;

    const x = Number(payload.x);
    const y = Number(payload.y);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      const distance = Math.hypot(x - player.x, y - player.y);
      const elapsed = Math.max(16, Date.now() - (player.lastMoveAt || Date.now() - 100));
      if (distance > Math.max(70, 0.28 * elapsed + 45)) return;
      player.x = Math.max(0, Math.min(3840, x));
      player.y = Math.max(0, Math.min(384, y));
      player.lastMoveAt = Date.now();
    }

    if (payload.facing === "left" || payload.facing === "right") player.facing = payload.facing;
    if ([-1, 0, 1].includes(Math.sign(Number(payload.vx)))) player.vx = Math.max(-500, Math.min(500, Number(payload.vx) || 0));
    if (Number.isFinite(Number(payload.vy))) player.vy = Math.max(-700, Math.min(700, Number(payload.vy)));
    if (["idle", "walk-left", "walk-right", "jump-left", "jump-right", "fall-left", "fall-right", "interact"].includes(payload.state)) player.state = payload.state;
    if (typeof payload.grounded === "boolean") player.grounded = payload.grounded;

    const movementData = publicPlayerPosition(player);

    // HP pemain lain.
    socket.to(room.code).emit(
      "player:moved",
      movementData
    );

    // TV Live Spectator.
    socket.to(room.code).emit(
      "tv:player-move",
      movementData
    );
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

      const boxId = String(payload.boxId || "").trim();

      const boxPosition = room.questionBoxes?.find((box) => box.id === boxId);
      if (!boxPosition) {
        callback({
          ok: false,
          error: "Question Block tidak valid."
        });
        return;
      }

      // Validate reported position against actual box location (server authority).
      if (Math.abs(player.x - boxPosition.x) > 64 || Math.abs(player.y - boxPosition.y) > 64) {
        callback({ ok: false, error: "Pemain terlalu jauh dari Question Block." });
        return;
      }

      if (player.usedBoxes.has(boxId)) {
        callback({
          ok: false,
          error: "Question Block sudah digunakan."
        });
        return;
      }

      const available = QUESTION_BANK.filter(
        (question) =>
          !room.usedQuestions.has(
            `${player.id}:${question.id}`
          )
      );

      if (available.length === 0) {
        callback({
          ok: false,
          error: "Quiz untuk pemain ini sudah habis."
        });
        return;
      }

      const question = available[randomInt(available.length)];

      room.usedQuestions.add(`${player.id}:${question.id}`);
      player.usedBoxes.add(boxId);

      const durationSeconds = room.settings.quizSeconds;
      const session = {
        question,
        boxId,
        selectedAnswer: null,
        finished: false,
        deadline: Date.now() + durationSeconds * 1000,
        timeout: null
      };

      player.activeQuiz = session;

      session.timeout = setTimeout(() => {
        finishQuiz(room, player, session, true);
      }, durationSeconds * 1000);

      // Soal hanya dikirim ke HP pemain yang menabrak.
      socket.emit(
        "quiz:show",
        publicQuestion(question, durationSeconds, player.answeredQuestions + 1, session.deadline)
      );

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
        players: publicLeaderboard(room),
        avatars: [...room.players.values()].map(publicPlayerPosition)
      });

      socket.emit("players:state", [...room.players.values()].map(publicPlayerPosition));
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
