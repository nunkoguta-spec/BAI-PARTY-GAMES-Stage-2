
import { io } from "socket.io-client";

export function setupHostPanel(shell, game) {
  const panel = document.createElement("section");
  panel.id = "bai-host-panel";

  panel.innerHTML = `
    <div class="host-heading">
      <span class="host-dot"></span>
      BAI PARTY GAMES HOST
    </div>

    <div id="host-connection">Menghubungkan server...</div>

    <div class="host-room-label">ROOM CODE</div>
    <div id="host-room-code">------</div>

    <div class="host-qr-wrap">
      <img id="host-qr" alt="QR Controller HP">
    </div>

    <div id="host-controller-url"></div>

    <div class="host-spectator">
      <div class="host-player-heading">LIVE SPECTATOR</div>

      <div class="host-spectator-modes">
        <button id="host-auto-mode" type="button">AUTO</button>
        <button id="host-manual-mode" type="button">MANUAL</button>
      </div>

      <input
        id="host-player-search"
        type="search"
        placeholder="Cari nama pemain..."
        autocomplete="off"
      >

      <div id="host-watching">Belum memilih pemain.</div>
    </div>

    <div class="host-player-heading">
      PEMAIN BERGABUNG
      <span id="host-player-count">0</span>
    </div>

    <div id="host-player-list">
      Belum ada pemain.
    </div>
  `;

  shell.appendChild(panel);

  const $ = (selector) => panel.querySelector(selector);

  const connection = $("#host-connection");
  const roomCodeElement = $("#host-room-code");
  const playerCount = $("#host-player-count");
  const playerList = $("#host-player-list");
  const qr = $("#host-qr");
  const controllerUrlElement = $("#host-controller-url");
  const searchInput = $("#host-player-search");
  const watchingLabel = $("#host-watching");
  const autoButton = $("#host-auto-mode");
  const manualButton = $("#host-manual-mode");

  const hostname = location.hostname || "localhost";
  const controllerUrl = `http://${hostname}:5173/client-play/`;

  controllerUrlElement.textContent = controllerUrl;

  qr.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" +
    encodeURIComponent(controllerUrl);

  const socket = io(`http://${hostname}:3001`, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 10000
  });

  let roomCreated = false;
  let currentRoomCode = "";
  let players = [];
  let selectedPlayerId = "";
  let selectedPlayerName = "";
  let mode = "AUTO";
  let pendingWatch = false;

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

  function removeSpectatorAvatar(scene) {
    if (!scene || !scene.remoteAvatars) return;

    for (const [playerId] of scene.remoteAvatars) {
      scene.removeRemoteAvatar(playerId);
    }

    scene.cameras.main.stopFollow();
  }

  function watchPlayer(player) {
    if (!player || !player.playerId || !currentRoomCode) return;

    selectedPlayerId = player.playerId;
    selectedPlayerName = player.name || "Player";
    watchingLabel.textContent = `Memuat ${selectedPlayerName}...`;

    pendingWatch = true;

    socket.emit(
      "tv:watch",
      {
        roomCode: currentRoomCode,
        playerId: selectedPlayerId
      },
      (response) => {
        if (!response || !response.ok || !response.player) {
          watchingLabel.textContent =
            response?.error || "Gagal mengikuti pemain.";
          return;
        }

        const snapshot = response.player;

        const scene = getWorldScene();

        if (!scene) {
          pendingWatch = true;
          return;
        }

        pendingWatch = false;

        removeSpectatorAvatar(scene);

        scene.createRemoteAvatar({
          ...snapshot,
          playerId: selectedPlayerId,
          name: selectedPlayerName
        });

        const remote = scene.remoteAvatars.get(selectedPlayerId);

        if (remote && remote.sprites && remote.sprites[0]) {
          scene.cameras.main.startFollow(
            remote.sprites[0],
            true,
            0.12,
            0
          );
        }

        watchingLabel.textContent =
          `TV sedang menonton: ${selectedPlayerName}`;
      }
    );
  }

  function chooseAutomaticPlayer() {
    if (mode !== "AUTO") return;

    if (!players.length) {
      selectedPlayerId = "";
      selectedPlayerName = "";
      watchingLabel.textContent = "Menunggu pemain...";
      return;
    }

    const currentStillExists = players.some(
      (player) => player.playerId === selectedPlayerId
    );

    if (currentStillExists) return;

    watchPlayer(players[0]);
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

  function renderPlayers() {
    const search = searchInput.value.trim().toLowerCase();

    playerList.replaceChildren();

    const filteredPlayers = players.filter((player) =>
      String(player.name || "Player").toLowerCase().includes(search)
    );

    if (!filteredPlayers.length) {
      playerList.textContent = players.length
        ? "Pemain tidak ditemukan."
        : "Belum ada pemain.";
      return;
    }

    filteredPlayers.forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "host-player-row";

      const name = document.createElement("span");
      name.textContent =
        `${index + 1}. ${player.name || "Player"}`;

      const score = document.createElement("span");
      score.className = "host-player-score";
      score.textContent = `${Number(player.score) || 0} pts`;

      const watchButton = document.createElement("button");
      watchButton.type = "button";
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

      row.append(name, score, watchButton);
      playerList.appendChild(row);
    });
  }

  searchInput.addEventListener("input", renderPlayers);

  socket.on("connect", () => {
    connection.textContent = "SERVER TERHUBUNG";
    connection.classList.add("host-online");

    if (roomCreated) return;

    socket.emit("room:create", { name: "Host" }, (response) => {
      if (!response || !response.ok) {
        connection.textContent =
          response?.error || "Gagal membuat room";
        return;
      }

      roomCreated = true;
      currentRoomCode = response.roomCode;

      roomCodeElement.textContent = currentRoomCode;

      console.log("[HOST] Room dibuat:", currentRoomCode);
    });
  });

  socket.on("disconnect", () => {
    connection.textContent = "SERVER TERPUTUS";
    connection.classList.remove("host-online");
  });

  socket.on("connect_error", (error) => {
    connection.textContent = "GAGAL TERHUBUNG KE SERVER";
    console.error("[HOST] Socket error:", error.message);
  });

  socket.on("room:players", (updatedPlayers = []) => {
    if (!Array.isArray(updatedPlayers)) return;

    players = updatedPlayers;
    playerCount.textContent = players.length;

    const selectedStillExists = players.some(
      (player) => player.playerId === selectedPlayerId
    );

    if (!selectedStillExists && selectedPlayerId) {
      selectedPlayerId = "";
      selectedPlayerName = "";
      removeSpectatorAvatar(getWorldScene());
    }

    renderPlayers();
    chooseAutomaticPlayer();
  });

  socket.on("tv:player-move", (data) => {
    if (!data || data.playerId !== selectedPlayerId) return;

    const scene = getWorldScene();
    if (!scene) return;

    scene.updateRemoteAvatar({
      ...data,
      name: selectedPlayerName
    });
  });

  socket.on("player:left", (data) => {
    if (!data || data.playerId !== selectedPlayerId) return;

    selectedPlayerId = "";
    selectedPlayerName = "";

    removeSpectatorAvatar(getWorldScene());

    if (mode === "AUTO") {
      chooseAutomaticPlayer();
    } else {
      watchingLabel.textContent = "Pemain yang ditonton keluar.";
    }
  });

  // Tunggu sampai WorldScene aktif sebelum membuat avatar spectator.
  if (game && game.events) {
    const checkSceneReady = () => {
      if (!getWorldScene()) return;

      game.events.off("step", checkSceneReady);

      if (pendingWatch && selectedPlayerId) {
        const player = players.find(
          (item) => item.playerId === selectedPlayerId
        );

        if (player) watchPlayer(player);
      }
    };

    game.events.on("step", checkSceneReady);
  }

  updateModeButtons();

  return {
    socket,
    getRoomCode: () => currentRoomCode
  };
}
