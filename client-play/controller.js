
import { io } from "socket.io-client";
import { createPhoneGame } from "./phone-game.js";
import { retroAudio } from "../src/audio/retroAudio.js";
import { QUEST } from "../src/game/quests.js";

// =====================================================
// SOCKET.IO
// =====================================================

const serverUrl = import.meta.env.VITE_SERVER_URL
  || (location.port === "3001" ? location.origin : "");
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
const AVATAR_DEFAULT = { skin:0, bottoms:0, shoes:0, top:0, eyes:0, hair:0, glasses:0, hat:0, weapon:0 };
// glasses / hat / weapon rows come from public/assets/avatar-gear (row 0 = nothing equipped).
const AVATAR_LIMITS = { skin:5, bottoms:64, shoes:10, top:79, eyes:4, hair:25, glasses:82, hat:81, weapon:91 };
const GEAR_CATEGORIES = new Set(["glasses", "hat", "weapon"]);
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
  jump: false,
  attack: false
};

let quizInterval = null;
let quizDeadline = 0;
let quizActive = false;
let gameStarted = false;
let currentCourse = null;
let joiningRoom = false;


// =====================================================
// AVATAR PREVIEW & VISUAL CUSTOMIZER
// =====================================================

const AVATAR_PREVIEW_PARTS = [
  ["skin", "/assets/avatar/Idle/Character/Character_Idle_Front-Sheet.png"],
  ["bottoms", "/assets/avatar/Idle/Clothing/Clothing_Bottoms_Idle_Front-Sheet.png"],
  ["shoes", "/assets/avatar/Idle/Clothing/Clothing_Shoes_Idle_Front-Sheet.png"],
  ["top", "/assets/avatar/Idle/Clothing/Clothing_Tops_Idle_Front-Sheet.png"],
  ["eyes", "/assets/avatar/Idle/Eyes/Eyes_Idle_Front-Sheet.png"],
  ["hair", "/assets/avatar/Idle/Hair/Hair_Idle_Front-Sheet.png"],
  ["glasses", "/assets/avatar-gear/Glasses/Idle/Glasses_Idle_Front-Sheet.png"],
  ["hat", "/assets/avatar-gear/Hat/Idle/Hat_Idle_Front-Sheet.png"],
  ["weapon", "/assets/avatar-gear/Weapon/Idle/Weapon_Idle_Front-Sheet.png"]
];

const CATEGORY_NAMES = {
  skin: "Warna Kulit / Wajah",
  hair: "Gaya Rambut",
  top: "Baju / Pakaian · 79 pilihan",
  bottoms: "Celana · 64 pilihan",
  shoes: "Sepatu",
  eyes: "Bentuk Mata",
  hat: "Topi / Headwear",
  glasses: "Kacamata",
  weapon: "Senjata"
};

let activeCategory = "skin";
const avatarPreviewImages = new Map();

function renderAvatarPreview() {
  const canvas = $("avatarPreview");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  // Every avatar sheet (body, eyes, hair, clothing, gear) uses the same native
  // 32x32 frame grid, so each layer is drawn 1:1 with no extra offset or crop.
  for (const [key] of AVATAR_PREVIEW_PARTS) {
    const image = avatarPreviewImages.get(key);
    if (!image?.complete || !image.naturalWidth) continue;
    const row = Math.max(0, Math.min(
      AVATAR_LIMITS[key] - 1, Number(avatarSelection[key]) || 0
    ));
    ctx.drawImage(image, 0, row * 32, 32, 32, 0, 0, canvas.width, canvas.height);
  }
}

// Zoomed source window [x, y, w, h] per category inside the native 32x32 frame.
const TILE_CROPS = {
  skin:    [8, 4, 16, 18],    // Cute face & head portrait
  hair:    [7, 2, 18, 17],    // Hairstyle on head
  eyes:    [10, 11, 12, 6],   // Focused eyes closeup
  top:     [8, 16, 16, 11],   // Centered SHIRT only! (y: 16..27, completely below head!)
  bottoms: [8, 23, 16, 10],   // Centered PANTS only! (y: 23..33, waist down!)
  shoes:   [8, 26, 16, 7],    // Centered SHOES only! (y: 26..33, ankles down!)
  hat:     [6, 0, 20, 14],    // Headwear/Hat
  glasses: [8, 9, 16, 8],     // Glasses/Goggles
  weapon:  [15, 8, 14, 22]    // Weapon/Blade
};

function drawAvatarLayerToContext(tctx, key, row) {
  const img = avatarPreviewImages.get(key);
  if (!img?.complete || !img.naturalWidth) return;
  tctx.drawImage(img, 0, row * 32, 32, 32, 0, 0, 32, 32);
}

function renderCategoryTiles() {
  const container = $("avatarItemTiles");
  if (!container) return;
  container.innerHTML = "";

  const titleEl = $("activeCategoryTitle");
  const descEl = $("activeSelectionDesc");
  const count = AVATAR_LIMITS[activeCategory] || 0;
  if (titleEl) titleEl.textContent = CATEGORY_NAMES[activeCategory] || activeCategory;
  if (descEl) {
    const selectedIndex = Number(avatarSelection[activeCategory] || 0);
    descEl.textContent = GEAR_CATEGORIES.has(activeCategory) && !selectedIndex
      ? "Tidak dipakai"
      : `Model #${selectedIndex + 1} / ${count}`;
  }
  const image = avatarPreviewImages.get(activeCategory);
  const isLoaded = image?.complete && image.naturalWidth;
  const [cx, cy, cw, ch] = TILE_CROPS[activeCategory] || [0, 0, 32, 32];

  // Layers drawn under and over the active category item:
  const underlay = [];
  const overlay = [];
  if (activeCategory === "hair" || activeCategory === "hat" || activeCategory === "glasses") {
    underlay.push("skin", "eyes");
  } else if (activeCategory === "eyes") {
    underlay.push("skin");
  } else if (activeCategory === "top") {
    underlay.push("skin");
  } else if (activeCategory === "bottoms") {
    underlay.push("skin");
  } else if (activeCategory === "shoes") {
    underlay.push("skin");
  } else if (activeCategory === "skin") {
    overlay.push("eyes", "hair");
  }

  for (let i = 0; i < count; i++) {
    const selected = avatarSelection[activeCategory] === i;
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `cc-card${selected ? " selected" : ""}`;
    tile.setAttribute("role", "option");
    tile.setAttribute("aria-selected", selected ? "true" : "false");
    tile.setAttribute("aria-label", `${CATEGORY_NAMES[activeCategory]} #${i + 1}`);

    if (GEAR_CATEGORIES.has(activeCategory) && i === 0) {
      const off = document.createElement("span");
      off.className = "cc-card-off";
      off.textContent = "Lepas";
      tile.append(off);
    } else {
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 64;
      thumbCanvas.height = 64;
      const tctx = thumbCanvas.getContext("2d");
      if (tctx) {
        tctx.imageSmoothingEnabled = false;
        const temp = document.createElement("canvas");
        temp.width = 32;
        temp.height = 32;
        const a = temp.getContext("2d");
        a.imageSmoothingEnabled = false;

        // 1. Draw underlay layers
        for (const under of underlay) {
          if (under === activeCategory) continue;
          const urow = Math.min(AVATAR_LIMITS[under] - 1, avatarSelection[under] || 0);
          drawAvatarLayerToContext(a, under, urow);
        }

        // 2. Draw active category item
        if (isLoaded) {
          drawAvatarLayerToContext(a, activeCategory, i);
        }

        // 3. Draw overlay layers (e.g. eyes and hair on top of skin)
        for (const over of overlay) {
          if (over === activeCategory) continue;
          const orow = Math.min(AVATAR_LIMITS[over] - 1, avatarSelection[over] || 0);
          drawAvatarLayerToContext(a, over, orow);
        }

        // 4. Integer pixel-perfect scaling centered inside the 64x64 card canvas
        const scale = Math.min(Math.floor(56 / cw), Math.floor(56 / ch)) || 1;
        const dw = cw * scale;
        const dh = ch * scale;
        const dx = Math.round((64 - dw) / 2);
        const dy = Math.round((64 - dh) / 2);
        tctx.drawImage(temp, cx, cy, cw, ch, dx, dy, dw, dh);
      }
      tile.append(thumbCanvas);
    }

    tile.addEventListener("click", () => {
      avatarSelection[activeCategory] = i;
      try { localStorage.setItem("bai-avatar", JSON.stringify(avatarSelection)); } catch {}
      retroAudio.playCoin?.();
      renderAvatarPreview();
      renderCategoryTiles();
      phoneScene?.applyAvatarSelection?.({ ...avatarSelection });
    });

    container.appendChild(tile);
  }
}

function setupAvatarCustomizer() {
  const tabs = document.querySelectorAll(".cc-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeCategory = tab.dataset.category || "skin";
      renderCategoryTiles();
    });
  });

  // "Selesai": choices already autosave, so trigger join!
  $("avatarDoneButton")?.addEventListener("click", () => {
    $("joinButton")?.click();
  });

  let loadedCount = 0;
  for (const [key, src] of AVATAR_PREVIEW_PARTS) {
    const image = new Image();
    image.onload = () => {
      loadedCount++;
      renderAvatarPreview();
      if (loadedCount >= AVATAR_PREVIEW_PARTS.length) {
        renderCategoryTiles();
      }
    };
    image.onerror = () => console.warn(`[AVATAR] Preview asset gagal: ${src}`);
    image.src = src;
    avatarPreviewImages.set(key, image);
  }

  renderAvatarPreview();
  renderCategoryTiles();
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

    const viewport = window.visualViewport;
    const width = Math.max(1, Math.floor(viewport?.width || window.innerWidth));
    const viewportHeight = Math.max(1, Math.floor(viewport?.height || window.innerHeight));
    const isTouchMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const portrait = window.matchMedia("(orientation: portrait)").matches;

    if (isTouchMobile && portrait) {
      const targetHeight = Math.max(180, Math.min(width * 9 / 16, viewportHeight * 0.48));
      container.style.height = `${Math.floor(targetHeight)}px`;
      container.style.minHeight = `${Math.floor(targetHeight)}px`;
    } else {
      container.style.height = "100%";
      container.style.minHeight = "100%";
    }

    gamePanel.style.setProperty("--viewport-width", `${width}px`);
    gamePanel.style.setProperty("--viewport-height", `${viewportHeight}px`);
    phoneGame.scale.refresh();
  }, 60);
}

// =====================================================
// MOBILE INPUT
// =====================================================

function setMobileInput(action, pressed) {
  if (!(action in mobileInput)) return;

  // Block movement input until host actually starts the game!
  if (!gameStarted && pressed) {
    if ($("playerStatus")) $("playerStatus").textContent = "Menunggu host memulai game.";
    return;
  }

  mobileInput[action] = pressed;
  if (action === "jump" && pressed) {
    retroAudio.playJump();
  }
  if (action === "attack" && pressed) {
    if (phoneScene?.enemyInReach) {
      phoneScene.attackStageEnemy();
    } else {
      phoneScene?.performAttackSlash?.();
    }
  }
  if (phoneScene?.mobileInput && phoneScene.mobileInput !== mobileInput) {
    phoneScene.mobileInput[action] = pressed;
  }
}

function releaseAllMobileInput() {
  setMobileInput("left", false);
  setMobileInput("right", false);
  setMobileInput("jump", false);
  setMobileInput("attack", false);
}

// =====================================================
// ENTER ROOM
// =====================================================

function enterRoom(data) {
  roomCode = data.roomCode;
  gameStarted = data.status === "playing";
  window.baiGameStarted = gameStarted;
  currentCourse = data.course || null;
  window.baiStageIndex = 0;
  try { sessionStorage.setItem("baiStageIndex", "0"); } catch {}
  if (currentCourse && phoneScene?.applyCourse) phoneScene.applyCourse(currentCourse);
  if (phoneScene) {
    phoneScene.gameStarted = gameStarted;
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
// NPC QUEST (stage 5 / KÖLN) — dialog UI
// The scene emits "npc-near" / "npc-talk"; the server validates and awards
// points via "quest:complete". The real-life part is honor-based.
// =====================================================

let questCompleted = new Set();
const questAccepted = new Set();
const questTargets = { female: 0, male: 0 }; // honor-based counters (cewe / cowo from other classes)
let questNearNpc = null;
let questOpenNpc = null;

function syncQuestScene() {
  phoneScene?.setQuestProgress?.([...questCompleted]);
}

function onQuestNpcNear(npc) {
  questNearNpc = npc || null;
  const button = $("talkButton");
  if (!button) return;
  button.classList.toggle("hidden", !npc || !gameStarted);
  if (npc) button.textContent = `BICARA: ${npc.name} ▸`;
}

function onBattleKo() { closeBattle({ ko: true }); }

// Touching the enemy outside a quiz hurts too; the server validates and applies it.
function onEnemyContact() {
  if (!gameStarted || battleOpen) return;
  socket.emit("enemy:contact", { roomCode });
}

// Server-authoritative HP / score for this player (damage, K.O. penalty, respawn).
socket.on("player:hp", (state) => {
  if (!state || state.playerId !== socket.id) return;
  if (Number.isFinite(Number(state.score))) { score = Number(state.score); $("score").textContent = score; }
  if (state.ko && Number(state.penalty) > 0) {
    $("playerStatus").textContent = `K.O.! -${state.penalty} POIN · respawn...`;
  } else if (state.respawn) {
    $("playerStatus").textContent = "Respawn! HP penuh, lanjutkan permainan.";
  }
});

function onEnemyNear(near) {
  const canFight = near && !battleOpen && Boolean(phoneScene?.player);
  $("attackButton")?.classList.toggle("hidden", !canFight);
}

function bindQuestScene(scene) {
  scene.events.off("enemy-near", onEnemyNear);
  scene.events.on("enemy-near", onEnemyNear);
  scene.events.off("battle-request", startBattle);
  scene.events.on("battle-request", startBattle);
  scene.events.off("player-ko", onBattleKo);
  scene.events.on("player-ko", onBattleKo);
  onEnemyNear(false);
  scene.events.off("enemy-contact", onEnemyContact);
  scene.events.on("enemy-contact", onEnemyContact);
  socket.emit("battle:state", { roomCode }, (res) => {
    if (res?.ok) {
      scene.setBattleState?.(res);
      scene.applyServerHp?.(res); // HP carries over between stages / reloads
    }
  });
  scene.events.off("npc-near", onQuestNpcNear);
  scene.events.off("npc-talk", openQuestDialog);
  scene.events.on("npc-near", onQuestNpcNear);
  scene.events.on("npc-talk", openQuestDialog);
  onQuestNpcNear(null);
  syncQuestScene();
  socket.emit("quest:state", { roomCode }, (res) => {
    if (!res?.ok) return;
    questCompleted = new Set(res.completed);
    syncQuestScene();
  });
}

function drawQuestPortrait(npc) {
  const ctx = $("questPortrait")?.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, 64, 64);
  ctx.imageSmoothingEnabled = false;
  for (const [key] of AVATAR_PREVIEW_PARTS) {
    const image = avatarPreviewImages.get(key);
    if (!image?.complete || !image.naturalWidth) continue;
    ctx.drawImage(image, 0, (npc.avatar[key] || 0) * 32, 32, 32, 0, 0, 64, 64);
  }
}

function openQuestDialog(npc) {
  if (!npc || !gameStarted || quizActive || questOpenNpc) return;
  questOpenNpc = npc;
  if (phoneScene) {
    phoneScene.quizPaused = true;
    if (phoneScene.player?.body) {
      phoneScene.player.body.setVelocity(0, 0);
    }
  }
  releaseAllMobileInput();
  $("talkButton")?.classList.add("hidden");
  $("questNpcName").textContent = npc.name;
  drawQuestPortrait(npc);
  $("questPanel").classList.remove("hidden");
  renderQuestDialog();
}

function closeQuestDialog() {
  questOpenNpc = null;
  $("questPanel")?.classList.add("hidden");
  if (phoneScene && !quizActive) phoneScene.quizPaused = false;
  onQuestNpcNear(questNearNpc);
}

function questButton(label, handler, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `pixel-btn pixel-choice-btn${primary ? " pixel-btn-primary" : ""}`;
  button.textContent = label;
  button.style.touchAction = "manipulation";
  button.style.userSelect = "none";
  button.style.webkitUserSelect = "none";

  let lastFired = 0;
  const fire = (e) => {
    e?.preventDefault?.();
    const now = Date.now();
    if (now - lastFired < 280) return;
    lastFired = now;
    handler();
  };
  button.addEventListener("pointerup", fire);
  button.addEventListener("click", fire);
  return button;
}

function renderQuestDialog(message = "") {
  const npc = questOpenNpc;
  if (!npc) return;
  const needF = QUEST.minFemale, needM = QUEST.minMale;
  const gotF = Math.min(questTargets.female, needF), gotM = Math.min(questTargets.male, needM);
  $("questProgressTag").textContent = questCompleted.has(npc.id)
    ? `${needF + needM}/${needF + needM}`
    : `${gotF + gotM}/${needF + needM}`;
  const actions = $("questActions");
  actions.replaceChildren();
  $("questTip").textContent = "";
  $("questRule").textContent = "";
  $("questMessage").textContent = message;

  if (questCompleted.has(npc.id)) {
    $("questText").textContent = `${npc.name}: Keren! Kamu sudah menyelesaikan misi perkenalan. Terus jaga koneksi baru kalian, ya!`;
    actions.append(questButton("TUTUP", closeQuestDialog, true));
    return;
  }

  if (questAccepted.has(npc.id)) {
    $("questText").textContent =
      `SILAHKAN BERKENALAN DENGAN KELAS LAIN DAN BERTUKARAN INSTAGRAM!\n\nCatat setiap orang yang sudah bertukar Instagram denganmu (minimal ${needF} cewe dan ${needM} cowo).`;
    $("questRule").textContent = "Isi dengan jujur. Hargai kalau ada yang tidak bersedia, cari teman lain.";
    for (const [key, label, need] of [["female", "CEWE", needF], ["male", "COWO", needM]]) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;";
      const text = document.createElement("span");
      text.textContent = `${label}: ${questTargets[key]} / min ${need} ${questTargets[key] >= need ? "✔" : ""}`;
      const minus = questButton("−", () => { questTargets[key] = Math.max(0, questTargets[key] - 1); renderQuestDialog(); });
      const plus = questButton("+", () => { questTargets[key] = Math.min(9, questTargets[key] + 1); renderQuestDialog(); });
      row.append(text, minus, plus);
      actions.append(row);
    }
    const ready = questTargets.female >= needF && questTargets.male >= needM;
    const done = questButton("SEMUA TARGET SELESAI ✔", () => submitQuest(npc), true);
    done.disabled = !ready;
    actions.append(done, questButton("TUTUP", closeQuestDialog));
    return;
  }

  $("questText").textContent =
    `${npc.name}: ${npc.greeting}\n\nSIDE QUEST: SILAHKAN BERKENALAN DENGAN KELAS LAIN DAN BERTUKARAN INSTAGRAM!\n\nTarget: minimal 2 perempuan dan 2 laki-laki dari kelas lain.`;
  $("questTip").textContent = `Tips: ${npc.tip}`;
  $("questRule").textContent = "Quest ini hanya pelengkap. Tidak menambah point, tidak memengaruhi leaderboard, dan tidak wajib untuk menyelesaikan stage utama.";
  actions.append(
    questButton("TERIMA SIDE QUEST", () => { questAccepted.add(npc.id); renderQuestDialog(); }, true),
    questButton("NANTI", closeQuestDialog)
  );
}

function submitQuest(npc) {
  for (const b of $("questActions").querySelectorAll("button")) b.disabled = true;
  socket.emit("quest:complete", { roomCode, npcId: npc.id, targets: { ...questTargets } }, (res) => {
    if (res?.ok || res?.alreadyDone) {
      questCompleted = new Set(res.completed || [...questCompleted, npc.id]);
      syncQuestScene();
      renderQuestDialog(res.ok ? "★ SIDE QUEST SELESAI! TERIMA KASIH SUDAH BERKENALAN! ★" : "");
      return;
    }
    renderQuestDialog(res?.error || "Misi gagal dikirim.");
  });
}

const talkBtn = $("talkButton");
if (talkBtn) {
  talkBtn.style.touchAction = "manipulation";
  let lastTalk = 0;
  const fireTalk = (e) => {
    e?.preventDefault?.();
    const now = Date.now();
    if (now - lastTalk < 300) return;
    lastTalk = now;
    openQuestDialog(questNearNpc);
  };
  talkBtn.addEventListener("pointerup", fireTalk);
  talkBtn.addEventListener("click", fireTalk);
}
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && questOpenNpc) closeQuestDialog();
});
socket.on("player:reset", () => {
  window.baiPlayerHpState = { hp: 100, maxHp: 100, ko: false };
  phoneScene?.setBattleState?.({ won: [], progress: {} });
  questCompleted = new Set();
  questAccepted.clear();
  questTargets.female = 0;
  questTargets.male = 0;
  syncQuestScene();
});

// =====================================================
// ENEMY BATTLE — answer quiz questions to defeat the stage enemy
// =====================================================

let battleOpen = false;
let battleBusy = false;
let battleWrongDamage = 10;

function battleCurrentStageId() {
  return phoneScene?.currentStage?.id || "munich";
}

function setBattleHp(solved, total) {
  const fill = $("battleHpFill");
  if (fill) fill.style.width = `${Math.max(0, Math.round(((total - solved) / Math.max(1, total)) * 100))}%`;
}

function renderBattleQuestion(q, message = "") {
  if (!q) return;
  // Difficulty: stage level (LEVEL 1 - 4) and question tier (MUDAH / SEDANG / SULIT)
  $("battleCounter").textContent = `SOAL ${Math.min(q.number, q.total)}/${q.total}${q.tierLabel ? ` · ${q.tierLabel}` : ""}${q.points ? ` · +${q.points}` : ""}`;
  $("battleCounter").dataset.tier = q.tier || "";
  $("battleTitle").textContent = q.levelLabel || (phoneScene?.stageEnemy?.cfg?.boss ? "BOSS BATTLE" : "BATTLE");
  $("battleEnemyName").textContent = phoneScene?.stageEnemy?.cfg?.name || "ENEMY";
  $("battleQuestion").textContent = q.question;
  $("battleMessage").textContent = message || "Pilih jawaban yang benar untuk menyerang!";
  setBattleHp(q.solved, q.total);
  const choices = $("battleChoices");
  choices.replaceChildren();

  for (const letter of ["A", "B", "C", "D"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pixel-btn pixel-choice-btn";
    button.dataset.letter = letter;

    const prefix = document.createElement("span");
    prefix.className = "pixel-choice-badge";
    prefix.textContent = letter;

    button.append(
      prefix,
      document.createTextNode(` ${q.choices[letter] ?? ""}`)
    );

    let picked = false;
    const handlePick = (event) => {
      if (picked || battleBusy) return;
      picked = true;
      if (event && event.cancelable) {
        event.preventDefault();
      }
      if (event) {
        event.stopPropagation();
      }
      answerBattle(letter, button);
    };

    button.addEventListener("touchstart", handlePick, { passive: false });
    button.addEventListener("click", handlePick);
    choices.append(button);
  }
}

function openBattlePanel() {
  battleOpen = true;
  $("talkButton")?.classList.add("hidden");
  $("attackButton")?.classList.add("hidden");
  $("mobileControls")?.classList.add("hidden");
  releaseAllMobileInput();
  $("battlePanel").classList.remove("anim");
  $("battlePanel").classList.remove("hidden");
}

function closeBattle({ ko = false } = {}) {
  if (!battleOpen) return;
  battleOpen = false;
  battleBusy = false;
  $("battlePanel")?.classList.add("hidden");
  $("mobileControls")?.classList.remove("hidden");
  releaseAllMobileInput();
  phoneScene?.endBattle?.(ko);
  onEnemyNear(Boolean(phoneScene?.enemyInReach));
}

function playDomGameStartCountdown(onDone) {
  const modal = $("gameStartModal");
  if (!modal) {
    if (onDone) onDone();
    return;
  }
  modal.classList.remove("hidden");
  const stageEl = $("startModalStage");
  const countEl = $("startModalCountdown");
  const stageName = phoneScene?.currentStage?.name || "MÜNCHEN";
  if (stageEl) stageEl.textContent = `ETAPPE ${(phoneScene?.stageIndex || 0) + 1}: ${stageName.toUpperCase()} HAUPTBAHNHOF`;

  const steps = [
    { text: "3", color: "#f59e0b", time: 0 },
    { text: "2", color: "#f97316", time: 700 },
    { text: "1", color: "#10b981", time: 1400 },
    { text: "LOS GEHT'S! 🏁", color: "#82d82c", time: 2100 }
  ];

  steps.forEach(s => {
    setTimeout(() => {
      if (!countEl) return;
      countEl.textContent = s.text;
      countEl.style.color = s.color;
      countEl.style.transform = "scale(1.3)";
      setTimeout(() => { if (countEl) countEl.style.transform = "scale(1)"; }, 150);
      if (s.text === "LOS GEHT'S! 🏁") {
        retroAudio.playCountdownBeep?.(true);
      } else {
        retroAudio.playCountdownBeep?.(false);
      }
    }, s.time);
  });

  setTimeout(() => {
    modal.classList.add("hidden");
    if (onDone) onDone();
  }, 2700);
}

function playDomBossAlert(onDone) {
  const modal = $("bossAlertModal");
  retroAudio.playBossAlarm?.();
  if (modal) {
    modal.classList.remove("hidden");
  }
  let called = false;
  const finish = () => {
    if (called) return;
    called = true;
    modal?.classList.add("hidden");
    if (onDone) onDone();
  };
  setTimeout(finish, 2200);
}

function startBattle() {
  if (battleOpen || quizActive || questOpenNpc || !phoneScene?.stageEnemy) return;

  const isBoss = Boolean(phoneScene?.stageEnemy?.cfg?.boss);
  if (isBoss && !phoneScene._bossIntroPlayed) {
    phoneScene._bossIntroPlayed = true;
    // Dramatic Boss Alert on phone screen
    playDomBossAlert(() => {
      executeBattleStart();
    });
    // In Phaser canvas:
    phoneScene.playFinalBossIntro?.();
    return;
  }

  executeBattleStart();
}

function executeBattleStart() {
  if (battleOpen || quizActive || questOpenNpc || !phoneScene?.stageEnemy) return;
  battleBusy = true;

  // Always use the sharp, responsive DOM HTML modal for battle quiz
  if (!socket?.connected) {
    battleBusy = false;
    $("playerStatus").textContent = "Koneksi ke server terputus.";
    return;
  }

  socket.emit("battle:start", {
    roomCode,
    x: phoneScene.player?.x,
    y: phoneScene.player?.y,
    stageIndex: phoneScene.stageIndex
  }, (res) => {
    battleBusy = false;
    if (res?.defeated) { phoneScene?.markEnemyDefeated?.(true); return; }
    if (!res?.ok) {
      // Server menolak (jauh dari musuh, K.O., game belum berjalan, dll). Tidak ada battle palsu lokal.
      $("playerStatus").textContent = res?.error || "Pertarungan tidak bisa dimulai.";
      return;
    }
    battleWrongDamage = res.wrongDamage || 10;
    openBattlePanel();
    phoneScene.beginBattle();
    phoneScene.setEnemyProgress(res.solved, res.total);
    renderBattleQuestion(res);
  });
}

function answerBattle(letter, button) {
  if (!battleOpen || battleBusy) return;
  battleBusy = true;
  for (const b of $("battleChoices").querySelectorAll("button")) b.disabled = true;
  phoneScene?.holdHp?.();

  socket.emit("battle:answer", { roomCode, choice: letter }, async (res) => {
    try {
      if (!res?.ok) {
        phoneScene?.releaseHp?.();
        battleBusy = false;
        for (const b of $("battleChoices").querySelectorAll("button")) b.disabled = false;
        $("battleMessage").textContent = res?.error || "Jawaban gagal dikirim.";
        return;
      }
      button.classList.add(res.correct ? "correct" : "wrong");
      setBattleHp(res.solved, res.total);
      $("battlePanel").classList.add("anim");
      if (Number.isFinite(Number(res.totalScore))) { score = Number(res.totalScore); $("score").textContent = score; }
      if (res.correct) {
        phoneScene.showFloatingFeedback?.(phoneScene.player.x, phoneScene.player.y - 14, `+${res.points} POIN`, "#82d82c");
        await phoneScene.playPlayerAttack(res.solved, res.total, res.defeated);
        phoneScene.releaseHp?.();
        if (!battleOpen) return;
        if (res.defeated) {
          phoneScene.showFloatingFeedback?.(phoneScene.player.x, phoneScene.player.y - 36, "MUSUH KALAH!", "#82d82c");
          closeBattle();
          return;
        }
      } else {
        await phoneScene.playEnemyAttack(res.wrongDamage || battleWrongDamage);
        phoneScene.releaseHp?.();
        if (!battleOpen) return;
      }
      battleBusy = false;
      $("battlePanel").classList.remove("anim");
      renderBattleQuestion(res.next, res.correct ? `BENAR! +${res.points} POIN · Serangan kena!` : `SALAH! Musuh menyerang balik. HP ${res.hp}/${res.maxHp}`);
    } catch (err) {
      console.error("[BATTLE ERROR]", err);
      battleBusy = false;
      phoneScene?.releaseHp?.();
      for (const b of $("battleChoices").querySelectorAll("button")) b.disabled = false;
    }
  });
}

$("attackButton")?.addEventListener("click", () => phoneScene?.attackStageEnemy?.());
$("battleFlee")?.addEventListener("click", () => closeBattle());

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

      onSceneReady: (scene) => {
        phoneScene = scene;

        // Hubungkan kontrol HP ke Phaser.
        scene.mobileInput = mobileInput;
        scene.gameStarted = gameStarted;
        bindQuestScene(scene);
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
    const press = (event) => {
      event.preventDefault();
      setMobileInput(action, true);
    };
    const release = () => setMobileInput(action, false);
    button.addEventListener("touchstart", press, { passive: false });
    button.addEventListener("touchend", release, { passive: false });
    button.addEventListener("touchcancel", release, { passive: false });

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
  $("mobileControls")?.classList.add("hidden");

  $("resultPanel").classList.add("hidden");
  $("quizPanel").classList.remove("hidden");

  $("questionText").textContent = question.question;
  $("quizMessage").textContent = "";
  const choicesContainer = $("choices");
  choicesContainer.replaceChildren();

  for (const letter of ["A", "B", "C", "D"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pixel-btn pixel-choice-btn";
    const prefix = document.createElement("span");
    prefix.className = "pixel-choice-badge";
    prefix.textContent = `${letter}`;

    button.append(
      prefix,
      document.createTextNode(` ${question.choices[letter] ?? ""}`)
    );

    let picked = false;
    const onPickChoice = (e) => {
      if (picked || !quizActive) return;
      picked = true;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      quizActive = false;

      for (const choice of choicesContainer.querySelectorAll("button")) {
        choice.disabled = true;
      }

      button.classList.add("selected");
      $("quizMessage").textContent = "Jawaban dikirim ke server...";

      socket.emit(
        "quiz:answer",
        {
          roomCode,
          answer: letter
        },
        (result) => {
          if (!result?.ok) {
            picked = false;
            $("quizMessage").textContent =
              result?.error || "Jawaban gagal dikirim.";

            quizActive = true;

            for (const choice of choicesContainer.querySelectorAll("button")) {
              choice.disabled = false;
            }
          }
        }
      );
    };

    button.addEventListener("touchstart", onPickChoice, { passive: false });
    button.addEventListener("click", onPickChoice);

    choicesContainer.append(button);
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
  $("mobileControls")?.classList.remove("hidden");
  releaseAllMobileInput();
  if (phoneScene) {
    phoneScene.quizPaused = false;
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

$("fullscreenToggleBtn")?.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

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
  window.baiStageIndex = 0;
  try { sessionStorage.setItem("baiStageIndex", "0"); } catch {}
  if (phoneScene) {
    phoneScene.finished = false;
    phoneScene.finishRequestSent = false;
    phoneScene.introActive = false;
    phoneScene._gameStartIntroPlaying = false;
    phoneScene.physics?.world?.resume?.();
    phoneScene.setStage?.(0);
    phoneScene.player?.setPosition(Number(x) || 240, Number(y) || 208);
    phoneScene.player?.body?.reset(Number(x) || 240, Number(y) || 208);
    phoneScene.syncAvatarLayers?.();
  }
  window._baiGameStartIntroPlayed = false;
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
  const wasPlaying = gameStarted;
  gameStarted = status === "playing";
  window.baiGameStarted = gameStarted;
  if (phoneScene) {
    phoneScene.gameStarted = gameStarted;
    phoneScene.introActive = false;
    phoneScene._gameStartIntroPlaying = false;
    if (startedAt) phoneScene.gameStartedAt = startedAt;
    if (status === "ended") phoneScene.finished = true;
    if (gameStarted && !wasPlaying && !window._baiGameStartIntroPlayed && (phoneScene.stageIndex === 0 || !phoneScene.stageIndex)) {
      window._baiGameStartIntroPlayed = true;
      playDomGameStartCountdown();
    }
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
