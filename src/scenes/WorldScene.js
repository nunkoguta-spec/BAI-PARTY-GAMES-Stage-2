
import Phaser from "phaser";
import { DEFAULT_AVATAR } from "../avatar/defaultAvatar.js";

const FRAME_COUNT = 4;
const WORLD_DECOR_Y = 224;
const VIEW_W = 480;
const VIEW_H = 270;

const MOVE_SPEED = 145;
const JUMP_SPEED = 430;

export class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");
  }

  create() {
    // DATA AVATAR MULTIPLAYER
    this.remoteAvatars = new Map();

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

    this.groundLayer = map.createLayer("Ground", tileset, 0, 0);
    this.platformLayer = map.createLayer("Platforms", tileset, 0, 0);

    if (!this.groundLayer || !this.platformLayer) {
      throw new Error("Layer Ground atau Platforms tidak ditemukan.");
    }

    this.groundLayer.setDepth(5);
    this.platformLayer.setDepth(6);

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

    this.worldWidth = map.widthInPixels;
    this.worldHeight = map.heightInPixels;

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    // DEKORASI
    this.createWorldDecorations();

    // SPAWN
    const spawn = map.findObject(
      "Objects",
      (object) => object.name === "PlayerSpawn"
    ) || { x: 240, y: 208 };

    this.createAvatar(
      Math.round(spawn.x),
      Math.round(spawn.y)
    );

    // QUESTION BOX
    this.createQuestionBoxes();

    // SINKRONISASI KOSTUM
    this.events.on(
      Phaser.Scenes.Events.POST_UPDATE,
      this.syncAvatarLayers,
      this
    );

    // COLLISION PLAYER
    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.platformLayer);

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

    // KAMERA
    const camera = this.cameras.main;

    camera.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight
    );

    camera.setRoundPixels(true);
    camera.startFollow(this.player, true, 0.12, 0);

    this.cameraY = 20;
    camera.scrollY = this.cameraY;
  }

  // =====================================================
  // QUESTION BOX
  // =====================================================

  createQuestionBoxes() {
    this.questionBoxes = [];

    const box = this.physics.add.staticImage(
      360,
      176,
      "question-box"
    );

    box.setDepth(15);
    box.setOrigin(0.5, 0.5);
    box.refreshBody();

    box.setData("used", false);
    box.setData("boxId", "question-box-01");
    box.setData("originalY", box.y);

    this.questionBoxes.push(box);
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
    player.body.setVelocityY(0);

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
    const trees = [
      [650, "deco-tree-1"],
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

    this.add.image(2200, WORLD_DECOR_Y, "deco-house")
      .setOrigin(0.5, 1)
      .setScrollFactor(1, 1)
      .setDepth(4);

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
      facing: data.facing === "left" ? "left" : "right"
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

    if (Number.isFinite(x)) {
      remote.targetX = x;
    }

    if (Number.isFinite(y)) {
      remote.targetY = y;
    }

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

    // INTERPOLASI GERAKAN REMOTE
    const smoothing = Math.min(1, delta / 85);

    for (const remote of this.remoteAvatars.values()) {
      remote.x = Phaser.Math.Linear(
        remote.x,
        remote.targetX,
        smoothing
      );

      remote.y = Phaser.Math.Linear(
        remote.y,
        remote.targetY,
        smoothing
      );

      const x = Math.round(remote.x);
      const y = Math.round(remote.y);

      for (const sprite of remote.sprites) {
        sprite.setPosition(x, y);
      }

      remote.nameLabel.setPosition(x, y - 25);
    }
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
    if (state === "idle") {
      return part.idleTexture;
    }

    return `avatar-${part.name}-walk-${state}`;
  }

  applyAvatarFrame() {
    const state = this.avatarState;
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
  }

  updatePlayerMovement() {
    const body = this.player.body;

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
    }
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update(_time, delta) {
    this.cameras.main.scrollY = this.cameraY;

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

    if (!this.player || !this.avatarParts) {
      return;
    }

    this.updatePlayerMovement();
    this.updateAvatarAnimation(delta);
  }

  postUpdate() {
    this.syncAvatarLayers();
  }
}
