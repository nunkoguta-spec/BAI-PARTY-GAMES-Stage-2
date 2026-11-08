
import { io } from "socket.io-client";
import { createPhoneGame } from "./phone-game.js";

// =====================================================
// SOCKET.IO
// =====================================================

const socket = io(`http://${location.hostname}:3001`, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  timeout: 10000
});

const startupParams = new URLSearchParams(location.search);
const initialRoomCode = startupParams.get("room") || "";
const initialPlayerName = startupParams.get("name") || "";

const $ = (id) => document.getElementById(id);

// =====================================================
// STATE
// =====================================================

let roomCode = "";
let playerName = "";
let score = 0;

let phoneGame = null;
let phoneScene = null;

const mobileInput = {
  left: false,
  right: false,
  jump: false
};

let quizInterval = null;
let quizDeadline = 0;
let quizActive = false;
let gameStarted = false;
let joiningRoom = false;

// =====================================================
// MESSAGE
// =====================================================

function showMessage(message, isError = false) {
  const element = $("joinMessage");
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#fb7185" : "#fbbf24";
}

// =====================================================
// FULLSCREEN DAN LANDSCAPE
// =====================================================

async function requestGameDisplay() {
  const root = document.documentElement;

  try {
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen({
        navigationUI: "hide"
      });
    }
  } catch (error) {
    console.warn("[DISPLAY] Fullscreen:", error);
  }

  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (error) {
    console.warn("[DISPLAY] Landscape:", error);
  }
}

// =====================================================
// RESIZE PHASER
// =====================================================

function refreshGameSize() {
  window.setTimeout(() => {
    if (!phoneGame) return;

    const container = $("phoneGame");
    if (!container) return;

    if (container.clientWidth < 1 || container.clientHeight < 1) return;
    phoneGame.scale.refresh();
  }, 150);
}

// =====================================================
// MOBILE INPUT
// =====================================================

function setMobileInput(action, pressed) {
  if (!(action in mobileInput)) return;

  mobileInput[action] = pressed;
  if (phoneScene?.mobileInput && phoneScene.mobileInput !== mobileInput) {
    phoneScene.mobileInput[action] = pressed;
  }
}

function releaseAllMobileInput() {
  setMobileInput("left", false);
  setMobileInput("right", false);
  setMobileInput("jump", false);
}

// =====================================================
// ENTER ROOM
// =====================================================

function enterRoom(data) {
  roomCode = data.roomCode;
  gameStarted = data.status === "playing";
  if (phoneScene) phoneScene.gameStarted = true;

  // ID disesuaikan dengan index.html.
  $("displayRoomCode").textContent = roomCode;
  $("displayPlayerName").textContent = playerName.toUpperCase();

  $("joinPanel").classList.add("hidden");
  $("gamePanel").classList.remove("hidden");

  $("playerStatus").textContent = "Menyiapkan game...";

  startPhoneGame();
  refreshGameSize();
}

// =====================================================
// START PHONE GAME
// =====================================================

function startPhoneGame() {
  if (phoneGame) return;

  try {
    phoneGame = createPhoneGame({
      parent: "phoneGame",
      socket,
      roomCode,

      onSceneReady: (scene) => {
        phoneScene = scene;

        // Hubungkan kontrol HP ke Phaser.
        scene.mobileInput = mobileInput;
        scene.gameStarted = true;

        $("playerStatus").textContent = gameStarted
          ? "Game berlangsung."
          : "Menunggu host memulai game.";

        refreshGameSize();

        console.log("[PHONE] Phaser scene siap.");
      },

      onQuizError: (message) => {
        $("playerStatus").textContent = message;
      }
    });
  } catch (error) {
    console.error("[PHONE] Gagal membuat game:", error);

    $("playerStatus").textContent =
      "Game gagal dimulai. Periksa Console.";
  }
}

// =====================================================
// JOIN ROOM
// =====================================================

function joinRoom(code) {
  if (joiningRoom) return;

  if (!code) {
    showMessage("Masukkan kode room.", true);
    return;
  }

  if (!socket.connected) {
    showMessage("Server belum terhubung. Coba lagi.", true);
    return;
  }

  playerName = $("playerName").value.trim() || "Player";

  joiningRoom = true;

  showMessage("Menghubungkan ke room...");

  const joinButton = $("joinButton");
  joinButton.disabled = true;

  socket.emit(
    "room:join",
    {
      roomCode: code,
      name: playerName
    },
    (result) => {
      joiningRoom = false;
      joinButton.disabled = false;

      if (!result?.ok) {
        showMessage(
          result?.error || "Gagal masuk room.",
          true
        );
        return;
      }

      console.log("[PHONE] Berhasil masuk room:", result);

      enterRoom(result);
    }
  );
}

// =====================================================
// JOIN BUTTON
// =====================================================

$("joinButton").addEventListener("click", async () => {
  const code = $("roomCode").value.trim().toUpperCase();

  if (!code) {
    showMessage("Masukkan kode room.", true);
    return;
  }

  await requestGameDisplay();
  joinRoom(code);
});

// =====================================================
// MOBILE CONTROLS
// =====================================================

function setupMobileControls() {
  const controls = [
    ["leftButton", "left"],
    ["rightButton", "right"],
    ["jumpButton", "jump"]
  ];

  for (const [id, action] of controls) {
    const button = $(id);

    if (!button) {
      console.warn(`[CONTROLS] Button tidak ditemukan: ${id}`);
      continue;
    }

    button.style.touchAction = "none";
    button.style.webkitTapHighlightColor = "transparent";
    button.style.userSelect = "none";
    button.style.webkitUserSelect = "none";

    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    if (window.PointerEvent) {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        setMobileInput(action, true);

        try {
          button.setPointerCapture?.(event.pointerId);
        } catch (error) {
          console.warn("[CONTROLS] Pointer capture:", error);
        }
      });

      const release = (event) => {
        event.preventDefault();
        setMobileInput(action, false);
      };

      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);

      button.addEventListener("lostpointercapture", () => {
        setMobileInput(action, false);
      });
    } else {
      button.addEventListener(
        "touchstart",
        (event) => {
          event.preventDefault();
          setMobileInput(action, true);
        },
        { passive: false }
      );

      const releaseTouch = (event) => {
        event.preventDefault();
        setMobileInput(action, false);
      };

      button.addEventListener(
        "touchend",
        releaseTouch,
        { passive: false }
      );

      button.addEventListener(
        "touchcancel",
        releaseTouch,
        { passive: false }
      );

      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        setMobileInput(action, true);
      });

      window.addEventListener("mouseup", () => {
        setMobileInput(action, false);
      });
    }
  }
}

if (initialRoomCode) $("roomCode").value = initialRoomCode.toUpperCase();
if (initialPlayerName) $("playerName").value = initialPlayerName.slice(0, 24);

setupMobileControls();

window.addEventListener("blur", releaseAllMobileInput);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    releaseAllMobileInput();
  }
});

// =====================================================
// QUIZ TIMER
// =====================================================

function stopQuizTimer() {
  if (quizInterval) {
    clearInterval(quizInterval);
    quizInterval = null;
  }
}

function renderTimer() {
  const remaining = Math.max(0, quizDeadline - Date.now());
  const seconds = Math.ceil(remaining / 1000);

  // ID sesuai index.html.
  $("quizTimer").textContent = seconds;

  // Timer bar opsional jika nanti ditambahkan.
  const timerBar = $("timerBar");

  if (timerBar) {
    timerBar.style.width =
      `${Math.max(0, remaining / 15000 * 100)}%`;
  }

  if (remaining <= 0) {
    stopQuizTimer();
  }
}

// =====================================================
// QUIZ RECEIVED FROM SERVER
// =====================================================

socket.on("quiz:show", (question) => {
  stopQuizTimer();

  quizActive = true;
  if (phoneScene) phoneScene.quizPaused = true;
  releaseAllMobileInput();

  $("resultPanel").classList.add("hidden");
  $("quizPanel").classList.remove("hidden");

  $("questionText").textContent = question.question;
  $("quizMessage").textContent = "";
  $("choices").replaceChildren();

  for (const letter of ["A", "B", "C", "D"]) {
    const button = document.createElement("button");
    button.className = "pixel-btn pixel-choice-btn";
    const prefix = document.createElement("span");
    prefix.className = "pixel-choice-badge";
    prefix.textContent = `${letter}`;

    button.append(
      prefix,
      document.createTextNode(` ${question.choices[letter] ?? ""}`)
    );

    button.addEventListener("click", () => {
      if (!quizActive) return;

      quizActive = false;

      for (const choice of $("choices").querySelectorAll("button")) {
        choice.disabled = true;
      }

      button.classList.add("selected");

      $("quizMessage").textContent =
        "Jawaban dikirim ke server...";

      socket.emit(
        "quiz:answer",
        {
          roomCode,
          answer: letter
        },
        (result) => {
          if (!result?.ok) {
            $("quizMessage").textContent =
              result?.error || "Jawaban gagal dikirim.";

            quizActive = true;

            for (const choice of $("choices").querySelectorAll("button")) {
              choice.disabled = false;
            }
          }
        }
      );
    });

    $("choices").append(button);
  }

  const duration = Math.max(1, Number(question.duration) || 15);
  quizDeadline = question.deadline ? Number(question.deadline) : (Date.now() + duration * 1000);
  $("quizPointsValue").textContent = String(question.points || 10);
  $("quizQuestionNumber").textContent = `SOAL #${question.number || 1}`;

  renderTimer();
  quizInterval = setInterval(renderTimer, 100);
});

// =====================================================
// QUIZ RESULT
// =====================================================

let quizAutoCloseTimer = null;
function closeQuizUI() {
  if (quizAutoCloseTimer) {
    clearTimeout(quizAutoCloseTimer);
    quizAutoCloseTimer = null;
  }
  $("quizPanel")?.classList.add("hidden");
  $("resultPanel")?.classList.add("hidden");
  if (phoneScene) {
    phoneScene.quizPaused = false;
    phoneScene.activeQuestionBoxId = null;
  }
  if ($("playerStatus")) {
    $("playerStatus").textContent = "Siap bermain lagi.";
  }
}

socket.on("quiz:result", (result) => {
  quizActive = false;
  stopQuizTimer();

  score = Number(result.totalScore) || 0;
  $("score").textContent = score;

  // Highlight choices with pixel styles
  const choices = $("choices")?.querySelectorAll("button") || [];
  choices.forEach((btn) => {
    const letter = btn.querySelector(".pixel-choice-badge")?.textContent?.trim();
    if (letter === result.correctAnswer) {
      btn.classList.add("pixel-choice-correct");
    } else if (btn.classList.contains("selected") && !result.correct) {
      btn.classList.add("pixel-choice-wrong");
    }
  });

  const quizMessage = $("quizMessage");
  if (quizMessage) {
    if (result.correct) {
      quizMessage.innerHTML = `<span class="pixel-feedback success">★ BENAR! +${result.scoreChange} POIN ★</span>`;
    } else if (result.timedOut) {
      quizMessage.innerHTML = `<span class="pixel-feedback timeout">⏱ WAKTU HABIS! (+0)</span>`;
    } else {
      quizMessage.innerHTML = `<span class="pixel-feedback wrong">✖ SALAH! JAWABAN: ${result.correctAnswer}</span>`;
    }
  }

  $("resultTitle").textContent = result.timedOut
    ? "WAKTU HABIS!"
    : result.correct
      ? "★ BENAR! ★"
      : "✖ SALAH! ✖";

  $("resultDetail").textContent =
    `Jawaban benar: ${result.correctAnswer} | Poin: ${result.scoreChange > 0 ? "+" : ""}${result.scoreChange} | Total: ${result.totalScore}`;

  $("playerStatus").textContent = result.correct ? "Jawaban Benar! +Poin" : "Quiz selesai.";

  if (quizAutoCloseTimer) clearTimeout(quizAutoCloseTimer);
  quizAutoCloseTimer = setTimeout(() => {
    closeQuizUI();
  }, result.correct ? 1400 : 2200);
});

// =====================================================
// CLOSE RESULT
// =====================================================

$("closeResultButton").addEventListener("click", () => {
  closeQuizUI();
});

$("restartGameBtn")?.addEventListener("click", () => {
  $("gameOverPanel")?.classList.add("hidden");
});

// =====================================================
// UPDATE PLAYER LIST AND SCORE
// =====================================================

let playerGameTimerInterval = null;
function updatePlayerGameTimer(endsAt) {
  if (playerGameTimerInterval) clearInterval(playerGameTimerInterval);
  const element = $("displayGameTimer");
  if (!element) return;
  if (!endsAt) {
    element.textContent = "--:--";
    return;
  }
  const tick = () => {
    const remainingMs = Math.max(0, endsAt - Date.now());
    const totalSec = Math.ceil(remainingMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    element.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    if (remainingMs <= 0) {
      clearInterval(playerGameTimerInterval);
      element.textContent = "00:00";
    }
  };
  tick();
  playerGameTimerInterval = setInterval(tick, 1000);
}

const toggleBtn = $("toggleLeaderboardBtn");
const drawer = $("playerLeaderboardDrawer");
if (toggleBtn && drawer) {
  toggleBtn.addEventListener("click", () => {
    drawer.classList.toggle("hidden");
  });
}

function renderPlayerDrawer(players = []) {
  const container = $("playerLeaderboardList");
  const sorted = [...players].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const myIndex = sorted.findIndex(p => p.playerId === socket.id);
  if ($("playerRank")) {
    $("playerRank").textContent = myIndex !== -1 ? `#${myIndex + 1}` : "#-";
  }
  if (!container) return;
  container.replaceChildren();
  sorted.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = `pixel-player-row ${p.playerId === socket.id ? "pixel-row-highlight" : ""}`;
    const rank = document.createElement("span");
    rank.textContent = `${idx === 0 ? "👑 " : ""}${idx + 1}. ${p.name || "Player"}`;
    const pts = document.createElement("span");
    pts.textContent = `${Number(p.score) || 0} PTS`;
    row.append(rank, pts);
    container.appendChild(row);
  });
}

socket.on("game:ended", ({ leaderboard, winner, reason } = {}) => {
  stopQuizTimer();
  updatePlayerGameTimer(null);
  closeQuizUI();
  const modal = $("gameOverPanel");
  if (!modal) return;
  modal.classList.remove("hidden");
  $("winnerBanner").textContent = winner ? `👑 JUARA 1: ${winner.name} (${winner.score} PTS)` : "★ GAME OVER ★";
  const sorted = Array.isArray(leaderboard) ? [...leaderboard].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)) : [];
  if ($("podiumName1")) $("podiumName1").textContent = sorted[0]?.name ? sorted[0].name.slice(0, 8) : "-";
  if ($("podiumScore1")) $("podiumScore1").textContent = sorted[0] ? `${sorted[0].score} PTS` : "-";
  if ($("podiumName2")) $("podiumName2").textContent = sorted[1]?.name ? sorted[1].name.slice(0, 8) : "-";
  if ($("podiumScore2")) $("podiumScore2").textContent = sorted[1] ? `${sorted[1].score} PTS` : "-";
  if ($("podiumName3")) $("podiumName3").textContent = sorted[2]?.name ? sorted[2].name.slice(0, 8) : "-";
  if ($("podiumScore3")) $("podiumScore3").textContent = sorted[2] ? `${sorted[2].score} PTS` : "-";

  const finalContainer = $("finalLeaderboardList");
  if (finalContainer && sorted.length) {
    finalContainer.replaceChildren();
    sorted.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = `pixel-player-row ${p.playerId === socket.id ? "pixel-row-highlight" : ""}`;
      row.textContent = `${idx === 0 ? "👑 " : ""}${idx + 1}. ${p.name} - ${p.score} PTS`;
      finalContainer.appendChild(row);
    });
  }
});

socket.on("player:kicked", ({ reason } = {}) => {
  alert(reason || "Anda telah dikeluarkan dari permainan oleh host.");
  location.reload();
});

socket.on("room:status", ({ status, endsAt, remainingMs } = {}) => {
  gameStarted = status === "playing";
  if (phoneScene) phoneScene.gameStarted = true;
  if (endsAt) updatePlayerGameTimer(endsAt);
  if (status === "paused") {
    if (playerGameTimerInterval) clearInterval(playerGameTimerInterval);
    const sec = Math.ceil((remainingMs || 0) / 1000);
    $("displayGameTimer").textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}P`;
  }
  if ($("playerStatus") && !quizActive) {
    $("playerStatus").textContent = gameStarted
      ? "Game berlangsung."
      : status === "paused"
        ? "Game dijeda oleh host."
        : "Menunggu host memulai game.";
  }
});

socket.on("tv:leaderboard", (players) => {
  if (!Array.isArray(players)) return;
  const ranked = [...players].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const mine = ranked.find(player => player.playerId === socket.id);
  if (mine) {
    score = Number(mine.score) || 0;
    $("score").textContent = score;
  }
});

socket.on("room:players", (players) => {
  if (!Array.isArray(players)) return;
  phoneScene?.setLeaderboardData(players);
  renderPlayerDrawer(players);

  const mine = players.find(
    (player) => player.playerId === socket.id
  );

  if (mine) {
    score = Number(mine.score) || 0;
    $("score").textContent = score;
  }

  if (!quizActive) {
    $("playerStatus").textContent = gameStarted
      ? `${players.length} pemain di room.`
      : "Menunggu host memulai game.";
  }
});

// =====================================================
// SOCKET CONNECTION STATUS
// =====================================================

socket.on("connect", () => {
  $("connection")?.textContent;
  const connection = $("connection");

  if (connection) {
    connection.textContent = "CONNECTED";
    connection.className = "connection online";
  }

  console.log("[CLIENT] Connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  const connection = $("connection");

  if (connection) {
    connection.textContent = "DISCONNECTED";
    connection.className = "connection offline";
  }

  if ($("playerStatus")) {
    $("playerStatus").textContent =
      "Koneksi terputus. Mencoba menyambung kembali...";
  }

  releaseAllMobileInput();

  console.warn("[CLIENT] Disconnected:", reason);
});

socket.on("connect_error", (error) => {
  const connection = $("connection");

  if (connection) {
    connection.textContent = "CONNECTION ERROR";
    connection.className = "connection offline";
  }

  console.error("[CLIENT] Connection error:", error.message);
});

// =====================================================
// DISPLAY RESIZE EVENTS
// =====================================================

window.addEventListener("resize", refreshGameSize);
window.addEventListener("orientationchange", refreshGameSize);

document.addEventListener("fullscreenchange", refreshGameSize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", refreshGameSize);
}

console.log("[CLIENT] Controller berhasil dimuat.");
