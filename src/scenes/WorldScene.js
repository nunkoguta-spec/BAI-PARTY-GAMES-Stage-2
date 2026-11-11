
import Phaser from "phaser";
import { DEFAULT_AVATAR } from "../avatar/defaultAvatar.js";
import { retroAudio } from "../audio/retroAudio.js";
import { COURSE } from "../game/course.js";

const FRAME_COUNT = 4;
const WORLD_DECOR_Y = 224;
const VIEW_W = 480;
const VIEW_H = 270;

const MOVE_SPEED = 145;
const JUMP_SPEED = 430;
const VIEWPORT_PADDING = 24;
<<<<<<< HEAD
=======
const HERO_SCALE = 0.62;   // mascot sprites are ~75px tall in the pack
const HERO_FEET = 15;      // distance from avatar centre to the ground
const SLOT_COLORS = ["#e03a3a", "#2f86e8", "#2fb34a", "#8a3fd0", "#e08a1e", "#1aa8a8", "#c0398a", "#667788"];
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

export class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");
  }

<<<<<<< HEAD
=======
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

>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
  create() {
    try {
      this.createWorld();
    } catch (error) {
      window.deutschWorldError = error;
      throw error;
    }
  }

  createWorld() {
    // DATA AVATAR MULTIPLAYER
    this.remoteAvatars = new Map();

    // Host mode flag — set by HostPanel to skip player spawn
    this.isHostMode = this.isHostMode || window.deutschHostMode === true;

    this.createParallaxBackground();
<<<<<<< HEAD
=======
    // Each chapter has its own landmark layer: Frankfurt skyline, Berlin landmarks,
    // and Hamburg harbour structures. This was authored but never called.
    // Landmarks are now baked into the pixel-art panoramas (backgrounds/cities/*-bg-v2.png),
    // so the old vector landmark layer is disabled to avoid drawing over them.
    // this.createCityLandmarks();
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

    // TILEMAP
    const map = this.make.tilemap({ key: "level-01" });

    const tileset = map.addTilesetImage(
      "Mountains Platformer",
      "mountains-tiles",
      32,
      32,
      0,
      0
    );

    if (!tileset) {
      throw new Error("Tileset Mountains Platformer tidak berhasil dipasang.");
    }

    // Extend tile data before creating TilemapLayer; Phaser layer snapshots need full route dimensions.
    const originalWidth = map.width;
    const extendedWidth = COURSE.worldColumns;
    for (const layerData of map.layers) {
      if (layerData.type !== "tilelayer" || !Array.isArray(layerData.data)) continue;
      const originalData = layerData.data.slice(0, originalWidth * map.height);
      layerData.data = Array.from({ length: map.height }, (_, row) => {
        const sourceRow = originalData.slice(row * originalWidth, (row + 1) * originalWidth);
        return Array.from({ length: extendedWidth }, (_, col) => sourceRow[col % originalWidth]);
      }).flat();
      layerData.width = extendedWidth;
    }
    map.width = extendedWidth;

    this.groundLayer = map.createLayer("Ground", tileset, 0, 0);
    this.platformLayer = map.createLayer("Platforms", tileset, 0, 0);

    if (!this.groundLayer || !this.platformLayer) {
      throw new Error("Layer Ground atau Platforms tidak ditemukan.");
    }

    this.groundLayer.setDepth(5);
    this.platformLayer.setDepth(6);
<<<<<<< HEAD
=======
    // Retain original tilemap collision while removing the mountain dirt visuals.
    if (this.cityStage) {
      this.groundLayer.setVisible(false);
      this.platformLayer.setVisible(false);
    }
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    this.worldWidth = map.widthInPixels || COURSE.width;
    this.worldHeight = map.heightInPixels || (map.height * map.tileHeight);
    // Keep arcade camera/physics bounds at the complete 300-column course size.

    // COLLISION TILEMAP
    const firstTileIndex = 0;
    const lastTileIndex = 143;

    this.groundLayer.setCollisionBetween(
      firstTileIndex,
      lastTileIndex,
      true
    );

    this.platformLayer.setCollisionBetween(
      firstTileIndex,
      lastTileIndex,
      true
    );

    this.groundLayer.calculateFacesWithin(
      0,
      0,
      map.width,
      map.height
    );

    this.platformLayer.calculateFacesWithin(
      0,
      0,
      map.width,
      map.height
    );

    // Tilemap arrays are expanded before layer creation above.
    this.worldWidth = COURSE.width; // 9600px total course
    this.worldHeight = map.height * map.tileHeight;
<<<<<<< HEAD
=======
    if (this.cityStage) { this.createReferenceStreet(); }
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    // DEKORASI
    this.createWorldDecorations();

    // QUESTION BOX
    this.createQuestionBoxes();

    // SPAWN — skip for host mode
    if (!this.isHostMode) {
      const spawn = map.findObject(
        "Objects",
        (object) => object.name === "PlayerSpawn"
      ) || { x: 240, y: 208 };

      this.createAvatar(
        Math.round(spawn.x),
        Math.round(spawn.y)
      );

      // SINKRONISASI KOSTUM — use string event name (Phaser 3 standard)
      this.events.on(
        "postupdate",
        this.syncAvatarLayers,
        this
      );

      // COLLISION PLAYER
      this.finished = false;
      this.physics.add.collider(this.player, this.groundLayer);
      this.physics.add.collider(this.player, this.platformLayer);
      this.createFinishPlatformDecor();
      this.createFinishTrigger();

      // COLLISION QUESTION BOX
      for (const box of this.questionBoxes) {
        this.physics.add.collider(
          this.player,
          box,
          (player, target) => {
            this.onQuestionBoxCollision(player, target);
          }
        );
      }

      // KONTROL
      this.setupControls();

      // KAMERA — follow player with proper X and Y lerp
      const camera = this.cameras.main;

      camera.setBounds(
        0,
        0,
        this.worldWidth,
        this.worldHeight
      );
      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

      camera.setRoundPixels(true);
      camera.setDeadzone(VIEW_W * 0.45, VIEW_H * 0.35);
      camera.startFollow(this.player, true, 0.12, 0.12);
      this.handleViewportResize();

      this.createHazardVisuals();
      for (const hazardItem of this.gameHazards) {
        this.physics.add.overlap(this.player, hazardItem.hazard, () => {
          if (hazardItem.isSlug) this.onSlugHit(hazardItem.id);
          else this.onHazardHit(hazardItem.id);
        });
      }

      this.createFinishGate(false);
      this.createFinishPlatformDecor();
      this.createFinishTrigger();
    } else {
      // Host mode: set camera bounds and draw spectator-only finish gate without spawning a player.
      const camera = this.cameras.main;

      this.gameStarted = true;
      this.hazardDefinitions = COURSE.hazards;
      this.createFinishGate(false);
      this.createHazardVisuals();
      this.createFinishPlatformDecor();

      camera.setBounds(
        0,
        0,
        this.worldWidth,
        this.worldHeight
      );

      camera.setRoundPixels(true);
      this.handleViewportResize();

      // Follow active remote player on host display; no local host character.
      this.hostSpectatorTarget = null;
      this.hostFollowPlayer = (player) => {
        if (!player?.sprites?.[0]) return;
<<<<<<< HEAD
=======
        camera.setZoom(1);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
        this.hostSpectatorTarget = player.sprites[0];
        camera.startFollow(this.hostSpectatorTarget, true, 0.12, 0.12);
      };
      this.hostClearFollow = () => {
        this.hostSpectatorTarget = null;
        camera.stopFollow();
<<<<<<< HEAD
        camera.scrollX = 0;
        camera.scrollY = 0;
      };
=======
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
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      camera.scrollX = 0;
      camera.scrollY = 0;
    }

    // LEADERBOARD HUD (in-game on all clients and host)
    this.createLeaderboardHUD();
    this.createGameTimerHUD();
<<<<<<< HEAD
=======
    this.createStageHUD();
  }

  createStageHUD() {
    this.stageLabel = this.add.text(8, 8, "MÜNCHEN", {
      fontFamily: "'Press Start 2P', monospace, sans-serif",
      fontSize: "7px",
      color: "#ffffff",
      stroke: "#172033",
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(110);
    this.stageSubLabel = this.add.text(8, 19, "RATHAUS / MARIENPLATZ", {
      fontFamily: "Arial, sans-serif",
      fontSize: "8px",
      fontStyle: "bold",
      color: "#ffe49a",
      stroke: "#172033",
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(110);
    if (this.isHostMode) { this.stageLabel.setVisible(false); this.stageSubLabel.setVisible(false); } // TV uses the DOM stage badge
    this.updateStageHUD();
  }

  updateStageHUD() {
    if (!this.stageLabel) return;
    const camera = this.cameras.main;
    const worldX = this.isHostMode
      ? camera.scrollX + VIEW_W / (2 * Math.max(0.01, camera.zoom))
      : (this.player?.x ?? COURSE.startX);
    const stages = COURSE.stages || [];
    const stage = stages.find((item) => worldX >= item.startX && worldX < item.endX) || stages[stages.length - 1];
    if (stage && this.currentStageId !== stage.id) {
      const previousStage = this.currentStageId;
      this.currentStageId = stage.id;
      this.stageLabel.setText(stage.name);
      this.stageSubLabel.setText(stage.landmark.toUpperCase());
      if (previousStage) this.showCityTransition(stage);
      if (this.isHostMode) window.dispatchEvent(new CustomEvent("bai-stage", { detail: stage }));
    }
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
    const eyebrow = this.add.text(0, -32, `KOTA BERIKUTNYA  •  STAGE ${index}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px",
      color: "#82d82c", stroke: "#000", strokeThickness: 2
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
    const ground = top - 3;
    const put = (key, x, scale, depth, y = ground) =>
      this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(depth);

    // Shared playable pavement. The skyline and city architecture above it are
    // chapter-specific and must not be replaced by repeating Munich houses.
    this.add.tileSprite(0, ground, COURSE.width, 46, "pack-cobble")
      .setOrigin(0, 0).setDepth(7.5);
    // Extend the visual pavement well beyond the physics map. On wide TV
    // viewports the camera can expose more vertical pixels than the tilemap;
    // stopping at worldHeight revealed the blue camera clear-color below it.
    const visualGroundBottom = Math.max(this.worldHeight, 900);
    this.add.tileSprite(0, ground + 46, COURSE.width, visualGroundBottom - ground - 46, "pack-cobble")
      .setOrigin(0, 0).setDepth(7.4).setTint(0x8a90b0);

    // City architecture is baked into each chapter's panoramic backdrop.
    // Do not stamp repeating Munich houses over the other city scenes.

    // Neutral street furniture repeats lightly without changing each city's silhouette.
    // Disabled: lamps, trees and bushes are already part of the new panoramas.
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
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
  }

  createHazardVisuals() {
    this.gameHazards = [];
    this.hitCooldown = false;
    for (const hazardData of COURSE.hazards) {
      const marsh = this.add.container(hazardData.x, WORLD_DECOR_Y - 5).setDepth(3).setScrollFactor(1);
      const bog = this.add.graphics();
      bog.fillStyle(0x194b43, 1);
      bog.fillRect(-30, -3, 60, 9);
      bog.fillStyle(0x28776a, 1);
      bog.fillRect(-24, -5, 45, 3);
      bog.fillStyle(0xa7dc71, 0.9);
      bog.fillRect(-15, -6, 7, 1);
      bog.fillRect(10, -6, 8, 1);
      marsh.add(bog);
      for (const reedX of [-23, -3, 19]) {
        const reed = this.add.rectangle(reedX, -12, 2, 13, 0x82d82c).setOrigin(0.5, 1);
        const leaf = this.add.rectangle(reedX + 3, -17, 6, 2, 0x469a1b).setOrigin(0.5, 1);
        marsh.add([reed, leaf]);
      }

      if (!hazardData.id.startsWith("hazard")) continue;
      const shadow = this.add.ellipse(hazardData.x, hazardData.y + 4, 34, 8, 0x111820, 0.7).setDepth(17);
      const hazard = this.add.container(hazardData.x, hazardData.y).setDepth(18);
      const base = this.add.rectangle(0, 4, 26, 8, 0x8f2828).setStrokeStyle(2, 0x171324);
      const spikes = [-9, 0, 9].map(x => this.add.triangle(x, -2, 0, 16, 6, 0, 12, 16, 0xf1d16b).setStrokeStyle(1, 0x7d302b));
      const glint = this.add.rectangle(-5, 1, 2, 3, 0xffffff).setAlpha(0.8);
      hazard.add([base, ...spikes, glint]);
      this.physics.add.existing(hazard, true);
      hazard.body.setSize(20, 12).setOffset(-10, -6);
      hazard.setData("hazardId", hazardData.id);
      const warning = this.add.text(hazardData.x, hazardData.y - 22, "!", { fontFamily: "monospace", fontSize: "11px", fontStyle: "bold", color: "#fff2aa", backgroundColor: "#842f32", padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: warning, y: warning.y - 2, duration: 420, yoyo: true, repeat: -1 });
      this.gameHazards.push({ hazard, shadow, warning, id: hazardData.id });
    }
    for (const slugData of COURSE.slugs) {
      const slug = this.add.container(slugData.x, slugData.y).setDepth(20);
      const shell = this.add.rectangle(0, 0, 24, 10, 0x82d82c).setStrokeStyle(2, 0x171324);
      const eye = this.add.rectangle(5, -3, 3, 3, 0xffffff);
      const pupil = this.add.rectangle(6, -3, 1, 2, 0x171324);
      slug.add([shell, eye, pupil]);
      slug.setData("slugId", slugData.id);
      const zone = this.add.zone(slugData.x, slugData.y, 28, 16);
      this.physics.add.existing(zone, true);
      zone.body.setSize(28, 16);
      this.gameHazards.push({ hazard: zone, slug, id: slugData.id, isSlug: true });
      this.tweens.add({ targets: slug, x: slugData.x + 32, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  createFinishPlatformDecor() {
    // Visual cover for end-of-course ground tiles; physics remains the original solid TilemapLayer.
    const platformY = 224;
    const startX = COURSE.finishX - 280;
    this.finishPlatformDecorations = [];
    for (let i = 0; i < 9; i++) {
<<<<<<< HEAD
      const top = this.add.rectangle(startX + i * 32, platformY, 32, 6, 0x82d82c).setOrigin(0, 0).setDepth(7);
      const dirt = this.add.rectangle(startX + i * 32, platformY + 6, 32, 26, 0x8a4c28).setOrigin(0, 0).setDepth(6);
=======
      const top = this.add.rectangle(startX + i * 32, platformY, 32, 6, this.cityStage ? 0xb9b4b2 : 0x82d82c).setOrigin(0, 0).setDepth(7);
      const dirt = this.add.rectangle(startX + i * 32, platformY + 6, 32, 26, this.cityStage ? 0x55566b : 0x8a4c28).setOrigin(0, 0).setDepth(6);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      this.finishPlatformDecorations.push(top, dirt);
    }
  }

  createFinishTrigger() {
    const finishX = COURSE.finishX;
    this.finishTrigger = this.add.zone(finishX, WORLD_DECOR_Y - 15, 72, 60);
    this.physics.add.existing(this.finishTrigger, true);
    this.physics.add.overlap(this.player, this.finishTrigger, () => {
      if (this.player.x >= COURSE.finishX - 100 && !this.finishWarningShown) {
        this.finishWarningShown = true;
        this.showFloatingFeedback(this.player.x, this.player.y, "GARIS FINISH!", "#f7c83b");
      }
    });
  }

  createFinishGate(withTrigger = false) {
    const finishX = COURSE.finishX;
    if (this.finishGate) this.finishGate.destroy(true);
    this.finishGate = this.add.container(finishX, WORLD_DECOR_Y - 32).setDepth(14);
    const gateBack = this.add.rectangle(0, 0, 18, 64, 0xf7c83b).setStrokeStyle(4, 0x171324);
    const gateBanner = this.add.rectangle(0, -36, 116, 22, 0x20243b).setStrokeStyle(3, 0x000000);
    const gateText = this.add.text(0, -40, "FINISH", { fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#f7c83b" }).setOrigin(0.5);
    this.finishGate.add([gateBack, gateBanner, gateText]);
    this.finishGate.setScrollFactor(1);

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
    if (this.hitCooldown || this.quizPaused || !this.player) return;
    this.hitCooldown = true;
    this.events.emit("hazard-hit", { hazardId });
    retroAudio.playWrong();
    this.player.body.setVelocity(0, -170);
    this.networkCharacterState = { state: `hurt-${this.playerFacing}`, grounded: false, vx: 0, vy: -170 };
    this.setAvatarAnimation(`hurt-${this.playerFacing}`);
    this.showFloatingFeedback(this.player.x, this.player.y, "AWAS!", "#f24b4b");
    this.time.delayedCall(1800, () => { this.hitCooldown = false; });
  }

  handleAuthoritativeHazardHit(result) {
    if (!this.player || !result) return;
    this.hitCooldown = true;
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
    const overlay = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x111422, 0.88)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(350);
    const panel = this.add.container(VIEW_W / 2, VIEW_H / 2)
      .setScrollFactor(0)
      .setDepth(351);
    const frame = this.add.graphics();
    frame.fillStyle(0x20243b, 1);
    frame.fillRect(-155, -76, 310, 152);
    frame.lineStyle(4, 0x000000, 1);
    frame.strokeRect(-155, -76, 310, 152);
    frame.lineStyle(2, 0xf7c83b, 1);
    frame.strokeRect(-151, -72, 302, 144);
    const title = this.add.text(0, -48, "FINISH!", { fontFamily: "'Press Start 2P', monospace", fontSize: "16px", color: "#f7c83b", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
    const bonus = this.add.text(0, -8, `+${Number(result.finishBonus) || 0} BONUS POIN`, { fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: "#82d82c", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    const rank = this.add.text(0, 20, `FINISH #${result.rank || "-"}`, { fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    const secs = Math.floor((result.elapsedMs || 0) / 1000);
    const time = this.add.text(0, 43, `WAKTU ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, { fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#cbd5e1", stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    panel.add([frame, title, bonus, rank, time]);
    this.finishOverlay = { overlay, panel };
    this.tweens.add({ targets: panel, scaleX: 1.04, scaleY: 1.04, duration: 180, yoyo: true, ease: "Back.easeOut" });
  }

  // =====================================================
  // QUESTION BOX

  createQuestionBoxes(serverPositions = null) {
    this.questionBoxes = [];

    // Prefer authoritative room positions; filter unsafe floor collisions on fallback course data.
    const boxSource = Array.isArray(serverPositions) && serverPositions.length
      ? serverPositions
      : (this.questionDefinitions || COURSE.questionBoxes);
    const boxPositions = boxSource.filter(pos => serverPositions?.length || this.isSafeBoxPosition(pos));
    this.safeQuestionBoxIds = new Set(boxPositions.map(pos => pos.id));

    for (const pos of boxPositions) {
      const box = this.physics.add.staticImage(
        pos.x,
        pos.y,
        "question-box"
      );

      box.setDepth(15);
      box.setOrigin(0.5, 0.5);
      box.refreshBody();

      box.setData("used", false);
      box.setData("boxId", pos.id);
      box.setData("originalY", box.y);

      this.questionBoxes.push(box);
    }
  }

  isSafeBoxPosition(pos) {
    const col = Math.floor(pos.x / 32);
    const row = Math.floor(pos.y / 32);
    // Place blocks only above continuous ground row; avoid boxes clipped by ledges or walls.
    const floorRow = 7;
    for (let y = row - 1; y <= row + 1; y++) {
      if (y < 0 || y >= COURSE.rows) return false;
      const ground = this.groundLayer.getTileAt(col, y);
      const platform = this.platformLayer.getTileAt(col, y);
      if (ground?.collides || platform?.collides) return false;
    }
    for (const candidateCol of [col - 1, col, col + 1]) {
      if (candidateCol < 0 || candidateCol >= COURSE.worldColumns) return false;
      const floor = this.groundLayer.getTileAt(candidateCol, floorRow);
      if (!floor?.collides) return false;
    }
    return true;
  }

  onQuestionBoxCollision(player, box) {
    if (!player.body || !box.body || box.getData("used")) {
      return;
    }

    const previousTop = player.body.prev.y;
    const currentTop = player.body.y;
    const boxBottom = box.body.y + box.body.height;

    const hitFromBelow =
      previousTop >= boxBottom - 10 &&
      currentTop <= boxBottom + 2;

    if (!hitFromBelow) {
      return;
    }

    box.setData("used", true);
    retroAudio.playBounce();
    this.activeQuestionBoxId = box.getData("boxId");
    this.quizPaused = true;
    player.body.setVelocity(0, 0);
    this.setAvatarAnimation(`interact-${this.playerFacing}`);
    this.networkCharacterState = { state: `interact-${this.playerFacing}`, grounded: true, vx: 0, vy: 0 };

    const originalY = box.getData("originalY");

    this.tweens.add({
      targets: box,
      y: originalY - 7,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
      onUpdate: () => box.body.updateFromGameObject(),
      onComplete: () => box.body.updateFromGameObject()
    });

    this.time.delayedCall(180, () => {
      box.setTint(0x777777);
    });

    const feedback = this.add.text(
      box.x,
      box.y - 27,
      "QUIZ!",
      {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#fff36b",
        stroke: "#43220c",
        strokeThickness: 3
      }
    );

    feedback.setOrigin(0.5);
    feedback.setDepth(30);

    this.tweens.add({
      targets: feedback,
      y: feedback.y - 22,
      alpha: 0,
      duration: 650,
      onComplete: () => feedback.destroy()
    });

    this.events.emit("question-box-hit", {
      boxId: box.getData("boxId"),
      playerId: null
    });

    console.log(
      "[BAI PARTY GAMES] Question Box berhasil dipukul!"
    );
  }

  // =====================================================
  // BACKGROUND DAN PARALLAX
  // =====================================================

  createParallaxBackground() {
<<<<<<< HEAD
    this.cameras.main.setBackgroundColor("#78bde8");
    if (!["bg-sky", "deco-cloud-1", "deco-cloud-2", "deco-cloud-3", "deco-cloud-5", "deco-cloud-6", "bg-snow-peaks", "bg-hills", "bg-forest", "deco-tree-2", "deco-tree-3"].every(key => this.textures.exists(key))) return;

    this.add.tileSprite(
      0,
      0,
      VIEW_W,
      VIEW_H,
      "bg-sky"
    )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100);

    const clouds = [
      [40, 28, "deco-cloud-1", 0.10, 6],
      [300, 52, "deco-cloud-2", 0.14, 4],
      [520, 20, "deco-cloud-5", 0.08, 5],
      [760, 64, "deco-cloud-3", 0.12, 3],
      [980, 34, "deco-cloud-6", 0.10, 5],
      [1240, 18, "deco-cloud-2", 0.14, 4],
      [1500, 58, "deco-cloud-1", 0.09, 6],
      [1760, 30, "deco-cloud-5", 0.12, 4]
    ];

    this.clouds = clouds.map(([x, y, key, factor, drift]) => {
      const sprite = this.add.image(x, y, key)
        .setOrigin(0, 0)
        .setScrollFactor(factor, 0)
        .setDepth(-95);

      return {
        sprite,
        drift,
        span: 2400
      };
    });

    this.parallaxLayers = [
      ["bg-snow-peaks", 62, 0.06, -90],
      ["bg-hills", 104, 0.16, -80],
      ["bg-forest", 148, 0.30, -70]
    ].map(([key, y, factor, depth]) => {
      const texture = this.textures.get(key).getSourceImage();

      const height = Math.min(
        texture.height,
        VIEW_H - y
      );

      const sprite = this.add.tileSprite(
        0,
        y,
        VIEW_W,
        height,
        key
      )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(depth);

      return {
        sprite,
        factor
      };
    });

    const farTrees = [
      [650, "deco-tree-3"],
      [1250, "deco-tree-3"],
      [1900, "deco-tree-3"],
      [2550, "deco-tree-3"],
      [3200, "deco-tree-3"],
      [3750, "deco-tree-3"]
    ];

    for (const [x, key] of farTrees) {
      this.add.image(x, WORLD_DECOR_Y, key)
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(3);
    }

    const midTrees = [
      [900, "deco-tree-2"],
      [1550, "deco-tree-2"],
      [2200, "deco-tree-2"],
      [2850, "deco-tree-2"],
      [3500, "deco-tree-2"]
    ];

    for (const [x, key] of midTrees) {
      this.add.image(x, WORLD_DECOR_Y, key)
        .setOrigin(0.5, 1)
        .setScrollFactor(1, 1)
        .setDepth(4);
    }
=======
    // Stage 1 — München / Marienplatz. Shared world-space backdrop for TV and HP.
    this.cityStage = true;
    this.cameras.main.setBackgroundColor("#287fc8");
    const cityChapters = [
      ["city-munich-gameplay", 0],
      ["city-frankfurt-custom", 2400],
      ["city-berlin-custom", 4800],
      ["city-hamburg-custom", 7200]
    ];
    this.cityBackdrops = [];
    for (const [textureKey, x] of cityChapters) {
      const key = this.textures.exists(textureKey) ? textureKey : "munich-city-bg";
      if (!this.textures.exists(key)) continue;
      const backdrop = this.add.image(x, 0, key)
        .setOrigin(0, 0)
        .setDisplaySize(2400, 224)
        .setScrollFactor(1, 0)
        .setDepth(-100);
      this.cityBackdrops.push(backdrop);
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
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
  }

  // =====================================================
  // DEKORASI DUNIA
  // =====================================================

  createWorldDecorations() {
<<<<<<< HEAD
=======
    if (this.cityStage) return;
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
      }
    ];

    this.avatarConfig = parts;
    this.avatarParts = [];

    this.player = this.add.sprite(
      x,
      y,
      "avatar-body",
<<<<<<< HEAD
      (this.localAvatarSelection?.skin ?? DEFAULT_AVATAR.skin) * FRAME_COUNT
=======
      this.getAvatarFrameIndex("avatar-body", this.localAvatarSelection?.skin ?? DEFAULT_AVATAR.skin, 0)
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    );

    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(20);
    for (const sprite of [this.player]) sprite.setFlipX(false);

    this.physics.add.existing(this.player);

    this.player.body.setSize(18, 24);
    this.player.body.setOffset(7, 6);
    this.player.body.setCollideWorldBounds(true);

    for (const part of parts.slice(1)) {
      const sprite = this.add.sprite(
        x,
        y,
        part.idleTexture,
<<<<<<< HEAD
        part.row * FRAME_COUNT
=======
        this.getAvatarFrameIndex(part.idleTexture, part.row, 0)
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
  }

  // =====================================================
  // MULTIPLAYER REMOTE AVATAR
  // =====================================================

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
      }
    ];

    const sprites = [];

    for (const part of parts) {
      const sprite = this.add.sprite(
        x,
        y,
        part.texture,
<<<<<<< HEAD
        part.row * FRAME_COUNT
=======
        this.getAvatarFrameIndex(part.texture, part.row, 0)
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      );

      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(part.depth);
      sprite.setFlipX(data.facing === "left");
      sprite.setVisible(true);
      sprite.setActive(true);

      sprites.push(sprite);
    }

    const nameLabel = this.add.text(
      x,
      y - 25,
      String(data.name || "Player").slice(0, 24),
      {
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#172033",
        strokeThickness: 3,
        align: "center"
      }
    );

<<<<<<< HEAD
=======
    const slot = this.remoteAvatars.size;
    nameLabel.setText(`P${slot + 1} ${String(data.name || "Player").slice(0, 14)}`);
    nameLabel.setBackgroundColor(SLOT_COLORS[slot % SLOT_COLORS.length]);
    nameLabel.setPadding(3, 1, 3, 1);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    nameLabel.setOrigin(0.5, 1);
    nameLabel.setDepth(32);
    nameLabel.setVisible(true);

    this.remoteAvatars.set(data.playerId, {
      playerId: data.playerId,
      name: data.name || "Player",
      sprites,
      nameLabel,
<<<<<<< HEAD
=======
      slot,
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
    });

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
      const limits = { skin:5, bottoms:14, shoes:10, top:29, eyes:4, hair:25 };
      const keys = ["skin", "bottoms", "shoes", "top", "eyes", "hair"];
      let changed = false;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = Number(data.avatar[key]);
        const safeValue = Number.isInteger(value) && value >= 0 && value < limits[key] ? value : DEFAULT_AVATAR[key];
        if ((remote.avatarRows || {})[key] !== safeValue) {
<<<<<<< HEAD
          remote.sprites[i]?.setFrame(safeValue * FRAME_COUNT + (remote.animFrame || 0));
=======
          const activeTexture = remote.sprites[i]?.texture?.key || `avatar-${key === "skin" ? "body" : key}`;
          remote.sprites[i]?.setFrame(this.getAvatarFrameIndex(activeTexture, safeValue, remote.animFrame || 0));
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
    if (typeof data.grounded === "boolean") remote.grounded = data.grounded;
    if (Number.isFinite(Number(data.vx))) remote.vx = Number(data.vx);
    if (Number.isFinite(Number(data.vy))) remote.vy = Number(data.vy);

    if (data.facing === "left" || data.facing === "right") {
      remote.facing = data.facing;

      for (const sprite of remote.sprites) {
        sprite.setFlipX(remote.facing === "left");
      }
    }

    if (data.name) {
      remote.name = String(data.name).slice(0, 24);
<<<<<<< HEAD
      remote.nameLabel.setText(remote.name);
=======
      remote.nameLabel.setText(`P${(remote.slot ?? 0) + 1} ${String(remote.name || "Player").slice(0, 14)}`);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
    remote.nameLabel.destroy();
<<<<<<< HEAD
=======
    remote.hero?.destroy();
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

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
      for (const sprite of remote.sprites) sprite.setPosition(x, y);
<<<<<<< HEAD
=======
      for (const sprite of remote.sprites) sprite.setVisible(true);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
      remote.nameLabel.setPosition(x, y - 25);
      if (remote.finishBanner) remote.finishBanner.setPosition(x, y - 40);
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

    const frameRate = anim === "idle" ? 4 : (anim === "walk" ? 8 : 6);
    const frameDuration = 1000 / frameRate;

    remote.animTimer = (remote.animTimer || 0) + delta;
    if (remote.animTimer >= frameDuration) {
      const steps = Math.floor(remote.animTimer / frameDuration);
      remote.animTimer -= steps * frameDuration;
<<<<<<< HEAD
      remote.animFrame = ((remote.animFrame || 0) + steps) % FRAME_COUNT;
    }

=======
      const bodyKey = anim === "jump" ? `avatar-body-jump-${direction}` : anim === "walk" ? `avatar-body-walk-${direction}` : anim === "interact" ? `avatar-body-interact-${direction}` : anim === "hurt" ? `avatar-body-hurt-${direction}` : "avatar-body";
      const frameTexture = this.textures.exists(bodyKey) ? bodyKey : "avatar-body";
      const activeColumns = this.getAvatarTextureColumns(frameTexture);
      if (remote.lastAnim !== anim || remote.lastDirection !== direction) remote.animFrame = 0;
      else remote.animFrame = ((remote.animFrame || 0) + steps) % activeColumns;
      remote.lastAnim = anim;
      remote.lastDirection = direction;
    }

    remote.heroState = `${anim === "walk" ? "walk" : anim}-${direction}`;
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    const frame = remote.animFrame || 0;
    const parts = ["body", "bottoms", "shoes", "top", "eyes", "hair"];
    const rows = [
      remote.avatarRows?.skin ?? DEFAULT_AVATAR.skin,
      remote.avatarRows?.bottoms ?? DEFAULT_AVATAR.bottoms,
      remote.avatarRows?.shoes ?? DEFAULT_AVATAR.shoes,
      remote.avatarRows?.top ?? DEFAULT_AVATAR.top,
      remote.avatarRows?.eyes ?? DEFAULT_AVATAR.eyes,
      remote.avatarRows?.hair ?? DEFAULT_AVATAR.hair
    ];

    remote.sprites.forEach((sprite, index) => {
      const part = parts[index];
      let textureKey = `avatar-${part}`;
      if (anim === "walk") textureKey = `avatar-${part}-walk-${direction}`;
      else if (anim === "jump") textureKey = `avatar-${part}-jump-${direction}`;
      else if (anim === "interact") textureKey = `avatar-${part}-interact-${direction}`;
      else if (anim === "hurt") textureKey = `avatar-${part}-hurt-${direction}`;

      if (!this.textures.exists(textureKey)) {
        textureKey = `avatar-${part}-walk-${direction}`;
        if (!this.textures.exists(textureKey)) textureKey = `avatar-${part}`;
      }

      if (sprite.texture.key !== textureKey) sprite.setTexture(textureKey);
<<<<<<< HEAD
      sprite.setFrame(rows[index] * FRAME_COUNT + frame);
=======
      sprite.setFrame(this.getAvatarFrameIndex(textureKey, rows[index], frame));
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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

    this.avatarState = state;
    this.avatarFrame = 0;
    this.avatarFrameTimer = 0;

    this.applyAvatarFrame();
  }

  applyAvatarSelection(selection = {}) {
    if (!this.avatarConfig || !this.player) return;
    const limits = { skin:5, bottoms:14, shoes:10, top:29, eyes:4, hair:25 };
    const keys = ["skin", "bottoms", "shoes", "top", "eyes", "hair"];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = Number(selection[key]);
      this.avatarConfig[i].row = Number.isInteger(value) && value >= 0 && value < limits[key]
        ? value : DEFAULT_AVATAR[key];
    }
    this.applyAvatarFrame();
  }

  getAvatarTexture(part, state) {
    if (state === "idle") return part.idleTexture;
    const texture = `avatar-${part.name}-${state}`;
    if (this.textures.exists(texture)) return texture;
    return `avatar-${part.name}-walk-${state.endsWith("left") ? "left" : "right"}`;
  }

  applyAvatarFrame() {
    const rawState = this.avatarState;
    const direction = rawState.endsWith("left") || rawState === "left" ? "left" : "right";
    const state = rawState === "idle" ? "idle" : rawState.startsWith("jump") || rawState.startsWith("fall") ? `jump-${direction}` : rawState === "left" || rawState === "right" ? `walk-${rawState}` : rawState;
    const frame = this.avatarFrame;

    const bodyConfig = this.avatarConfig[0];
    const bodyTexture = this.getAvatarTexture(bodyConfig, state);
<<<<<<< HEAD
    const bodyFrame = bodyConfig.row * FRAME_COUNT + frame;
=======
    const bodyFrame = this.getAvatarFrameIndex(bodyTexture, bodyConfig.row, frame);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

    this.player.setTexture(bodyTexture);
    this.player.setFrame(bodyFrame);

    for (const part of this.avatarParts) {
      const config = part.config;
      const texture = this.getAvatarTexture(config, state);
<<<<<<< HEAD
      const frameIndex = config.row * FRAME_COUNT + frame;
=======
      const frameIndex = this.getAvatarFrameIndex(texture, config.row, frame);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

      part.sprite.setTexture(texture);
      part.sprite.setFrame(frameIndex);
    }
  }

  updateAvatarAnimation(delta) {
    const frameRate = this.avatarState === "idle" ? 4 : 8;
    const frameDuration = 1000 / frameRate;

    this.avatarFrameTimer += delta;

    if (this.avatarFrameTimer >= frameDuration) {
      const steps = Math.floor(
        this.avatarFrameTimer / frameDuration
      );

      this.avatarFrameTimer -= steps * frameDuration;

<<<<<<< HEAD
      this.avatarFrame =
        (this.avatarFrame + steps) % FRAME_COUNT;
=======
      const bodyTexture = this.getAvatarTexture(this.avatarConfig[0], this.avatarState === "idle" ? "idle" : this.avatarState.startsWith("jump") || this.avatarState.startsWith("fall") ? `jump-${this.avatarState.endsWith("left") ? "left" : "right"}` : this.avatarState);
      const columns = this.getAvatarTextureColumns(bodyTexture);
      this.avatarFrame = (this.avatarFrame + steps) % columns;
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

      this.applyAvatarFrame();
    }
  }

  syncAvatarLayers() {
    if (!this.player || !this.avatarParts) {
      return;
    }

    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);

    for (const part of this.avatarParts) {
      part.sprite.setPosition(x, y);
    }
<<<<<<< HEAD
=======

    for (const part of this.avatarParts) part.sprite.setVisible(true);
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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

    this.mobileInput = {
      left: false,
      right: false,
      jump: false
    };

    this.mobileJumpWasDown = false;
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
<<<<<<< HEAD
    camera.setViewport(0, 0, width, height);
    camera.setSize(width, height);
=======
    // Phaser.Scale.FIT owns the canvas scaling. Keep the world camera in
    // logical game coordinates (480x270); resizing it to browser pixels
    // makes the camera see far beyond the world and leaves a large empty sky.
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
    if (this.player) {
      this.player.body?.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, this.worldWidth, this.worldHeight));
    }
    if (this.isHostMode && this.hostSpectatorTarget) {
      camera.startFollow(this.hostSpectatorTarget, true, 0.12, 0.12);
    }
  }

  updatePlayerMovement() {
    const body = this.player.body;

    if (this.quizPaused || this.finished) {
      body.setVelocity(0, body.velocity.y);
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
      this.setAvatarAnimation(`jump-${this.playerFacing}`);
    }

    const grounded = body.onFloor();
    if (grounded && !this.wasGrounded) {
      this.events.emit("player:landed");
      this.tweens.add({
        targets: [this.player, ...(this.avatarParts?.map(p => p.sprite) || [])],
        scaleX: 1.2,
        scaleY: 0.82,
        duration: 75,
        yoyo: true,
        ease: "Quad.easeOut"
      });
    }
    this.wasGrounded = grounded;

    if (this.avatarState.startsWith("interact") || this.avatarState.startsWith("hurt")) {
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

    // UPDATE AVATAR PEMAIN LAIN
    this.updateRemoteAvatars(delta);
<<<<<<< HEAD
=======
    this.updateStageHUD();
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9

    if (this.isHostMode || !this.player || !this.avatarParts) {
      return;
    }

    this.updatePlayerMovement();
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
<<<<<<< HEAD
=======
    if (this.isHostMode) { this.leaderboardTitle?.setVisible(false); return; } // TV uses the DOM leaderboard HUD
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
    this.leaderboardBg.fillStyle(0x111422, 0.85);
    this.leaderboardBg.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.leaderboardBg.lineStyle(2, 0x000000, 1);
    this.leaderboardBg.strokeRect(panelX, panelY, panelWidth, panelHeight);
    this.leaderboardBg.lineStyle(1, 0x313859, 0.8);
    this.leaderboardBg.strokeRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);

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
<<<<<<< HEAD
      "⏱ 10:00",
=======
      "⏱ 12:00",
>>>>>>> 11f10904e9719236a7a7f89e4b6421c8ce05a5e9
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
}
