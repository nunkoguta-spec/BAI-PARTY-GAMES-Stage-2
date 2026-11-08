
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

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    phoneGame.scale.resize(width, height);
    phoneGame.scale.refresh();
  }, 150);
}

// =====================================================
// MOBILE INPUT
// =====================================================

function setMobileInput(action, pressed) {
  if (!(action in mobileInput)) return;

  mobileInput[action] = pressed;

  if (phoneScene?.mobileInput) {
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

        $("playerStatus").textContent =
          "Game siap! Ayo mulai bermain.";

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
  releaseAllMobileInput();

  $("resultPanel").classList.add("hidden");
  $("quizPanel").classList.remove("hidden");

  $("questionText").textContent = question.question;
  $("quizMessage").textContent = "";
  $("choices").replaceChildren();

  for (const letter of ["A", "B", "C", "D"]) {
    const button = document.createElement("button");

    button.className = "choice";

    const prefix = document.createElement("span");
    prefix.textContent = `${letter}.`;

    button.append(
      prefix,
      document.createTextNode(question.choices[letter] ?? "")
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

  const duration = Math.max(
    1,
    Number(question.duration) || 15
  );

  quizDeadline = Date.now() + duration * 1000;

  renderTimer();
  quizInterval = setInterval(renderTimer, 100);
});

// =====================================================
// QUIZ RESULT
// =====================================================

socket.on("quiz:result", (result) => {
  quizActive = false;
  stopQuizTimer();

  score = Number(result.totalScore) || 0;
  $("score").textContent = score;

  $("quizPanel").classList.add("hidden");
  $("resultPanel").classList.remove("hidden");

  $("resultTitle").textContent = result.timedOut
    ? "WAKTU HABIS!"
    : result.correct
      ? "RICHTIG! BENAR!"
      : "FALSCH! SALAH!";

  $("resultDetail").textContent =
    `Jawaban benar: ${result.correctAnswer} | ` +
    `Perubahan skor: ${
      result.scoreChange > 0 ? "+" : ""
    }${result.scoreChange} | ` +
    `Total skor: ${result.totalScore}`;

  $("playerStatus").textContent = "Quiz selesai.";
});

// =====================================================
// CLOSE RESULT
// =====================================================

$("closeResultButton").addEventListener("click", () => {
  $("resultPanel").classList.add("hidden");
  $("playerStatus").textContent = "Siap bermain lagi.";
});

// =====================================================
// UPDATE PLAYER LIST AND SCORE
// =====================================================

socket.on("room:players", (players) => {
  if (!Array.isArray(players)) return;

  const mine = players.find(
    (player) => player.playerId === socket.id
  );

  if (mine) {
    score = Number(mine.score) || 0;
    $("score").textContent = score;
  }

  if (!quizActive) {
    $("playerStatus").textContent =
      `${players.length} pemain di room.`;
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
