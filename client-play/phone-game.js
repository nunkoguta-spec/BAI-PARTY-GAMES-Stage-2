
import Phaser from "phaser";
import { THEME } from "../src/theme.js";
import { BootScene } from "../src/scenes/BootScene.js";
import { WorldScene } from "../src/scenes/WorldScene.js";

export function createPhoneGame({
  parent,
  socket,
  roomCode,
  avatar,
  questionBoxPositions,
  onSceneReady,
  onQuizError
}) {
  class PhoneWorldScene extends WorldScene {
    create() {
      this.localAvatarSelection = avatar || null;
      this.questionBoxPositions = questionBoxPositions || null;
      super.create();
      this.gameStarted = true;
      if (this.localAvatarSelection && this.player) this.applyAvatarSelection(this.localAvatarSelection);

      this.lastNetworkUpdate = 0;

      console.log("[PHONE NETWORK] Scene siap.");
      console.log("[PHONE NETWORK] Socket ID:", socket.id);
      console.log("[PHONE NETWORK] Room:", roomCode);

      // =====================================================
      // MENERIMA DAFTAR PEMAIN
      // =====================================================

      const handlePlayersState = (players = []) => {
        if (!Array.isArray(players)) return;

        for (const player of players) {
          if (!player?.playerId) continue;
          if (player.playerId === socket.id) continue;

          this.createRemoteAvatar(player);
        }
      };

      // =====================================================
      // PEMAIN BARU BERGABUNG
      // =====================================================

      const handlePlayerJoined = (player) => {
        if (!player?.playerId) return;
        if (player.playerId === socket.id) return;

        this.createRemoteAvatar(player);
      };

      // =====================================================
      // POSISI PEMAIN BERUBAH
      // =====================================================

      const handlePlayerMoved = (player) => {
        if (!player?.playerId) return;
        if (player.playerId === socket.id) return;

        this.updateRemoteAvatar(player);
      };

      // =====================================================
      // PEMAIN KELUAR
      // =====================================================

      const handlePlayerLeft = ({ playerId } = {}) => {
        if (!playerId) return;
        this.removeRemoteAvatar(playerId);
      };

      // =====================================================
      // DAFTARKAN SOCKET LISTENERS
      // =====================================================

      const handleQuestionBoxes = (positions) => {
        if (!Array.isArray(positions) || !this.questionBoxes) return;
        const byId = new Map(positions.map((pos) => [pos.id, pos]));
        for (const box of this.questionBoxes) {
          const pos = byId.get(box.getData("boxId"));
          if (!pos) continue;
          box.setPosition(pos.x, pos.y);
          box.setData("originalY", pos.y);
          box.refreshBody();
        }
      };
      socket.on("room:question-boxes", handleQuestionBoxes);
      socket.on("players:state", handlePlayersState);
      socket.on("player:joined", handlePlayerJoined);
      socket.on("player:moved", handlePlayerMoved);
      socket.on("player:left", handlePlayerLeft);

      // Leaderboard updates from server
      const handleLeaderboard = (players) => {
        this.setLeaderboardData(players);
      };
      socket.on("tv:leaderboard", handleLeaderboard);

      const handleQuizResult = (result) => {
        if (!result) return;
        if (result.correct) {
          this.showFloatingFeedback?.(this.player?.x || 240, this.player?.y || 208, `+${result.scoreChange || 10} PTS!`, "#82d82c");
        } else {
          this.showFloatingFeedback?.(this.player?.x || 240, this.player?.y || 208, "SALAH!", "#f24b4b");
          this.setAvatarAnimation?.(`hurt-${this.playerFacing}`);
        }
      };
      socket.on("quiz:result", handleQuizResult);

      const handleGameEnded = ({ leaderboard } = {}) => {
        if (Array.isArray(leaderboard)) {
          this.showPodium?.(leaderboard);
        }
      };
      socket.on("game:ended", handleGameEnded);

      // =====================================================
      // BERSIHKAN LISTENERS SAAT SCENE DITUTUP
      // =====================================================

      this.events.once(
        "shutdown",
        () => {
          socket.off("room:question-boxes", handleQuestionBoxes);
          socket.off("players:state", handlePlayersState);
          socket.off("player:joined", handlePlayerJoined);
          socket.off("player:moved", handlePlayerMoved);
          socket.off("player:left", handlePlayerLeft);
          socket.off("tv:leaderboard", handleLeaderboard);
          socket.off("quiz:result", handleQuizResult);
          socket.off("game:ended", handleGameEnded);
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
              this.quizPaused = false;
              this.activeQuestionBoxId = null;
              const box = this.questionBoxes?.find(item => item.getData("boxId") === boxId);
              if (box) box.setData("used", false);
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

      if (this.quizPaused) return;
      if (!this.player || !this.player.body) return;
      if (!socket.connected) return;

      if (time - this.lastNetworkUpdate < 100) return;

      this.lastNetworkUpdate = time;

      socket.emit("player:move", {
        roomCode,
        x: this.player.x,
        y: this.player.y,
        vx: this.player.body.velocity.x,
        vy: this.player.body.velocity.y,
        facing: this.playerFacing || "right",
        state: this.networkCharacterState?.state || "idle",
        grounded: this.networkCharacterState?.grounded ?? this.player.body.onFloor()
      });
    }
  }

  // =====================================================
  // PHASER GAME CONFIGURATION — mobile starts WorldScene directly
  // =====================================================

  class PhoneBootScene extends BootScene {
    create() {
      if (!this.scene.isActive("WorldScene")) {
        this.scene.start("WorldScene");
      }
    }
  }

  return new Phaser.Game({
    type: Phaser.CANVAS,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoRound: true,
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
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 480,
      height: 270
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
      PhoneBootScene,
      PhoneWorldScene
    ]
  });
}
