
import "./style.css";
import Phaser from "phaser";
import { THEME } from "./theme.js";
import { BootScene } from "./scenes/BootScene.js";
import { WorldScene } from "./scenes/WorldScene.js";
import { TrainTravelScene } from "./scenes/TrainTravelScene.js";
import { setupHostPanel } from "./hostPanel.js";
import { t, getLang, setLang, onLangChange, SUPPORTED_LANGUAGES } from "./i18n/index.js";
import { loadHostSession, clearHostSession } from "./session.js";

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
    WorldScene,
    TrainTravelScene
  ]
};

const menu = document.getElementById("main-menu");
const gameContainer = document.getElementById("game");
const menuMessage = document.getElementById("menu-message");
const menuForm = document.getElementById("menu-form");
const settingsPanel = document.getElementById("menu-settings-panel");
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

const ROUTE_STAGES = [
  {
    id: "munich",
    num: "1",
    name: "MÜNCHEN",
    badge: "LV.1 · A1",
    detailId: "München · Rathaus / Marienplatz · Musim Gugur · Lawan Penjaga Lv.1 (3 Soal A1)",
    detailDe: "München · Rathaus / Marienplatz · Herbst · Stadtwächter Lv.1 (3 Fragen A1)"
  },
  {
    id: "frankfurt",
    num: "2",
    name: "FRANKFURT",
    badge: "LV.2 · A1+",
    detailId: "Frankfurt · Skyline am Main · Musim Panas · Lawan Penjaga Lv.2 (5 Soal A1+)",
    detailDe: "Frankfurt · Skyline am Main · Sommer · Stadtwächter Lv.2 (5 Fragen A1+)"
  },
  {
    id: "berlin",
    num: "3",
    name: "BERLIN",
    badge: "LV.3 · A2",
    detailId: "Berlin · Brandenburger Tor · Musim Dingin · Lawan Penjaga Lv.3 (8 Soal A2)",
    detailDe: "Berlin · Brandenburger Tor · Winter · Stadtwächter Lv.3 (8 Fragen A2)"
  },
  {
    id: "hamburg",
    num: "4",
    name: "HAMBURG",
    badge: "BOSS B1",
    detailId: "Hamburg · Hafen / Elbphilharmonie · Final Boss Herr Tycoon (10 Soal A2/B1 · 300 HP)",
    detailDe: "Hamburg · Hafen / Elbphilharmonie · Final Boss Herr Tycoon (10 Fragen A2/B1 · 300 HP)"
  },
  {
    id: "koeln",
    num: "5",
    name: "KÖLN",
    badge: "MISI NPC",
    detailId: "Köln · Kölner Dom / Rhein · Misi Spesial Frau Deandra & Garis Finish!",
    detailDe: "Köln · Kölner Dom / Rhein · Spezialmission mit Frau Deandra & Ziel!"
  }
];
let activeRouteStop = 0;

function renderRouteMap() {
  const mapEl = document.getElementById("menu-route-map");
  const detailEl = document.getElementById("menu-route-detail");
  if (!mapEl || !detailEl) return;

  const isDe = getLang() === "de";
  mapEl.replaceChildren(...ROUTE_STAGES.map((stop, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `menu-route-stop${idx === activeRouteStop ? " active" : ""}${stop.id === "hamburg" ? " is-boss" : ""}${stop.id === "koeln" ? " is-finish" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(idx === activeRouteStop));
    btn.innerHTML = `<span class="route-num">${stop.num}</span><span class="route-city">${stop.name}</span><span class="route-badge">${stop.badge}</span>`;
    btn.addEventListener("click", () => {
      activeRouteStop = idx;
      renderRouteMap();
    });
    return btn;
  }));

  const current = ROUTE_STAGES[activeRouteStop] || ROUTE_STAGES[0];
  detailEl.textContent = isDe ? current.detailDe : current.detailId;
}

function renderMenu() {
  document.documentElement.lang = getLang();
  const isJoinMode = document.getElementById("menu-form").dataset.mode === "join";
  if (isJoinMode) {
    document.getElementById("menu-title").textContent = t("menu.join");
    document.getElementById("menu-player-label").textContent = t("join.playerLabel");
    document.getElementById("menu-room-label").textContent = t("join.roomLabel");
    document.getElementById("menu-join-submit").textContent = t("menu.joinSubmit");
    document.getElementById("menu-join-back").textContent = t("settings.back");
    document.getElementById("menu-player-name").placeholder = t("join.playerPlaceholder");
    document.getElementById("menu-room-code").placeholder = t("join.roomPlaceholder");
  } else {
    document.getElementById("menu-title").textContent = "Deutsch Adventure";
  }

  const eyebrow = document.getElementById("menu-eyebrow");
  if (eyebrow) eyebrow.textContent = t("brand.eyebrow");
  const routeHeading = document.getElementById("menu-route-heading");
  if (routeHeading) routeHeading.textContent = t("brand.routeTitle");

  document.getElementById("menu-tagline").textContent = t("brand.tagline");
  const playBtn = document.getElementById("menu-play");
  if (playBtn) playBtn.textContent = t("menu.play");
  document.getElementById("menu-host").textContent = t("menu.host");
  document.getElementById("menu-join").textContent = t("menu.join");
  document.getElementById("menu-settings").textContent = t("menu.settings");
  document.getElementById("settings-title").textContent = t("settings.title");
  document.getElementById("settings-language-label").textContent = t("settings.languageLabel");
  document.getElementById("settings-back").textContent = t("settings.back");

  const howToTitle = document.getElementById("menu-howto-title");
  if (howToTitle) howToTitle.textContent = t("menu.howToTitle");
  const howToList = document.getElementById("menu-howto-list");
  if (howToList) {
    const steps = t("menu.howToSteps");
    howToList.replaceChildren(...(Array.isArray(steps) ? steps : []).map(step => {
      const li = document.createElement("li");
      li.textContent = step;
      return li;
    }));
  }
  const controlsHint = document.getElementById("menu-controls-hint");
  if (controlsHint) controlsHint.textContent = t("menu.controlsHint");

  const quickLang = document.getElementById("menu-quick-lang");
  if (quickLang) {
    quickLang.replaceChildren(...SUPPORTED_LANGUAGES.map(language => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `menu-lang-chip${language.code === getLang() ? " active" : ""}`;
      btn.dataset.lang = language.code;
      btn.setAttribute("aria-pressed", String(language.code === getLang()));
      btn.textContent = language.code.toUpperCase();
      btn.addEventListener("click", () => setLang(language.code));
      return btn;
    }));
  }

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

  renderRouteMap();
}

function startGame() {
  // A new game always begins at Stage 1 / München.
  window.baiStageIndex = 0;
  try { sessionStorage.setItem("baiStageIndex", "0"); } catch {}
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
  menuForm.dataset.mode = "";
  document.getElementById("menu-title").textContent = "Deutsch Adventure";
  menu.hidden = false;
  gameContainer.hidden = true;
  shell.classList.remove("game-active");
  menuForm.hidden = true;
  settingsPanel.hidden = true;
  const routeBox = document.querySelector(".menu-route-box");
  if (routeBox) routeBox.hidden = false;
  document.getElementById("menu-actions").hidden = false;
  menuMessage.textContent = "";
}

// resume=true: the page was refreshed while hosting -> continue the SAME room (same code, same players).
// resume=false (clicking HOST in the menu): always a brand-new room.
function hostRoom({ resume = false } = {}) {
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
  hostPanel.show();
  hostPanel.createRoom({ resume });
}

function showJoinForm() {
  menuForm.dataset.mode = "join";
  menuForm.innerHTML = `
    <div class="menu-form-grid">
      <div class="menu-form-field">
        <label id="menu-player-label" for="menu-player-name"></label>
        <input id="menu-player-name" maxlength="24" autocomplete="nickname">
      </div>
      <div class="menu-form-field">
        <label id="menu-room-label" for="menu-room-code"></label>
        <input id="menu-room-code" maxlength="8" autocomplete="off" autocapitalize="characters">
      </div>
    </div>
    <button id="menu-join-submit" type="button"></button>
    <button id="menu-join-back" class="menu-secondary" type="button"></button>`;
  renderMenu();
  menuForm.hidden = false;
  const routeBox = document.querySelector(".menu-route-box");
  if (routeBox) routeBox.hidden = true;
  document.getElementById("menu-actions").hidden = true;
  menuForm.querySelector("#menu-join-back").addEventListener("click", showMainMenu);

  const codeInput = menuForm.querySelector("#menu-room-code");
  const nameInput = menuForm.querySelector("#menu-player-name");
  const submitJoin = () => {
    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput.value.trim() || "Player";
    if (!code) { menuMessage.textContent = t("join.enterCode"); codeInput.focus(); return; }
    const controllerUrl = new URL("/client-play/", location.origin);
    controllerUrl.searchParams.set("room", code);
    controllerUrl.searchParams.set("name", name);
    location.assign(controllerUrl);
  };
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });
  codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitJoin(); });
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") codeInput.focus(); });
  menuForm.querySelector("#menu-join-submit").addEventListener("click", submitJoin);
  nameInput.focus();
}

document.getElementById("menu-host").addEventListener("click", () => hostRoom());
document.getElementById("menu-join").addEventListener("click", showJoinForm);
document.getElementById("menu-settings").addEventListener("click", () => {
  settingsPanel.hidden = false;
  menuForm.hidden = true;
  const routeBox = document.querySelector(".menu-route-box");
  if (routeBox) routeBox.hidden = true;
  document.getElementById("menu-actions").hidden = true;
});
document.getElementById("settings-back").addEventListener("click", showMainMenu);
document.getElementById("menu-language-options").addEventListener("click", event => {
  const button = event.target.closest("[data-lang]");
  if (button) setLang(button.dataset.lang);
});
onLangChange(renderMenu);
renderMenu();

const fontReady = (document.fonts?.load ? document.fonts.load('8px "Press Start 2P"') : Promise.resolve()).catch(() => {});
// ?new=1 -> forget the saved host session (start fresh from the menu), then clean the URL.
const startupParams = new URLSearchParams(location.search);
if (startupParams.get("new") === "1") {
  clearHostSession();
  startupParams.delete("new");
  const query = startupParams.toString();
  try { history.replaceState(null, "", location.pathname + (query ? `?${query}` : "") + location.hash); } catch {}
}

Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 1500))]).then(() => {
  game = new Phaser.Game(config);
  // Host refreshed the page while a room was open: go straight back into that room.
  if (loadHostSession()) requestAnimationFrame(() => hostRoom({ resume: true }));
});

window.addEventListener(
  "resize",
  fitIntegerScale,
  { passive: true }
);
