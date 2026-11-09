
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

export class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");
  }

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
        this.hostSpectatorTarget = player.sprites[0];
        camera.startFollow(this.hostSpectatorTarget, true, 0.12, 0.12);
      };
      this.hostClearFollow = () => {
        this.hostSpectatorTarget = null;
        camera.stopFollow();
        camera.scrollX = 0;
        camera.scrollY = 0;
      };
      camera.scrollX = 0;
      camera.scrollY = 0;
    }

    // LEADERBOARD HUD (in-game on all clients and host)
    this.createLeaderboardHUD();
    this.createGameTimerHUD();
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
      const top = this.add.rectangle(startX + i * 32, platformY, 32, 6, 0x82d82c).setOrigin(0, 0).setDepth(7);
      const dirt = this.add.rectangle(startX + i * 32, platformY + 6, 32, 26, 0x8a4c28).setOrigin(0, 0).setDepth(6);
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

  createQuestionBoxes() {
    this.questionBoxes = [];

    // Place boxes only above clear floor columns. Skip any cell occupied by a solid tile.
    const boxSource = this.questionDefinitions || COURSE.questionBoxes;
    const boxPositions = boxSource.filter(pos => this.isSafeBoxPosition(pos));
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
  }

  // =====================================================
  // DEKORASI DUNIA
  // =====================================================

  createWorldDecorations() {
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
    const parts = [
      {
        name: "body",
        idleTexture: "avatar-body",
        row: DEFAULT_AVATAR.skin,
        depth: 20
      },
      {
        name: "bottoms",
        idleTexture: "avatar-bottoms",
        row: DEFAULT_AVATAR.bottoms,
        depth: 21
      },
      {
        name: "shoes",
        idleTexture: "avatar-shoes",
        row: DEFAULT_AVATAR.shoes,
        depth: 22
      },
      {
        name: "top",
        idleTexture: "avatar-top",
        row: DEFAULT_AVATAR.top,
        depth: 23
      },
      {
        name: "eyes",
        idleTexture: "avatar-eyes",
        row: DEFAULT_AVATAR.eyes,
        depth: 24
      },
      {
        name: "hair",
        idleTexture: "avatar-hair",
        row: DEFAULT_AVATAR.hair,
        depth: 25
      }
    ];

    this.avatarConfig = parts;
    this.avatarParts = [];

    this.player = this.add.sprite(
      x,
      y,
      "avatar-body",
      DEFAULT_AVATAR.skin * FRAME_COUNT
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
        part.row * FRAME_COUNT
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
        row: DEFAULT_AVATAR.skin,
        depth: 26
      },
      {
        name: "bottoms",
        texture: "avatar-bottoms",
        row: DEFAULT_AVATAR.bottoms,
        depth: 27
      },
      {
        name: "shoes",
        texture: "avatar-shoes",
        row: DEFAULT_AVATAR.shoes,
        depth: 28
      },
      {
        name: "top",
        texture: "avatar-top",
        row: DEFAULT_AVATAR.top,
        depth: 29
      },
      {
        name: "eyes",
        texture: "avatar-eyes",
        row: DEFAULT_AVATAR.eyes,
        depth: 30
      },
      {
        name: "hair",
        texture: "avatar-hair",
        row: DEFAULT_AVATAR.hair,
        depth: 31
      }
    ];

    const sprites = [];

    for (const part of parts) {
      const sprite = this.add.sprite(
        x,
        y,
        part.texture,
        part.row * FRAME_COUNT
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

    nameLabel.setOrigin(0.5, 1);
    nameLabel.setDepth(32);
    nameLabel.setVisible(true);

    this.remoteAvatars.set(data.playerId, {
      playerId: data.playerId,
      name: data.name || "Player",
      sprites,
      nameLabel,
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
      remote.nameLabel.setText(remote.name);
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
      remote.animFrame = ((remote.animFrame || 0) + steps) % FRAME_COUNT;
    }

    const frame = remote.animFrame || 0;
    const parts = ["body", "bottoms", "shoes", "top", "eyes", "hair"];
    const rows = [
      DEFAULT_AVATAR.skin,
      DEFAULT_AVATAR.bottoms,
      DEFAULT_AVATAR.shoes,
      DEFAULT_AVATAR.top,
      DEFAULT_AVATAR.eyes,
      DEFAULT_AVATAR.hair
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
      sprite.setFrame(rows[index] * FRAME_COUNT + frame);
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
    const bodyFrame = bodyConfig.row * FRAME_COUNT + frame;

    this.player.setTexture(bodyTexture);
    this.player.setFrame(bodyFrame);

    for (const part of this.avatarParts) {
      const config = part.config;
      const texture = this.getAvatarTexture(config, state);
      const frameIndex = config.row * FRAME_COUNT + frame;

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

      this.avatarFrame =
        (this.avatarFrame + steps) % FRAME_COUNT;

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
    camera.setViewport(0, 0, width, height);
    camera.setSize(width, height);
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
      "⏱ 10:00",
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
