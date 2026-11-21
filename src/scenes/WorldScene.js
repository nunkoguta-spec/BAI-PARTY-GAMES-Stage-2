
import Phaser from "phaser";
import { DEFAULT_AVATAR } from "../avatar/defaultAvatar.js";
import { retroAudio } from "../audio/retroAudio.js";
import { COURSE } from "../game/course.js";
import { seasonOf, backdropKey } from "../game/seasons.js";
import { QUEST } from "../game/quests.js";
import { BATTLE, battleConfig, battleEnemyX } from "../game/battle.js";
import { BATTLE_QUESTIONS } from "../game/battleQuestions.js";
import { TRAP, trapsForStage } from "../game/traps.js";
import { createTrapVisual } from "./trapVisuals.js";

const FRAME_COUNT = 4;
const WORLD_DECOR_Y = 224;
const VIEW_W = 480;
const VIEW_H = 270;

const MOVE_SPEED = 185;
const JUMP_SPEED = 430;
const VIEWPORT_PADDING = 24;
const HERO_SCALE = 0.62;   // mascot sprites are ~75px tall in the pack
const HERO_FEET = 15;      // distance from avatar centre to the ground
const SLOT_COLORS = ["#e03a3a", "#2f86e8", "#2fb34a", "#8a3fd0", "#e08a1e", "#1aa8a8", "#c0398a", "#667788"];

export class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");
  }

  getAvatarTextureColumns(textureKey) {
    const texture = this.textures.exists(textureKey) ? this.textures.get(textureKey) : null;
    const sourceWidth = Number(texture?.source?.[0]?.width) || FRAME_COUNT * 32;
    const frameWidth = Number(texture?.getFrame?.(0)?.width) || 32;
    return Math.max(1, Math.floor(sourceWidth / frameWidth));
  }

  getAvatarTextureRows(textureKey) {
    const texture = this.textures.exists(textureKey) ? this.textures.get(textureKey) : null;
    const sourceHeight = Number(texture?.source?.[0]?.height) || 32;
    const frameHeight = Number(texture?.getFrame?.(0)?.height) || 32;
    return Math.max(1, Math.floor(sourceHeight / frameHeight));
  }

  getAvatarFrameIndex(textureKey, row, frame = 0) {
    // Sprite sheets are not uniform: Jump uses 3 columns while most other
    // states use 4. Clothing sheets also have a different number of variant
    // rows. Resolve both dimensions from the active texture to keep each
    // selected costume layer on its own row during every animation state.
    const columns = this.getAvatarTextureColumns(textureKey);
    const rows = this.getAvatarTextureRows(textureKey);
    const safeRow = Phaser.Math.Clamp(Math.floor(Number(row) || 0), 0, rows - 1);
    const safeFrame = Phaser.Math.Clamp(Math.floor(Number(frame) || 0), 0, columns - 1);
    return safeRow * columns + safeFrame;
  }

  init(data = {}) {
    const rawStage = data?.stageIndex ??
      this.sys?.settings?.data?.stageIndex ??
      window.baiStageIndex ??
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("baiStageIndex") : 0);
    this.stageIndex = Phaser.Math.Clamp(
      Number.isFinite(Number(rawStage)) ? Math.floor(Number(rawStage)) : 0,
      0,
      COURSE.stages.length - 1
    );
    if (typeof data?.isHostMode === "boolean") {
      this.isHostMode = data.isHostMode;
    }
    window.baiStageIndex = this.stageIndex;
    try { sessionStorage.setItem("baiStageIndex", String(this.stageIndex)); } catch {}
  }

  setStage(targetStageIndex) {
    const stageIndex = Phaser.Math.Clamp(
      Math.floor(Number(targetStageIndex) || 0),
      0,
      COURSE.stages.length - 1
    );
    if (this.stageIndex === stageIndex) return;
    this.stageIndex = stageIndex;
    window.baiStageIndex = stageIndex;
    try { sessionStorage.setItem("baiStageIndex", String(stageIndex)); } catch {}

    if (this.isHostMode) {
      // Host TV view: smoothly update stage bounds & assets without restarting the scene or dropping players!
      this.currentStage = COURSE.stages[stageIndex] || COURSE.stages[0];
      this.stageStartX = this.currentStage.startX;
      this.stageEndX = this.currentStage.endX;
      this.stageWidth = this.stageEndX - this.stageStartX;
      this.cameras.main.setBounds(this.stageStartX, 0, this.stageWidth, 270);
      this.createArrivalStation();
      this.createBahnhof();
      this.createStageEnemies();
      this.updateStageHUD();
      return;
    }

    this.scene.restart({ stageIndex, isHostMode: this.isHostMode });
  }

  create(data = {}) {
    try {
      this.createWorld(data);
    } catch (error) {
      window.deutschWorldError = error;
      throw error;
    }
  }

  createWorld(data = {}) {
    // DATA AVATAR MULTIPLAYER
    this.remoteAvatars = new Map();

    // Host mode flag — set by HostPanel to skip player spawn
    this.isHostMode = this.isHostMode || window.deutschHostMode === true;
    this.gameStarted = this.isHostMode || Boolean(data?.gameStarted ?? window.baiGameStarted ?? false);

    // One stage = one city. The stage remains in the same global coordinate
    // space so multiplayer/network positions stay compatible with the existing
    // server, but the camera and playable collision are locked to this city.
    const requestedStage = Number(
      data?.stageIndex ??
      this.stageIndex ??
      this.sys?.settings?.data?.stageIndex ??
      window.baiStageIndex ??
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("baiStageIndex") : 0) ??
      0
    );
    this.stageIndex = Phaser.Math.Clamp(
      Number.isFinite(requestedStage) ? Math.floor(requestedStage) : 0,
      0,
      Math.max(0, COURSE.stages.length - 1)
    );
    window.baiStageIndex = this.stageIndex;
    try { sessionStorage.setItem("baiStageIndex", String(this.stageIndex)); } catch {}
    this.currentStage = COURSE.stages[this.stageIndex] || COURSE.stages[0];
    this.stageStartX = this.currentStage.startX;
    this.stageEndX = this.currentStage.endX;
    this.stageWidth = this.stageEndX - this.stageStartX;

    this.showCityTransition(this.currentStage);

    this.createParallaxBackground();
    this.createSeasonParticles();
    // Each chapter has its own landmark layer: Frankfurt skyline, Berlin landmarks,
    // and Hamburg harbour structures. This was authored but never called.
    // Landmarks are now baked into the pixel-art panoramas (backgrounds/cities/*-bg-v2.png),
    // so the old vector landmark layer is disabled to avoid drawing over them.
    // this.createCityLandmarks();

    // TILEMAP
    const map = this.make.tilemap({ key: "level-01" });

    // OLD TILEMAP GROUND/PLATFORM REMOVED.
    // The previous Ground + Platforms layers contained solid terrain tiles that
    // could make the avatar enter walls or appear to float above the street.
    // Keep the map only as a data source (PlayerSpawn/Objects); do not create
    // the legacy visual/collision layers.
    this.groundLayer = null;
    this.platformLayer = null;

    // One invisible Arcade Physics floor for THIS CITY ONLY. Its top edge is
    // y=224, exactly aligned with the visible cobblestone street and avatar feet.
    this.worldWidth = COURSE.width; // keep global coordinate space for multiplayer
    this.worldHeight = 270;
    this.groundCollider = this.add.rectangle(
      this.stageStartX + this.stageWidth / 2,
      232,
      this.stageWidth,
      16,
      0xffffff,
      0
    );
    this.groundCollider.setVisible(false);
    this.physics.add.existing(this.groundCollider, true);
    this.groundCollider.body.setSize(this.stageWidth, 16);
    this.groundCollider.body.setOffset(0, 0);

    if (this.cityStage) { this.createReferenceStreet(); }

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    // DEKORASI
    this.createWorldDecorations();

    // QUEST NPCs (final stage only)
    this.createQuestNpcs();

    // SPAWN — skip for host mode
    if (!this.isHostMode) {
      // Player spawns at the arrival station entrance doors
      const spawnX = this.stageIndex > 0 ? (this.stageStartX + 120) : (this.stageStartX + 160);
      const spawn = {
        x: spawnX,
        y: 208
      };

      this.createAvatar(
        Math.round(spawn.x),
        Math.round(spawn.y)
      );
      this.createPlayerHealthHud();
      this.createStageEnemies();
      this.createTrapVisuals();

      // SINKRONISASI KOSTUM — use string event name (Phaser 3 standard)
      this.events.on(
        "postupdate",
        this.syncAvatarLayers,
        this
      );

      // COLLISION PLAYER — ground only. All gameplay obstacles are disabled.
      this.finished = false;
      this.stageTransitioning = false;
      this.physics.add.collider(this.player, this.groundCollider);

      this.createArrivalStation();
      this.createBahnhof();
      this.createStageTravelTrigger();

      // When arriving from a train journey, player steps out from the Bahnhof doors onto the city street!
      if (this.stageIndex > 0) {
        this.player.setAlpha(0);
        for (const p of this.avatarParts || []) p.sprite.setAlpha(0);
        this.tweens.add({
          targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
          alpha: 1,
          x: this.stageStartX + 175,
          duration: 650,
          ease: "Sine.easeOut"
        });
        this.time.delayedCall(400, () => {
          this.showFloatingFeedback(
            this.stageStartX + 170,
            160,
            `KELUAR DARI ${this.currentStage.name} HBF`,
            "#82d82c"
          );
        });
      }

      // KONTROL — unchanged.
      this.setupControls();

      // KAMERA — locked to this city only.
      const camera = this.cameras.main;
      camera.setBounds(
        this.stageStartX,
        0,
        this.stageWidth,
        270
      );
      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

      camera.setRoundPixels(true);
      camera.setDeadzone(VIEW_W * 0.45, VIEW_H * 0.35);
      camera.startFollow(this.player, true, 0.085, 0.085);
      this.handleViewportResize();

      // No hazards, spikes, slugs, or obstacle overlap handlers.
      this.gameHazards = [];

      if (this.stageIndex === COURSE.stages.length - 1) {
        this.createFinishGate(true);
      }
    } else {
      // Host mode: set camera bounds and draw spectator-only finish gate without spawning a player.
      const camera = this.cameras.main;

      this.gameStarted = true;
      this.hazardDefinitions = [];
      this.gameHazards = [];
      this.createTrapVisuals();
      this.createArrivalStation();
      this.createBahnhof();
      this.createStageEnemies();
      if (this.stageIndex === COURSE.stages.length - 1) {
        this.createFinishGate(false);
      }

      camera.setBounds(
        this.stageStartX,
        0,
        this.stageWidth,
        this.worldHeight
      );

      camera.setRoundPixels(true);
      this.handleViewportResize();

      // Follow active remote player on host display; no local host character.
      this.hostSpectatorTarget = null;
      this.hostFollowPlayer = (player) => {
        if (!player?.sprites?.[0]) return;
        camera.setZoom(1);
        this.hostSpectatorTarget = player.sprites[0];
        camera.startFollow(this.hostSpectatorTarget, true, 0.085, 0.085);
      };
      this.hostClearFollow = () => {
        this.hostSpectatorTarget = null;
        camera.stopFollow();
        camera.setZoom(1);
        camera.scrollX = 0;
        camera.scrollY = 0;
      };

      // TV spectator overview: dynamically fit every connected avatar into the
      // 16:9 playfield instead of silently following only one participant.
      this.hostShowAllPlayers = () => {
        const active = [...(this.remoteAvatars?.values() || [])]
          .filter((remote) => remote && Number.isFinite(remote.x) && Number.isFinite(remote.y));
        camera.stopFollow();
        this.hostSpectatorTarget = null;
        if (!active.length) {
          camera.setZoom(1);
          camera.scrollX = 0;
          camera.scrollY = 0;
          return;
        }
        // Spectator view must stay at a useful gameplay scale. Fitting players
        // across the entire 9,600px course made the city collapse into a thin
        // strip and exposed the empty sky below it. Frame the active group,
        // with a firm zoom floor; the host can still follow one player at 1x.
        const sorted = [...active].sort((a, b) => a.x - b.x);
        const anchorX = sorted[Math.floor((sorted.length - 1) / 2)].x;
        const nearby = active.filter((player) => Math.abs(player.x - anchorX) <= 720);
        const framed = nearby.length ? nearby : [sorted[Math.floor(sorted.length / 2)]];
        const minX = Math.min(...framed.map((p) => p.x));
        const maxX = Math.max(...framed.map((p) => p.x));
        const minY = Math.min(...framed.map((p) => p.y));
        const maxY = Math.max(...framed.map((p) => p.y));
        const spanX = Math.max(220, maxX - minX + 150);
        const spanY = Math.max(150, maxY - minY + 112);
        const fitZoom = Math.min((VIEW_W - 72) / spanX, (VIEW_H - 76) / spanY);
        const zoom = Phaser.Math.Clamp(fitZoom, 0.52, 0.9);
        camera.setZoom(zoom);
        const centerX = (minX + maxX) / 2;
        // Keep the street/avatars in the lower half while preserving enough
        // sky and landmark visibility at every supported spectator zoom.
        const centerY = 224 - 0.24 * (VIEW_H / zoom);
        camera.centerOn(centerX, centerY);
      };
      camera.scrollX = 0;
      camera.scrollY = 0;
    }

    // LEADERBOARD HUD (in-game on all clients and host)
    this.createLeaderboardHUD();
    this.createGameTimerHUD();
    this.createStageHUD();
  }

  createStageHUD() {
    const stage = this.currentStage || COURSE.stages[0];
    if (this.isHostMode) {
      // Host view: simple clean city tag at top-left
      // Two lines (city / landmark) so the tag never runs under the centred timer.
      this.stageLabel = this.add.text(10, 10, `${stage.name}\n${stage.landmark || ""}`.toUpperCase(), {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "7px",
        color: "#f7c83b",
        stroke: "#000000",
        strokeThickness: 3,
        lineSpacing: 4
      }).setScrollFactor(0).setDepth(110);
      window.dispatchEvent(new CustomEvent("bai-stage", { detail: stage }));
      return;
    }

    // Player mode: Unified Clean Status Card at top-left below DOM header (y: 48)
    const topY = 48;
    this.stageLabel = this.add.text(12, topY + 4, stage.name, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "7px",
      color: "#ffffff"
    }).setScrollFactor(0).setDepth(1002);

    this.stageSubLabel = this.add.text(12, topY + 28, String(stage.landmark || "").toUpperCase(), {
      fontFamily: "Arial, sans-serif",
      fontSize: "7px",
      fontStyle: "bold",
      color: "#ffd36a"
    }).setScrollFactor(0).setDepth(1002);

    this.questHud = null;
    if (stage.id === QUEST.stageId) {
      this.questHud = this.add.text(12, topY + 40, "", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "5px",
        color: "#a8f08c",
        stroke: "#172033",
        strokeThickness: 2
      }).setScrollFactor(0).setDepth(1002);
      this.refreshQuestHud();
    }
  }

  updateStageHUD() {
    if (!this.stageLabel || !this.currentStage) return;
    if (this.isHostMode) {
      this.stageLabel.setText(`${this.currentStage.name}\n${this.currentStage.landmark || ""}`.toUpperCase());
      window.dispatchEvent(new CustomEvent("bai-stage", { detail: this.currentStage }));
      return;
    }
    this.stageLabel.setText(this.currentStage.name);
    if (this.stageSubLabel) this.stageSubLabel.setText(String(this.currentStage.landmark || "").toUpperCase());
  }

  showCityTransition(stage) {
    if (!stage || !this.add || !this.tweens) return;
    if (this.cityTransition) {
      this.cityTransition.destroy(true);
      this.cityTransition = null;
    }
    const index = (COURSE.stages || []).findIndex((item) => item.id === stage.id) + 1;
    const card = this.add.container(VIEW_W / 2, VIEW_H / 2)
      .setScrollFactor(0).setDepth(260).setAlpha(0).setScale(0.88);
    const frame = this.add.graphics();
    frame.fillStyle(0x111827, 0.94);
    frame.fillRoundedRect(-154, -48, 308, 96, 7);
    frame.lineStyle(4, 0x090d18, 1);
    frame.strokeRoundedRect(-154, -48, 308, 96, 7);
    frame.lineStyle(2, 0xf7c83b, 1);
    frame.strokeRoundedRect(-148, -42, 296, 84, 5);
    frame.lineStyle(1, 0xffe49a, 0.75);
    frame.lineBetween(-132, -18, 132, -18);
    const season = seasonOf(stage);
    const eyebrow = this.add.text(0, -32, `STAGE ${index}  •  ${season.de}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px",
      color: season.accent, stroke: "#000", strokeThickness: 2
    }).setOrigin(0.5);
    const title = this.add.text(0, 0, stage.name, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "17px",
      color: "#f7c83b", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 25, String(stage.landmark || "").toUpperCase(), {
      fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold",
      color: "#fff4d6", stroke: "#000", strokeThickness: 2
    }).setOrigin(0.5);
    card.add([frame, eyebrow, title, subtitle]);
    this.cityTransition = card;
    this.tweens.add({
      targets: card, alpha: 1, scale: 1, duration: 240,
      ease: "Back.easeOut",
      onComplete: () => this.time.delayedCall(1450, () => {
        if (!card.active) return;
        this.tweens.add({ targets: card, alpha: 0, y: card.y - 12, duration: 260,
          ease: "Quad.easeIn", onComplete: () => {
            if (this.cityTransition === card) this.cityTransition = null;
            card.destroy(true);
          }
        });
      })
    });
  }


  // =====================================================
  // BAI ASSET PACK — mascot poses + reference street
  // =====================================================

  heroKeyFor(state = "idle") {
    if (state.startsWith("hurt")) return "hero-hit";
    if (state.startsWith("interact")) return "hero-victory";
    if (state.startsWith("jump") || state.startsWith("fall")) return "hero-jump";
    if (state.startsWith("walk") || state === "left" || state === "right") return "hero-run";
    return "hero-idle";
  }

  updateHero() {
    // The extracted mascot pose sheets are decorative single-pose art, not
    // modular costume layers. Returning false keeps the actual customizable
    // body/clothing sprites visible on both phone and TV.
    return false;
  }


  createReferenceStreet() {
    if (!this.textures.exists("pack-cobble")) return;
    const top = 224;
    // The visual street and the solid tilemap begin on the same world-space
    // row. The previous -3px offset made the pavement lip and collision seam
    // disagree, which looked like characters were walking into the wall.
    const ground = top;
    const put = (key, x, scale, depth, y = ground) =>
      this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(depth);

    // Shared playable pavement. The skyline and city architecture above it are
    // chapter-specific and must not be replaced by repeating Munich houses.
    const season = this.season || seasonOf(this.currentStage);
    this.add.tileSprite(this.stageStartX, ground, this.stageWidth, 46, "pack-cobble")
      .setOrigin(0, 0).setDepth(7.5).setTint(season.street);
    // Extend the visual pavement well beyond the physics map. On wide TV
    // viewports the camera can expose more vertical pixels than the tilemap;
    // stopping at worldHeight revealed the blue camera clear-color below it.
    const visualGroundBottom = Math.max(this.worldHeight, 900);
    this.add.tileSprite(this.stageStartX, ground + 46, this.stageWidth, visualGroundBottom - ground - 46, "pack-cobble")
      .setOrigin(0, 0).setDepth(7.4).setTint(season.streetDeep);

    this.createSeasonGroundDetail(season, ground);

    // City architecture is baked into each chapter's panoramic backdrop.
    // Do not stamp repeating Munich houses over the other city scenes.

    // Neutral street furniture repeats lightly without changing each city's silhouette.
    // Disabled: lamps, trees and bushes are already part of the new panoramas.
  }

  // Small season-specific details on the pavement edge (deterministic, so TV
  // and every phone draw exactly the same thing).
  createSeasonGroundDetail(season, ground) {
    const rnd = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
    const g = this.add.graphics().setDepth(7.6);
    const x0 = this.stageStartX, x1 = this.stageEndX;
    if (season.ground === "snow") {
      // continuous drift along the curb + patches on the cobbles
      for (let x = x0; x < x1; x += 2) {
        const h = 2 + Math.floor(rnd(x) * 3);
        g.fillStyle(0xfcfdff, 1); g.fillRect(x, ground - h, 2, h + 1);
        g.fillStyle(0xc4d4ec, 1); g.fillRect(x, ground + 1, 2, 1);
      }
      for (let x = x0; x < x1; x += 26) {
        const w = 8 + Math.floor(rnd(x + 5) * 14), y = ground + 4 + Math.floor(rnd(x + 9) * 28);
        g.fillStyle(0xf4f8ff, 0.8); g.fillRect(x + Math.floor(rnd(x + 2) * 18), y, w, 2);
        g.fillStyle(0xc4d4ec, 0.7); g.fillRect(x + Math.floor(rnd(x + 2) * 18), y + 2, w, 1);
      }
    } else if (season.ground === "leaves") {
      const cols = [0xd9792a, 0xe8a233, 0xb5452a, 0x8c5a2b, 0xf0c04a];
      for (let x = x0; x < x1; x += 11) {
        const c = cols[Math.floor(rnd(x) * cols.length)];
        const y = ground - 1 + Math.floor(rnd(x + 3) * 30);
        g.fillStyle(c, 1); g.fillRect(x + Math.floor(rnd(x + 1) * 8), y, 3, 2);
        g.fillStyle(0x5a3a1e, 0.55); g.fillRect(x + Math.floor(rnd(x + 1) * 8) + 1, y + 2, 2, 1);
      }
    } else if (season.ground === "flowers") {
      const cols = [0xff9ccf, 0xffffff, 0xffe27a, 0xf46fa8];
      for (let x = x0; x < x1; x += 17) {
        const fx = x + Math.floor(rnd(x) * 12);
        g.fillStyle(0x4fae45, 1); g.fillRect(fx, ground - 3, 1, 3); g.fillRect(fx + 2, ground - 2, 1, 2);
        g.fillStyle(cols[Math.floor(rnd(x + 4) * cols.length)], 1); g.fillRect(fx - 1, ground - 5, 3, 2);
      }
      for (let x = x0; x < x1; x += 31) {
        g.fillStyle(0xffb6d8, 0.9);
        g.fillRect(x + Math.floor(rnd(x) * 20), ground + 3 + Math.floor(rnd(x + 6) * 26), 2, 1);
      }
    }
    this.seasonGroundDetail = g;
  }

  tintSeasonProps(group) {
    const tint = (this.season || seasonOf(this.currentStage)).prop;
    for (const child of group?.list || []) {
      if (child.type === "Image" || child.type === "Sprite") child.setTint(tint);
    }
  }

  createMunichStreetArt() {
    const street = this.add.graphics().setDepth(7);
    const top = 224;
    street.fillStyle(0x45465b, 1);
    // Visual-only extension: keep the cobblestone foreground continuous even
    // when the spectator canvas is taller than the physics tilemap.
    const visualGroundBottom = Math.max(this.worldHeight, 900);
    street.fillRect(0, top, COURSE.width, visualGroundBottom - top);
    street.fillStyle(0x9a9baa, 1);
    street.fillRect(0, top, COURSE.width, 5);
    street.fillStyle(0xd3c9b9, 1);
    street.fillRect(0, top - 3, COURSE.width, 4);
    street.lineStyle(1, 0x292d42, 0.95);
    for (let x = 0; x <= COURSE.width; x += 32) {
      street.lineBetween(x, top + 5, x, visualGroundBottom);
      street.lineBetween(x + 16, top + 23, x + 16, visualGroundBottom);
    }
    for (let y = top + 24; y < visualGroundBottom; y += 24) {
      street.lineBetween(0, y, COURSE.width, y);
    }
    street.fillStyle(0x77798b, 1);
    for (let x = 8; x < COURSE.width; x += 64) {
      street.fillRect(x, top + 10, 24, 2);
      street.fillRect(x + 30, top + 31, 18, 2);
    }
    this.munichStreetArt = street;
  }

  createArrivalStation() {
    const stage = this.currentStage || COURSE.stages[0];
    const stationX = this.stageStartX + 120;
    this.arrivalStationGroup?.destroy(true);
    this.arrivalStationGroup = this.add.container(stationX, 224).setDepth(6);

    // Hauptbahnhof building façade behind the player from which they just stepped out
    if (this.textures.exists("bhf-station")) {
      const station = this.add.image(0, 0, "bhf-station")
        .setOrigin(0.5, 1)
        .setDepth(1);
      this.arrivalStationGroup.add(station);
    }

    // Station exit sign (e.g. "FRANKFURT HBF • AUSGANG")
    const signBox = this.add.rectangle(0, -118, 148, 18, 0x101c2b, 0.95)
      .setStrokeStyle(1.5, 0xf6c84a);
    const signText = this.add.text(0, -118, `${stage.name} HBF • AUSGANG`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "6px",
      color: "#fff3c5"
    }).setOrigin(0.5);
    this.arrivalStationGroup.add([signBox, signText]);

    // Station entrance street furniture: lamps, clock, bench, plants
    if (this.textures.exists("bhf-lamp-b")) {
      this.arrivalStationGroup.add(this.add.image(-120, 0, "bhf-lamp-b").setOrigin(0.5, 1).setDepth(2));
      this.arrivalStationGroup.add(this.add.image(120, 0, "bhf-lamp-b").setOrigin(0.5, 1).setDepth(2));
    }
    if (this.textures.exists("bhf-bench")) {
      this.arrivalStationGroup.add(this.add.image(75, 0, "bhf-bench").setOrigin(0.5, 1).setDepth(2));
    }
    if (this.textures.exists("bhf-plant")) {
      this.arrivalStationGroup.add(this.add.image(-65, 0, "bhf-plant").setOrigin(0.5, 1).setDepth(2));
    }
    if (this.textures.exists("bhf-clocks")) {
      this.arrivalStationGroup.add(this.add.image(0, -68, "bhf-clocks").setOrigin(0.5, 1).setDepth(2));
    }
    this.tintSeasonProps(this.arrivalStationGroup);
  }

  createBahnhof() {
    const stage = this.currentStage || COURSE.stages[0];
    const stationX = this.stageEndX - 200;
    this.bahnhofGroup?.destroy(true);
    this.bahnhofGroup = this.add.container(stationX, 224).setDepth(12);

    const add = (name, x, y = 0, depth = 1, scale = 1, flip = false) => {
      const key = `bhf-${name}`;
      if (!this.textures.exists(key)) return null;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const sprite = this.add.image(x, y, key)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(depth)
        .setFlipX(flip);
      this.bahnhofGroup.add(sprite);
      return sprite;
    };

    // The grand Hauptbahnhof building facade at the end of the street
    add("station", 0, 0, 1, 1);
    add("clocks", 0, -68, 2, 1);

    // Entrance wayfinding sign above the station doors
    const nextCity = stage.next ? stage.next.toUpperCase() : stage.name;
    const signBox = this.add.rectangle(0, -118, 210, 18, 0x101c2b, 0.95)
      .setStrokeStyle(1.5, 0xf6c84a);
    const signText = this.add.text(0, -118, `${stage.name} HBF • EINGANG ➔ ${nextCity}`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "6px",
      color: "#ffdc72"
    }).setOrigin(0.5);
    this.bahnhofGroup.add([signBox, signText]);

    // Entrance street furniture: lamps, ticket machine, bench, plants
    add("lamp-b", -130, 0, 2, 1);
    add("lamp-a", 130, 0, 2, 1);
    add("ticket-machine", -75, 0, 3, 1);
    add("bench", 75, 0, 3, 1);
    add("plant", -40, 0, 3, 1);
    add("trash", -105, 0, 3, 1);
    add("direction-sign", 105, 0, 3, 1);

    // The last stage's HBF (currently Köln) is the Grand Terminal / Endstation
    // of the entire journey. Decorate the platform with red VIP carpet,
    // conductor, and travelers.
    const isFinalStage = this.stageIndex === COURSE.stages.length - 1;
    if (isFinalStage) {
      const carpet = this.add.rectangle(0, 2, 180, 5, 0xb82633).setDepth(4);
      const carpetGold1 = this.add.rectangle(0, -1, 180, 1, 0xf6c84a).setDepth(4);
      const carpetGold2 = this.add.rectangle(0, 5, 180, 1, 0xf6c84a).setDepth(4);
      this.bahnhofGroup.add([carpet, carpetGold1, carpetGold2]);

      // Station master / conductor welcoming at the terminal doors
      add("officer", 35, 0, 5, 1);
      // Cheering travelers
      add("traveler", -45, 0, 5, 1);
      add("traveler", 65, 0, 5, 1, true);
    }

    // Endstation gate: Every stage enemy must be defeated and player must be at least 175px into station zone.
    if (!this.isHostMode && this.player && this.stageIndex < COURSE.stages.length - 1) {
      const enemyWon = this.stageEnemy?.defeated || this.stageEnemyBattleWon;
      if (enemyWon && this.player.x >= this.stageEndX - 225 && this.player.x < this.stageEndX - 170) {
        const gate = this.add.rectangle(this.stageEndX - 165, WORLD_DECOR_Y - 26, 30, 56, 0x0c1322, 0.92)
          .setStrokeStyle(2, 0xf7c83b, 1).setDepth(25);
        const gateTxt = this.add.text(this.stageEndX - 165, WORLD_DECOR_Y - 28, "HBF\n→", {
          fontFamily: "'Press Start 2P', monospace", fontSize: "6px", color: "#f7c83b", align: "center"
        }).setOrigin(0.5).setDepth(26);
        this.stageGateVisual = { gate, gateTxt };
      }
    }

    this.tintSeasonProps(this.bahnhofGroup);

    const destination = stage.next
      ? `NÄCHSTER HALT  ·  ${stage.next.toUpperCase()} HBF`
      : `ENDSTATION  ·  ${stage.station || `${stage.name} HBF`}`;
    // Positioned directly on the Bahnhof in world space, NOT floating on the camera screen!
    this.routeBanner?.destroy(true);
    const routePanel = this.add.container(0, -96).setDepth(8);
    const panel = this.add.rectangle(0, 0, 220, 16, 0x101c2b, 0.94)
      .setStrokeStyle(1, 0xf2c34b, 1);
    const routeText = this.add.text(0, 0, destination, {
      fontFamily: "Arial, sans-serif",
      fontSize: "8px",
      fontStyle: "bold",
      color: "#fff4d6",
      align: "center"
    }).setOrigin(0.5);
    routePanel.add([panel, routeText]);
    this.bahnhofGroup.add(routePanel);
    this.routeBanner = routePanel;
  }

  createStageTravelTrigger() {
    const triggerX = this.stageEndX - 200;
    this.stageTravelTrigger = this.add.zone(triggerX, WORLD_DECOR_Y - 18, 90, 60);
    this.physics.add.existing(this.stageTravelTrigger, true);

    if (!this.player) return;

    this.physics.add.overlap(this.player, this.stageTravelTrigger, () => {
      if (this.stageTransitioning || !this.player) return;
      if (this.player.x < triggerX - 25) return;

      // Require the stage's battle to be won before boarding train
      const stage = COURSE.stages[this.stageIndex];
      const isEnemyStage = Boolean(battleConfig(stage?.id));
      const enemyDefeated = !isEnemyStage || this.stageEnemy?.defeated || this.stageEnemyBattleWon;
      if (!enemyDefeated) {
        this.player.setX(triggerX - 42);
        this.player.body.setVelocity(0, 0);
        if (this.time.now - (this.lastStageBlockFeedback || 0) > 1800) {
          this.lastStageBlockFeedback = this.time.now;
          this.showFloatingFeedback(this.player.x, this.player.y - 30, "KALAHKAN MUSUH DULU!", "#ff5b5b");
          retroAudio.playWrong?.();
        }
        return;
      }

      if (this.stageIndex >= COURSE.stages.length - 1) {
        this.triggerEndstationFinish();
        return;
      }
      this.startTrainTravel();
    });
  }

  triggerEndstationFinish() {
    if (this.finished) return;
    this.finished = true;
    this.stageTransitioning = true;
    this.player.body.setVelocity(0, 0);
    this.setAvatarAnimation("idle");
    retroAudio.playCorrect?.();

    // 1. Victory Hop & Cheer
    this.tweens.add({
      targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
      y: this.player.y - 20,
      duration: 220,
      yoyo: true,
      ease: "Sine.easeOut"
    });

    // 2. Confetti Explosion!
    this.spawnCelebrationConfetti(this.player.x, this.player.y - 30);

    // 3. Floating Announcement
    this.showFloatingFeedback(
      this.player.x,
      this.player.y - 36,
      `🏆 ${this.currentStage.station || this.currentStage.name} • REISE SELESAI! 🏆`,
      "#f7c83b"
    );

    // 4. Character walks onto red carpet and boards the final victory train
    const trainDoorX = this.stageEndX - 110;
    this.time.delayedCall(450, () => {
      this.playerFacing = "right";
      this.setAvatarAnimation("right");
      this.tweens.add({
        targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
        x: trainDoorX,
        duration: 900,
        ease: "Linear",
        onComplete: () => {
          this.setAvatarAnimation("idle");
          this.tweens.add({
            targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
            alpha: 0,
            scale: 0.85,
            duration: 280,
            onComplete: () => {
              retroAudio.playTrainWhistle?.();
              const victoryTrain = this.bahnhofGroup?.list?.find(c => c.texture?.key?.includes("train"));
              if (victoryTrain) {
                this.tweens.add({
                  targets: victoryTrain,
                  x: victoryTrain.x + 650,
                  duration: 1300,
                  ease: "Cubic.easeIn"
                });
              }
              this.time.delayedCall(450, () => {
                this.createFinishResultOverlay({
                  finishBonus: 25,
                  rank: 1,
                  elapsedMs: Math.max(0, Date.now() - (this.gameStartedAt || Date.now()))
                });
              });
            }
          });
        }
      });
    });
  }

  spawnCelebrationConfetti(x, y) {
    const colors = [0xf7c83b, 0xf24b4b, 0x82d82c, 0x4aa3f0, 0xffffff, 0xec4899];
    for (let i = 0; i < 36; i++) {
      const color = colors[i % colors.length];
      const p = this.add.rectangle(
        x + Phaser.Math.Between(-15, 15),
        y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(4, 7),
        Phaser.Math.Between(3, 5),
        color
      ).setDepth(200);

      const vx = Phaser.Math.Between(-140, 140);
      const vy = Phaser.Math.Between(-180, -70);
      const rot = Phaser.Math.Between(-180, 180);

      this.tweens.add({
        targets: p,
        x: p.x + vx,
        y: p.y + vy + Phaser.Math.Between(120, 200),
        angle: rot,
        alpha: { from: 1, to: 0 },
        duration: Phaser.Math.Between(1200, 2000),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  startTrainTravel() {
    if (this.stageTransitioning) return;
    if (this.stageIndex >= COURSE.stages.length - 1) {
      this.finished = true;
      this.finishGate?.setAlpha(0.75);
      this.showFloatingFeedback(
        this.player.x,
        this.player.y,
        `${this.currentStage.station || this.currentStage.name} • ENDSTATION!`,
        "#f7c83b"
      );
      return;
    }
    this.stageTransitioning = true;
    this.player.body.setVelocity(0, 0);
    this.setAvatarAnimation("idle");
    const nextIndex = this.stageIndex + 1;

    window.baiStageIndex = nextIndex;
    try {
      sessionStorage.setItem("baiStageIndex", String(nextIndex));
    } catch {}

    // Fade the current city out before changing scenes. This prevents the
    // previous camera/frame from flashing while TrainTravelScene initializes.
    const transition = this.add.rectangle(
      this.cameras.main.scrollX + VIEW_W / 2,
      this.cameras.main.scrollY + VIEW_H / 2,
      VIEW_W,
      VIEW_H,
      0x000000,
      0
    ).setScrollFactor(0).setDepth(300);
    this.tweens.add({
      targets: transition,
      alpha: 1,
      duration: 180,
      onComplete: () => {
        this.scene.start("TrainTravelScene", {
          fromIndex: this.stageIndex,
          toIndex: nextIndex,
          isHostMode: this.isHostMode,
          avatarSelection: this.localAvatarSelection || DEFAULT_AVATAR
        });
      }
    });
  }

  animatePlayerBoardTrain(data) {
    if (!data?.playerId) return;
    const remote = this.remoteAvatars?.get(data.playerId);
    const destination = COURSE.stages[data.toIndex] || COURSE.stages[0];

    // Show floating celebratory route text
    const displayX = remote?.sprites?.[0]?.x || (this.stageEndX - 200);
    this.showFloatingFeedback(
      displayX,
      155,
      `${data.name || "PEMAIN"} MASUK BAHNHOF ➔ ${destination.name}!`,
      "#82d82c"
    );

    retroAudio.playTrainWhistle?.();

    if (remote?.sprites) {
      // Remote character walks towards the Bahnhof entrance doors and enters
      const doorX = this.stageEndX - 200;
      this.tweens.add({
        targets: remote.sprites,
        x: doorX,
        duration: 550,
        ease: "Linear",
        onComplete: () => {
          this.tweens.add({
            targets: remote.sprites,
            alpha: 0,
            scaleY: 0.8,
            duration: 200,
            onComplete: () => {
              if (remote.nameLabel) remote.nameLabel.setVisible(false);
            }
          });
        }
      });
    }
  }

  spawnSteamPuff(x, y) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(
        x + Phaser.Math.Between(-8, 8),
        y + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(3, 6),
        0xffffff,
        0.8
      ).setDepth(20);
      this.tweens.add({
        targets: p,
        x: p.x - Phaser.Math.Between(15, 35),
        y: p.y - Phaser.Math.Between(15, 30),
        alpha: 0,
        scale: 1.8,
        duration: Phaser.Math.Between(450, 750),
        ease: "Sine.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  createHazardVisuals() {
    // Legacy hook, kept so older code paths do not break. Real traps: createTrapVisuals().
    this.gameHazards = [];
    this.hitCooldown = false;
  }

  // =====================================================
  // STAGE TRAPS (src/game/traps.js)
  // Drawn here, judged by the server: the scene never decides a hit. Timed traps follow the SERVER
  // clock (window.baiServerClockOffset, see src/game/clock.js) so what you see is what the server uses.
  // =====================================================

  getServerNow() {
    return Date.now() + (Number(window.baiServerClockOffset) || 0);
  }

  createTrapVisuals() {
    this.trapObjects = [];
    const stage = COURSE.stages[this.stageIndex];
    const list = trapsForStage(stage?.id);
    if (!list.length) return;
    const ground = TRAP.groundY;
    for (const trap of list) this.trapObjects.push(createTrapVisual(this, trap));
    // One warning sign before the first trap of the stage ("Gefahr!").
    const first = list[0];
    const signX = (first.type === "roller" ? first.from : first.x) - 90;
    this.trapSign = this.add.image(signX, ground, "trap-sign").setOrigin(0.5, 1).setDepth(7.8);
    this.events.once("shutdown", () => { this.trapObjects = []; });
  }

  updateTraps() {
    if (!this.trapObjects?.length) return;
    const now = this.getServerNow();
    for (const obj of this.trapObjects) obj.update?.(now);
  }

  // The server confirmed a trap hit (broadcast to everybody in the room).
  handleTrapHit(data = {}) {
    if (!data?.playerId) return;
    const obj = this.trapObjects?.find((o) => o.trap.id === data.trapId);
    const isMe = data.playerId === this.localPlayerId;
    if (obj) {
      obj.hit?.(data);   // per-trap reaction (flash / chomp / sparks)
    }
    if (isMe && this.player?.body && !data.ko) {
      const dir = data.dir >= 0 ? 1 : -1;
      retroAudio.playWrong();
      this.player.body.setVelocity(dir * TRAP.knockbackX, -TRAP.knockbackY);
      this.playerFacing = dir > 0 ? "left" : "right";
      this.networkCharacterState = { state: `hurt-${this.playerFacing}`, grounded: false, vx: dir * TRAP.knockbackX, vy: -TRAP.knockbackY };
      this.setAvatarAnimation(`hurt-${this.playerFacing}`);
      this.trapKnockUntil = this.time.now + 350;
      this.cameras.main.shake(140, 0.006);
      const damage = Number(data.damage) || 15;
      const newHp = Math.max(0, this.playerHp - damage);
      this.renderServerHp({
        hp: newHp,
        maxHp: this.playerMaxHp,
        damage,
        ko: Boolean(data.ko || newHp <= 0),
        penalty: 25
      });
      this.showFloatingFeedback(this.player.x, this.player.y - 36, `JEBAKAN! -${damage} HP`, "#f7c83b");
    } else if (!isMe) {
      const remote = this.remoteAvatars?.get(data.playerId);
      if (remote) this.showFloatingFeedback?.(remote.x, remote.y - 34, "JEBAKAN!", "#f7c83b");
    }
  }

  createFinishPlatformDecor() {
    // Visual cover for end-of-course ground tiles; physics remains the original solid TilemapLayer.
    const platformY = 224;
    const startX = this.stageEndX - 280;
    this.finishPlatformDecorations = [];
    for (let i = 0; i < 9; i++) {
      const top = this.add.rectangle(startX + i * 32, platformY, 32, 6, this.cityStage ? 0xb9b4b2 : 0x82d82c).setOrigin(0, 0).setDepth(7);
      const dirt = this.add.rectangle(startX + i * 32, platformY + 6, 32, 26, this.cityStage ? 0x55566b : 0x8a4c28).setOrigin(0, 0).setDepth(6);
      this.finishPlatformDecorations.push(top, dirt);
    }
  }

  createFinishTrigger() {
    if (this.stageIndex !== COURSE.stages.length - 1 || !this.player) return;
    const finishX = this.stageEndX - 180;
    this.finishTrigger = this.add.zone(finishX, WORLD_DECOR_Y - 15, 120, 60);
    this.physics.add.existing(this.finishTrigger, true);
    this.physics.add.overlap(this.player, this.finishTrigger, () => {
      this.triggerEndstationFinish();
    });
  }

  createFinishGate(withTrigger = false) {
    const finishX = this.stageEndX - 180;
    if (this.finishGate) this.finishGate.destroy(true);

    // Grand celebratory Endstation Terminal Archway
    const arch = this.add.container(finishX, WORLD_DECOR_Y - 48).setDepth(15);
    const archBanner = this.add.rectangle(0, 0, 196, 26, 0x111c2e, 0.95).setStrokeStyle(2, 0xf7c83b, 1);
    const archTitle = this.add.text(0, -5, "★ ENDSTATION · FINISH ★", { fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#f7c83b" }).setOrigin(0.5);
    const archSub = this.add.text(0, 7, this.currentStage?.station || "ENDSTATION", { fontFamily: "Arial, sans-serif", fontSize: "9px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5);
    const leftPole = this.add.rectangle(-94, 26, 4, 52, 0xf7c83b).setStrokeStyle(1, 0x000);
    const rightPole = this.add.rectangle(94, 26, 4, 52, 0xf7c83b).setStrokeStyle(1, 0x000);
    // Golden finish line tape across the platform
    const ribbon = this.add.rectangle(0, 48, 188, 5, 0xf6c84a).setStrokeStyle(1, 0x000);
    arch.add([leftPole, rightPole, archBanner, archTitle, archSub, ribbon]);
    arch.setScrollFactor(1);
    this.finishGate = arch;

    if (withTrigger && this.player) this.createFinishTrigger();
  }

  onSlugHit(slugId) {
    if (this.hitCooldown || this.quizPaused || !this.player) return;
    this.hitCooldown = true;
    retroAudio.playWrong();
    this.player.body.setVelocity(0, -190);
    this.setAvatarAnimation(`hurt-${this.playerFacing}`);
    this.showFloatingFeedback(this.player.x, this.player.y, "LOMPATI SLUG!", "#f7c83b");
    this.events.emit("slug-hit", { slugId });
    this.time.delayedCall(1200, () => { this.hitCooldown = false; });
  }

  onHazardHit(hazardId) {
    if (this.hitCooldown || this.quizPaused || !this.player || this.playerKo) return;
    this.hitCooldown = true;
    this.events.emit("hazard-hit", { hazardId });
    retroAudio.playWrong();
    this.player.body.setVelocity(0, -170);
    this.networkCharacterState = { state: `hurt-${this.playerFacing}`, grounded: false, vx: 0, vy: -170 };
    this.setAvatarAnimation(`hurt-${this.playerFacing}`);
    const damage = 20;
    const newHp = Math.max(0, this.playerHp - damage);
    this.renderServerHp({
      hp: newHp,
      maxHp: this.playerMaxHp,
      damage,
      ko: newHp <= 0,
      penalty: 25
    });
    this.showFloatingFeedback(this.player.x, this.player.y - 32, `RINTANGAN! -${damage} HP`, "#f24b4b");
    this.time.delayedCall(1800, () => { this.hitCooldown = false; });
  }

  handleAuthoritativeHazardHit(result) {
    if (!this.player || !result) return;
    this.hitCooldown = true;
    const damage = Number(result.damage) || 20;
    const newHp = Math.max(0, this.playerHp - damage);
    this.renderServerHp({
      hp: newHp,
      maxHp: this.playerMaxHp,
      damage,
      ko: Boolean(result.ko || newHp <= 0),
      penalty: 25
    });
    this.player.setPosition(result.respawnX, result.respawnY);
    this.player.body.setVelocity(0, 0);
    this.player.body.reset(result.respawnX, result.respawnY);
    this.syncAvatarLayers();
    this.setAvatarAnimation(`hurt-${this.playerFacing}`);
    this.time.delayedCall(1600, () => { this.hitCooldown = false; });
  }

  handleAuthoritativeFinish(result) {
    if (!this.player || this.finished) return;
    this.finished = true;
    this.finishGate?.setAlpha(0.65);
    this.player.body.setVelocity(0, 0);
    this.showFloatingFeedback(this.player.x, this.player.y, `FINISH +${result?.finishBonus || 0}`, "#f7c83b");
    this.createFinishResultOverlay(result);
    this.events.emit("player:finished-local", result);
  }

  createFinishResultOverlay(result = {}) {
    if (this.finishOverlay) {
      this.finishOverlay.overlay.destroy();
      this.finishOverlay.panel.destroy();
    }
    const overlay = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x111422, 0.90)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(350);
    const panel = this.add.container(VIEW_W / 2, VIEW_H / 2)
      .setScrollFactor(0)
      .setDepth(351);

    const frame = this.add.graphics();
    frame.fillStyle(0x1a2238, 1);
    frame.fillRect(-165, -84, 330, 168);
    frame.lineStyle(4, 0x000000, 1);
    frame.strokeRect(-165, -84, 330, 168);
    frame.lineStyle(2, 0xf7c83b, 1);
    frame.strokeRect(-161, -80, 322, 160);

    const title = this.add.text(0, -56, "🏆 GLÜCKWUNSCH! 🏆", {
      fontFamily: "'Press Start 2P', monospace", fontSize: "11px",
      color: "#f7c83b", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5);

    const sub = this.add.text(0, -38, `REISE SELESAI · ${this.currentStage?.station || ""}`, {
      fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(0.5);

    const route = this.add.text(0, -22, COURSE.stages.map((st) => st.name.charAt(0) + st.name.slice(1).toLowerCase()).join(" ➔ "), {
      fontFamily: "Arial, sans-serif", fontSize: "8px",
      color: "#82d82c"
    }).setOrigin(0.5);

    const bonus = this.add.text(0, -2, `+${Number(result.finishBonus) || 25} BONUS POIN`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "8px",
      color: "#82d82c", stroke: "#000", strokeThickness: 3
    }).setOrigin(0.5);

    const rank = this.add.text(0, 18, `FINISH #${result.rank || 1}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "8px",
      color: "#ffffff", stroke: "#000", strokeThickness: 3
    }).setOrigin(0.5);

    const secs = Math.floor((result.elapsedMs || 0) / 1000);
    const time = this.add.text(0, 36, `WAKTU ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px",
      color: "#cbd5e1", stroke: "#000", strokeThickness: 3
    }).setOrigin(0.5);

    const restartBtn = this.add.rectangle(0, 58, 140, 22, 0xf7c83b).setStrokeStyle(2, 0x000000);
    const restartText = this.add.text(0, 58, "MAIN LAGI ➔", {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px",
      color: "#171324"
    }).setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on("pointerdown", () => {
      this.setStage(0);
    });

    panel.add([frame, title, sub, route, bonus, rank, time, restartBtn, restartText]);
    this.finishOverlay = { overlay, panel };
    this.tweens.add({ targets: panel, scaleX: 1.03, scaleY: 1.03, duration: 180, yoyo: true, ease: "Back.easeOut" });
  }

  // =====================================================
  // BACKGROUND DAN PARALLAX
  // =====================================================

  // Seasonal atmosphere. Every particle sits at depth -20: in front of the
  // panorama, behind the street, props and avatars, so it never covers gameplay.
  // =====================================================
  // QUEST NPCs (stage 5 / KÖLN)
  //
  // One optional side-quest NPC (see src/game/quests.js) built from the same
  // modular avatar sheets as the players. The scene only handles looks and
  // proximity; the dialog UI lives in the phone controller and quest rewards
  // are validated by the server (`quest:complete`).
  //
  // Events emitted on this.events:
  //   "npc-near"  (npc | null)  nearest talkable NPC changed
  //   "npc-talk"  (npc)         player pressed E next to an NPC
  // =====================================================

  createQuestNpcs() {
    this.questNpcs = [];
    this.nearNpcId = null;
    this.questCompleted = this.questCompleted || new Set();
    this.questMarkers = new Map();
    this.npcIdleEvent?.remove?.();
    this.npcIdleEvent = null;
    if (!this.currentStage || this.currentStage.id !== QUEST.stageId) return;

    const partDefs = [
      ["avatar-body", "skin"],
      ["avatar-bottoms", "bottoms"],
      ["avatar-shoes", "shoes"],
      ["avatar-top", "top"],
      ["avatar-eyes", "eyes"],
      ["avatar-hair", "hair"]
    ];
    const baseY = 208; // same centre line as the player: feet land on y=224

    for (const npc of QUEST.npcs) {
      if (npc.x < this.stageStartX || npc.x > this.stageEndX) continue;
      const sprites = [];
      partDefs.forEach(([texture, key], i) => {
        if (!this.textures.exists(texture)) return;
        const sprite = this.add.sprite(
          npc.x, baseY, texture,
          this.getAvatarFrameIndex(texture, npc.avatar[key], 0)
        );
        sprite.setOrigin(0.5, 0.5).setDepth(18 + i * 0.1);
        sprites.push({ sprite, texture, row: npc.avatar[key] });
      });


      // "!" = quest available, green check once this player has completed it.
      const marker = this.add.text(npc.x, baseY - 20, "!", {
        fontFamily: "'Press Start 2P', monospace", fontSize: "10px",
        color: "#f7c83b", stroke: "#000", strokeThickness: 3
      }).setOrigin(0.5, 1).setDepth(34);
      this.tweens.add({ targets: marker, y: marker.y - 4, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.questMarkers.set(npc.id, marker);

      this.questNpcs.push({ npc, sprites, marker });
    }

    // Breathing idle: advance the NPC's 4-frame idle sheet.
    let frame = 0;
    this.npcIdleEvent = this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        frame = (frame + 1) % FRAME_COUNT;
        for (const entry of this.questNpcs) {
          for (const part of entry.sprites) {
            part.sprite.setFrame(this.getAvatarFrameIndex(part.texture, part.row, frame));
          }
        }
      }
    });
    this.events.once("shutdown", () => {
      this.npcIdleEvent?.remove?.();
      this.npcIdleEvent = null;
    });
    this.setQuestProgress([...this.questCompleted]);
  }

  // ids: array of completed NPC ids for THIS player (server is the source of truth).
  setQuestProgress(ids = []) {
    this.questCompleted = new Set(Array.isArray(ids) ? ids : []);
    for (const [id, marker] of this.questMarkers || []) {
      if (!marker?.active) continue;
      const done = this.questCompleted.has(id);
      marker.setText(done ? "✔" : "!");
      marker.setColor(done ? "#82d82c" : "#f7c83b");
    }
    this.refreshQuestHud();
  }

  refreshQuestHud() {
    if (!this.questHud?.active) return;
    const total = QUEST.npcs.length;
    const done = QUEST.npcs.filter((n) => this.questCompleted?.has(n.id)).length;
    this.questHud.setText(`SIDE QUEST ${done}/${total}`);
  }

  updateNpcProximity() {
    if (!this.player || !this.questNpcs?.length) return;
    let nearest = null;
    let best = QUEST.interactRange;
    for (const entry of this.questNpcs) {
      const dx = Math.abs(this.player.x - entry.npc.x);
      if (dx < best && Math.abs(this.player.y - 208) < 40) {
        best = dx;
        nearest = entry.npc;
      }
    }
    const nearId = nearest ? nearest.id : null;
    if (nearId !== this.nearNpcId) {
      this.nearNpcId = nearId;
      this.events.emit("npc-near", nearest);
    }
    if (nearest && !this.quizPaused && !this.finished &&
        this.talkKey && Phaser.Input.Keyboard.JustDown(this.talkKey)) {
      this.events.emit("npc-talk", nearest);
    }
  }

  createSeasonParticles() {
    this.seasonParticles = [];
    const season = this.season || seasonOf(this.currentStage);
    const rnd = (r) => (Array.isArray(r) ? Phaser.Math.FloatBetween(r[0], r[1]) : r);
    for (const spec of season.particles) {
      let animKey = null;
      if (spec.key) {
        if (!this.textures.exists(spec.key)) continue;
        animKey = `${spec.key}-loop`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(spec.key, { start: 0, end: 7 }),
            frameRate: 8,
            repeat: -1
          });
        }
      }
      for (let i = 0; i < spec.count; i++) {
        const x = Phaser.Math.Between(-20, VIEW_W + 60);
        const y = spec.kind === "float" ? Phaser.Math.Between(30, 150) : Phaser.Math.Between(-10, 218);
        const alpha = rnd(spec.alpha);
        let sprite;
        if (spec.shape === "rect") {
          const size = Phaser.Math.Between(spec.size[0], spec.size[1]);
          sprite = this.add.rectangle(x, y, size, size, spec.color, alpha);
        } else {
          sprite = this.add.sprite(x, y, spec.key).setAlpha(alpha);
          sprite.play({ key: animKey, startFrame: Phaser.Math.Between(0, 7) });
        }
        sprite.setScrollFactor(spec.parallax, 0).setDepth(-20);
        if (spec.kind === "float" && spec.vx[0] > 0) sprite.setFlipX(false);
        this.seasonParticles.push({
          sprite, kind: spec.kind, parallax: spec.parallax, baseAlpha: alpha, baseY: y,
          vx: spec.kind === "twinkle" ? 0 : rnd(spec.vx || 0),
          vy: spec.kind === "fall" ? rnd(spec.vy) : 0,
          bob: spec.bob || 0,
          wobbleSpeed: Phaser.Math.FloatBetween(1.2, 2.4),
          wobbleAmp: Phaser.Math.FloatBetween(0.3, 0.9),
          phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
          twinkleSpeed: Phaser.Math.FloatBetween(1.5, 3)
        });
      }
    }
  }

  updateSeasonParticles(delta, scrollX) {
    if (!this.seasonParticles?.length) return;
    const dt = delta / 1000;
    for (const p of this.seasonParticles) {
      const camX = scrollX * p.parallax;
      p.phase += p.wobbleSpeed * dt;
      const s = p.sprite;
      if (p.kind === "fall") {
        s.y += p.vy * dt;
        s.x += (p.vx + Math.sin(p.phase) * p.wobbleAmp * 12) * dt;
        if (s.y > 218) { s.y = -6; s.x = camX + Phaser.Math.Between(-20, VIEW_W + 50); }
      } else if (p.kind === "float") {
        s.x += p.vx * dt;
        s.y = p.baseY + Math.sin(p.phase) * p.bob;
      } else {
        s.setAlpha(p.baseAlpha * (0.25 + 0.75 * Math.abs(Math.sin(p.phase * p.twinkleSpeed * 0.5))));
      }
      const relX = s.x - camX;
      if (relX < -30) s.x += VIEW_W + 60;
      else if (relX > VIEW_W + 50) s.x -= VIEW_W + 60;
    }
  }

  createParallaxBackground() {
    // One panoramic city per scene. The next city is not rendered beside it;
    // it is reached through the Bahnhof + train travel scene.
    // The panorama is the season-specific variant for this stage (course.js).
    this.cityStage = true;
    const stage = this.currentStage || COURSE.stages[0];
    this.season = seasonOf(stage);
    this.cameras.main.setBackgroundColor(this.season.sky);
    const legacy = {
      munich: "city-munich-gameplay",
      frankfurt: "city-frankfurt-custom",
      berlin: "city-berlin-custom",
      hamburg: "city-hamburg-custom"
    };
    let key = backdropKey(stage);
    if (!this.textures.exists(key)) key = legacy[stage.id] || "city-munich-gameplay";
    if (this.textures.exists(key)) {
      // Match the clear colour to the top row of the art so tall spectator
      // views never show a different blue above the panorama.
      try {
        const px = this.textures.getPixel(2, 0, key);
        if (px) this.cameras.main.setBackgroundColor(px);
      } catch { /* keep season sky colour */ }
      this.cityBackdrops = [
        this.add.image(stage.startX, 0, key)
          .setOrigin(0, 0)
          .setDisplaySize(this.stageWidth, 224)
          .setScrollFactor(1, 0)
          .setDepth(-100)
      ];
    } else {
      this.cityBackdrops = [];
    }
  }

  createCityLandmarks() {
    const g = this.add.graphics().setScrollFactor(1, 0).setDepth(-99);
    const drawBuilding = (x, baseY, width, height, color, windowColor = 0xf7d98a) => {
      g.fillStyle(0x17233c, 1);
      g.fillRect(x - 2, baseY - height - 2, width + 4, height + 4);
      g.fillStyle(color, 1);
      g.fillRect(x, baseY - height, width, height);
      g.fillStyle(windowColor, 0.9);
      for (let wx = x + 5; wx < x + width - 3; wx += 13) {
        for (let wy = baseY - height + 8; wy < baseY - 8; wy += 14) g.fillRect(wx, wy, 4, 6);
      }
      g.fillStyle(0x24314c, 1);
      g.fillRect(x - 3, baseY - height, width + 6, 4);
    };

    // Frankfurt: modern Mainhattan skyline and river-side towers.
    for (const b of [
      [2520, 218, 78, 88, 0x8297b8], [2610, 218, 54, 126, 0x9aa9bf],
      [2680, 218, 88, 156, 0x657b9e], [2780, 218, 62, 112, 0xb1b8c4],
      [2860, 218, 92, 142, 0x748ba9], [2970, 218, 70, 98, 0x9aabc0],
      [3060, 218, 64, 176, 0x607798], [3150, 218, 82, 120, 0x879bb7]
    ]) drawBuilding(...b);
    g.fillStyle(0x253e65, 1); g.fillRect(2500, 219, 760, 5);
    g.fillStyle(0x42a6c6, 1); g.fillRect(2500, 224, 760, 3);

    // Berlin: Fernsehturm, Brandenburg Gate and low city blocks.
    for (const b of [
      [4920, 218, 82, 70, 0xb99c83], [5020, 218, 72, 92, 0xc5a58a],
      [5360, 218, 90, 76, 0xc7a98c], [5470, 218, 84, 60, 0xb8957b],
      [5580, 218, 96, 82, 0xd0b294]
    ]) drawBuilding(...b);
    g.fillStyle(0x34415a, 1); g.fillRect(5140, 114, 8, 104);
    g.fillStyle(0xe7e7e4, 1); g.fillCircle(5144, 126, 17);
    g.fillStyle(0x34415a, 1); g.fillRect(5140, 142, 8, 76);
    g.fillStyle(0xd6b17a, 1); g.fillRect(5220, 170, 118, 8);
    for (let x = 5228; x < 5335; x += 25) {
      g.fillStyle(0xd6b17a, 1); g.fillRect(x, 178, 8, 40);
      g.fillStyle(0x34415a, 1); g.fillRect(x + 3, 183, 2, 35);
    }
    g.fillStyle(0xd6b17a, 1); g.fillRect(5212, 164, 134, 6);

    // Hamburg: harbor warehouses, cranes and Elbphilharmonie silhouette.
    for (const b of [
      [7320, 218, 112, 76, 0xa76e58], [7450, 218, 98, 96, 0xb27b62],
      [7565, 218, 124, 68, 0x98644f], [7710, 218, 88, 88, 0xb77d65],
      [7830, 218, 108, 72, 0x9f6d59]
    ]) drawBuilding(...b, 0xf3cf9a);
    g.lineStyle(5, 0x283b57, 1);
    g.lineBetween(7350, 220, 7350, 108); g.lineBetween(7350, 108, 7460, 108);
    g.lineBetween(7460, 108, 7460, 220); g.lineBetween(7350, 108, 7405, 68);
    g.lineBetween(7405, 68, 7460, 108);
    g.lineBetween(7600, 220, 7600, 96); g.lineBetween(7600, 96, 7730, 96);
    g.lineBetween(7730, 96, 7730, 220);
    g.fillStyle(0x3c86a8, 1); g.fillRect(7200, 222, 1100, 3);
    this.cityLandmarks = g;
  }

  // =====================================================
  // DEKORASI DUNIA
  // =====================================================

  createWorldDecorations() {
    if (this.cityStage) return;
    // Ambient pond/water feature. Sits below walkable ground and repeats across long world.
    const pondPositions = [520, 1550, 2780, 3550];
    for (const x of pondPositions) {
      const pond = this.add.container(x, WORLD_DECOR_Y - 2).setDepth(3).setScrollFactor(1);
      const water = this.add.graphics();
      water.fillStyle(0x168fa0, 1);
      water.fillRect(-48, -8, 96, 11);
      water.fillStyle(0x36d2c5, 1);
      water.fillRect(-42, -7, 30, 2);
      water.fillRect(8, -7, 34, 2);
      water.fillStyle(0x0b5969, 1);
      water.fillRect(-48, 2, 96, 3);
      water.fillStyle(0xc9f7e8, 1);
      water.fillRect(-26, -5, 8, 1);
      water.fillRect(18, -4, 6, 1);
      pond.add(water);

      // Lily pads and flowers distinguish pond from ground tiles.
      const pads = [
        [-34, -12, 0x82d82c], [5, -14, 0x469a1b], [31, -11, 0x82d82c]
      ];
      for (const [px, py, color] of pads) {
        const pad = this.add.graphics();
        pad.fillStyle(color, 1);
        pad.fillRect(px, py, 11, 3);
        pad.fillRect(px + 2, py - 1, 6, 1);
        pond.add(pad);
      }

      // Soft pixel shimmer; one small tween per pond, owned by scene and auto-cleaned.
      const shimmer = this.add.graphics();
      shimmer.fillStyle(0xd9fff2, 1);
      shimmer.fillRect(-4, -5, 5, 1);
      pond.add(shimmer);
      this.tweens.add({
        targets: shimmer,
        x: 34,
        alpha: 0.35,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }

    const trees = [
      [200, "deco-tree-1"],
      [650, "deco-tree-1"],
      [1000, "deco-tree-2"],
      [1250, "deco-tree-1"],
      [1900, "deco-tree-1"],
      [2550, "deco-tree-1"],
      [3200, "deco-tree-1"],
      [3750, "deco-tree-1"]
    ];

    for (const [x, key] of trees) {
      this.add.image(x, WORLD_DECOR_Y, key)
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(4);
    }

    // Small alpine village details beside route, using existing CC0 decor sheets.
    this.add.image(2200, WORLD_DECOR_Y, "deco-house")
      .setOrigin(0.5, 1)
      .setScrollFactor(1, 1)
      .setDepth(4);

    this.add.image(2050, WORLD_DECOR_Y, "deco-wooden-shed")
      .setOrigin(0.5, 1)
      .setScrollFactor(1, 1)
      .setDepth(4);

    this.add.image(2310, WORLD_DECOR_Y, "deco-laundry")
      .setOrigin(0.5, 1)
      .setScrollFactor(1, 1)
      .setDepth(7);

    for (const x of [720, 1710, 2680, 3710]) {
      this.add.image(x, WORLD_DECOR_Y, "deco-standing-torch")
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(8);
    }

    for (const x of [1400, 3150]) {
      const boulder = this.add.image(x, WORLD_DECOR_Y, "deco-rock-4")
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(7);
      boulder.setScale(1.4);
      const highlight = this.add.image(x + 20, WORLD_DECOR_Y - 11, "deco-flower-4")
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(8);
      highlight.setScale(0.8);
    }

    const flowers = [
      [360, "deco-flower-1"],
      [850, "deco-flower-2"],
      [1120, "deco-flower-3"],
      [1580, "deco-flower-4"],
      [2260, "deco-flower-5"],
      [2650, "deco-flower-1"],
      [3220, "deco-flower-2"],
      [3650, "deco-flower-3"]
    ];

    for (const [x, key] of flowers) {
      this.add.image(x, WORLD_DECOR_Y, key)
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(7);
    }

    const tufts = [
      [90, "deco-grass-1"],
      [300, "deco-grass-2"],
      [540, "deco-grass-3"],
      [760, "deco-grass-1"],
      [1010, "deco-grass-2"],
      [1290, "deco-grass-3"],
      [1650, "deco-grass-1"],
      [2000, "deco-grass-2"],
      [2380, "deco-grass-3"],
      [2900, "deco-grass-1"],
      [3340, "deco-grass-2"],
      [3760, "deco-grass-3"],
      [620, "deco-rock-3"],
      [1780, "deco-stacked-rocks"],
      [3100, "deco-rock-3"]
    ];

    for (const [x, key] of tufts) {
      this.add.image(x, WORLD_DECOR_Y, key)
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(7);
    }

    this.add.image(980, WORLD_DECOR_Y, "deco-fence-1")
      .setOrigin(0.5, 1)
      .setScrollFactor(1, 1)
      .setDepth(4);

    this.add.image(2500, WORLD_DECOR_Y, "deco-fence-2")
      .setOrigin(0.5, 1)
      .setScrollFactor(1, 1)
      .setDepth(4);
  }

  // =====================================================
  // AVATAR LOKAL
  // =====================================================

  createAvatar(x, y) {
    const selected = this.localAvatarSelection || DEFAULT_AVATAR;
    const parts = [
      {
        name: "body",
        idleTexture: "avatar-body",
        row: selected.skin,
        depth: 20
      },
      {
        name: "bottoms",
        idleTexture: "avatar-bottoms",
        row: selected.bottoms,
        depth: 21
      },
      {
        name: "shoes",
        idleTexture: "avatar-shoes",
        row: selected.shoes,
        depth: 22
      },
      {
        name: "top",
        idleTexture: "avatar-top",
        row: selected.top,
        depth: 23
      },
      {
        name: "eyes",
        idleTexture: "avatar-eyes",
        row: selected.eyes,
        depth: 24
      },
      {
        name: "hair",
        idleTexture: "avatar-hair",
        row: selected.hair,
        depth: 25
      },
      { name: "glasses", idleTexture: "avatar-glasses", row: selected.glasses ?? 0, depth: 25.2 },
      { name: "hat", idleTexture: "avatar-hat", row: selected.hat ?? 0, depth: 25.4 },
      { name: "weapon", idleTexture: "avatar-weapon", row: selected.weapon ?? 0, depth: 25.6 }
    ];

    this.avatarConfig = parts;
    this.avatarParts = [];

    this.player = this.add.sprite(
      x,
      y,
      "avatar-body",
      this.getAvatarFrameIndex("avatar-body", this.localAvatarSelection?.skin ?? DEFAULT_AVATAR.skin, 0)
    );

    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(20);
    for (const sprite of [this.player]) sprite.setFlipX(false);

    // Soft contact shadow under feet to ground the character
    this.playerShadow = this.add.ellipse(x, y + 10, 16, 5, 0x000000, 0.32).setDepth(18);

    this.physics.add.existing(this.player);

    // Match the lower edge of the physics body to the visible shoe baseline.
    // Avatar frames are 32px tall; this keeps the feet on the street surface
    // instead of letting the lower pixels appear embedded in the cobblestone.
    this.player.body.setSize(18, 22);
    this.player.body.setOffset(7, 10);
    this.player.body.setCollideWorldBounds(true);

    for (const part of parts.slice(1)) {
      const sprite = this.add.sprite(
        x,
        y,
        part.idleTexture,
        this.getAvatarFrameIndex(part.idleTexture, part.row, 0)
      );

      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(part.depth);

      this.avatarParts.push({
        sprite,
        config: part
      });
    }

    this.avatarState = "idle";
    this.avatarFrame = 0;
    this.avatarFrameTimer = 0;

    this.applyAvatarFrame();
    this.syncAvatarLayers();
    // HP is owned by the server and cached in window.baiPlayerHpState so it survives
    // scene.restart() on every stage change (it is never reset or healed by moving on).
    const savedHp = window.baiPlayerHpState || {};
    this.playerMaxHp = Number(savedHp.maxHp) || BATTLE.playerMaxHp;
    this.playerHp = Number.isFinite(Number(savedHp.hp)) ? Math.max(0, Math.min(this.playerMaxHp, Number(savedHp.hp))) : this.playerMaxHp;
    this.playerKo = Boolean(savedHp.ko);
    this.hpHold = false;
    this.pendingHpState = null;
    this.enemyAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
  }

  createPlayerHealthHud() {
    if (this.isHostMode) return; // Host TV screen is clean overview; no player health bar

    // Unified Top-Left Status Card placed cleanly below the DOM header (x: 6, y: 46)
    const topY = 46;
    this.playerHpHud = this.add.container(6, topY).setScrollFactor(0).setDepth(1000);

    const plate = this.add.graphics();
    plate.fillStyle(0x0e1322, 0.94).fillRoundedRect(0, 0, 126, 42, 4);
    plate.lineStyle(1.5, 0xf7c83b, 1).strokeRoundedRect(0, 0, 126, 42, 4);
    plate.lineStyle(1, 0x000000, 1).strokeRoundedRect(-1, -1, 128, 44, 4);

    const heart = this.add.text(7, 18, "♥", { fontFamily: "monospace", fontSize: "10px", color: "#ff4444" });
    this.tweens.add({
      targets: heart,
      scale: 1.15,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.playerHpText = this.add.text(80, 5, "100/100", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "5px",
      color: "#f7d36c"
    });

    this.playerHpBarBg = this.add.rectangle(66, 23, 94, 5, 0x3d1118).setOrigin(0.5);
    this.playerHpBar = this.add.rectangle(19, 23, 94, 5, 0x2ecc71).setOrigin(0, 0.5);

    this.playerHpHud.add([plate, heart, this.playerHpText, this.playerHpBarBg, this.playerHpBar]);
    this.updatePlayerHealthHud();
  }

  updatePlayerHealthHud() {
    if (!this.playerHpText || !this.playerHpBar) return;
    const ratio = Phaser.Math.Clamp(this.playerHp / this.playerMaxHp, 0, 1);
    const color = ratio > 0.5 ? 0x2ecc71 : (ratio > 0.25 ? 0xf1c40f : 0xe74c3c);
    const colorHex = ratio > 0.5 ? "#2ecc71" : (ratio > 0.25 ? "#f7c83b" : "#ff5555");

    this.playerHpText.setText(this.playerKo ? "K.O." : `${this.playerHp}/${this.playerMaxHp}`);
    this.playerHpText.setColor(colorHex);
    this.playerHpBar.width = Math.max(0, Math.round(94 * ratio));
    this.playerHpBar.fillColor = color;
  }

  tintAvatar(color) {
    for (const part of this.avatarParts || []) {
      if (!part.sprite?.active) continue;
      if (color === null) part.sprite.clearTint(); else part.sprite.setTint(color);
    }
  }

  // =====================================================
  // PLAYER HP (server-authoritative)
  // The server decides HP, damage, K.O., the -25 penalty and respawn. The scene only
  // draws it: applyServerHp() is fed by the `player:hp` socket event (and by the
  // battle answers). holdHp()/releaseHp() let an attack animation land before the
  // bar drops, so the hit and the damage line up.
  // =====================================================

  holdHp() { this.hpHold = true; }

  releaseHp() {
    this.hpHold = false;
    if (this.pendingHpState) {
      const state = this.pendingHpState;
      this.pendingHpState = null;
      this.renderServerHp(state);
    }
  }

  applyServerHp(state = {}) {
    if (!state) return;
    window.baiPlayerHpState = {
      hp: Number(state.hp),
      maxHp: Number(state.maxHp) || BATTLE.playerMaxHp,
      ko: Boolean(state.ko)
    };
    if (this.hpHold && !state.respawn) {
      // Keep the latest value; K.O. state must not be lost if several hits land while held.
      this.pendingHpState = { ...state, damage: (Number(this.pendingHpState?.damage) || 0) + (Number(state.damage) || 0), ko: Boolean(state.ko || this.pendingHpState?.ko) };
      return;
    }
    this.renderServerHp(state);
  }

  renderServerHp(state) {
    if (!this.sys?.isActive?.() || !this.player) return;
    const maxHp = Number(state.maxHp) || this.playerMaxHp;
    const hp = Phaser.Math.Clamp(Number(state.hp), 0, maxHp);
    if (!Number.isFinite(hp)) return;
    const damage = Number(state.damage) || 0;
    this.playerMaxHp = maxHp;
    this.playerHp = hp;
    if (state.respawn) {
      this.respawnLocal(state);
    } else if (state.ko && !this.playerKo) {
      this.playerKo = true;
      this.playKoAnimation(Number(state.penalty) || 0);
    }
    this.updatePlayerHealthHud();
    if (damage > 0 && !state.respawn) {
      this.tintAvatar(0xff4444);
      this.time.delayedCall(180, () => { if (!this.playerKo) this.tintAvatar(null); });
      this.showFloatingFeedback(this.player.x, this.player.y - 32, `-${damage} HP`, "#ff4444");
      if (this.playerHpHud) {
        this.tweens.add({
          targets: this.playerHpHud,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 75,
          yoyo: true,
          ease: "Back.easeOut"
        });
      }
    }
  }

  // K.O.: play the hurt sheet to its last frame, then fall onto the platform until respawn.
  playKoAnimation(penalty) {
    if (!this.player?.body) return;
    this.player.body.setVelocity(0, 0);
    this.quizPaused = true;
    const dir = this.playerFacing === "left" ? "left" : "right";
    this.playerKo = true;
    this.setAvatarAnimation(`hurt-${dir}`);
    this.networkCharacterState = { state: `hurt-${dir}`, grounded: true, vx: 0, vy: 0 };
    this.tintAvatar(0xff6666);
    this.cameras.main.shake(240, 0.01);
    this.showFloatingFeedback(this.player.x, this.player.y - 28, "K.O.!", "#ff5555");
    if (penalty) this.showFloatingFeedback(this.player.x, this.player.y - 8, `-${penalty} POIN`, "#ffd36a");
    const targets = [this.player, ...(this.avatarParts || []).map((part) => part.sprite)];
    this.tweens.add({
      targets,
      angle: dir === "left" ? 88 : -88,
      alpha: 0.55,
      duration: 420,
      ease: "Back.easeIn"
    });
    this.time.delayedCall(220, () => {
      if (!this.playerKo) return;
      this.tintAvatar(0x777777);
      this.spawnKoStars(this.player.x, this.player.y - 10);
    });
    this.events.emit("player-ko");
  }

  spawnKoStars(x, y) {
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(x + (i - 1) * 8, y, "*", {
        fontFamily: "Arial, sans-serif", fontSize: "10px", color: "#ffe27a"
      }).setOrigin(0.5).setDepth(40);
      this.tweens.add({
        targets: star,
        y: y - 16 - i * 3,
        alpha: 0,
        duration: 700,
        delay: i * 80,
        onComplete: () => star.destroy()
      });
    }
  }

  respawnLocal(state) {
    this.playerKo = false;
    this.playerDamageCooldown = false;
    const stage = COURSE.stages[this.stageIndex] || COURSE.stages[0];
    const bahnhofSpawnX = stage.startX + 175;
    const x = Number.isFinite(Number(state.respawnX)) ? Number(state.respawnX) : bahnhofSpawnX;
    const y = Number.isFinite(Number(state.respawnY)) ? Number(state.respawnY) : 208;
    this.player.setPosition(x, y);
    this.player.body.reset(x, y);
    this.player.body.setVelocity(0, 0);
    this.tweens.killTweensOf(this.player);
    this.player.setAlpha(1).setAngle(0).setScale(1);
    for (const part of this.avatarParts || []) {
      this.tweens.killTweensOf(part.sprite);
      part.sprite.setAlpha(1).setAngle(0).setScale(1);
    }
    this.tintAvatar(null);
    if (this.playerShadow) {
      this.playerShadow.setPosition(x, y + 10);
      this.playerShadow.setAlpha(0.32);
      this.playerShadow.setScale(1.0);
    }
    this.setAvatarAnimation("idle");
    this.networkCharacterState = { state: "idle", grounded: true, vx: 0, vy: 0 };
    this.quizPaused = false;
    this.playerHp = this.playerMaxHp;
    this.updatePlayerHealthHud();
    this.syncAvatarLayers();
    this.showFloatingFeedback(x, y - 18, `RESPAWN DI BAHNHOF ${stage.name}!`, "#82d82c");
    this.showFloatingFeedback(x, y - 36, "HP PENUH (100)", "#f7c83b");
  }

  // =====================================================
  // ENEMY BATTLE (see src/game/battle.js)
  //
  // One enemy per stage (München / Frankfurt / Berlin / Hamburg boss). The
  // enemy only dies by answering quiz questions: the phone controller runs the
  // question UI against the server and calls these methods to animate it.
  //   beginBattle() / endBattle(ko)
  //   playPlayerAttack(solved, total, defeated) -> Promise  (correct answer)
  //   playEnemyAttack(damage)                   -> Promise  (wrong answer)
  //   setBattleState({won, progress})           restore after reload / stage change
  // Events: "enemy-near" (bool), "battle-request", "player-ko".
  // Köln (stage 5) has no enemy.
  // =====================================================

  createStageEnemies() {
    const stage = COURSE.stages[this.stageIndex];
    this.stageEnemy = null;
    this.enemyInReach = false;
    this.battleActive = false;
    const cfg = battleConfig(stage?.id);
    if (!cfg) return;
    const x = battleEnemyX(stage.id);
    const texture = `enemy-${cfg.enemyId}-idle`;
    if (!this.textures.exists(texture)) return;
    const isBoss = cfg.boss;
    const enemy = this.add.image(x, isBoss ? 193 : 198, texture).setDepth(19);
    enemy.setScale(isBoss ? 0.55 : 0.72);
    enemy.setFlipX(true); // art faces right; players arrive from the left

    const barWidth = isBoss ? 74 : 50;
    const bar = this.add.graphics().setDepth(30);
    const name = this.add.text(x, isBoss ? 116 : 138, `${cfg.name} (HP ${cfg.maxHp})`, {
      fontFamily: "monospace", fontSize: isBoss ? "7px" : "6px", color: isBoss ? "#f7c83b" : "#f8e6bd",
      stroke: "#20120d", strokeThickness: 2, fontStyle: "bold"
    }).setOrigin(0.5).setDepth(31);

    // Floating question battle alert banner above enemy (visual alert only; player must click the fight button!)
    const promptContainer = this.add.container(x, (isBoss ? 193 : 198) - (isBoss ? 74 : 56)).setDepth(35).setVisible(false);
    const pBg = this.add.graphics();
    pBg.fillStyle(0x140c1e, 0.94);
    pBg.fillRoundedRect(-48, -10, 96, 20, 3);
    pBg.lineStyle(1.5, 0xf7c83b, 1);
    pBg.strokeRoundedRect(-48, -10, 96, 20, 3);
    const pText = this.add.text(0, 0, "⚔ LAWAN! ⚔", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "6px",
      color: "#f7c83b",
      fontStyle: "bold"
    }).setOrigin(0.5);
    promptContainer.add([pBg, pText]);
    this.tweens.add({
      targets: promptContainer,
      y: (isBoss ? 193 : 198) - (isBoss ? 78 : 60),
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.enemyBattlePrompt = promptContainer;

    this.stageEnemy = {
      cfg, sprite: enemy, hp: cfg.maxHp, maxHp: cfg.maxHp, bar, name, barWidth,
      homeX: x, baseY: enemy.y, feetY: enemy.y + enemy.displayHeight / 2,
      direction: 1, lastAttack: 0, defeated: false, enemyId: cfg.enemyId, solved: 0, total: cfg.total,
      walkTime: 0, idleTime: 0
    };
    this.drawEnemyHealthBar();
    this.showFloatingFeedback(x, 120, isBoss ? "⚠️ BOSS APPROACHING!" : "⚠️ ENEMY!", "#ffd36a");
    if (this.pendingBattleState) this.setBattleState(this.pendingBattleState);
  }

  // Swap the enemy pose (idle / walk / attack / special / hit / defeat) and keep its feet on the ground.
  setEnemyPose(pose) {
    const e = this.stageEnemy;
    if (!e?.sprite?.active) return;
    if (e.defeated && pose !== "defeat") return;
    const key = `enemy-${e.enemyId}-${pose}`;
    if (!this.textures.exists(key)) return;
    if (e.sprite.texture.key !== key) {
      e.sprite.setTexture(key);
      e.sprite.y = e.feetY - e.sprite.displayHeight / 2;
    }
  }

  drawEnemyHealthBar() {
    const e = this.stageEnemy;
    if (!e || !e.sprite?.active) return;

    // World-space UI layers only; each player sees enemy info as camera follows them.
    const x = Math.round(e.sprite.x);
    const top = Math.round(e.sprite.y - e.sprite.displayHeight / 2 - 18);
    const w = e.barWidth;
    const h = 4;
    const ratio = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
    const fillWidth = Math.max(0, Math.round(w * ratio));

    e.bar.clear();
    // Dark backing with clear contrast, directly above the NPC
    e.bar.fillStyle(0x0c0914, 0.96);
    e.bar.fillRoundedRect(x - w / 2 - 1, top - 1, w + 2, h + 2, 2);
    e.bar.lineStyle(1, e.cfg.boss ? 0xf7c83b : 0x000000, 1);
    e.bar.strokeRoundedRect(x - w / 2 - 1, top - 1, w + 2, h + 2, 2);

    e.bar.fillStyle(0x381215, 1);
    e.bar.fillRect(x - w / 2, top, w, h);
    if (fillWidth > 0) {
      const color = ratio > 0.5 ? 0xe74c3c : ratio > 0.25 ? 0xf39c12 : 0x8e1c24;
      e.bar.fillStyle(color, 1);
      e.bar.fillRect(x - w / 2, top, fillWidth, h);
      e.bar.fillStyle(0xffffff, 0.28);
      e.bar.fillRect(x - w / 2, top, fillWidth, 1);
    }

    if (e.name) {
      e.name.setPosition(x, top - 7);
      e.name.setText(`${e.cfg.name}  ${e.hp}/${e.maxHp}`);
    }
  }

  updateStageEnemies(delta) {
    const e = this.stageEnemy;
    if (!e || e.defeated || !e.sprite?.active) return;

    if (this.isHostMode || !this.player) {
      // Host / spectator view: enemy patrols with animated walking step
      e.walkTime = (e.walkTime || 0) + delta * 0.008;
      e.sprite.x += e.direction * delta * 0.022;
      if (Math.abs(e.sprite.x - e.homeX) > 46) {
        e.direction *= -1;
      }
      e.sprite.setFlipX(e.direction < 0);
      this.setEnemyPose("walk");
      e.sprite.y = e.baseY + Math.abs(Math.sin(e.walkTime * 8)) * 2;
      this.drawEnemyHealthBar();
      return;
    }

    const distance = Math.abs(this.player.x - e.sprite.x);
    const inReach = distance < BATTLE.reach && Math.abs(this.player.y - e.sprite.y) < 48;

    if (inReach !== this.enemyInReach) {
      this.enemyInReach = inReach;
      this.events.emit("enemy-near", inReach); // phone shows the SERANG button
      if (this.enemyBattlePrompt) this.enemyBattlePrompt.setVisible(inReach && !this.battleActive && !e.defeated);
    }

    if (!this.battleActive) {
      if (inReach) {
        // Player is nearby! Enemy alert: faces player in ready stance
        e.sprite.setFlipX(this.player.x < e.sprite.x);
        this.setEnemyPose("idle");
        e.idleTime = (e.idleTime || 0) + delta * 0.005;
        // Subtle breathing pulse
        const baseScale = e.cfg.boss ? 0.55 : 0.72;
        e.sprite.setScale(
          baseScale * (1 + Math.sin(e.idleTime * 6) * 0.02),
          baseScale * (1 - Math.sin(e.idleTime * 6) * 0.02)
        );
      } else {
        // Patrol back and forth with animated walking step
        e.walkTime = (e.walkTime || 0) + delta * 0.008;
        e.sprite.x += e.direction * delta * 0.022;
        if (Math.abs(e.sprite.x - e.homeX) > 46) {
          e.direction *= -1;
        }
        e.sprite.setFlipX(e.direction < 0);
        this.setEnemyPose("walk");
        // Walking footstep cadence
        e.sprite.y = e.baseY + Math.abs(Math.sin(e.walkTime * 8)) * 2;
      }

      this.drawEnemyHealthBar();
      if (this.enemyBattlePrompt) {
        this.enemyBattlePrompt.x = e.sprite.x;
      }
    }

    if (inReach && !this.battleActive && !this.quizPaused && Phaser.Input.Keyboard.JustDown(this.enemyAttackKey)) {
      this.attackStageEnemy();
    }
  }

  // F key (desktop), click/touch, and SERANG button (phone) all trigger the battle quiz!
  attackStageEnemy() {
    const e = this.stageEnemy;
    if (!e || e.defeated || !this.player || this.battleActive || this.playerKo || this.introActive || this._bossIntroPlaying) return;
    if (this.events.listenerCount("battle-request") > 0) {
      this.events.emit("battle-request");
    } else {
      this.startInCanvasBattle();
    }
  }

  startInCanvasBattle() {
    const e = this.stageEnemy;
    if (!e || e.defeated || !this.player || this.battleActive) return;
    const isBoss = Boolean(e.cfg?.boss);
    const proceed = () => {
      this.beginBattle();

      const stageId = COURSE.stages[this.stageIndex]?.id || "munich";
      const questions = BATTLE_QUESTIONS[stageId] || BATTLE_QUESTIONS.munich;
      if (!questions || !questions.length) return;

      if (e.localQuestionIndex === undefined) e.localQuestionIndex = 0;
      const qItem = questions[e.localQuestionIndex % questions.length];
      this.showInCanvasBattleModal(qItem, e);
    };

    if (isBoss && !this._bossIntroPlayed) {
      this.playFinalBossIntro(proceed);
    } else {
      proceed();
    }
  }

  showInCanvasBattleModal(qItem, e) {
    if (this.inCanvasBattleElements) {
      this.inCanvasBattleElements.forEach(el => el.destroy());
      this.inCanvasBattleElements = null;
    }

    const centerX = VIEW_W / 2;
    const centerY = VIEW_H - 52;
    const elements = [];

    const bg = this.add.graphics().setDepth(400).setScrollFactor(0);
    bg.fillStyle(0x111628, 0.96);
    bg.fillRoundedRect(centerX - 165, centerY - 42, 330, 84, 6);
    bg.lineStyle(2, 0xf7c83b, 1);
    bg.strokeRoundedRect(centerX - 165, centerY - 42, 330, 84, 6);
    elements.push(bg);

    const title = this.add.text(centerX, centerY - 32, `⚔ BATTLE: ${e.cfg.name} · SOAL ${e.solved + 1}/${e.total} ⚔`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#f7c83b"
    }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
    elements.push(title);

    const questionText = this.add.text(centerX, centerY - 18, qItem.question, {
      fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold", color: "#ffffff", wordWrap: { width: 310 }
    }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
    elements.push(questionText);

    const letters = ["A", "B", "C", "D"];
    const positions = [
      [centerX - 78, centerY + 2], [centerX + 78, centerY + 2],
      [centerX - 78, centerY + 24], [centerX + 78, centerY + 24]
    ];

    letters.forEach((letter, idx) => {
      const [bx, by] = positions[idx];
      const btn = this.add.rectangle(bx, by, 150, 18, 0x222b48).setStrokeStyle(1.5, 0x4a5d8f, 1).setDepth(402).setScrollFactor(0);
      btn.setInteractive({ useHandCursor: true });
      const txt = this.add.text(bx, by, `${letter}. ${qItem.choices[letter]}`, {
        fontFamily: "Arial, sans-serif", fontSize: "8px", fontStyle: "bold", color: "#e2e8f0"
      }).setOrigin(0.5).setDepth(403).setScrollFactor(0);

      btn.on("pointerover", () => btn.setFillStyle(0x354472));
      btn.on("pointerout", () => btn.setFillStyle(0x222b48));
      btn.on("pointerdown", () => {
        if (this.inCanvasBattleElements) {
          this.inCanvasBattleElements.forEach(el => el.destroy());
          this.inCanvasBattleElements = null;
        }
        if (letter === qItem.answer) {
          e.solved = (e.solved || 0) + 1;
          const defeated = e.solved >= e.total;
          this.playPlayerAttack(e.solved, e.total, defeated).then(() => {
            if (defeated) {
              this.endBattle(false);
            } else {
              e.localQuestionIndex = (e.localQuestionIndex || 0) + 1;
              const nextQ = (BATTLE_QUESTIONS[COURSE.stages[this.stageIndex]?.id] || BATTLE_QUESTIONS.munich)[e.localQuestionIndex % 20];
              this.showInCanvasBattleModal(nextQ, e);
            }
          });
        } else {
          this.holdHp();
          const damage = e.cfg.wrongDamage || 10;
          this.playEnemyAttack(damage).then(() => {
            this.releaseHp();
            const newHp = Math.max(0, this.playerHp - damage);
            const isKo = newHp <= 0;
            this.renderServerHp({
              hp: newHp,
              maxHp: this.playerMaxHp,
              damage,
              ko: isKo,
              penalty: 25
            });
            if (isKo) {
              this.endBattle(true);
              this.time.delayedCall(BATTLE.koRespawnMs || 1800, () => {
                const stage = COURSE.stages[this.stageIndex] || COURSE.stages[0];
                this.respawnLocal({ respawnX: stage.startX + 175, respawnY: 208 });
              });
            } else {
              e.localQuestionIndex = (e.localQuestionIndex || 0) + 1;
              const nextQ = (BATTLE_QUESTIONS[COURSE.stages[this.stageIndex]?.id] || BATTLE_QUESTIONS.munich)[e.localQuestionIndex % 20];
              this.showInCanvasBattleModal(nextQ, e);
            }
          });
        }
      });

      elements.push(btn, txt);
    });

    this.inCanvasBattleElements = elements;
  }

  setBattleState(state) {
    this.pendingBattleState = state || null;
    const e = this.stageEnemy;
    if (!e || !state) return;
    const stageId = COURSE.stages[this.stageIndex]?.id;
    if (state.won?.includes?.(stageId)) { this.markEnemyDefeated(true); return; }
    const progress = state.progress?.[stageId];
    if (progress) this.setEnemyProgress(progress.solved, progress.total);
    this.stageEnemyBattleWon = Boolean(state.won?.includes?.(stageId));
    if (this.stageEnemyBattleWon) this.markEnemyDefeated(true);
  }

  setEnemyProgress(solved, total) {
    const e = this.stageEnemy;
    if (!e) return;
    e.solved = solved;
    e.hp = Math.max(0, Math.round(e.maxHp * (total - solved) / Math.max(1, total)));
    this.drawEnemyHealthBar();
  }

  beginBattle() {
    const e = this.stageEnemy;
    if (!e || !this.player) return;
    this.battleActive = true;
    this.quizPaused = true;
    this.player.body.setVelocity(0, 0);
    this.playerFacing = e.sprite.x >= this.player.x ? "right" : "left";
    this.setAvatarAnimation("idle");
    e.sprite.setFlipX(this.player.x < e.sprite.x);
    this.setEnemyPose("idle");
    if (this.enemyBattlePrompt) this.enemyBattlePrompt.setVisible(false);
  }

  endBattle(ko = false) {
    this.battleActive = false;
    if (this.inCanvasBattleElements) {
      this.inCanvasBattleElements.forEach(el => el.destroy());
      this.inCanvasBattleElements = null;
    }
    if (!ko) this.quizPaused = false;
    this.setAvatarAnimation("idle");
    this.setEnemyPose("idle");
  }

  spawnSlashEffect(x, y) {
    const g = this.add.graphics({ x, y }).setDepth(40);
    g.lineStyle(3, 0xfff1a8, 1);
    g.beginPath(); g.moveTo(-16, -14); g.lineTo(16, 14); g.strokePath();
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath(); g.moveTo(-12, 12); g.lineTo(14, -10); g.strokePath();
    g.fillStyle(0xffd36a, 1);
    for (const [dx, dy] of [[-18, 0], [18, -4], [0, -18], [4, 18]]) g.fillRect(dx - 1, dy - 1, 3, 3);
    this.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 260, onComplete: () => g.destroy() });
  }

  spawnPunchSwoosh(x, y, dir) {
    const g = this.add.graphics({ x, y }).setDepth(42);
    const sign = dir === "right" ? 1 : -1;
    g.lineStyle(3, 0xfff2b0, 1);
    g.beginPath();
    g.arc(sign * 10, 0, 14, -0.6 * Math.PI, 0.6 * Math.PI, sign < 0);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(sign * 18, 0, 3);
    this.tweens.add({ targets: g, alpha: 0, scale: 1.5, x: x + sign * 14, duration: 200, onComplete: () => g.destroy() });
  }

  spawnSwordSlashArc(x, y, dir) {
    const g = this.add.graphics({ x, y }).setDepth(43);
    const sign = dir === "right" ? 1 : -1;
    // Outer vibrant cyan-glow arc
    g.lineStyle(4, 0x38bdf8, 0.7);
    g.beginPath();
    g.arc(sign * 12, 0, 18, -0.65 * Math.PI, 0.65 * Math.PI, sign < 0);
    g.strokePath();

    // Inner bright white razor blade arc
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath();
    g.arc(sign * 13, 0, 18, -0.6 * Math.PI, 0.6 * Math.PI, sign < 0);
    g.strokePath();

    // Sharp blade tip spark
    g.fillStyle(0xffffff, 1);
    g.fillCircle(sign * 22, -6, 2.5);
    g.fillStyle(0x38bdf8, 0.9);
    g.fillCircle(sign * 24, 0, 2);

    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      x: x + sign * 18,
      duration: 190,
      ease: "Quad.easeOut",
      onComplete: () => g.destroy()
    });
  }

  spawnHitSparks(x, y) {
    const colors = [0xfff2b0, 0xff4444, 0xffa500, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const p = this.add.rectangle(
        x + Phaser.Math.Between(-6, 6),
        y + Phaser.Math.Between(-6, 6),
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(2, 4),
        colors[i % colors.length]
      ).setDepth(45);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(40, 110);
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * speed,
        y: p.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(180, 320),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  spawnDefeatParticles(x, y) {
    const colors = [0xf7c83b, 0xff4444, 0xec4899, 0xffffff, 0x82d82c];
    for (let i = 0; i < 24; i++) {
      const p = this.add.rectangle(
        x + Phaser.Math.Between(-12, 12),
        y + Phaser.Math.Between(-12, 12),
        Phaser.Math.Between(3, 6),
        Phaser.Math.Between(3, 6),
        colors[i % colors.length]
      ).setDepth(45);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(50, 160);
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * speed,
        y: p.y + Math.sin(angle) * speed + 30,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(400, 750),
        ease: "Quad.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  // Correct answer: the player lunges & strikes with weapon (or punch), the enemy flinches in hit pose and loses HP!
  playPlayerAttack(solved, total, defeated) {
    return new Promise((resolve) => {
      const e = this.stageEnemy;
      if (!e || !this.player) { resolve(); return; }
      const dir = e.sprite.x >= this.player.x ? "right" : "left";
      this.playerFacing = dir;
      const hasWeapon = Number(this.localAvatarSelection?.weapon) > 0;
      const animType = hasWeapon ? "sword" : "punch";
      this.setAvatarAnimation(`${animType}-${dir}`);
      this.networkCharacterState = { state: `${animType}-${dir}`, grounded: true, vx: 0, vy: 0 };
      retroAudio.playCorrect?.();

      const lunge = dir === "right" ? 16 : -16;
      if (hasWeapon) {
        retroAudio.playSlash?.();
        this.spawnSwordSlashArc(this.player.x + (dir === "right" ? 18 : -18), this.player.y - 4, dir);
      } else {
        this.spawnPunchSwoosh(this.player.x + (dir === "right" ? 18 : -18), this.player.y - 4, dir);
      }

      this.tweens.add({
        targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
        x: `+=${lunge}`,
        scaleX: 1.15,
        scaleY: 0.9,
        duration: 130,
        yoyo: true,
        ease: "Quad.easeOut"
      });

      this.time.delayedCall(220, () => {
        if (!e.sprite?.active) return;
        this.setEnemyProgress(solved, total);
        this.spawnSlashEffect(e.sprite.x + (dir === "right" ? -14 : 14), e.sprite.y - 6);
        this.spawnHitSparks(e.sprite.x + (dir === "right" ? -14 : 14), e.sprite.y - 6);
        this.cameras.main.shake(defeated ? 220 : 120, defeated ? 0.01 : 0.005);
        if (hasWeapon) {
          retroAudio.playShatter?.();
        } else {
          retroAudio.playBounce?.();
        }
        if (defeated) retroAudio.playCoin?.();
        const dmg = Math.round(e.maxHp / Math.max(1, total));
        this.showFloatingFeedback(e.sprite.x, e.sprite.y - 38, defeated ? "DIKALAHKAN!" : `-${dmg} HP`, "#ffe28a");

        if (!defeated) {
          this.setEnemyPose("hit");
          e.sprite.setTint(0xff4444);
          this.tweens.add({
            targets: e.sprite,
            x: e.sprite.x + (dir === "right" ? 16 : -16),
            scaleX: (e.cfg.boss ? 0.55 : 0.72) * 0.88,
            duration: 100,
            yoyo: true,
            ease: "Back.easeOut",
            onComplete: () => {
              e.sprite?.clearTint?.();
              e.sprite?.setScale(e.cfg.boss ? 0.55 : 0.72);
              this.setEnemyPose("idle");
            }
          });
        }
      });

      this.time.delayedCall(520, () => {
        this.networkCharacterState = { state: "idle", grounded: true, vx: 0, vy: 0 };
        this.setAvatarAnimation("idle");
        if (defeated) this.markEnemyDefeated(false);
      });
      this.time.delayedCall(defeated ? 1250 : 760, resolve);
    });
  }

  // Wrong answer: the enemy winds up, lunges forward and strikes, player recoils and loses HP!
  playEnemyAttack(damage) {
    return new Promise((resolve) => {
      const e = this.stageEnemy;
      if (!e || !this.player) { this.releaseHp(); resolve(); return; }
      const dir = e.sprite.x >= this.player.x ? "right" : "left";
      const useSpecial = e.cfg.boss && Math.random() < 0.4 && this.textures.exists(`enemy-${e.enemyId}-special`);
      retroAudio.playWrong?.();

      const homeX = e.sprite.x;
      // Phase 1: Wind-up (anticipation)
      this.setEnemyPose(useSpecial ? "special" : "attack");
      this.tweens.add({
        targets: e.sprite,
        x: homeX + (dir === "right" ? 8 : -8),
        scaleY: (e.cfg.boss ? 0.55 : 0.72) * 1.12,
        duration: 140,
        ease: "Sine.easeIn",
        onComplete: () => {
          // Phase 2: Forward lunge & slash strike
          this.tweens.add({
            targets: e.sprite,
            x: homeX + (dir === "right" ? -32 : 32),
            scaleY: e.cfg.boss ? 0.55 : 0.72,
            duration: 120,
            yoyo: true,
            hold: 80,
            ease: "Quad.easeOut",
            onComplete: () => {
              e.sprite.x = homeX;
              this.setEnemyPose("idle");
            }
          });

          this.time.delayedCall(70, () => {
            if (!this.player?.active || this.playerKo) { this.releaseHp(); return; }
            this.player.body.setVelocity(0, 0);
            this.setAvatarAnimation(`hurt-${dir}`);
            this.networkCharacterState = { state: `hurt-${dir}`, grounded: true, vx: 0, vy: 0 };
            this.tintAvatar(0xff4444);
            this.cameras.main.shake(140, 0.007);
            this.spawnSlashEffect(this.player.x, this.player.y - 6);
            this.spawnHitSparks(this.player.x, this.player.y - 6);

            // Knockback player away from enemy
            const knockback = dir === "right" ? -14 : 14;
            this.tweens.add({
              targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
              x: `+=${knockback}`,
              duration: 100,
              yoyo: true,
              ease: "Quad.easeOut",
              onComplete: () => {
                if (!this.playerKo) this.tintAvatar(null);
              }
            });

            this.releaseHp();
          });
        }
      });

      this.time.delayedCall(650, () => {
        this.setEnemyPose("idle");
        this.networkCharacterState = { state: "idle", grounded: true, vx: 0, vy: 0 };
        if (!this.playerKo) this.setAvatarAnimation("idle");
      });
      this.time.delayedCall(880, resolve);
    });
  }

  markEnemyDefeated(instant = false) {
    const e = this.stageEnemy;
    if (!e || e.defeated) return;
    e.defeated = true;
    this.enemyInReach = false;
    this.events.emit("enemy-near", false);
    if (this.enemyBattlePrompt) this.enemyBattlePrompt.destroy();
    e.hp = 0;
    e.bar.destroy();
    e.name.destroy();
    if (instant) { e.sprite.destroy(); return; }

    this.setEnemyPose("defeat");
    retroAudio.playCorrect?.();
    this.spawnDefeatParticles(e.sprite.x, e.sprite.y);
    this.showFloatingFeedback(e.sprite.x, e.sprite.y - 40, `🏆 ${e.cfg.name} KALAH! 🏆`, "#82d82c");

    this.tweens.add({
      targets: e.sprite,
      alpha: 0,
      y: e.sprite.y + 16,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 850,
      delay: 300,
      ease: "Quad.easeIn",
      onComplete: () => e.sprite.destroy()
    });
  }

  // =====================================================
  // MULTIPLAYER REMOTE AVATAR
  // =====================================================

  buildPlayerNameplate(remote) {
    if (!remote?.namePlate?.active || !remote?.nameLabel?.active) return;
    const slot = remote.slot ?? 0;
    const slotColors = [
      { badge: 0x2563eb, border: 0x60a5fa, tag: "P1" }, // Blue
      { badge: 0xd97706, border: 0xfbbf24, tag: "P2" }, // Gold / Orange
      { badge: 0x059669, border: 0x34d399, tag: "P3" }, // Green
      { badge: 0x7c3aed, border: 0xa78bfa, tag: "P4" }  // Purple
    ];
    const pal = slotColors[slot % slotColors.length];

    const labelW = Math.max(20, Math.ceil(remote.nameLabel.width));
    const badgeW = 14;
    const pad = 3;
    const totalW = badgeW + labelW + pad * 2 + 2;
    const totalH = 13;

    const left = -Math.round(totalW / 2);
    const top = -totalH;

    const g = remote.namePlate;
    g.clear();

    // 1. Sleek dark translucent pill
    g.fillStyle(0x0a101d, 0.92);
    g.fillRoundedRect(left, top, totalW, totalH, 3);
    g.lineStyle(1, pal.border, 0.95);
    g.strokeRoundedRect(left, top, totalW, totalH, 3);

    // 2. Colored slot badge pill on left [P1] / [P2]
    g.fillStyle(pal.badge, 1);
    g.fillRoundedRect(left + 1, top + 1, badgeW, totalH - 2, 2);

    // 3. Small downward pointer arrow (caret) pointing at avatar's head
    g.fillStyle(pal.border, 1);
    g.fillTriangle(-3, 0, 3, 0, 0, 3);

    // 4. Position text elements precisely inside the container
    remote.slotLabel?.setPosition(left + 1 + Math.round(badgeW / 2), -2);
    remote.nameLabel.setPosition(left + badgeW + pad + Math.round(labelW / 2) + 1, -2);
  }

  createRemoteAvatar(data) {
    if (!data || !data.playerId) {
      return;
    }

    if (this.remoteAvatars.has(data.playerId)) {
      this.updateRemoteAvatar(data);
      return;
    }

    const x = Number.isFinite(Number(data.x))
      ? Number(data.x)
      : 240;

    const y = Number.isFinite(Number(data.y))
      ? Number(data.y)
      : 208;

    // REMOTE AVATAR:
    // Depth dibuat di atas avatar lokal agar tidak tertutup.
    const parts = [
      {
        name: "body",
        texture: "avatar-body",
        row: Number.isInteger(data.avatar?.skin) ? data.avatar.skin : DEFAULT_AVATAR.skin,
        depth: 26
      },
      {
        name: "bottoms",
        texture: "avatar-bottoms",
        row: Number.isInteger(data.avatar?.bottoms) ? data.avatar.bottoms : DEFAULT_AVATAR.bottoms,
        depth: 27
      },
      {
        name: "shoes",
        texture: "avatar-shoes",
        row: Number.isInteger(data.avatar?.shoes) ? data.avatar.shoes : DEFAULT_AVATAR.shoes,
        depth: 28
      },
      {
        name: "top",
        texture: "avatar-top",
        row: Number.isInteger(data.avatar?.top) ? data.avatar.top : DEFAULT_AVATAR.top,
        depth: 29
      },
      {
        name: "eyes",
        texture: "avatar-eyes",
        row: Number.isInteger(data.avatar?.eyes) ? data.avatar.eyes : DEFAULT_AVATAR.eyes,
        depth: 30
      },
      {
        name: "hair",
        texture: "avatar-hair",
        row: Number.isInteger(data.avatar?.hair) ? data.avatar.hair : DEFAULT_AVATAR.hair,
        depth: 31
      },
      { name: "glasses", texture: "avatar-glasses", row: Number.isInteger(data.avatar?.glasses) ? data.avatar.glasses : 0, depth: 31.2 },
      { name: "hat", texture: "avatar-hat", row: Number.isInteger(data.avatar?.hat) ? data.avatar.hat : 0, depth: 31.4 },
      { name: "weapon", texture: "avatar-weapon", row: Number.isInteger(data.avatar?.weapon) ? data.avatar.weapon : 0, depth: 31.6 }
    ];

    const sprites = [];

    for (const part of parts) {
      const sprite = this.add.sprite(
        x,
        y,
        part.texture,
        this.getAvatarFrameIndex(part.texture, part.row, 0)
      );

      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(part.depth);
      sprite.setFlipX(data.facing === "left");
      sprite.setVisible(true);
      sprite.setActive(true);

      sprites.push(sprite);
    }

    const slot = this.remoteAvatars.size;
    const slotColors = [
      { badge: 0x2563eb, border: 0x60a5fa, tag: "P1" },
      { badge: 0xd97706, border: 0xfbbf24, tag: "P2" },
      { badge: 0x059669, border: 0x34d399, tag: "P3" },
      { badge: 0x7c3aed, border: 0xa78bfa, tag: "P4" }
    ];
    const pal = slotColors[slot % slotColors.length];
    const displayName = String(data.name || `Player ${slot + 1}`).slice(0, 10);

    const nameLabel = this.add.text(
      0, 0,
      displayName,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        fontStyle: "bold",
        color: "#f8fafc",
        align: "center"
      }
    ).setOrigin(0.5, 1);

    const slotLabel = this.add.text(
      0, 0,
      pal.tag,
      {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "5px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5, 1);

    const namePlate = this.add.graphics();
    const hpBar = this.add.graphics();
    const nameContainer = this.add.container(x, y - 24).setDepth(33);
    nameContainer.add([namePlate, hpBar, nameLabel, slotLabel]);

    const remoteObj = {
      hpBar,
      hp: Number.isFinite(Number(data.hp)) ? Number(data.hp) : BATTLE.playerMaxHp,
      maxHp: Number(data.maxHp) || BATTLE.playerMaxHp,
      ko: Boolean(data.ko),
      playerId: data.playerId,
      name: data.name || "Player",
      sprites,
      nameLabel,
      slotLabel,
      namePlate,
      nameContainer,
      slot,
      x,
      y,
      targetX: x,
      targetY: y,
      facing: data.facing === "left" ? "left" : "right",
      state: data.state || "idle",
      finished: Boolean(data.finished),
      vx: Number(data.vx) || 0,
      vy: Number(data.vy) || 0,
      grounded: data.grounded !== false,
      avatarRows: { ...(data.avatar || DEFAULT_AVATAR) },
      lastUpdate: performance.now(),
      snapshots: [{ time: performance.now(), x, y }],
      serverNow: Number(data.serverNow) || Date.now()
    };

    this.buildPlayerNameplate(remoteObj);
    this.drawRemoteHpBar(remoteObj);
    this.remoteAvatars.set(data.playerId, remoteObj);

    console.log(
      "[MULTIPLAYER] Avatar pemain dibuat:",
      data.name,
      data.playerId,
      "Posisi:",
      x,
      y,
      "Depth:",
      sprites.map((sprite) => sprite.depth)
    );
  }

  updateRemoteAvatar(data) {
    if (!data || !data.playerId) {
      return;
    }

    let remote = this.remoteAvatars.get(data.playerId);

    if (!remote) {
      this.createRemoteAvatar(data);
      return;
    }

    // Costume data is carried with the authoritative server snapshot. Refresh
    // sprite-sheet rows when it changes so TV and peer clients never keep stale clothes.
    if (data.avatar && typeof data.avatar === "object") {
      const limits = { skin:5, bottoms:64, shoes:10, top:79, eyes:4, hair:25, glasses:82, hat:81, weapon:91 };
      const keys = ["skin", "bottoms", "shoes", "top", "eyes", "hair", "glasses", "hat", "weapon"];
      let changed = false;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = Number(data.avatar[key]);
        const safeValue = Number.isInteger(value) && value >= 0 && value < limits[key] ? value : DEFAULT_AVATAR[key];
        if ((remote.avatarRows || {})[key] !== safeValue) {
          const activeTexture = remote.sprites[i]?.texture?.key || `avatar-${key === "skin" ? "body" : key}`;
          remote.sprites[i]?.setFrame(this.getAvatarFrameIndex(activeTexture, safeValue, remote.animFrame || 0));
          changed = true;
        }
      }
      if (changed) remote.avatarRows = { ...data.avatar };
    }

    const x = Number(data.x);
    const y = Number(data.y);

    const now = performance.now();
    if (Number.isFinite(x) && Number.isFinite(y)) {
      remote.snapshots.push({ time: now, x, y });
      remote.snapshots = remote.snapshots.slice(-4);
      remote.targetX = x;
      remote.targetY = y;
      remote.lastUpdate = now;
      remote.serverNow = Number(data.serverNow) || Date.now();
    }

    if (data.state && ["idle", "walk-left", "walk-right", "jump-left", "jump-right", "fall-left", "fall-right", "interact", "hurt"].includes(data.state)) {
      remote.state = data.state;
    }
    if (typeof data.finished === "boolean") remote.finished = data.finished;
    if (Number.isFinite(Number(data.hp))) this.setRemoteHp(remote, data);
    if (typeof data.grounded === "boolean") remote.grounded = data.grounded;
    if (Number.isFinite(Number(data.vx))) remote.vx = Number(data.vx);
    if (Number.isFinite(Number(data.vy))) remote.vy = Number(data.vy);

    if (data.facing === "left" || data.facing === "right") {
      remote.facing = data.facing;

      for (const sprite of remote.sprites) {
        sprite.setFlipX(remote.facing === "left");
      }
    }

    if (data.name && data.name !== remote.name && remote.nameLabel?.active) {
      remote.name = String(data.name).slice(0, 24);
      remote.nameLabel.setText(String(remote.name || "Player").slice(0, 10));
      this.buildPlayerNameplate(remote);
    }
  }

  // Other players' HP bar (above the nameplate). Fed by the server: position snapshots
  // and the `player:hp` event both carry hp / maxHp / ko.
  setRemoteHp(remote, data = {}) {
    if (!remote) return;
    const prevHp = remote.hp;
    const wasKo = remote.ko;
    const newMax = Number(data.maxHp) || remote.maxHp || BATTLE.playerMaxHp;
    const newHp = Phaser.Math.Clamp(Number(data.hp), 0, newMax);
    const newKo = typeof data.ko === "boolean" ? data.ko : remote.ko;

    const hpChanged = (newHp !== prevHp) || (newMax !== remote.maxHp);
    const koChanged = (newKo !== wasKo);

    remote.maxHp = newMax;
    remote.hp = newHp;
    remote.ko = newKo;

    const damage = Number(data.damage) || Math.max(0, (Number(prevHp) || 0) - remote.hp);
    if (damage > 0 && remote.nameLabel?.active) {
      this.showFloatingFeedback(remote.x, remote.y - 14, `-${damage}`, "#ff7777");
      for (const sprite of remote.sprites) {
        sprite.setTint(0xff7777);
        this.time.delayedCall(180, () => { if (sprite.active) { if (remote.ko) sprite.setTint(0x777777); else sprite.clearTint(); } });
      }
    }
    if (remote.ko && !wasKo) {
      const fall = remote.facing === "left" ? 88 : -88;
      for (const sprite of remote.sprites) {
        sprite.setTint(0x777777);
        this.tweens.add({ targets: sprite, angle: fall, alpha: 0.5, duration: 420, ease: "Back.easeIn" });
      }
      this.showFloatingFeedback(remote.x, remote.y - 26, "K.O.!", "#ff5555");
    } else if (!remote.ko && wasKo) {
      for (const sprite of remote.sprites) {
        this.tweens.killTweensOf(sprite);
        sprite.clearTint();
        sprite.setAlpha(1).setAngle(0);
      }
      this.showFloatingFeedback(remote.x, remote.y - 26, "RESPAWN!", "#82d82c");
    }
    if (hpChanged || koChanged) {
      this.drawRemoteHpBar(remote);
    }
  }

  drawRemoteHpBar(remote) {
    const g = remote.hpBar;
    if (!g?.active) return;
    const ratio = Phaser.Math.Clamp((remote.hp ?? BATTLE.playerMaxHp) / (remote.maxHp || BATTLE.playerMaxHp), 0, 1);
    // Hide HP bar when full health (100%) or K.O. to keep the host screen clean without overlapping
    if (ratio >= 1 || remote.ko) {
      g.clear();
      return;
    }
    const w = 26, h = 3;
    const left = -Math.round(w / 2);
    // Positioned right above the compact nameplate (nameplate top is at -13)
    const top = -19;
    g.clear();
    g.fillStyle(0x0a0c16, 0.95).fillRect(left - 1, top - 1, w + 2, h + 2);
    g.fillStyle(0x381215, 1).fillRect(left, top, w, h);
    if (ratio > 0) {
      const fillW = Math.max(1, Math.round(w * ratio));
      g.fillStyle(ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf1c40f : 0xe74c3c, 1).fillRect(left, top, fillW, h);
    }
  }

  removeRemoteAvatar(playerId) {
    if (!playerId) {
      return;
    }

    const remote = this.remoteAvatars.get(playerId);

    if (!remote) {
      return;
    }

    for (const sprite of remote.sprites) {
      sprite.destroy();
    }

    remote.finishBanner?.destroy();
    remote.nameContainer?.destroy(true);
    remote.hero?.destroy();

    this.remoteAvatars.delete(playerId);

    console.log(
      "[MULTIPLAYER] Avatar pemain dihapus:",
      playerId
    );
  }

  updateRemoteAvatars(delta) {
    if (!this.remoteAvatars) {
      return;
    }

    const renderAt = performance.now() - 35;
    for (const remote of this.remoteAvatars.values()) {
      const snapshots = remote.snapshots || [];
      while (snapshots.length > 2 && snapshots[1].time <= renderAt) snapshots.shift();
      const first = snapshots[0];
      const second = snapshots[1];
      if (first && second && second.time > first.time) {
        const t = Phaser.Math.Clamp((renderAt - first.time) / (second.time - first.time), 0, 1);
        remote.x = Phaser.Math.Linear(first.x, second.x, t);
        remote.y = Phaser.Math.Linear(first.y, second.y, t);
      } else if (first) {
        remote.x = Phaser.Math.Linear(remote.x, first.x, Math.min(1, delta / 50));
        remote.y = Phaser.Math.Linear(remote.y, first.y, Math.min(1, delta / 50));
      }

      this.updateRemoteAvatarAnimation(remote, delta);
      if (remote.finished) {
        this.showRemoteFinished(remote);
      }

      const x = Math.round(remote.x);
      const y = Math.round(remote.y);
      const idleBob = remote.heroState?.startsWith("idle") ? Math.sin(performance.now() / 430 + remote.slot) * 0.45 : 0;
      for (const sprite of remote.sprites) sprite.setPosition(x, y + idleBob);
      for (const sprite of remote.sprites) sprite.setVisible(true);
      remote.nameContainer?.setPosition(x, y - 24 + idleBob);
      if (remote.finishBanner) remote.finishBanner.setPosition(x, y - 42);
    }
  }

  showRemoteFinished(remote) {
    if (remote.finishBanner || !remote.nameLabel?.active) return;
    remote.finishBanner = this.add.text(remote.x, remote.y - 40, "FINISH 🏁", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "6px",
      color: "#f7c83b",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(120);
    remote.finishBanner.setScrollFactor(1);
  }

  updateRemoteAvatarAnimation(remote, delta) {
    const dx = (remote.targetX !== undefined ? remote.targetX - remote.x : 0);
    const dy = (remote.targetY !== undefined ? remote.targetY - remote.y : 0);
    const staleMs = Date.now() - (remote.serverNow || Date.now());
    const staleFactor = Phaser.Math.Clamp(1 - Math.max(0, staleMs - 180) / 420, 0, 1);
    const vx = (Number(remote.vx) || 0) * staleFactor;
    const vy = (Number(remote.vy) || 0) * staleFactor;
    const isMoving = Math.abs(vx) > 8 || Math.abs(dx) > 1.1;
    const isJumping = vy < -30 || dy < -2;
    const isFalling = vy > 50 || dy > 2;

    let anim = "idle";
    let direction = remote.facing || "right";

    if (remote.state?.startsWith("interact")) {
      anim = "interact";
    } else if (remote.state?.startsWith("sword") || remote.state?.startsWith("attack")) {
      anim = "sword";
    } else if (remote.state?.startsWith("punch")) {
      anim = "punch";
    } else if (remote.state?.startsWith("hurt")) {
      anim = "hurt";
    } else if (isJumping || isFalling) {
      anim = "jump";
    } else if (isMoving) {
      anim = "walk";
    }

    if (remote.state?.endsWith("left")) direction = "left";
    else if (remote.state?.endsWith("right")) direction = "right";
    else if (dx > 0.4 || vx > 8) direction = "right";
    else if (dx < -0.4 || vx < -8) direction = "left";
    remote.facing = direction;

    const frameRate = anim === "idle" ? 4 : (anim === "walk" ? 9 : ((anim === "punch" || anim === "sword") ? 14 : 6));
    const frameDuration = 1000 / frameRate;

    if (anim === "jump") {
      remote.animFrame = vy < -40 ? 0 : (vy > 40 ? 2 : 1);
    } else {
      remote.animTimer = (remote.animTimer || 0) + delta;
      if (remote.animTimer >= frameDuration) {
        const steps = Math.floor(remote.animTimer / frameDuration);
        remote.animTimer -= steps * frameDuration;
        const bodyKey = anim === "walk" ? `avatar-body-walk-${direction}` : anim === "interact" ? `avatar-body-interact-${direction}` : anim === "hurt" ? `avatar-body-hurt-${direction}` : anim === "sword" ? `avatar-body-sword-${direction}` : anim === "punch" ? `avatar-body-punch-${direction}` : "avatar-body";
        const frameTexture = this.textures.exists(bodyKey) ? bodyKey : "avatar-body";
        const activeColumns = this.getAvatarTextureColumns(frameTexture);
        if (remote.lastAnim !== anim || remote.lastDirection !== direction) remote.animFrame = 0;
        else remote.animFrame = ((remote.animFrame || 0) + steps) % activeColumns;
        remote.lastAnim = anim;
        remote.lastDirection = direction;
      }
    }

    remote.heroState = `${anim === "walk" ? "walk" : anim}-${direction}`;
    const frame = remote.animFrame || 0;
    const parts = ["body", "bottoms", "shoes", "top", "eyes", "hair", "glasses", "hat", "weapon"];
    const rows = [
      remote.avatarRows?.skin ?? DEFAULT_AVATAR.skin,
      remote.avatarRows?.bottoms ?? DEFAULT_AVATAR.bottoms,
      remote.avatarRows?.shoes ?? DEFAULT_AVATAR.shoes,
      remote.avatarRows?.top ?? DEFAULT_AVATAR.top,
      remote.avatarRows?.eyes ?? DEFAULT_AVATAR.eyes,
      remote.avatarRows?.hair ?? DEFAULT_AVATAR.hair,
      remote.avatarRows?.glasses ?? 0,
      remote.avatarRows?.hat ?? 0,
      remote.avatarRows?.weapon ?? 0
    ];

    remote.sprites.forEach((sprite, index) => {
      const part = parts[index];
      let textureKey = `avatar-${part}`;
      if (anim === "walk") textureKey = `avatar-${part}-walk-${direction}`;
      else if (anim === "jump") textureKey = `avatar-${part}-jump-${direction}`;
      else if (anim === "interact") textureKey = `avatar-${part}-interact-${direction}`;
      else if (anim === "hurt") textureKey = `avatar-${part}-hurt-${direction}`;
      else if (anim === "sword" || anim === "attack") {
        textureKey = `avatar-${part}-sword-${direction}`;
        if (!this.textures.exists(textureKey)) textureKey = `avatar-${part}-punch-${direction}`;
      } else if (anim === "punch") textureKey = `avatar-${part}-punch-${direction}`;

      if (!this.textures.exists(textureKey)) {
        textureKey = `avatar-${part}-walk-${direction}`;
        if (!this.textures.exists(textureKey)) textureKey = `avatar-${part}`;
      }

      if (sprite.texture.key !== textureKey) sprite.setTexture(textureKey);
      const targetFrame = this.getAvatarFrameIndex(textureKey, rows[index], frame);
      if (sprite.frame?.name !== targetFrame) {
        sprite.setFrame(targetFrame);
      }
      sprite.setFlipX(false);
    });
  }

  // =====================================================
  // ANIMASI AVATAR LOKAL
  // =====================================================

  setAvatarAnimation(state) {
    if (this.avatarState === state) {
      return;
    }

    // Smooth aerial transition: going from jump to fall in same direction should not reset frame timer
    const wasAir = this.avatarState?.startsWith("jump") || this.avatarState?.startsWith("fall");
    const isAir = state?.startsWith("jump") || state?.startsWith("fall");
    const sameDir = (this.avatarState?.endsWith("left") && state?.endsWith("left")) || (this.avatarState?.endsWith("right") && state?.endsWith("right"));

    this.avatarState = state;
    if (!(wasAir && isAir && sameDir)) {
      this.avatarFrame = 0;
      this.avatarFrameTimer = 0;
    }

    this.applyAvatarFrame();
  }

  applyAvatarSelection(selection = {}) {
    if (!this.avatarConfig || !this.player) return;
    const limits = { skin:5, bottoms:64, shoes:10, top:79, eyes:4, hair:25, glasses:82, hat:81, weapon:91 };
    const keys = ["skin", "bottoms", "shoes", "top", "eyes", "hair", "glasses", "hat", "weapon"];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = Number(selection[key]);
      this.avatarConfig[i].row = Number.isInteger(value) && value >= 0 && value < limits[key]
        ? value : DEFAULT_AVATAR[key];
    }
    this.applyAvatarFrame();
  }

  setPlayerCombatPose(pose, dir = this.playerFacing || "right") {
    const anim = pose === "run" ? "run" : pose;
    const state = `${anim}-${dir}`;
    this.setAvatarAnimation(state);
    this.avatarFrame = 0;
    this.avatarFrameTimer = 0;
    this.applyAvatarFrame();
  }

  getAvatarTexture(part, state) {
    if (state === "idle") return part.idleTexture;

    // Smooth locomotion uses same-pivot Walk sheets; special attacks use Sword or Punch sheets.
    const direction = state.endsWith("left") ? "left" : "right";
    const pose = (state.startsWith("sword") || state.startsWith("attack")) ? "sword" : state.startsWith("punch") ? "punch" : state.startsWith("hurt") ? "hurt" : state.startsWith("interact") ? "interact" : state.startsWith("jump") || state.startsWith("fall") ? "jump" : state.startsWith("run") ? "run" : "walk";
    const exact = `avatar-${part.name}-${pose}-${direction}`;
    if (this.textures.exists(exact)) return exact;

    if (pose === "sword") {
      const punchKey = `avatar-${part.name}-punch-${direction}`;
      if (this.textures.exists(punchKey)) return punchKey;
    }

    // Run sheets exist for body/eyes/hair and some clothing layers only; reuse the aligned Walk fallback.
    const walk = `avatar-${part.name}-walk-${direction}`;
    if (this.textures.exists(walk)) return walk;
    return part.idleTexture;
  }

  applyAvatarFrame() {
    const rawState = this.avatarState;
    const direction = rawState.endsWith("left") || rawState === "left" ? "left" : "right";
    const state = rawState === "idle" ? "idle" : rawState.startsWith("jump") || rawState.startsWith("fall") ? `jump-${direction}` : rawState === "left" || rawState === "right" ? `walk-${rawState}` : rawState;
    const frame = this.avatarFrame;

    const bodyConfig = this.avatarConfig[0];
    const bodyTexture = this.getAvatarTexture(bodyConfig, state);
    const bodyFrame = this.getAvatarFrameIndex(bodyTexture, bodyConfig.row, frame);

    this.player.setTexture(bodyTexture);
    this.player.setFrame(bodyFrame);

    for (const part of this.avatarParts) {
      const config = part.config;
      const texture = this.getAvatarTexture(config, state);
      const frameIndex = this.getAvatarFrameIndex(texture, config.row, frame);

      part.sprite.setTexture(texture);
      part.sprite.setFrame(frameIndex);
    }
  }

  updateAvatarAnimation(delta) {
    const grounded = this.player?.body?.onFloor() ?? true;
    const vy = this.player?.body?.velocity?.y ?? 0;

    // In air: frame reflects real vertical trajectory (0: rise leap, 1: apex float, 2: landing reach)
    if (!grounded && (this.avatarState.startsWith("jump") || this.avatarState.startsWith("fall"))) {
      const jumpFrame = vy < -50 ? 0 : (vy > 50 ? 2 : 1);
      if (this.avatarFrame !== jumpFrame) {
        this.avatarFrame = jumpFrame;
        this.applyAvatarFrame();
      }
      return;
    }

    // On ground: natural 9 FPS walk stride cadence vs 4 FPS breathing idle
    const isMoving = Math.abs(this.player?.body?.velocity?.x || 0) > 5;
    const isAttacking = this.avatarState.startsWith("punch") || this.avatarState.startsWith("sword") || this.avatarState.startsWith("attack");
    const frameRate = isAttacking ? 15
      : this.avatarState.startsWith("hurt") ? 10
      : (isMoving ? 10 : 5);
    const frameDuration = 1000 / frameRate;

    this.avatarFrameTimer += delta;

    if (this.avatarFrameTimer >= frameDuration) {
      const steps = Math.floor(this.avatarFrameTimer / frameDuration);
      this.avatarFrameTimer -= steps * frameDuration;

      const bodyTexture = this.getAvatarTexture(
        this.avatarConfig[0],
        this.avatarState === "idle" ? "idle" : this.avatarState
      );
      const columns = this.getAvatarTextureColumns(bodyTexture);
      // Attacks and death play once and hold the last frame until timer reset.
      if (isAttacking || this.playerKo) {
        this.avatarFrame = Math.min(columns - 1, this.avatarFrame + steps);
      } else {
        this.avatarFrame = (this.avatarFrame + steps) % columns;
      }

      this.applyAvatarFrame();
    }
  }

  spawnFootDust(x, y) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.rectangle(x + Phaser.Math.Between(-7, 7), y, 3, 2, 0xd0c4b0).setDepth(19);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-14, 14),
        y: p.y - Phaser.Math.Between(2, 6),
        alpha: { from: 0.8, to: 0 },
        scale: 0.5,
        duration: 160,
        ease: "Sine.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  syncAvatarLayers() {
    if (!this.player || !this.avatarParts) {
      return;
    }

    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);

    // Keep all avatar layers 100% aligned with the body sprite frame-by-frame
    for (const part of this.avatarParts) {
      part.sprite.setPosition(x, y);
      part.sprite.setVisible(true);
    }

    if (this.playerShadow) {
      const grounded = this.player.body?.onFloor() ?? true;
      this.playerShadow.setPosition(x, y + 10);
      this.playerShadow.setAlpha(this.playerKo ? 0.12 : (grounded ? 0.32 : 0.16));
      this.playerShadow.setScale(grounded ? 1.0 : 0.72);
    }
  }

  // =====================================================
  // KONTROL
  // =====================================================

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W
    });

    this.jumpKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.talkKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    );

    this.mobileInput = {
      left: false,
      right: false,
      jump: false,
      attack: false
    };

    this.mobileJumpWasDown = false;
    this.mobileAttackWasDown = false;
    this.isAttacking = false;
    this.playerFacing = "right";
    this.wasGrounded = true;
    this.networkCharacterState = { state: "idle", grounded: true, vx: 0, vy: 0 };

    this.input.once("pointerdown", () => {
      retroAudio.unlock();
      retroAudio.startBGM();
    });
    this.events.once("shutdown", () => retroAudio.stopBGM());
    this.scale.on("resize", this.handleViewportResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.handleViewportResize, this));
  }

  handleViewportResize(gameSize) {
    const width = Math.max(1, gameSize?.width || this.scale.width || VIEW_W);
    const height = Math.max(1, gameSize?.height || this.scale.height || VIEW_H);
    const camera = this.cameras.main;
    // Keep the world camera in logical game coordinates (480x270).
    // Lock bounds strictly to the active stage so player is never thrown back visually.
    camera.setBounds(this.stageStartX || 0, 0, this.stageWidth || 2400, 270);
    if (this.player) {
      this.player.body?.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, this.worldWidth, this.worldHeight));
      if (!this.isHostMode) {
        camera.startFollow(this.player, true, 0.085, 0.085);
      }
    }
    if (this.isHostMode && this.hostSpectatorTarget) {
      camera.startFollow(this.hostSpectatorTarget, true, 0.085, 0.085);
    }
  }

  performAttackSlash() {
    if (this.isAttacking || this.playerKo || !this.player?.body) return;
    this.isAttacking = true;
    this.attackStartTime = this.time.now;
    const dir = this.playerFacing || "right";
    const hasWeapon = Number(this.localAvatarSelection?.weapon) > 0;
    const anim = hasWeapon ? "sword" : "punch";
    const state = `${anim}-${dir}`;

    this.setAvatarAnimation(state);
    this.networkCharacterState = { state, grounded: this.player.body.onFloor(), vx: 0, vy: 0 };

    // Visual slash / swoosh effect + audio
    if (hasWeapon) {
      retroAudio.playSlash?.();
      this.spawnSwordSlashArc(this.player.x + (dir === "right" ? 14 : -14), this.player.y - 4, dir);
    } else {
      retroAudio.playBounce?.();
      this.spawnPunchSwoosh(this.player.x + (dir === "right" ? 14 : -14), this.player.y - 4, dir);
    }

    // Subtle forward lunge
    const lunge = dir === "right" ? 8 : -8;
    this.tweens.add({
      targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
      x: `+=${lunge}`,
      duration: 110,
      yoyo: true,
      ease: "Quad.easeOut"
    });

    this.time.delayedCall(340, () => {
      this.isAttacking = false;
      if (!this.playerKo) {
        this.setAvatarAnimation("idle");
        this.networkCharacterState = { state: "idle", grounded: this.player.body.onFloor(), vx: 0, vy: 0 };
      }
    });
  }

  updatePlayerMovement() {
    const body = this.player.body;

    // Trap knock-back: keep the push for a moment instead of letting held input cancel it.
    if (this.time.now < (this.trapKnockUntil || 0)) return;

    // Watchdog safety checks: prevent any flag from freezing player permanently
    if (this.isAttacking && (!this.attackStartTime || this.time.now - this.attackStartTime > 450)) {
      this.isAttacking = false;
    }
    if (this.introActive && (!this.introStartTime || this.time.now - this.introStartTime > 3600)) {
      this.introActive = false;
      this._gameStartIntroPlaying = false;
    }
    if (this.quizPaused && !this.battleActive && !this.inCanvasBattleElements) {
      this.quizPaused = false;
    }

    // Freeze movement until host starts game, during intro (host TV only), during quiz, or after finish.
    // A K.O. keeps the fallen pose instead of snapping back to idle.
    if (!this.gameStarted || (this.isHostMode && this.introActive) || this._bossIntroPlaying || this.quizPaused || this.finished) {
      body.setVelocity(0, body.velocity.y);
      if (!this.playerKo) this.setAvatarAnimation("idle");
      return;
    }

    // Attack button or F key:
    const attackPressed = Phaser.Input.Keyboard.JustDown(this.enemyAttackKey) ||
      (this.mobileInput.attack && !this.mobileAttackWasDown);
    this.mobileAttackWasDown = Boolean(this.mobileInput.attack);

    if (attackPressed && !this.isAttacking && !this.playerKo) {
      if (this.enemyInReach) {
        this.attackStageEnemy();
      } else {
        this.performAttackSlash();
      }
      return;
    }

    if (this.avatarState.startsWith("interact") || this.avatarState.startsWith("hurt") || this.avatarState.startsWith("punch") || this.avatarState.startsWith("sword") || this.avatarState.startsWith("attack") || this.isAttacking) {
      this.networkCharacterState = { state: this.avatarState, grounded: body.onFloor(), vx: 0, vy: 0 };
      return;
    }

    const left =
      this.cursors.left.isDown ||
      this.keys.a.isDown ||
      this.mobileInput.left;

    const right =
      this.cursors.right.isDown ||
      this.keys.d.isDown ||
      this.mobileInput.right;

    if (left && !right) {
      body.setVelocityX(-MOVE_SPEED);
      this.playerFacing = "left";
      this.setAvatarAnimation("left");
    } else if (right && !left) {
      body.setVelocityX(MOVE_SPEED);
      this.playerFacing = "right";
      this.setAvatarAnimation("right");
    } else {
      body.setVelocityX(0);
      this.setAvatarAnimation("idle");
    }

    const mobileJumpPressed =
      this.mobileInput.jump && !this.mobileJumpWasDown;

    this.mobileJumpWasDown = this.mobileInput.jump;

    const keyboardJumpPressed =
      Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w);

    if (
      (keyboardJumpPressed || mobileJumpPressed) &&
      body.onFloor()
    ) {
      body.setVelocityY(-JUMP_SPEED);
      retroAudio.playJump?.();
      this.setAvatarAnimation(`jump-${this.playerFacing}`);
      // Jump vertical stretch juice
      this.tweens.add({
        targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
        scaleX: 0.90,
        scaleY: 1.15,
        duration: 85,
        yoyo: true,
        ease: "Quad.easeOut"
      });
      this.spawnFootDust(this.player.x, this.player.y + 11);
    }

    const grounded = body.onFloor();
    if (grounded && !this.wasGrounded) {
      this.events.emit("player:landed");
      // Landing horizontal squash juice
      this.tweens.add({
        targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
        scaleX: 1.18,
        scaleY: 0.84,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut"
      });
      this.spawnFootDust(this.player.x, this.player.y + 11);
    }
    this.wasGrounded = grounded;

    if (this.avatarState.startsWith("interact") || this.avatarState.startsWith("hurt") || this.avatarState.startsWith("punch")) {
      this.networkCharacterState = { state: this.avatarState, grounded, vx: 0, vy: 0 };
      return;
    }

    const state = !grounded
      ? (body.velocity.y < 0 ? `jump-${this.playerFacing}` : `fall-${this.playerFacing}`)
      : Math.abs(body.velocity.x) > 5 ? `walk-${this.playerFacing}` : "idle";
    this.networkCharacterState = { state, grounded, vx: Math.round(body.velocity.x), vy: Math.round(body.velocity.y) };
    this.setAvatarAnimation(state === "walk-left" ? "left" : state === "walk-right" ? "right" : state === "idle" ? "idle" : state);
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update(_time, delta) {
    const scrollX = this.cameras.main.scrollX;

    for (const layer of this.parallaxLayers || []) {
      layer.sprite.tilePositionX = Math.round(
        scrollX * layer.factor
      );
    }

    for (const cloud of this.clouds || []) {
      cloud.sprite.x +=
        (cloud.drift * delta) / 1000;

      const screenX =
        cloud.sprite.x -
        scrollX * cloud.sprite.scrollFactorX;

      if (screenX > VIEW_W + 40) {
        cloud.sprite.x -= cloud.span;
      }

      cloud.sprite.x =
        Math.round(cloud.sprite.x * 4) / 4;
    }

    // SEASON ATMOSPHERE (snow / leaves / petals / birds / sparkles)
    this.updateSeasonParticles(delta, scrollX);
    this.updateTraps();

    // UPDATE AVATAR PEMAIN LAIN
    this.updateRemoteAvatars(delta);
    this.updateStageHUD();
    this.updateStageEnemies(delta);

    if (this.isHostMode || !this.player || !this.avatarParts) {
      return;
    }

    this.updatePlayerMovement();
    this.updateNpcProximity();

    // Never let a player walk out of the current city. Entering the Bahnhof
    // triggers the train scene before the boundary is crossed.
    if (this.player) {
      const minX = this.stageStartX + 24;
      const maxX = this.stageEndX - 70;
      if (this.player.x < minX) {
        this.player.setX(minX);
        this.player.body.velocity.x = Math.max(0, this.player.body.velocity.x);
      }
      if (this.player.x > maxX && !this.stageTransitioning) {
        const stage = COURSE.stages[this.stageIndex];
        const enemyDefeated = !this.stageEnemy || this.stageEnemy.defeated || Boolean(this.pendingBattleState?.won?.includes?.(stage.id));
        if (!enemyDefeated) {
          this.player.setX(maxX - 24);
          this.player.body.velocity.x = 0;
          if (this.time.now - (this.lastStageBlockFeedback || 0) > 2000) {
            this.lastStageBlockFeedback = this.time.now;
            this.showFloatingFeedback(this.player.x, this.player.y - 32, "⚠️ KALAHKAN MUSUH DULU UNTUK NAIK KERETA!", "#f24b4b");
            retroAudio.playWrong?.();
          }
          return;
        }

        this.player.setX(maxX);
        this.player.body.velocity.x = 0;
        if (this.stageIndex < COURSE.stages.length - 1) {
          this.startTrainTravel();
        } else if (!this.finished) {
          this.triggerEndstationFinish();
        }
      }
    }

    this.updateAvatarAnimation(delta);
  }

  postUpdate() {
    this.syncAvatarLayers();
  }

  // =====================================================
  // LEADERBOARD HUD (RETRO ARCADE)
  // =====================================================

  createLeaderboardHUD() {
    this.leaderboardData = [];
    this.leaderboardTexts = [];
    this.previousRanks = new Map();

    // Mobile/Desktop controller already has the HTML header & TOP drawer; hide in-canvas leaderboard to keep screen clean
    if (!this.isHostMode) return;

    this.leaderboardBg = this.add.graphics();
    this.leaderboardBg.setScrollFactor(0);
    this.leaderboardBg.setDepth(98);

    this.leaderboardTitle = this.add.text(
      VIEW_W - 10,
      8,
      "LEADERBOARD",
      {
        fontFamily: "'Press Start 2P', monospace, sans-serif",
        fontSize: "7px",
        color: "#f7c83b",
        stroke: "#000000",
        strokeThickness: 2,
        align: "right"
      }
    );
    this.leaderboardTitle.setOrigin(1, 0);
    this.leaderboardTitle.setScrollFactor(0);
    this.leaderboardTitle.setDepth(100);
  }

  setLeaderboardData(players) {
    if (this.isHostMode) { this.leaderboardTitle?.setVisible(false); return; } // TV uses the DOM leaderboard HUD
    if (!Array.isArray(players)) return;
    this.leaderboardData = [...players]
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 5);
    this.updateLeaderboardHUD();
  }

  updateLeaderboardHUD() {
    if (!this.leaderboardTitle) return;

    for (const text of this.leaderboardTexts) {
      text.destroy();
    }
    this.leaderboardTexts = [];

    const data = this.leaderboardData || [];
    if (!data.length) {
      this.leaderboardBg.clear();
      return;
    }

    const startY = 22;
    const itemHeight = 12;
    const panelWidth = 140;
    const panelHeight = 18 + data.length * itemHeight;
    const panelX = VIEW_W - panelWidth - 4;
    const panelY = 4;

    this.leaderboardBg.clear();
    this.leaderboardBg.fillStyle(0x251d18, 0.9);
    this.leaderboardBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 3);
    this.leaderboardBg.lineStyle(1, 0xc7a875, 0.95);
    this.leaderboardBg.strokeRoundedRect(panelX + 1, panelY + 1, panelWidth - 2, panelHeight - 2, 2);
    this.leaderboardBg.lineStyle(1, 0x765333, 0.9);
    this.leaderboardBg.strokeRect(panelX + 4, panelY + 4, panelWidth - 8, panelHeight - 8);

    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      const id = entry.playerId;
      const name = String(entry.name || "Player").slice(0, 8);
      const score = Number(entry.score) || 0;
      const isTop = i === 0 && score > 0;
      const prefix = i === 0 && score > 0 ? "👑" : `${i + 1}.`;
      const color = isTop ? "#f7c83b" : (i === 1 ? "#cbd5e1" : (i === 2 ? "#e29b52" : "#9299ab"));

      const prevRank = this.previousRanks.get(id);
      const rankUp = prevRank !== undefined && prevRank > i;
      this.previousRanks.set(id, i);

      const text = this.add.text(
        VIEW_W - 8,
        startY + i * itemHeight,
        `${prefix} ${name} ${score}`,
        {
          fontFamily: "'Press Start 2P', monospace, sans-serif",
          fontSize: "6px",
          color,
          stroke: "#000000",
          strokeThickness: 2,
          align: "right"
        }
      );
      text.setOrigin(1, 0);
      text.setScrollFactor(0);
      text.setDepth(100);

      if (rankUp) {
        this.tweens.add({
          targets: text,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 140,
          yoyo: true,
          ease: "Quad.easeOut"
        });
      }

      this.leaderboardTexts.push(text);
    }
  }
  createGameTimerHUD() {
    this.gameTimerBox = this.add.graphics();
    this.gameTimerBox.setScrollFactor(0);
    this.gameTimerBox.setDepth(98);

    this.gameTimerText = this.add.text(
      VIEW_W / 2,
      8,
      "⏱ 12:00",
      {
        fontFamily: "'Press Start 2P', monospace, sans-serif",
        fontSize: "8px",
        color: "#82d82c",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center"
      }
    );
    this.gameTimerText.setOrigin(0.5, 0);
    this.gameTimerText.setScrollFactor(0);
    this.gameTimerText.setDepth(100);
    this.gameTimerText.setVisible(false);
  }

  setGameTimer(endsAt, status, remainingMs) {
    if (!this.gameTimerText) return;
    if (this.gameTimerInterval) {
      clearInterval(this.gameTimerInterval);
      this.gameTimerInterval = null;
    }

    if (status === "paused") {
      this.gameTimerText.setVisible(true);
      const sec = Math.ceil((remainingMs || 0) / 1000);
      const min = Math.floor(sec / 60);
      const rem = sec % 60;
      this.gameTimerText.setText(`⏱ ${String(min).padStart(2, "0")}:${String(rem).padStart(2, "0")} PAUSED`);
      this.gameTimerText.setColor("#f7c83b");
      this.drawGameTimerBox();
      return;
    }

    if (status === "ended") {
      this.gameTimerText.setVisible(true);
      this.gameTimerText.setText("⏱ GAME OVER");
      this.gameTimerText.setColor("#f24b4b");
      this.drawGameTimerBox();
      return;
    }

    if (!endsAt || status !== "playing") {
      this.gameTimerText.setVisible(false);
      this.gameTimerBox?.clear();
      return;
    }

    this.gameTimerText.setVisible(true);
    this.gameTimerText.setColor("#82d82c");

    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      const totalSec = Math.ceil(left / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      this.gameTimerText.setText(`⏱ ${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
      if (left <= 30000) {
        this.gameTimerText.setColor("#f24b4b");
      }
      this.drawGameTimerBox();
      if (left <= 0) {
        clearInterval(this.gameTimerInterval);
        this.gameTimerInterval = null;
        this.gameTimerText.setText("⏱ SELESAI");
      }
    };
    tick();
    this.gameTimerInterval = setInterval(tick, 1000);
  }

  drawGameTimerBox() {
    if (!this.gameTimerBox || !this.gameTimerText || !this.gameTimerText.visible) return;
    const bounds = this.gameTimerText.getBounds();
    this.gameTimerBox.clear();
    this.gameTimerBox.fillStyle(0x111422, 0.88);
    this.gameTimerBox.fillRect(bounds.x - 6, bounds.y - 3, bounds.width + 12, bounds.height + 6);
    this.gameTimerBox.lineStyle(2, 0x000000, 1);
    this.gameTimerBox.strokeRect(bounds.x - 6, bounds.y - 3, bounds.width + 12, bounds.height + 6);
    this.gameTimerBox.lineStyle(1, 0x313859, 0.7);
    this.gameTimerBox.strokeRect(bounds.x - 4, bounds.y - 1, bounds.width + 8, bounds.height + 2);
  }

  showFloatingFeedback(x, y, text, color = "#f7c83b") {
    const label = this.add.text(x, y - 22, text, {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "8px",
      color,
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: label,
      y: label.y - 28,
      alpha: 0,
      duration: 1100,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy()
    });
  }

  showFinishResult(result = {}) {
    const overlay = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x111422, 0.92)
      .setScrollFactor(0)
      .setDepth(350);
    const panel = this.add.container(VIEW_W / 2, VIEW_H / 2).setScrollFactor(0).setDepth(351);
    const frame = this.add.graphics();
    frame.fillStyle(0x20243b, 1);
    frame.fillRect(-155, -76, 310, 152);
    frame.lineStyle(4, 0x000000, 1);
    frame.strokeRect(-155, -76, 310, 152);
    frame.lineStyle(2, 0xf7c83b, 1);
    frame.strokeRect(-151, -72, 302, 144);
    const title = this.add.text(0, -50, "FINISH!", { fontFamily: "'Press Start 2P', monospace", fontSize: "18px", color: "#f7c83b", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
    const bonus = this.add.text(0, -10, `+${Number(result.finishBonus) || 0} BONUS POIN`, { fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: "#82d82c", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    const rank = this.add.text(0, 22, `PERINGKAT FINISH #${result.rank || "-"}`, { fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    const time = this.add.text(0, 46, `WAKTU ${Math.floor((result.elapsedMs || 0) / 60000)}:${String(Math.floor(((result.elapsedMs || 0) % 60000) / 1000)).padStart(2, "0")}`, { fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#cbd5e1", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    panel.add([frame, title, bonus, rank, time]);
    this.tweens.add({ targets: panel, scaleX: 1.08, scaleY: 1.08, duration: 180, yoyo: true, ease: "Back.easeOut" });
    this.time.delayedCall(3500, () => { overlay.destroy(); panel.destroy(); });
  }

  showPodium(leaderboard = []) {
    if (this.podiumContainer) this.podiumContainer.destroy();
    const sorted = [...leaderboard].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

    this.podiumContainer = this.add.container(VIEW_W / 2, VIEW_H / 2);
    this.podiumContainer.setScrollFactor(0);
    this.podiumContainer.setDepth(300);

    const bg = this.add.graphics();
    bg.fillStyle(0x111422, 0.94);
    bg.fillRect(-170, -110, 340, 220);
    bg.lineStyle(4, 0x000000, 1);
    bg.strokeRect(-170, -110, 340, 220);
    bg.lineStyle(2, 0xf7c83b, 1);
    bg.strokeRect(-166, -106, 332, 212);
    this.podiumContainer.add(bg);

    const title = this.add.text(0, -92, "★ GAME OVER ★", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "12px",
      color: "#f7c83b",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5);
    this.podiumContainer.add(title);

    const winner = sorted[0];
    const winnerText = this.add.text(0, -72, winner ? `👑 PEMENANG: ${winner.name}` : "SELESAI", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "8px",
      color: "#82d82c",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0.5);
    this.podiumContainer.add(winnerText);

    // 2nd Place (Left)
    const p2Bg = this.add.graphics();
    p2Bg.fillStyle(0xcbd5e1, 1);
    p2Bg.fillRect(-90, 5, 54, 45);
    p2Bg.lineStyle(2, 0x000000, 1);
    p2Bg.strokeRect(-90, 5, 54, 45);
    this.podiumContainer.add(p2Bg);
    const p2Num = this.add.text(-63, 20, "2", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "14px",
      color: "#171324"
    }).setOrigin(0.5);
    const p2Name = this.add.text(-63, -8, sorted[1]?.name ? sorted[1].name.slice(0, 6) : "-", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "6px",
      color: "#cbd5e1"
    }).setOrigin(0.5);
    this.podiumContainer.add([p2Num, p2Name]);

    // 1st Place (Center)
    const p1Bg = this.add.graphics();
    p1Bg.fillStyle(0xf7c83b, 1);
    p1Bg.fillRect(-27, -20, 54, 70);
    p1Bg.lineStyle(2, 0x000000, 1);
    p1Bg.strokeRect(-27, -20, 54, 70);
    this.podiumContainer.add(p1Bg);
    const p1Crown = this.add.text(0, -42, "👑", { fontSize: "14px" }).setOrigin(0.5);
    const p1Num = this.add.text(0, 5, "1", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "18px",
      color: "#171324"
    }).setOrigin(0.5);
    const p1Name = this.add.text(0, -30, sorted[0]?.name ? sorted[0].name.slice(0, 6) : "-", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "6px",
      color: "#f7c83b"
    }).setOrigin(0.5);
    this.podiumContainer.add([p1Crown, p1Num, p1Name]);

    // 3rd Place (Right)
    const p3Bg = this.add.graphics();
    p3Bg.fillStyle(0xe29b52, 1);
    p3Bg.fillRect(36, 20, 54, 30);
    p3Bg.lineStyle(2, 0x000000, 1);
    p3Bg.strokeRect(36, 20, 54, 30);
    this.podiumContainer.add(p3Bg);
    const p3Num = this.add.text(63, 32, "3", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "12px",
      color: "#171324"
    }).setOrigin(0.5);
    const p3Name = this.add.text(63, 8, sorted[2]?.name ? sorted[2].name.slice(0, 6) : "-", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "6px",
      color: "#e29b52"
    }).setOrigin(0.5);
    this.podiumContainer.add([p3Num, p3Name]);

    for (let c = 0; c < 16; c++) {
      const star = this.add.text(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-80, 80), "★", {
        fontFamily: "'Press Start 2P', monospace, sans-serif",
        fontSize: `${Phaser.Math.Between(6, 10)}px`,
        color: Phaser.Utils.Array.GetRandom(["#f7c83b", "#82d82c", "#ffffff", "#38bdf8"])
      }).setOrigin(0.5);
      this.podiumContainer.add(star);
      this.tweens.add({
        targets: star,
        y: star.y - 12,
        alpha: 0.3,
        duration: Phaser.Math.Between(800, 1400),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  // =====================================================
  // SCENE: GAME START COUNTDOWN SPEECH BUBBLE CUTSCENE
  // =====================================================
  playGameStartIntro(onComplete) {
    if (!this.isHostMode) {
      this.introActive = false;
      this._gameStartIntroPlaying = false;
      if (onComplete) onComplete();
      return;
    }

    if (this._gameStartIntroPlaying) return;
    this._gameStartIntroPlaying = true;
    this._gameStartIntroPlayed = true;
    this.introActive = true;
    this.introStartTime = this.time.now;

    if (this.player?.body) {
      this.player.body.setVelocity(0, 0);
      this.setAvatarAnimation("idle");
    }

    const elements = [];
    const centerX = VIEW_W / 2;
    const centerY = VIEW_H / 2;

    let callbackExecuted = false;
    const finishIntro = () => {
      if (callbackExecuted) return;
      callbackExecuted = true;
      clearTimeout(safetyTimer);
      elements.forEach(el => el?.destroy?.());
      this.introActive = false;
      this._gameStartIntroPlaying = false;
      if (onComplete) onComplete();
    };
    const safetyTimer = setTimeout(finishIntro, 3200);

    // Clean semi-transparent backdrop
    const backdrop = this.add.rectangle(centerX, centerY, VIEW_W, VIEW_H, 0x0a101d, 0.62)
      .setScrollFactor(0).setDepth(600);
    elements.push(backdrop);

    // SPEECH BUBBLE CONTAINER
    const bubbleContainer = this.add.container(centerX, centerY).setScrollFactor(0).setDepth(605);
    elements.push(bubbleContainer);

    const bw = 330, bh = 106;
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x0f172a, 0.96);
    bubbleBg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bubbleBg.lineStyle(2.5, 0xf6c84a, 1);
    bubbleBg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    // Speech bubble tail pointing downwards
    bubbleBg.fillStyle(0x0f172a, 0.96);
    bubbleBg.fillTriangle(-12, bh / 2, 12, bh / 2, 0, bh / 2 + 10);
    bubbleBg.lineStyle(2.5, 0xf6c84a, 1);
    bubbleBg.lineBetween(-12, bh / 2, 0, bh / 2 + 10);
    bubbleBg.lineBetween(0, bh / 2 + 10, 12, bh / 2);
    bubbleContainer.add(bubbleBg);

    // Conductor avatar frame on left
    if (this.textures.exists("bhf-officer")) {
      const avatarBox = this.add.rectangle(-bw / 2 + 32, 0, 44, 66, 0x1e293b, 1)
        .setStrokeStyle(1.5, 0xf6c84a, 1);
      const officer = this.add.image(-bw / 2 + 32, 2, "bhf-officer").setScale(1.2);
      bubbleContainer.add([avatarBox, officer]);
    }

    // Header badge
    const badge = this.add.text(-bw / 2 + 62, -bh / 2 + 12, "📢 BAHNHOF DURCHSAGE · MÜNCHEN", {
      fontFamily: "'Press Start 2P', monospace", fontSize: "6px", color: "#f6c84a"
    }).setOrigin(0, 0);

    const announce = this.add.text(-bw / 2 + 62, -bh / 2 + 25, "„Achtung an Gleis 1! Zug nach Hamburg fährt ab!\nAlle Fahrgäste einsteigen. Bereit machen!“", {
      fontFamily: "Arial, sans-serif", fontSize: "9px", fontStyle: "bold", color: "#f1f5f9", wordWrap: { width: 250 }
    }).setOrigin(0, 0);

    // Large countdown inside bubble
    const countText = this.add.text(centerX - 120, 24, "3", {
      fontFamily: "'Press Start 2P', monospace", fontSize: "22px", color: "#f59e0b", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5);
    bubbleContainer.add([badge, announce, countText]);

    bubbleContainer.setScale(0.85);
    bubbleContainer.setAlpha(0);
    this.tweens.add({
      targets: bubbleContainer,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: "Back.easeOut"
    });

    const runNumber = (numStr, color, delay) => {
      this.time.delayedCall(delay, () => {
        countText.setText(numStr);
        countText.setColor(color);
        countText.setScale(1.4);
        retroAudio.playCountdownBeep?.(false);
        this.tweens.add({ targets: countText, scale: 1.0, duration: 240, ease: "Back.easeOut" });
      });
    };

    runNumber("2", "#f97316", 750);
    runNumber("1", "#10b981", 1450);

    this.time.delayedCall(2150, () => {
      countText.setFontSize(13);
      countText.setText("LOS GEHT'S! 🏁");
      countText.setColor("#82d82c");
      countText.setScale(1.4);
      retroAudio.playCountdownBeep?.(true);
      retroAudio.playTrainWhistle?.();
      this.spawnCelebrationConfetti(this.player?.x || centerX, (this.player?.y || centerY) - 20);
      this.cameras.main.flash(200, 255, 255, 255);
      this.tweens.add({ targets: countText, scale: 1.1, duration: 250, ease: "Back.easeOut" });
    });

    this.time.delayedCall(2850, () => {
      this.tweens.add({
        targets: [bubbleContainer, backdrop],
        alpha: 0,
        scale: 0.9,
        duration: 220,
        ease: "Quad.easeIn",
        onComplete: finishIntro
      });
    });
  }

  // =====================================================
  // SCENE: FINAL BOSS ENCOUNTER SPEECH BUBBLE CUTSCENE
  // =====================================================
  playFinalBossIntro(onComplete) {
    if (this._bossIntroPlaying) return;
    this._bossIntroPlaying = true;
    this._bossIntroPlayed = true;

    if (this.player?.body) {
      this.player.body.setVelocity(0, 0);
      this.setAvatarAnimation("idle");
    }

    const elements = [];
    const centerX = VIEW_W / 2;
    const centerY = VIEW_H / 2;

    let callbackExecuted = false;
    const finishBossIntro = () => {
      if (callbackExecuted) return;
      callbackExecuted = true;
      clearTimeout(safetyTimer);
      elements.forEach(el => el?.destroy?.());
      this._bossIntroPlaying = false;
      this.quizPaused = false;
      if (onComplete) onComplete();
    };
    const safetyTimer = setTimeout(finishBossIntro, 2600);

    retroAudio.playBossAlarm?.();
    this.cameras.main.shake(320, 0.012);

    // Dark crimson vignette
    const vignette = this.add.rectangle(centerX, centerY, VIEW_W, VIEW_H, 0x1f0206, 0.72)
      .setScrollFactor(0).setDepth(600);
    elements.push(vignette);

    // BOSS SPEECH BUBBLE CONTAINER
    const bubble = this.add.container(centerX, centerY).setScrollFactor(0).setDepth(605);
    elements.push(bubble);

    const bw = 350, bh = 116;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a060a, 0.97);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2.5, 0xef4444, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    // Dialogue tail pointing left towards boss
    bg.fillStyle(0x1a060a, 0.97);
    bg.fillTriangle(-bw / 2 + 25, bh / 2, -bw / 2 + 45, bh / 2, -bw / 2 + 15, bh / 2 + 12);
    bg.lineStyle(2.5, 0xef4444, 1);
    bg.lineBetween(-bw / 2 + 25, bh / 2, -bw / 2 + 15, bh / 2 + 12);
    bg.lineBetween(-bw / 2 + 15, bh / 2 + 12, -bw / 2 + 45, bh / 2);
    bubble.add(bg);

    // Boss Portrait on the left
    const portraitKey = this.textures.exists("enemy-boss_tycoon-portrait") ? "enemy-boss_tycoon-portrait" : (this.textures.exists("enemy-hamburg-portrait") ? "enemy-hamburg-portrait" : null);
    if (portraitKey) {
      const pBox = this.add.rectangle(-bw / 2 + 38, 0, 56, 76, 0x2b060d, 1)
        .setStrokeStyle(1.5, 0xef4444, 1);
      const portrait = this.add.image(-bw / 2 + 38, 0, portraitKey);
      portrait.setDisplaySize(52, 72);
      bubble.add([pBox, portrait]);
    }

    const tx = portraitKey ? -bw / 2 + 76 : -bw / 2 + 20;
    const wrapW = bw - (portraitKey ? 92 : 40);

    const tag = this.add.text(tx, -bh / 2 + 12, "⚡ PERTARUNGAN PENENTU · FINAL BOSS ⚡", {
      fontFamily: "'Press Start 2P', monospace", fontSize: "6px", color: "#f59e0b"
    }).setOrigin(0, 0);

    const name = this.add.text(tx, -bh / 2 + 26, "HERR TYCOON · HAMBURG MEISTER", {
      fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "900", color: "#ffffff", stroke: "#000", strokeThickness: 2
    }).setOrigin(0, 0);

    const stats = this.add.text(tx, -bh / 2 + 42, "LEVEL 4 · B1 TINGKAT TINGGI • 300 HP", {
      fontFamily: "Arial, sans-serif", fontSize: "9px", fontStyle: "bold", color: "#ef4444"
    }).setOrigin(0, 0);

    const speechBg = this.add.rectangle(tx + wrapW / 2, 28, wrapW, 36, 0x26070e, 0.9)
      .setStrokeStyle(1, 0x7f1d1d, 1);
    const speech = this.add.text(tx + wrapW / 2, 28, "„Willkommen in Hamburg! Di sinilah akhir perjalananmu!\nTunjukkan kemampuan bahasa Jermanmu kalau mau lewat!“", {
      fontFamily: "Arial, sans-serif", fontSize: "9px", fontStyle: "italic bold", color: "#fef08a", align: "center", wordWrap: { width: wrapW - 12 }
    }).setOrigin(0.5);

    bubble.add([tag, name, stats, speechBg, speech]);

    bubble.setScale(0.85);
    bubble.setAlpha(0);
    this.tweens.add({
      targets: bubble,
      scale: 1,
      alpha: 1,
      duration: 250,
      ease: "Back.easeOut"
    });

    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: [bubble, vignette],
        alpha: 0,
        scale: 0.95,
        duration: 200,
        ease: "Quad.easeIn",
        onComplete: finishBossIntro
      });
    });
  }
}
