
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { randomInt } from "node:crypto";

const app = express();
const httpServer = http.createServer(app);

const PORT = Number(process.env.PORT) || 3001;

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

const rooms = new Map();

const QUESTION_TIME = 15_000;

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
}

// Data publik avatar untuk multiplayer.
function publicPlayerPosition(player) {
  return {
    playerId: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    facing: player.facing
  };
}

function publicQuestion(question) {
  return {
    questionId: question.id,
    question: question.question,
    choices: question.choices,
    duration: QUESTION_TIME / 1000
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
    player.score += 10;
  } else if (!timedOut) {
    player.score -= 5;
  }

  const result = {
    correct,
    timedOut,
    correctAnswer: session.question.answer,
    scoreChange: correct ? 10 : timedOut ? 0 : -5,
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

    const room = {
      code,
      hostId: socket.id,
      members: new Set([socket.id]),
      players: new Map(),
      usedQuestions: new Set()
    };

    rooms.set(code, room);

    socket.join(code);

    callback({
      ok: true,
      roomCode: code,
      hostId: socket.id
    });

    console.log(`[ROOM] Created ${code}`);
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
        playerId: socket.id
      });
      return;
    }

    const player = {
      id: socket.id,
      name,
      score: 0,
      answeredQuestions: 0,
      activeQuiz: null,
      usedBoxes: new Set(),
      x: 240,
      y: 208,
      facing: "right"
    };

    room.members.add(socket.id);
    room.players.set(socket.id, player);

    socket.join(code);

    callback({
      ok: true,
      roomCode: code,
      playerId: socket.id,
      playerName: name
    });

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

    if (!player) return;

    const x = Number(payload.x);
    const y = Number(payload.y);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      player.x = Math.max(0, Math.min(100000, x));
      player.y = Math.max(0, Math.min(100000, y));
    }

    if (
      payload.facing === "left" ||
      payload.facing === "right"
    ) {
      player.facing = payload.facing;
    }

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

      const player = room.players.get(socket.id);

      if (!player) {
        callback({
          ok: false,
          error: "Pemain tidak ditemukan."
        });
        return;
      }

      const boxId = String(payload.boxId || "").trim();

      if (!boxId) {
        callback({
          ok: false,
          error: "Question Block tidak valid."
        });
        return;
      }

      if (player.activeQuiz) {
        callback({
          ok: false,
          error: "Selesaikan quiz yang sedang aktif."
        });
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

      const session = {
        question,
        boxId,
        selectedAnswer: null,
        finished: false,
        timeout: null
      };

      player.activeQuiz = session;

      session.timeout = setTimeout(() => {
        finishQuiz(room, player, session, true);
      }, QUESTION_TIME);

      // Soal hanya dikirim ke HP pemain yang menabrak.
      socket.emit(
        "quiz:show",
        publicQuestion(question)
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

      room.members.add(socket.id);
      socket.join(code);

      callback({
        ok: true,
        roomCode: code,
        players: publicLeaderboard(room)
      });

      broadcastPlayerList(room);
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
