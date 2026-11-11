
import { io } from "socket.io-client";
import QRCode from "qrcode";
import { retroAudio } from "./audio/retroAudio.js";
import { COURSE } from "./game/course.js";

export function setupHostPanel(shell, game, { onRoomCreated = () => {} } = {}) {
  const panel = document.createElement("section");
  panel.id = "bai-host-panel";
  panel.hidden = true;

  panel.innerHTML = `
    <div id="host-minibar" class="pixel-box" hidden>
      <span id="host-minibar-text">⚙ HOST: ------</span>
      <button id="host-expand-panel" class="pixel-btn pixel-btn-sm" type="button">BUKA ▶</button>
    </div>

    <div id="host-card" class="pixel-box host-card">
      <div class="host-header-bar">
        <span class="pixel-heading">HOST DASHBOARD</span>
        <div style="display:flex;gap:4px">
          <button id="host-audio-btn" class="pixel-btn pixel-btn-sm" type="button">🔊 BGM</button>
          <button id="host-toggle-panel" class="pixel-btn pixel-btn-sm" type="button">◀ TUTUP</button>
        </div>
      </div>
      <div id="host-connection" class="pixel-badge">Menghubungkan server...</div>

      <div class="pixel-section">
        <div class="pixel-subheading">INFORMASI ROOM</div>
        <div class="pixel-room-code-wrap">
          <span class="pixel-label">KODE:</span>
          <span id="host-room-code" class="pixel-value">------</span>
        </div>
        <div class="host-qr-wrap"><canvas id="host-qr" width="140" height="140"></canvas></div>
        <div class="pixel-meta-text" style="text-align:center;font-size:7px;color:#82d82c;margin:2px 0 6px">▲ SCAN QR UNTUK GABUNG ▲</div>
        <div id="host-controller-url" class="pixel-url"></div>
        <div class="pixel-btn-row">
          <button id="host-copy-code" class="pixel-btn" type="button">SALIN KODE</button>
          <button id="host-copy-link" class="pixel-btn" type="button">SALIN LINK</button>
        </div>
      </div>

      <div class="pixel-section">
        <div class="pixel-subheading">KONTROL GAME</div>
        <div id="host-room-status" class="pixel-status-text">Membuat room...</div>
        <div id="host-game-timer" class="pixel-timer-text">⏱ SISA WAKTU: --:--</div>
        <div class="pixel-btn-grid">
          <button id="host-start-game" class="pixel-btn pixel-btn-primary" type="button" disabled>START GAME</button>
          <button id="host-pause-game" class="pixel-btn" type="button" disabled>PAUSE</button>
          <button id="host-resume-game" class="pixel-btn" type="button" disabled>RESUME</button>
          <button id="host-end-game" class="pixel-btn pixel-btn-danger" type="button" disabled>END GAME</button>
          <button id="host-restart-game" class="pixel-btn" type="button" hidden>MULAI ULANG</button>
        </div>
      </div>

      <div class="pixel-section">
        <div class="pixel-subheading">PENGATURAN PERMAINAN</div>
        <div class="pixel-grid-settings">
          <label>Waktu Kuis:
            <select id="host-setting-quiz" class="pixel-select">
              <option value="10">10 Detik</option>
              <option value="15" selected>15 Detik</option>
              <option value="20">20 Detik</option>
              <option value="30">30 Detik</option>
              <option value="45">45 Detik</option>
              <option value="60">60 Detik</option>
            </select>
          </label>
          <label>Durasi Game:
            <select id="host-setting-duration" class="pixel-select">
<<<<<<< HEAD
              <option value="3">3 Menit</option>
              <option value="5">5 Menit</option>
              <option value="10" selected>10 Menit</option>
              <option value="15">15 Menit</option>
              <option value="20">20 Menit</option>
=======
              <option value="10">10 Menit</option>
              <option value="12" selected>12 Menit</option>
              <option value="15">15 Menit</option>
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
            </select>
          </label>
          <label>Poin Benar:
            <select id="host-setting-points" class="pixel-select">
              <option value="5">5 Poin</option>
              <option value="10" selected>10 Poin</option>
              <option value="15">15 Poin</option>
              <option value="20">20 Poin</option>
            </select>
          </label>
        </div>
        <button id="host-apply-settings" class="pixel-btn pixel-btn-muted" style="width:100%; margin-top:4px" type="button">SIMPAN PENGATURAN</button>
      </div>

      <div class="pixel-section">
        <div class="pixel-subheading">LIVE SPECTATOR</div>
        <div class="pixel-btn-row">
<<<<<<< HEAD
          <button id="host-auto-mode" class="pixel-btn active" type="button">AUTO</button>
          <button id="host-manual-mode" class="pixel-btn" type="button">MANUAL</button>
=======
          <button id="host-auto-mode" class="pixel-btn active" type="button">SEMUA PEMAIN</button>
          <button id="host-manual-mode" class="pixel-btn" type="button">IKUTI PEMAIN</button>
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
        </div>
        <input id="host-player-search" class="pixel-input" type="search" placeholder="Cari pemain...">
        <div id="host-watching" class="pixel-meta-text">Kamera: Otomatis</div>
      </div>

      <div class="pixel-section">
        <div class="pixel-subheading">DAFTAR PEMAIN (<span id="host-player-count">0</span>)</div>
        <div id="host-player-list" class="pixel-player-list">Belum ada pemain.</div>
      </div>
    </div>
  `;

  shell.appendChild(panel);

  const $ = (selector) => panel.querySelector(selector);

  const connection = $("#host-connection");
  const roomCodeElement = $("#host-room-code");
  const playerCount = $("#host-player-count");
  const playerList = $("#host-player-list");
  const controllerUrlElement = $("#host-controller-url");
  const qrCanvas = $("#host-qr");
  const copyCodeButton = $("#host-copy-code");
  const copyLinkButton = $("#host-copy-link");
  const roomStatus = $("#host-room-status");
  const gameTimerElement = $("#host-game-timer");
  const startGameButton = $("#host-start-game");
  const pauseGameButton = $("#host-pause-game");
  const resumeGameButton = $("#host-resume-game");
  const endGameButton = $("#host-end-game");
  const restartGameButton = $("#host-restart-game");
  const quizSelect = $("#host-setting-quiz");
  const durationSelect = $("#host-setting-duration");
  const pointsSelect = $("#host-setting-points");
  const applySettingsButton = $("#host-apply-settings");
  const searchInput = $("#host-player-search");
  const watchingLabel = $("#host-watching");
  const autoButton = $("#host-auto-mode");
  const manualButton = $("#host-manual-mode");
  const togglePanelBtn = $("#host-toggle-panel");
  const expandPanelBtn = $("#host-expand-panel");
  const hostCard = $("#host-card");
  const hostMinibar = $("#host-minibar");
  const hostMinibarText = $("#host-minibar-text");

  togglePanelBtn?.addEventListener("click", () => {
    hostCard.hidden = true;
    hostMinibar.hidden = false;
  });

  expandPanelBtn?.addEventListener("click", () => {
    hostCard.hidden = false;
    hostMinibar.hidden = true;
  });

  const hostname = location.hostname || "localhost";
  const serverUrl = import.meta.env.VITE_SERVER_URL || `${location.protocol === "https:" ? "https:" : "http:"}//${hostname}:3001`;
  let controllerUrl = `${location.origin}/client-play/`;

  controllerUrlElement.textContent = controllerUrl;

  let currentHostToken = "";

  copyCodeButton.addEventListener("click", async () => {
    if (!currentRoomCode) return;
    try {
      await navigator.clipboard.writeText(currentRoomCode);
      copyCodeButton.textContent = "TERSALIN";
      setTimeout(() => { copyCodeButton.textContent = "SALIN KODE"; }, 1400);
    } catch {
      roomStatus.textContent = "Salin kode manual: " + currentRoomCode;
    }
  });

  copyLinkButton.addEventListener("click", async () => {
    if (!currentRoomCode) return;
    try {
      await navigator.clipboard.writeText(controllerUrl);
      copyLinkButton.textContent = "TAUTAN TERSALIN";
      setTimeout(() => { copyLinkButton.textContent = "SALIN TAUTAN"; }, 1400);
    } catch {
      roomStatus.textContent = `Buka: ${controllerUrl}`;
    }
  });

  applySettingsButton.addEventListener("click", () => {
    if (!currentRoomCode) return;
    const settings = {
      quizSeconds: Number(quizSelect.value),
      gameMinutes: Number(durationSelect.value),
      correctPoints: Number(pointsSelect.value)
    };
    socket.emit("room:settings", { roomCode: currentRoomCode, hostToken: currentHostToken, settings }, (res) => {
      roomStatus.textContent = res?.ok ? "Pengaturan tersimpan." : (res?.error || "Gagal menyimpan.");
    });
  });

  pauseGameButton.addEventListener("click", () => {
    if (!currentRoomCode) return;
    socket.emit("room:pause", { roomCode: currentRoomCode, hostToken: currentHostToken }, (res) => {
      if (!res?.ok) roomStatus.textContent = res?.error || "Gagal menjeda game.";
    });
  });

  resumeGameButton.addEventListener("click", () => {
    if (!currentRoomCode) return;
    socket.emit("room:resume", { roomCode: currentRoomCode, hostToken: currentHostToken }, (res) => {
      if (!res?.ok) roomStatus.textContent = res?.error || "Gagal melanjutkan game.";
    });
  });

  endGameButton.addEventListener("click", () => {
    if (!currentRoomCode) return;
    if (!window.confirm("Akhiri sesi permainan untuk semua pemain sekarang?")) return;
    socket.emit("room:end", { roomCode: currentRoomCode, hostToken: currentHostToken }, (res) => {
      if (!res?.ok) roomStatus.textContent = res?.error || "Gagal mengakhiri game.";
    });
  });

  restartGameButton.addEventListener("click", () => {
    if (!currentRoomCode) return;
    socket.emit("room:restart", { roomCode: currentRoomCode, hostToken: currentHostToken }, (res) => {
      if (!res?.ok) {
        roomStatus.textContent = res?.error || "Gagal mengatur ulang room.";
        return;
      }
      restartGameButton.hidden = true;
      startGameButton.disabled = players.length === 0;
      roomStatus.textContent = "Sesi baru siap. Pemain dapat bergerak ke garis start.";
      const scene = getWorldScene();
      scene?.resetLocalPlayer?.();
      for (const p of players) {
        const avatar = scene?.remoteAvatars?.get(p.playerId);
        if (avatar) scene.updateRemoteAvatar({ ...p, x: COURSE.startX, y: COURSE.startY, state: "idle", finished: false, score: 0 });
      }
    });
  });

  let hostGameTimerInterval = null;
  function updateHostTimer(endsAt) {
    if (hostGameTimerInterval) clearInterval(hostGameTimerInterval);
    const scene = getWorldScene();
    if (!endsAt) {
      gameTimerElement.textContent = "⏱ SISA WAKTU: --:--";
      if (scene) scene.setGameTimer(null, "ended");
      return;
    }
    const tick = () => {
      const remainingMs = Math.max(0, endsAt - Date.now());
      const totalSec = Math.ceil(remainingMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const formatted = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      gameTimerElement.textContent = `⏱ SISA WAKTU: ${formatted}`;
      if (hostMinibarText) hostMinibarText.textContent = `⚙ ${currentRoomCode} | ⏱ ${formatted}`;
      if (remainingMs <= 0) {
        clearInterval(hostGameTimerInterval);
        gameTimerElement.textContent = "⏱ SELESAI";
      }
    };
    tick();
    hostGameTimerInterval = setInterval(tick, 1000);
    if (scene) scene.setGameTimer(endsAt, "playing");
  }

  startGameButton.addEventListener("click", () => {
    if (!currentRoomCode) return;
    startGameButton.disabled = true;
    socket.timeout(5000).emit("room:start", { roomCode: currentRoomCode, hostToken: currentHostToken }, (error, response) => {
      if (error || !response?.ok) {
        startGameButton.disabled = false;
        roomStatus.textContent = response?.error || "Gagal memulai game.";
        return;
      }
      roomStatus.textContent = "Game berlangsung";
      startGameButton.disabled = true;
      pauseGameButton.disabled = false;
      endGameButton.disabled = false;
      resumeGameButton.disabled = true;
      quizSelect.disabled = true;
      durationSelect.disabled = true;
      pointsSelect.disabled = true;
      applySettingsButton.disabled = true;
      if (response.endsAt) updateHostTimer(response.endsAt);
    });
  });

  const hostAudioBtn = $("#host-audio-btn");
  hostAudioBtn?.addEventListener("click", () => {
    retroAudio.unlock();
    if (!retroAudio.isPlaying) retroAudio.startBGM();
    const muted = retroAudio.toggleMute();
    hostAudioBtn.textContent = muted ? "🔈 MUTE" : "🔊 BGM";
  });

  async function updateRoomQr() {
    controllerUrl = `${location.origin}/client-play/?room=${encodeURIComponent(currentRoomCode)}`;
    controllerUrlElement.textContent = controllerUrl;
    if (hostMinibarText) hostMinibarText.textContent = `⚙ HOST: ${currentRoomCode}`;
    try {
      await QRCode.toCanvas(qrCanvas, controllerUrl, {
        width: 140,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#171324", light: "#ffffff" }
      });
    } catch (error) {
      console.error("[HOST] QR generation failed:", error);
      roomStatus.textContent = "QR gagal dibuat. Bagikan kode atau tautan room.";
    }
  }

  const socket = io(serverUrl, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 10000
  });

  let roomCreated = false;
  let roomRequested = false;
  let currentRoomCode = "";
  let players = [];
  let selectedPlayerId = "";
  let selectedPlayerName = "";
  let mode = "AUTO";
  let pendingWatch = false;
  let createRoomTimeout = null;

  function getWorldScene() {
    if (!game || !game.scene) return null;

    try {
      const scene = game.scene.getScene("WorldScene");

      if (!scene || !scene.sys || !scene.sys.isActive()) {
        return null;
      }

      return scene;
    } catch {
      return null;
    }
  }

  function watchPlayer(player) {
    if (!player || !player.playerId) return;

    selectedPlayerId = player.playerId;
    selectedPlayerName = player.name || "Player";
    watchingLabel.textContent = `Menonton: ${selectedPlayerName}`;

    const scene = getWorldScene();
    if (!scene) return;
    const remote = scene.remoteAvatars?.get(selectedPlayerId);
    if (remote && remote.sprites && remote.sprites[0]) {
      scene.hostFollowPlayer?.(remote);
    }
  }

  function chooseAutomaticPlayer() {
    if (mode !== "AUTO") return;
<<<<<<< HEAD

    if (!players.length) {
      selectedPlayerId = "";
      selectedPlayerName = "";
      watchingLabel.textContent = "Kamera: Otomatis";
      const scene = getWorldScene();
      scene?.hostClearFollow?.();
      return;
    }

    const currentStillExists = players.some(
      (player) => player.playerId === selectedPlayerId
    );

    if (currentStillExists) return;

    watchPlayer(players[0]);
=======
    selectedPlayerId = "";
    selectedPlayerName = "";
    watchingLabel.textContent = players.length
      ? `SPECTATOR: SEMUA PEMAIN (${players.length})`
      : "SPECTATOR: MENUNGGU PEMAIN";
    const scene = getWorldScene();
    scene?.hostShowAllPlayers?.();
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
  }

  function updateModeButtons() {
    autoButton.classList.toggle("active", mode === "AUTO");
    manualButton.classList.toggle("active", mode === "MANUAL");
  }

  autoButton.addEventListener("click", () => {
    mode = "AUTO";
    updateModeButtons();
    chooseAutomaticPlayer();
  });

  manualButton.addEventListener("click", () => {
    mode = "MANUAL";
    updateModeButtons();
    watchingLabel.textContent = selectedPlayerId
      ? `MANUAL: ${selectedPlayerName}`
      : "Pilih pemain dari daftar.";
  });

<<<<<<< HEAD
  function renderPlayers() {
=======

  // ---- TV spectator HUD (stage badge + live leaderboard), reference layout ----
  const tvHud = document.createElement("div");
  tvHud.id = "tv-hud";
  tvHud.innerHTML = `
    <div class="tv-stage"><div class="tv-stage-medal">★</div>
      <div><div id="tv-stage-name" class="tv-stage-name">MÜNCHEN</div><div id="tv-stage-sub" class="tv-stage-sub">MARIENPLATZ</div></div></div>
    <div class="tv-board" id="tv-board"></div>`;
  document.body.appendChild(tvHud);
  window.addEventListener("bai-stage", (event) => {
    const stage = event.detail || {};
    const n = document.getElementById("tv-stage-name"), sub = document.getElementById("tv-stage-sub");
    if (n && stage.name) n.textContent = String(stage.name).toUpperCase();
    if (sub && stage.landmark) sub.textContent = String(stage.landmark).toUpperCase();
  });
  function renderTvHud(list) {
    const board = document.getElementById("tv-board");
    if (!board) return;
    board.replaceChildren();
    [...list].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)).slice(0, 8).forEach((p, i) => {
      const row = document.createElement("div"); row.className = "tv-row";
      const chip = document.createElement("span"); chip.className = "tv-chip"; chip.textContent = `P${i + 1}`;
      const name = document.createElement("span"); name.className = "tv-name";
      name.textContent = (i === 0 ? "♛ " : "") + (p.name || "Player");
      const score = document.createElement("span"); score.className = "tv-score"; score.textContent = String(Number(p.score) || 0);
      row.append(chip, name, score); board.appendChild(row);
    });
    tvHud.hidden = list.length === 0 && !window.__baiHostActive;
  }

  function renderPlayers() {
    renderTvHud(players);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    const search = searchInput.value.trim().toLowerCase();

    playerList.replaceChildren();

    const rankedPlayers = [...players].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const filteredPlayers = rankedPlayers.filter((player) =>
      String(player.name || "Player").toLowerCase().includes(search)
    );

    if (!filteredPlayers.length) {
      playerList.textContent = players.length
        ? "Pemain tidak ditemukan."
        : "Belum ada pemain.";
      return;
    }

    filteredPlayers.forEach((player) => {
      const row = document.createElement("div");
      row.className = "host-player-row";

      const name = document.createElement("span");
      const rank = rankedPlayers.indexOf(player) + 1;
      name.textContent =
        `${rank}. ${player.name || "Player"}`;

      const status = document.createElement("span");
      status.className = "host-player-status";
      status.textContent = player.connected === false ? "OFFLINE" : "SIAP";

      const score = document.createElement("span");
      score.className = "host-player-score";
      score.textContent = `${Number(player.score) || 0} pts`;

      const watchButton = document.createElement("button");
      watchButton.type = "button";
      watchButton.className = "pixel-btn pixel-btn-sm";
      watchButton.textContent =
        player.playerId === selectedPlayerId
          ? "DITONTON"
          : "TONTON";

      watchButton.addEventListener("click", () => {
        mode = "MANUAL";
        updateModeButtons();
        watchPlayer(player);
        renderPlayers();
      });

      const kickButton = document.createElement("button");
      kickButton.type = "button";
      kickButton.className = "pixel-btn pixel-btn-danger pixel-btn-sm";
      kickButton.textContent = "KICK";
      kickButton.addEventListener("click", () => {
        if (!window.confirm(`Keluarkan ${player.name || "pemain"} dari room?`)) return;
        socket.emit("room:kick", { roomCode: currentRoomCode, hostToken: currentHostToken, playerId: player.playerId }, (res) => {
          if (!res?.ok) roomStatus.textContent = res?.error || "Gagal mengeluarkan pemain.";
        });
      });

      row.append(name, status, score, watchButton, kickButton);
      playerList.appendChild(row);
    });
  }

  searchInput.addEventListener("input", renderPlayers);

  function createRoom() {
    if (roomCreated || roomRequested) return;
    roomRequested = true;
    if (!socket.connected) {
      connection.textContent = "Menghubungkan server...";
      socket.connect();
      setTimeout(() => {
        if (!socket.connected && roomRequested) {
          roomRequested = false;
          connection.textContent = "Server tidak tersedia. Game berjalan offline.";
          onRoomCreated({ roomCode: "", offline: true });
        }
      }, 10000);
      return;
    }
    createRoomOnServer();
  }

  function createRoomOnServer() {
    connection.textContent = "Membuat room...";
    clearTimeout(createRoomTimeout);
    createRoomTimeout = setTimeout(() => {
      if (roomCreated) return;
      roomRequested = false;
      connection.textContent = "Server tidak merespons. Game berjalan offline.";
      onRoomCreated({ roomCode: "", offline: true });
    }, 8000);

    socket.timeout(8000).emit("room:create", { name: "Host" }, (error, response) => {
      clearTimeout(createRoomTimeout);
      if (error || !response || !response.ok) {
        roomRequested = false;
        connection.textContent = response?.error || "Gagal membuat room. Coba lagi.";
        console.error("[HOST] Pembuatan room gagal:", error || response?.error);
        return;
      }

      roomCreated = true;
      panel.hidden = false;
      currentHostToken = response.hostToken || "";
      currentRoomCode = response.roomCode;
      roomCodeElement.textContent = currentRoomCode;
      if (hostMinibarText) hostMinibarText.textContent = `⚙ HOST: ${currentRoomCode}`;
      startGameButton.disabled = false;
      roomStatus.textContent = "Room siap. Menunggu pemain...";

      socket.emit("tv:subscribe", { roomCode: currentRoomCode, hostToken: currentHostToken }, (result) => {
        if (!result?.ok) {
          roomStatus.textContent = result?.error || "Status room gagal dimuat.";
          return;
        }
        players = result.players || [];
        playerCount.textContent = players.length;
        renderPlayers();
        const scene = getWorldScene();
        if (scene) {
          scene.setLeaderboardData(players);
          if (Array.isArray(result.avatars)) {
            for (const av of result.avatars) scene.createRemoteAvatar(av);
          }
        }
        chooseAutomaticPlayer();
      });

      updateRoomQr();
      console.log("[HOST] Room dibuat:", currentRoomCode);
      onRoomCreated({ roomCode: currentRoomCode });
    });
  }

  // MULTIPLAYER AVATAR EVENTS ON HOST (TV SCREEN)
  socket.on("room:question-boxes", (positions = []) => {
    if (!Array.isArray(positions)) return;
    const scene = getWorldScene();
    const byId = new Map(positions.map((pos) => [pos.id, pos]));
    for (const box of scene?.questionBoxes || []) {
      const pos = byId.get(box.getData("boxId"));
      if (!pos) continue;
      box.setPosition(pos.x, pos.y);
      box.setData("originalY", pos.y);
      box.refreshBody?.();
    }
  });

  socket.on("players:state", (playerList = []) => {
    const scene = getWorldScene();
    if (!scene || !Array.isArray(playerList)) return;
    for (const p of playerList) {
      scene.createRemoteAvatar(p);
    }
    chooseAutomaticPlayer();
  });

  socket.on("player:joined", (player) => {
    if (!player?.playerId) return;
    const scene = getWorldScene();
    if (scene) {
      scene.createRemoteAvatar(player);
      scene.showFloatingFeedback?.(player.x || 240, player.y || 208, `${player.name} BERGABUNG!`, "#82d82c");
    }
<<<<<<< HEAD
    if (mode === "AUTO" && !selectedPlayerId) {
      watchPlayer(player);
=======
    if (mode === "AUTO") {
      chooseAutomaticPlayer();
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    }
  });

  socket.on("connect", () => {
    connection.textContent = "SERVER TERHUBUNG";
    connection.classList.add("host-online");
    if (roomRequested && !roomCreated) {
      createRoomOnServer();
    } else if (roomCreated && currentRoomCode) {
      socket.emit("tv:subscribe", { roomCode: currentRoomCode, hostToken: currentHostToken }, (result) => {
        if (!result?.ok) return;
        players = result.players || [];
        playerCount.textContent = players.length;
        renderPlayers();
        const scene = getWorldScene();
        if (scene) {
          scene.setLeaderboardData(players);
          if (Array.isArray(result.avatars)) {
            for (const av of result.avatars) scene.createRemoteAvatar(av);
          }
        }
      });
    }
  });

  socket.on("connect_error", (error) => {
    connection.textContent = "Server tidak tersedia. Menghubungkan ulang...";
    connection.classList.remove("host-online");
    console.error("[HOST] Koneksi server gagal:", error.message);
  });

  socket.on("disconnect", () => {
    connection.textContent = "SERVER TERPUTUS";
    connection.classList.remove("host-online");
  });

  socket.on("room:status", ({ status, endsAt, remainingMs, reason, leaderboard } = {}) => {
    const scene = getWorldScene();
    if (status === "playing") {
<<<<<<< HEAD
=======
      // TV: collapse the dashboard once the game starts so the playfield is fully visible.
      if (!hostCard.hidden && !window.__baiAutoCollapsed) { window.__baiAutoCollapsed = true; togglePanelBtn?.click(); }
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      roomStatus.textContent = "Game berlangsung";
      startGameButton.disabled = true;
      pauseGameButton.disabled = false;
      resumeGameButton.disabled = true;
      endGameButton.disabled = false;
      quizSelect.disabled = true;
      durationSelect.disabled = true;
      pointsSelect.disabled = true;
      applySettingsButton.disabled = true;
      if (endsAt) updateHostTimer(endsAt);
      if (scene) scene.setGameTimer(endsAt, "playing");
    } else if (status === "paused") {
      roomStatus.textContent = "Game dijeda";
      startGameButton.disabled = true;
      pauseGameButton.disabled = true;
      resumeGameButton.disabled = false;
      endGameButton.disabled = false;
      if (hostGameTimerInterval) clearInterval(hostGameTimerInterval);
      const sec = Math.ceil((remainingMs || 0) / 1000);
      gameTimerElement.textContent = `⏱ SISA WAKTU: ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} (PAUSED)`;
      if (scene) scene.setGameTimer(null, "paused", remainingMs);
    } else if (status === "ended") {
<<<<<<< HEAD
=======
      window.__baiAutoCollapsed = false;
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      roomStatus.textContent = `Game selesai (${reason || "selesai"}).`;
      startGameButton.disabled = true;
      pauseGameButton.disabled = true;
      resumeGameButton.disabled = true;
      endGameButton.disabled = true;
      updateHostTimer(null);
      gameTimerElement.textContent = "GAME OVER";
      if (scene) {
        scene.setGameTimer(null, "ended");
        if (Array.isArray(leaderboard)) scene.showPodium?.(leaderboard);
      }
      if (leaderboard?.length) renderPlayers();
    } else {
      roomStatus.textContent = "Room siap. Menunggu dimulai...";
      startGameButton.disabled = false;
      pauseGameButton.disabled = true;
      resumeGameButton.disabled = true;
      endGameButton.disabled = true;
      updateHostTimer(null);
      if (scene) scene.setGameTimer(null, "waiting");
    }
  });

  socket.on("player:moved", (data) => {
    if (!data?.playerId) return;
    const scene = getWorldScene();
    if (!scene) return;
    scene.updateRemoteAvatar(data);

    if (mode === "AUTO") {
<<<<<<< HEAD
      if (!selectedPlayerId || selectedPlayerId === data.playerId) {
        const remote = scene.remoteAvatars?.get(data.playerId);
        if (remote) scene.hostFollowPlayer?.(remote);
      }
=======
      scene.hostShowAllPlayers?.();
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    } else if (mode === "MANUAL" && data.playerId === selectedPlayerId) {
      const remote = scene.remoteAvatars?.get(data.playerId);
      if (remote) scene.hostFollowPlayer?.(remote);
    }
  });

  socket.on("player:left", (data) => {
    const playerId = data?.playerId;
    if (!playerId) return;
    const scene = getWorldScene();
    if (scene) scene.removeRemoteAvatar(playerId);

    if (playerId === selectedPlayerId) {
      selectedPlayerId = "";
      selectedPlayerName = "";
<<<<<<< HEAD
      watchingLabel.textContent = "Kamera: Otomatis";
=======
      watchingLabel.textContent = "SPECTATOR: SEMUA PEMAIN";
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      scene?.hostClearFollow?.();
      if (mode === "AUTO") chooseAutomaticPlayer();
    }
  });

  socket.on("room:players", (updatedPlayers = []) => {
    if (!Array.isArray(updatedPlayers)) return;
    players = updatedPlayers;
    playerCount.textContent = players.length;
    renderPlayers();
    const scene = getWorldScene();
    if (scene) scene.setLeaderboardData(players);
    chooseAutomaticPlayer();
  });

  socket.on("tv:leaderboard", (updatedPlayers = []) => {
    if (!Array.isArray(updatedPlayers)) return;
    players = updatedPlayers;
    playerCount.textContent = players.length;
    renderPlayers();
    const scene = getWorldScene();
    if (scene) scene.setLeaderboardData(players);
  });

  socket.on("game:ended", ({ leaderboard } = {}) => {
    const scene = getWorldScene();
    if (scene && Array.isArray(leaderboard)) {
      scene.showPodium?.(leaderboard);
      scene.setGameTimer(null, "ended");
    }
  });

  socket.on("tv:quiz-status", ({ playerId, status } = {}) => {
    const scene = getWorldScene();
    if (!scene) return;
    const remote = scene.remoteAvatars?.get(playerId);
    if (remote) {
      scene.showFloatingFeedback?.(
        remote.x,
        remote.y,
        status === "correct" ? "+PTS!" : status === "timeout" ? "WAKTU HABIS" : "SALAH!",
        status === "correct" ? "#82d82c" : "#f24b4b"
      );
    }
  });

  updateModeButtons();

  return {
    socket,
    createRoom,
    show: () => { panel.hidden = false; },
    getRoomCode: () => currentRoomCode
  };
}
