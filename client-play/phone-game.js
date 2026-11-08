
import Phaser from "phaser";
import { THEME } from "../src/theme.js";
import { BootScene } from "../src/scenes/BootScene.js";
import { WorldScene } from "../src/scenes/WorldScene.js";

export function createPhoneGame({
  parent,
  socket,
  roomCode,
  onSceneReady,
  onQuizError
}) {
  class PhoneWorldScene extends WorldScene {
    create() {
      super.create();

      this.lastNetworkUpdate = 0;

      console.log("[PHONE NETWORK] Scene siap.");
      console.log("[PHONE NETWORK] Socket ID:", socket.id);
      console.log("[PHONE NETWORK] Room:", roomCode);

      // =====================================================
      // MENERIMA DAFTAR PEMAIN
      // =====================================================

      const handlePlayersState = (players = []) => {
        console.log(
          "[PHONE NETWORK] players:state diterima:",
          players
        );

        if (!Array.isArray(players)) return;

        for (const player of players) {
          if (!player?.playerId) continue;
          if (player.playerId === socket.id) continue;

          console.log(
            "[PHONE NETWORK] Membuat avatar dari state:",
            player.name,
            player.playerId,
            player.x,
            player.y
          );

          this.createRemoteAvatar(player);
        }

        console.log(
          "[PHONE NETWORK] Total remote avatar:",
          this.remoteAvatars?.size
        );
      };

      // =====================================================
      // PEMAIN BARU BERGABUNG
      // =====================================================

      const handlePlayerJoined = (player) => {
        console.log(
          "[PHONE NETWORK] player:joined diterima:",
          player
        );

        if (!player?.playerId) return;
        if (player.playerId === socket.id) return;

        this.createRemoteAvatar(player);

        console.log(
          "[PHONE NETWORK] Avatar pemain baru dibuat:",
          player.name
        );
      };

      // =====================================================
      // POSISI PEMAIN BERUBAH
      // =====================================================

      const handlePlayerMoved = (player) => {
        if (!player?.playerId) return;
        if (player.playerId === socket.id) return;

        console.log(
          "[PHONE NETWORK] POSISI REMOTE:",
          JSON.stringify(player),
          "POSISI SAYA:",
          this.player?.x,
          this.player?.y,
          "CAMERA:",
          this.cameras.main.worldView
        );

        this.updateRemoteAvatar(player);
      };

      // =====================================================
      // PEMAIN KELUAR
      // =====================================================

      const handlePlayerLeft = ({ playerId } = {}) => {
        console.log(
          "[PHONE NETWORK] player:left diterima:",
          playerId
        );

        if (!playerId) return;

        this.removeRemoteAvatar(playerId);
      };

      // =====================================================
      // DAFTARKAN SOCKET LISTENERS
      // =====================================================

      socket.on("players:state", handlePlayersState);
      socket.on("player:joined", handlePlayerJoined);
      socket.on("player:moved", handlePlayerMoved);
      socket.on("player:left", handlePlayerLeft);

      // =====================================================
      // BERSIHKAN LISTENERS SAAT SCENE DITUTUP
      // =====================================================

      this.events.once(
        Phaser.Scenes.Events.SHUTDOWN,
        () => {
          console.log("[PHONE NETWORK] Membersihkan listeners.");

          socket.off("players:state", handlePlayersState);
          socket.off("player:joined", handlePlayerJoined);
          socket.off("player:moved", handlePlayerMoved);
          socket.off("player:left", handlePlayerLeft);
        }
      );

      // =====================================================
      // MINTA DATA PEMAIN LAIN KE SERVER
      // =====================================================

      if (socket.connected) {
        console.log(
          "[PHONE NETWORK] Meminta daftar pemain:",
          roomCode
        );

        socket.emit(
          "players:request",
          { roomCode },
          (result) => {
            console.log(
              "[PHONE NETWORK] Hasil players:request:",
              result
            );

            if (!result?.ok) {
              console.warn(
                "[PHONE NETWORK] Gagal mengambil daftar pemain:",
                result?.error
              );
            } else {
              console.log(
                "[PHONE NETWORK] Jumlah pemain lain:",
                result.count
              );
            }
          }
        );
      } else {
        console.warn(
          "[PHONE NETWORK] Socket belum terhubung saat scene dibuat."
        );
      }

      // =====================================================
      // REQUEST QUIZ
      // =====================================================

      this.events.on("question-box-hit", ({ boxId }) => {
        console.log(
          "[PHONE QUIZ] Question box terkena:",
          boxId
        );

        socket.emit(
          "quiz:request",
          { roomCode, boxId },
          (result) => {
            console.log(
              "[PHONE QUIZ] Hasil request:",
              result
            );

            if (!result?.ok) {
              onQuizError?.(
                result?.error || "Quiz gagal dimulai."
              );
            }
          }
        );
      });

      // =====================================================
      // SCENE READY
      // =====================================================

      console.log("[PHONE NETWORK] Scene siap digunakan.");

      onSceneReady?.(this);
    }

    // =====================================================
    // UPDATE DAN KIRIM POSISI PEMAIN SENDIRI
    // =====================================================

    update(time, delta) {
      super.update(time, delta);

      if (!this.player || !this.player.body) return;
      if (!socket.connected) return;

      if (time - this.lastNetworkUpdate < 100) return;

      this.lastNetworkUpdate = time;

      socket.emit("player:move", {
        roomCode,
        x: this.player.x,
        y: this.player.y,
        facing: this.playerFacing || "right"
      });
    }
  }

  // =====================================================
  // PHASER GAME CONFIGURATION
  // =====================================================

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 480,
    height: 270,
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
      autoCenter: Phaser.Scale.CENTER_BOTH
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
      PhoneWorldScene
    ]
  });
}
