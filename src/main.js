
import "./style.css";
import "./reference-ui.css";
import Phaser from "phaser";
import { THEME } from "./theme.js";
import { BootScene } from "./scenes/BootScene.js";
import { WorldScene } from "./scenes/WorldScene.js";
import { setupHostPanel } from "./hostPanel.js";
import { t, getLang, setLang, onLangChange, SUPPORTED_LANGUAGES } from "./i18n/index.js";

const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;

const shell = document.getElementById("stage-shell");

if (!shell) {
  throw new Error("Elemen #stage-shell tidak ditemukan.");
}

let game;

function fitIntegerScale() {
  const viewport = window.visualViewport;
  const width = Math.max(1, Math.floor(viewport?.width || window.innerWidth));
  const height = Math.max(1, Math.floor(viewport?.height || window.innerHeight));
  shell.style.width = `${width}px`;
  shell.style.height = `${height}px`;
  game?.scale.refresh();
}

fitIntegerScale();

const config = {
  type: Phaser.CANVAS,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: THEME.sky,
  pixelArt: true,
  roundPixels: true,
  antialias: false,

  render: {
    pixelArt: true,
    roundPixels: true,
    antialias: false
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },

  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 900
      },
      debug: false
    }
  },

  scene: [
    BootScene,
    WorldScene
  ]
};

const menu = document.getElementById("main-menu");
const gameContainer = document.getElementById("game");
const menuMessage = document.getElementById("menu-message");
const menuForm = document.getElementById("menu-form");
const settingsPanel = document.getElementById("menu-settings-panel");
const playOptions = document.getElementById("menu-play-options");
const infoPanel = document.getElementById("menu-info-panel");

// Draw the same layered pixel-avatar assets used by the phone customizer so
// the title screen uses real in-game characters rather than emoji placeholders.
function renderMenuAvatars() {
  const layers = [
    ["skin", "/assets/avatar/Idle/Character/Character_Idle_Front-Sheet.png"],
    ["bottoms", "/assets/avatar/Idle/Clothing/Clothing_Bottoms_Idle_Front-Sheet.png"],
    ["shoes", "/assets/avatar/Idle/Clothing/Clothing_Shoes_Idle_Front-Sheet.png"],
    ["top", "/assets/avatar/Idle/Clothing/Clothing_Tops_Idle_Front-Sheet.png"],
    ["eyes", "/assets/avatar/Idle/Eyes/Eyes_Idle_Front-Sheet.png"],
    ["hair", "/assets/avatar/Idle/Hair/Hair_Idle_Front-Sheet.png"]
  ];
  const variants = [
    {skin:0,bottoms:2,shoes:1,top:8,eyes:1,hair:3},
    {skin:1,bottoms:5,shoes:3,top:12,eyes:2,hair:8},
    {skin:2,bottoms:8,shoes:5,top:17,eyes:0,hair:14},
    {skin:3,bottoms:10,shoes:7,top:21,eyes:3,hair:19}
  ];
  const loaded = new Map();
  for (const [key, src] of layers) {
    const image = new Image();
    image.onload = () => {
      loaded.set(key, image);
      document.querySelectorAll(".menu-avatar").forEach((canvas, index) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        for (const [part] of layers) {
          const sprite = loaded.get(part);
          if (!sprite?.complete || !sprite.naturalWidth) continue;
          const row = variants[index][part];
          ctx.drawImage(sprite, 0, row * 32, 32, 32, 32, 24, 64, 64);
        }
      });
    };
    image.src = src;
  }
}
renderMenuAvatars();
let hostPanel = null;
let activeRoom = false;
let bootReady = false;
let pendingGameStart = false;
window.addEventListener("deutsch:boot-ready", () => {
  bootReady = true;
  if (pendingGameStart && typeof window.deutschStartWorld === "function") {
    pendingGameStart = false;
    window.deutschStartWorld();
  }
}, { once: true });

window.addEventListener("deutsch:world-error", event => {
  const error = event.detail;
  menu.hidden = false;
  gameContainer.hidden = true;
  shell.classList.remove("game-active");
  menuMessage.textContent = `Game gagal dimulai: ${error?.message || "periksa Console"}`;
  console.error("[GAME] WorldScene gagal:", error);
});

window.addEventListener("error", event => {
  console.error("[GAME] JavaScript error:", event.error || event.message);
  menuMessage.textContent = `JavaScript error: ${event.message}`;
});

function renderMenu() {
  document.documentElement.lang = getLang();
  if (document.getElementById("menu-form").dataset.mode === "join") {
    document.getElementById("menu-title").textContent = t("menu.join");
    document.getElementById("menu-player-label").textContent = t("join.playerLabel");
    document.getElementById("menu-room-label").textContent = t("join.roomLabel");
    document.getElementById("menu-join-submit").textContent = t("menu.joinSubmit");
    document.getElementById("menu-join-back").textContent = t("settings.back");
    document.getElementById("menu-player-name").placeholder = t("join.playerPlaceholder");
    document.getElementById("menu-room-code").placeholder = t("join.roomPlaceholder");
  }
  document.getElementById("menu-tagline").textContent = t("brand.tagline");
  const playBtn = document.getElementById("menu-play");
  if (playBtn) playBtn.textContent = `▶ ${t("menu.play")}`;
  const hostBtn = document.getElementById("menu-host");
  const joinBtn = document.getElementById("menu-join");
  if (hostBtn) hostBtn.textContent = t("menu.host");
  if (joinBtn) joinBtn.textContent = t("menu.join");
  document.getElementById("menu-settings").textContent = `⚙ ${t("menu.settings")}`;
  document.getElementById("settings-title").textContent = t("settings.title");
  document.getElementById("settings-language-label").textContent = t("settings.languageLabel");
  document.getElementById("settings-back").textContent = t("settings.back");
  const options = document.getElementById("menu-language-options");
  options.replaceChildren(...SUPPORTED_LANGUAGES.map(language => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `menu-language${language.code === getLang() ? " selected" : ""}`;
    button.dataset.lang = language.code;
    button.setAttribute("aria-pressed", String(language.code === getLang()));
    button.textContent = language.label;
    return button;
  }));
}

function startGame() {
  activeRoom = true;
  menu.hidden = true;
  gameContainer.hidden = false;
  shell.classList.add("game-active");
  game.scale.refresh();
  requestAnimationFrame(() => {
    game.scale.refresh();
    if (bootReady && typeof window.deutschStartWorld === "function") {
      pendingGameStart = false;
      window.deutschStartWorld();
    } else {
      pendingGameStart = true;
    }
  });
}

function showMainMenu() {
  document.getElementById("menu-title").textContent = "BAI PARTY GAMES";
  menu.hidden = false;
  gameContainer.hidden = true;
  shell.classList.remove("game-active");
  menuForm.hidden = true;
  settingsPanel.hidden = true;
  playOptions.hidden = true;
  infoPanel.hidden = true;
  document.getElementById("menu-actions").hidden = false;
  menuMessage.textContent = "";
}

function hostRoom() {
  window.deutschHostMode = true;
  menuMessage.textContent = t("menu.hostConnecting");
  document.getElementById("menu-actions").hidden = true;
  if (!hostPanel) {
    hostPanel = setupHostPanel(shell, game, {
      onRoomCreated: ({ offline = false } = {}) => {
        menuMessage.textContent = offline ? "Server tidak tersedia. Game berjalan tanpa multiplayer." : t("menu.roomReady");
        if (offline) hostPanel?.show();
      }
    });
  }
  startGame();
  hostPanel.createRoom();
}

function showJoinForm() {
  playOptions.hidden = true;
  menuForm.dataset.mode = "join";
  menuForm.innerHTML = `
    <label id="menu-player-label" for="menu-player-name"></label>
    <input id="menu-player-name" maxlength="24" autocomplete="nickname">
    <label id="menu-room-label" for="menu-room-code"></label>
    <input id="menu-room-code" maxlength="8" autocomplete="off">
    <button id="menu-join-submit" type="button"></button>
    <button id="menu-join-back" class="menu-secondary" type="button"></button>`;
  renderMenu();
  menuForm.hidden = false;
  document.getElementById("menu-actions").hidden = true;
  menuForm.querySelector("#menu-join-back").addEventListener("click", showMainMenu);
  menuForm.querySelector("#menu-join-submit").addEventListener("click", () => {
    const code = menuForm.querySelector("#menu-room-code").value.trim().toUpperCase();
    const name = menuForm.querySelector("#menu-player-name").value.trim() || "Player";
    if (!code) { menuMessage.textContent = t("join.enterCode"); return; }
    const controllerUrl = new URL("/client-play/", location.origin);
    controllerUrl.searchParams.set("room", code);
    controllerUrl.searchParams.set("name", name);
    location.assign(controllerUrl);
  });
}

document.getElementById("menu-play").addEventListener("click", () => {
  document.getElementById("menu-actions").hidden = true;
  playOptions.hidden = false;
  menuMessage.textContent = "Pilih buat room di TV atau gabung melalui HP.";
});
document.getElementById("menu-play-back").addEventListener("click", showMainMenu);
document.getElementById("menu-host").addEventListener("click", hostRoom);
document.getElementById("menu-join").addEventListener("click", showJoinForm);
document.getElementById("menu-customize").addEventListener("click", () => {
  infoPanel.hidden = false;
  document.getElementById("menu-info-title").textContent = "CUSTOMIZATION";
  document.getElementById("menu-info-copy").textContent = "Buka link controller di HP dan pilih kostum sebelum masuk room. Semua pilihan tersimpan dan disinkronkan ke TV.";
  document.getElementById("menu-actions").hidden = true;
});
document.getElementById("menu-leaderboard").addEventListener("click", () => {
  infoPanel.hidden = false;
  document.getElementById("menu-info-title").textContent = "LEADERBOARD";
  document.getElementById("menu-info-copy").textContent = "Peringkat pemain akan tampil selama permainan dan pada Ranking Akhir setelah petualangan Hamburg.";
  document.getElementById("menu-actions").hidden = true;
});
document.getElementById("menu-info-back").addEventListener("click", showMainMenu);
document.getElementById("menu-quit").addEventListener("click", () => {
  menuMessage.textContent = "Terima kasih sudah bermain BAI PARTY GAMES!";
  try { window.close(); } catch {}
});
document.getElementById("menu-settings").addEventListener("click", () => {
  playOptions.hidden = true;
  settingsPanel.hidden = false;
  menuForm.hidden = true;
  document.getElementById("menu-actions").hidden = true;
});
document.getElementById("settings-back").addEventListener("click", showMainMenu);
document.getElementById("menu-language-options").addEventListener("click", event => {
  const button = event.target.closest("[data-lang]");
  if (button) setLang(button.dataset.lang);
});
onLangChange(renderMenu);
renderMenu();

game = new Phaser.Game(config);

window.addEventListener(
  "resize",
  fitIntegerScale,
  { passive: true }
);
