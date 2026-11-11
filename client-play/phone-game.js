
import Phaser from "phaser";
import { THEME } from "../src/theme.js";
import { BootScene } from "../src/scenes/BootScene.js";
import { WorldScene } from "../src/scenes/WorldScene.js";
import { COURSE } from "../src/game/course.js";

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
    applyCourse(course = {}) {
      if (!this.player || !this.groundLayer || !this.platformLayer) {
        this.pendingCourse = course;
        return;
      }
      this.worldWidth = Number(course.width) || this.worldWidth;
      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.hazardDefinitions = Array.isArray(course.hazards) ? course.hazards : COURSE.hazards;
      this.questionDefinitions = Array.isArray(course.questionBoxes) ? course.questionBoxes : this.courseQuestionDefaults;
      this.slugDefinitions = Array.isArray(course.slugs) ? course.slugs : COURSE.slugs;
      if (course.startedAt) this.gameStartedAt = course.startedAt;
      this.rebuildCourseObjects();
    }

    rebuildCourseObjects() {
      // WorldScene already builds these from shared COURSE metadata before scene ready.
      // Replace only if server delivered a different map width/config; never tear down active collider network.
      if (!this.player || !this.groundLayer || !this.platformLayer) return;
      this.worldWidth = Number(this.pendingCourse?.width) || this.worldWidth;
      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.handleViewportResize();
    }

    create() {
      this.localAvatarSelection = avatar || null;
      this.questionBoxPositions = questionBoxPositions || null;
      super.create();
      this.gameStarted = true;
      this.courseQuestionDefaults = COURSE.questionBoxes;
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
      const handlePlayerCorrection = (position) => {
        if (position?.playerId !== socket.id || !this.player?.body) return;
        const x = Number(position.x);
        const y = Number(position.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (Math.hypot(this.player.x - x, this.player.y - y) > 24) {
          this.player.setPosition(x, y);
          this.player.body.reset(x, y);
          this.player.body.setVelocity(Number(position.vx) || 0, Number(position.vy) || 0);
        }
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
      socket.on("player:correction", handlePlayerCorrection);
      socket.on("player:left", handlePlayerLeft);

      // Leaderboard updates from server
      const handleLeaderboard = (players) => {
        this.setLeaderboardData(players);
      };
      const handleHazardHit = (result) => {
        if (result?.playerId === socket.id) this.handleAuthoritativeHazardHit(result);
      };
      const handleSlugState = (data) => {
        if (!data?.playerId || data.playerId === socket.id) return;
        this.updateRemoteAvatar(data);
      };
      const handleFinishedPeer = (data) => {
        if (!data?.playerId || data.playerId === socket.id) return;
        this.updateRemoteAvatar({ ...data, state: "idle", finished: true });
      };
      const handleFinished = (result) => {
        if (result?.playerId === socket.id) this.handleAuthoritativeFinish(result);
      };
      socket.on("tv:leaderboard", handleLeaderboard);
      socket.on("hazard:hit", handleHazardHit);
      socket.on("player:moved", handleSlugState);
      socket.on("player:finished", handleFinished);
      socket.on("tv:player-finished", handleFinishedPeer);

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
          socket.off("player:correction", handlePlayerCorrection);
          socket.off("player:left", handlePlayerLeft);
          socket.off("tv:leaderboard", handleLeaderboard);
          socket.off("hazard:hit", handleHazardHit);
          socket.off("player:moved", handleSlugState);
          socket.off("player:finished", handleFinished);
          socket.off("tv:player-finished", handleFinishedPeer);
          this.events.off("hazard-hit", this._hazardSyncHandler);
          this.events.off("slug-hit", this._slugSyncHandler);

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

      this._hazardSyncHandler = ({ hazardId }) => {
        socket.emit("hazard:request", { roomCode, hazardId });
      };
      this._slugSyncHandler = ({ slugId }) => {
        socket.emit("slug:hit", { roomCode, slugId });
      };
      this.events.on("hazard-hit", this._hazardSyncHandler);
      this.events.on("slug-hit", this._slugSyncHandler);


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
<<<<<<< HEAD
          {
            roomCode,
            boxId,
            x: this.player?.x,
            y: this.player?.y
          },
=======
          { roomCode, boxId },
>>>>>>> 9d50e30d7c4301c8064254cef288197da15e9467
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

      if (this.pendingCourse && this.player) {
        this.applyCourse(this.pendingCourse);
        this.pendingCourse = null;
      }
      if (!this.player || !this.player.body) return;
      if (!socket.connected) return;

      if (time - this.lastNetworkUpdate < 50) return;

      this.lastNetworkUpdate = time;

      socket.emit("player:move", {
        roomCode,
        x: this.player.x,
        y: this.player.y,
        vx: this.quizPaused || this.finished ? 0 : this.player.body.velocity.x,
        vy: this.player.body.velocity.y,
        startedAt: this.gameStartedAt || 0,
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
      // Preserve fixed pixel-art physics world. FIT fills fullscreen 16:9 canvas without changing world coordinates.
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
