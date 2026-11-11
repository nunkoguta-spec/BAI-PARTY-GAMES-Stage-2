
import { io } from "socket.io-client";
import { createPhoneGame } from "./phone-game.js";
import { retroAudio } from "../src/audio/retroAudio.js";

// =====================================================
// SOCKET.IO
// =====================================================

const serverUrl = import.meta.env.VITE_SERVER_URL || `${location.protocol === "https:" ? "https:" : "http:"}//${location.hostname}:3001`;
const socket = io(serverUrl, {
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
const AVATAR_DEFAULT = { skin:0, bottoms:0, shoes:0, top:0, eyes:0, hair:0 };
const AVATAR_LIMITS = { skin:5, bottoms:14, shoes:10, top:29, eyes:4, hair:25 };
let avatarSelection = { ...AVATAR_DEFAULT };
try {
  const saved = JSON.parse(localStorage.getItem("bai-avatar") || "{}");
  for (const [key, limit] of Object.entries(AVATAR_LIMITS)) {
    const value = Number(saved[key]);
    if (Number.isInteger(value) && value >= 0 && value < limit) avatarSelection[key] = value;
  }
} catch {}
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
let currentCourse = null;
let joiningRoom = false;


const AVATAR_PREVIEW_PARTS = [
  ["skin", "/assets/avatar/Idle/Character/Character_Idle_Front-Sheet.png"],
  ["bottoms", "/assets/avatar/Idle/Clothing/Clothing_Bottoms_Idle_Front-Sheet.png"],
  ["shoes", "/assets/avatar/Idle/Clothing/Clothing_Shoes_Idle_Front-Sheet.png"],
  ["top", "/assets/avatar/Idle/Clothing/Clothing_Tops_Idle_Front-Sheet.png"],
  ["eyes", "/assets/avatar/Idle/Eyes/Eyes_Idle_Front-Sheet.png"],
  ["hair", "/assets/avatar/Idle/Hair/Hair_Idle_Front-Sheet.png"]
];
const avatarPreviewImages = new Map();
function renderAvatarPreview() {
  const canvas = $("avatarPreview");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (const [key] of AVATAR_PREVIEW_PARTS) {
    const image = avatarPreviewImages.get(key);
    if (!image?.complete || !image.naturalWidth) continue;
    const row = Math.max(0, Math.min(AVATAR_LIMITS[key] - 1, Number(avatarSelection[key]) || 0));
    ctx.drawImage(image, 0, row * 32, 32, 32, 16, 8, 64, 64);
  }
}
function setupAvatarCustomizer() {
  const saveBtn = document.getElementById("avatarSaveButton");
  if (saveBtn) saveBtn.addEventListener("click", () => { saveBtn.textContent = "TERSIMPAN ✓"; setTimeout(() => { saveBtn.textContent = "SIMPAN"; }, 1200); });
  const ids = { skin:"avatarSkin", bottoms:"avatarBottoms", shoes:"avatarShoes", top:"avatarTop", eyes:"avatarEyes", hair:"avatarHair" };
  const categories = [
    { key:"skin", label:"Wajah", title:"WAJAH", icon:"face" },
    { key:"eyes", label:"Mata", title:"MATA", icon:"eyes" },
    { key:"hair", label:"Rambut", title:"RAMBUT", icon:"hair" },
    { key:"top", label:"Baju", title:"ATASAN", icon:"top" },
    { key:"bottoms", label:"Celana", title:"BAWAHAN", icon:"bottoms" },
    { key:"shoes", label:"Sepatu", title:"SEPATU", icon:"shoes" }
  ];
  let activeCategory = "skin";
  const rail = $("avatarCategoryRail");
  const grid = $("avatarItemGrid");
  const title = $("avatarCategoryTitle");

  for (const [key, id] of Object.entries(ids)) {
    const select = $(id);
    if (!select) continue;
    select.replaceChildren();
    for (let i = 0; i < AVATAR_LIMITS[key]; i++) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `${key === "skin" ? "Tone" : "Style"} ${i + 1}`;
      select.append(option);
    }
    select.value = String(avatarSelection[key]);
    select.addEventListener("change", () => {
      avatarSelection[key] = Number(select.value);
      persistAvatarSelection();
      renderAvatarPreview();
      phoneScene?.applyAvatarSelection?.({ ...avatarSelection });
      renderAvatarItemGrid();
    });
  }

  for (const [key, src] of AVATAR_PREVIEW_PARTS) {
    const image = new Image();
    image.onload = () => {
      renderAvatarPreview();
      renderAvatarItemGrid();
    };
    image.onerror = () => console.warn(`[AVATAR] Preview asset gagal dimuat: ${src}`);
    image.src = src;
    avatarPreviewImages.set(key, image);
  }

  function persistAvatarSelection() {
    try { localStorage.setItem("bai-avatar", JSON.stringify(avatarSelection)); } catch {}
  }

  function renderAvatarItemGrid() {
    if (!grid) return;
    const category = categories.find((item) => item.key === activeCategory) || categories[0];
    if (title) title.textContent = category.title;
    grid.replaceChildren();
    const image = avatarPreviewImages.get(activeCategory);
    for (let i = 0; i < AVATAR_LIMITS[activeCategory]; i++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `avatar-item${Number(avatarSelection[activeCategory]) === i ? " selected" : ""}`;
      button.setAttribute("aria-label", `${category.label} style ${i + 1}`);
      button.setAttribute("aria-pressed", String(Number(avatarSelection[activeCategory]) === i));
      const thumb = document.createElement("canvas");
      thumb.width = 32;
      thumb.height = 32;
      thumb.className = "avatar-item-thumb";
      const context = thumb.getContext("2d");
      if (context && image?.complete && image.naturalWidth) {
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, i * 32, 32, 32, 0, 0, 32, 32);
      }
      const number = document.createElement("span");
      number.className = "avatar-item-number";
      number.textContent = String(i + 1).padStart(2, "0");
      button.append(thumb, number);
      if (Number(avatarSelection[activeCategory]) === i) {
        const check = document.createElement("span");
        check.className = "avatar-item-check";
        check.textContent = "✓";
        button.append(check);
      }
      button.addEventListener("click", () => {
        avatarSelection[activeCategory] = i;
        const select = $(ids[activeCategory]);
        if (select) select.value = String(i);
        persistAvatarSelection();
        renderAvatarPreview();
        renderAvatarItemGrid();
        phoneScene?.applyAvatarSelection?.({ ...avatarSelection });
      });
      grid.append(button);
    }
  }

  if (rail) {
    rail.replaceChildren();
    for (const category of categories) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `avatar-category${category.key === activeCategory ? " active" : ""}`;
      button.innerHTML = `<img src="/assets/ui/icon-${category.icon}.png" alt="" aria-hidden="true"><small>${category.label}</small>`;
      button.setAttribute("aria-pressed", String(category.key === activeCategory));
      button.addEventListener("click", () => {
        activeCategory = category.key;
        rail.querySelectorAll(".avatar-category").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        renderAvatarItemGrid();
      });
      rail.append(button);
    }
  }

  renderAvatarPreview();
  renderAvatarItemGrid();
}
setupAvatarCustomizer();

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
  retroAudio.unlock();

  // Chromium/Android fullscreen uses gesture; iOS uses standalone/status-bar + viewport CSS fallback.
  try {
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: "hide" });
    } else if (root.webkitRequestFullscreen && !document.webkitFullscreenElement) {
      root.webkitRequestFullscreen();
    } else if (root.webkitEnterFullscreen && !document.webkitFullscreenElement) {
      root.webkitEnterFullscreen();
    }
  } catch (error) {
    console.info("[DISPLAY] Browser fullscreen fallback:", error?.message || error);
  }

  // iOS Safari generally does not support orientation.lock; keep responsive
  // portrait/landscape layouts instead of forcing a broken pseudo-fullscreen.
  try {
    if (screen.orientation?.lock && matchMedia("(max-width: 900px)").matches) {
      await screen.orientation.lock("landscape");
    }
  } catch (error) {
    console.info("[DISPLAY] Orientation lock unavailable; responsive layout active.");
  }
}

// =====================================================
// RESIZE PHASER
// =====================================================

function refreshGameSize() {
  window.setTimeout(() => {
    if (!phoneGame) return;

    const container = $("phoneGame");
    const gamePanel = $("gamePanel");
    if (!container || !gamePanel || !gamePanel.isConnected) return;

    if (container.clientWidth < 1 || container.clientHeight < 1) return;
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.floor(viewport?.width || window.innerWidth));
    const viewportHeight = viewport?.height || window.innerHeight;
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    const targetHeight = landscape
      ? Math.max(150, Math.min(container.clientWidth * 9 / 16, viewportHeight - 112))
      : Math.max(180, Math.min(container.clientWidth * 9 / 16, viewportHeight * 0.46));
    container.style.height = `${Math.floor(targetHeight)}px`;
    container.style.minHeight = `${Math.floor(targetHeight)}px`;
    gamePanel.style.setProperty("--viewport-width", `${width}px`);
    gamePanel.style.setProperty("--viewport-height", `${Math.floor(viewportHeight)}px`);
    phoneGame.scale.resize(container.clientWidth, Math.floor(targetHeight));
    phoneGame.scale.refresh();
  }, 100);
}

// =====================================================
// MOBILE INPUT
// =====================================================

function setMobileInput(action, pressed) {
  if (!(action in mobileInput)) return;

  mobileInput[action] = pressed;
  if (action === "jump" && pressed) {
    retroAudio.playJump();
  }
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
  currentCourse = data.course || null;
  if (currentCourse && phoneScene?.applyCourse) phoneScene.applyCourse(currentCourse);
  if (phoneScene) {
    phoneScene.gameStarted = true;
    if (currentCourse?.startedAt) phoneScene.gameStartedAt = currentCourse.startedAt;
  }

  retroAudio.unlock();
  retroAudio.startBGM();

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
      avatar: { ...avatarSelection },
      questionBoxPositions: window.__roomQuestionBoxes || null,

      onSceneReady: (scene) => {
        phoneScene = scene;

        // Hubungkan kontrol HP ke Phaser.
        scene.mobileInput = mobileInput;
        scene.gameStarted = true;
        if (currentCourse && scene.applyCourse) scene.applyCourse(currentCourse);

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
      name: playerName,
      avatar: { ...avatarSelection }
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

      window.__roomQuestionBoxes = result.questionBoxes || null;
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
window.addEventListener("resize", refreshGameSize, { passive: true });
window.addEventListener("orientationchange", () => window.setTimeout(refreshGameSize, 250), { passive: true });
window.visualViewport?.addEventListener("resize", refreshGameSize, { passive: true });

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

socket.on("quiz:timer-pause", ({ remainingMs } = {}) => {
  if (!quizActive) return;
  quizDeadline = Date.now() + Math.max(0, Number(remainingMs) || 0);
  stopQuizTimer();
  renderTimer();
  $("quizMessage").textContent = "Waktu kuis dijeda oleh host.";
});

socket.on("quiz:timer-resume", ({ deadline, serverNow } = {}) => {
  if (!quizActive) return;
  quizDeadline = Number(deadline) || Date.now();
  if (serverNow) quizDeadline += Date.now() - Number(serverNow);
  stopQuizTimer();
  renderTimer();
  quizInterval = setInterval(renderTimer, 100);
  $("quizMessage").textContent = "Waktu kuis berjalan kembali.";
});

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

  if (result.correct) {
    retroAudio.playCorrect();
  } else {
    retroAudio.playWrong();
  }

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
  phoneScene?.finishOverlay?.overlay?.setVisible(false);
  phoneScene?.finishOverlay?.panel?.setVisible(false);
});

function showFinalResults(leaderboard = [], winner = null, reason = "selesai") {
  updatePlayerGameTimer(null);
  const gameOver = $("gameOverPanel");
  if (!gameOver) return;
  gameOver.classList.remove("hidden");
  if (winner && $("winnerBanner")) {
    const reasonLabel = reason === "timeout" ? "WAKTU HABIS" : "SESI SELESAI";
    $("winnerBanner").textContent = `🏁 ${reasonLabel} · JUARA: ${winner.name} · ${winner.score} POIN`;
  }
  const rows = $("finalLeaderboardList");
  const sorted = [...leaderboard].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  if (rows) {
    rows.replaceChildren();
    sorted.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = `pixel-player-row ${index === 0 ? "pixel-row-highlight" : ""}`;
      const finishInfo = entry.finishedAt ? ` · FINISH +${entry.finishBonus || 0}` : " · BELUM FINISH";
      row.textContent = `${index + 1}. ${entry.name} — ${entry.score} POIN${finishInfo}`;
      rows.appendChild(row);
    });
  }
}

$("audioToggleBtn")?.addEventListener("click", () => {
  retroAudio.unlock();
  if (!retroAudio.isPlaying) retroAudio.startBGM();
  const muted = retroAudio.toggleMute();
  const btn = $("audioToggleBtn");
  if (btn) btn.textContent = muted ? "🔈" : "🔊";
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
    const finishTag = p.finishedAt ? " 🏁" : "";
    rank.textContent = `${idx === 0 ? "👑 " : ""}${idx + 1}. ${p.name || "Player"}${finishTag}`;
    const pts = document.createElement("span");
    pts.textContent = `${Number(p.score) || 0} PTS`;
    row.append(rank, pts);
    container.appendChild(row);
  });
}

socket.on("hazard:hit", (result) => {
  if (!result) return;
  score = Number(result.totalScore) || 0;
  $("score").textContent = score;
  $("playerStatus").textContent = `RINTANGAN! -${result.penalty} POIN`;
  retroAudio.playWrong();
  if (phoneScene) phoneScene.handleAuthoritativeHazardHit(result);
  window.setTimeout(() => {
    if (!quizActive && gameStarted && $("playerStatus").textContent.startsWith("RINTANGAN!")) {
      $("playerStatus").textContent = "Game berlangsung.";
    }
  }, 1500);
});

socket.on("player:finished", (result) => {
  if (!result) return;
  if (result.playerId !== socket.id) {
    phoneScene?.updateRemoteAvatar({ ...result, state: "idle", finished: true });
    return;
  }
  score = Number(result.score) || score;
  $("score").textContent = score;
  $("playerStatus").textContent = `FINISH #${result.rank} · BONUS +${result.finishBonus}`;
  phoneScene?.handleAuthoritativeFinish(result);
  retroAudio.playCorrect();
});

socket.on("hazard:score", ({ playerId, score: nextScore } = {}) => {
  if (playerId !== socket.id) return;
  score = Number(nextScore) || 0;
  $("score").textContent = score;
});

socket.on("tv:player-finished", (result) => {
  if (!result || result.playerId === socket.id) return;
  if (phoneScene) phoneScene.updateRemoteAvatar({ ...result, state: "idle" });
});

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

socket.on("player:reset", ({ x, y, score: resetScore } = {}) => {
  quizActive = false;
  if (phoneScene) {
    phoneScene.finished = false;
    phoneScene.finishRequestSent = false;
    phoneScene.physics?.world?.resume?.();
    phoneScene.player?.setPosition(Number(x) || 240, Number(y) || 208);
    phoneScene.player?.body?.reset(Number(x) || 240, Number(y) || 208);
    phoneScene.syncAvatarLayers?.();
  }
  if (Number.isFinite(Number(resetScore))) {
    score = Number(resetScore);
    $("score").textContent = score;
  }
  $("gameOverPanel")?.classList.add("hidden");
  $("playerStatus").textContent = "Room diatur ulang. Menunggu host memulai.";
});

socket.on("player:kicked", ({ reason } = {}) => {
  alert(reason || "Anda telah dikeluarkan dari permainan oleh host.");
  location.reload();
});

socket.on("room:status", ({ status, endsAt, startedAt, remainingMs, leaderboard, winner, reason } = {}) => {
  gameStarted = status === "playing";
  if (phoneScene) {
    phoneScene.gameStarted = true;
    if (startedAt) phoneScene.gameStartedAt = startedAt;
    if (status === "ended") phoneScene.finished = true;
  }
  if (status === "ended") {
    const gameOver = $("gameOverPanel");
    gameOver?.classList.remove("hidden");
    if (winner && $("winnerBanner")) $("winnerBanner").textContent = `🏁 SELESAI · JUARA: ${winner.name} · ${winner.score} POIN`;
    const rows = $("finalLeaderboardList");
    if (rows && Array.isArray(leaderboard)) {
      rows.replaceChildren();
      leaderboard.forEach((entry, index) => {
        const row = document.createElement("div");
        row.className = `pixel-player-row ${index === 0 ? "pixel-row-highlight" : ""}`;
        row.textContent = `${index + 1}. ${entry.name} — ${entry.score} POIN${entry.finishedAt ? " · FINISH" : ""}`;
        rows.appendChild(row);
      });
    }
  }
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

window.addEventListener("resize", refreshGameSize, { passive: true });
window.addEventListener("orientationchange", refreshGameSize, { passive: true });
window.addEventListener("pageshow", refreshGameSize, { passive: true });
window.addEventListener("visualViewport:resize", refreshGameSize, { passive: true });
window.addEventListener("visualViewport:scroll", refreshGameSize, { passive: true });

document.addEventListener("fullscreenchange", refreshGameSize);
document.addEventListener("webkitfullscreenchange", refreshGameSize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", refreshGameSize, { passive: true });
  window.visualViewport.addEventListener("scroll", refreshGameSize, { passive: true });
}

console.log("[CLIENT] Controller berhasil dimuat.");
