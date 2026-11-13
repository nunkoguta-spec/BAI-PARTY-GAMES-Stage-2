import Phaser from "phaser";
import { COURSE } from "../game/course.js";
import { DEFAULT_AVATAR } from "../avatar/defaultAvatar.js";
import { retroAudio } from "../audio/retroAudio.js";

const AVATAR_PARTS = [
  ["body", "avatar-body", "skin", 1],
  ["bottoms", "avatar-bottoms", "bottoms", 2],
  ["shoes", "avatar-shoes", "shoes", 3],
  ["top", "avatar-top", "top", 4],
  ["eyes", "avatar-eyes", "eyes", 5],
  ["hair", "avatar-hair", "hair", 6]
];

export class TrainTravelScene extends Phaser.Scene {
  constructor() {
    super("TrainTravelScene");
  }

  init(data = {}) {
    this.fromIndex = Number.isFinite(Number(data.fromIndex)) ? Number(data.fromIndex) : Math.max(0, Number(window.baiStageIndex || 0));
    this.toIndex = Number.isFinite(Number(data.toIndex)) ? Number(data.toIndex) : this.fromIndex + 1;
    this.isHostMode = Boolean(data.isHostMode || window.deutschHostMode);
    this.avatarSelection = { ...DEFAULT_AVATAR, ...(data.avatarSelection || {}) };
    this._travelFinished = false;
    this._arrivalStarted = false;
  }

  preload() {
    // Centralized assets loaded by BootScene
  }

  create() {
    const camera = this.cameras.main;
    const W = 480;
    const H = 270;
    this.W = W;
    this.H = H;
    camera.setScroll(0, 0);
    camera.setZoom(1);
    camera.setBackgroundColor("#91b8d0");

    const from = COURSE.stages[this.fromIndex] || COURSE.stages[0];
    const to = COURSE.stages[this.toIndex] || COURSE.stages[COURSE.stages.length - 1];

    this.groundY = Math.round(H * 0.72);
    this.trainScale = 1.35;
    this.trainKey = this.textures.exists("bhf-train-long") ? "bhf-train-long" : (this.textures.exists("bhf-train") ? "bhf-train" : "bahnhof-train");
    this.trainWidth = Math.round((this.trainKey === "bhf-train-long" ? 448 : 302) * this.trainScale);

    this.drawStationBackdrop(from, "departure");
    this.createHeader(from, to);
    this.createTrainAndBoardingSequence(from, to);
  }

  drawStationBackdrop(stage, mode = "departure") {
    const { W, H, groundY } = this;
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x78aecd, 0x78aecd, 0xc1dbe5, 0xc1dbe5, 1);
    bg.fillRect(0, 0, W, H);

    // City skyline silhouette
    const skyline = this.add.graphics().setDepth(1);
    skyline.fillStyle(0x7896a5, 0.42);
    const skylineBase = groundY - 66;
    const buildings = [
      [0.00, 38, 0.075], [0.085, 54, 0.065], [0.16, 31, 0.08],
      [0.255, 62, 0.07], [0.34, 43, 0.075], [0.435, 57, 0.065],
      [0.52, 34, 0.085], [0.625, 60, 0.07], [0.715, 42, 0.08],
      [0.81, 55, 0.07], [0.90, 36, 0.09]
    ];
    for (const [x, h, width] of buildings) {
      const bx = W * x;
      const bw = W * width;
      const bh = h * 0.72;
      skyline.fillRect(bx, skylineBase - bh, bw, bh);
      skyline.fillStyle(0x7896a5, 0.22);
      skyline.fillRect(bx - 3, skylineBase - bh - 4, bw + 6, 5);
      skyline.fillStyle(0x7896a5, 0.42);
    }

    // Station building façade on the left serves as the station entrance.
    if (this.textures.exists("bhf-station")) {
      this.add.image(10, groundY, "bhf-station")
        .setOrigin(0.5, 1).setScale(0.82).setDepth(3);
    }

    // Platform, ballast and foundation run edge to edge.
    this.add.rectangle(W / 2, groundY + 11, W + 4, 22, 0x89969a).setDepth(4);
    this.add.rectangle(W / 2, groundY - 1, W + 4, 4, 0xd9cba9).setDepth(5);
    this.add.rectangle(W / 2, groundY + (H - groundY) / 2 + 8, W + 4, H - groundY + 16, 0x3d4654).setDepth(4);
    this.add.rectangle(W / 2, groundY + 22, W + 4, 10, 0x53616a).setDepth(5);

    // Platform canopy on the right covers the train boarding area
    if (this.textures.exists("bhf-platform-b")) {
      this.add.image(330, groundY, "bhf-platform-b")
        .setOrigin(0.5, 1).setScale(1).setDepth(6);
    }

    // Stationary rails across the station platform
    const rails = this.add.graphics().setDepth(7);
    const railY = groundY + 18;
    rails.fillStyle(0x6d5840, 1);
    for (let x = -8; x < W + 24; x += 22) rails.fillRect(x, railY + 1, 14, 6);
    rails.lineStyle(3, 0xc5ccd6, 1);
    rails.lineBetween(-2, railY, W + 2, railY);
    rails.lineBetween(-2, railY + 8, W + 2, railY + 8);
    rails.lineStyle(1, 0xffffff, 0.6);
    rails.lineBetween(-2, railY, W + 2, railY);

    // Overhead electrical catenary poles (tiang listrik) at depth 5 (BEHIND the train at depth 12)
    const catenaryPoles = this.add.graphics().setDepth(5);
    const wireY = groundY + 18 - Math.round(52 * this.trainScale);
    const messengerY = wireY - 14;

    for (const mastX of [40, 210, 390]) {
      catenaryPoles.fillStyle(0x3e4754, 1);
      catenaryPoles.fillRect(mastX - 2, wireY - 20, 5, groundY - (wireY - 20));
      catenaryPoles.fillRect(mastX - 2, wireY - 20, 24, 4);
      catenaryPoles.fillStyle(0xd5e1ed, 1);
      catenaryPoles.fillRect(mastX + 16, wireY - 14, 4, 6);
    }

    // Overhead catenary contact wire at roof level (depth 13, connects with pantograph)
    const catenaryWire = this.add.graphics().setDepth(13);
    catenaryWire.lineStyle(1.5, 0x4a5666, 0.95);
    catenaryWire.lineBetween(-10, wireY, W + 10, wireY);
    catenaryWire.lineStyle(1, 0x3d4754, 0.85);
    catenaryWire.lineBetween(-10, messengerY, W + 10, messengerY);
    catenaryWire.lineStyle(1, 0x5a6678, 0.7);
    for (let x = 16; x < W + 10; x += 32) catenaryWire.lineBetween(x, messengerY, x, wireY);

    // Platform travelers & station atmosphere
    if (this.textures.exists("bhf-traveler")) {
      this.add.image(72, groundY, "bhf-traveler").setOrigin(0.5, 1).setDepth(8);
      this.add.image(410, groundY, "bhf-traveler").setOrigin(0.5, 1).setDepth(8).setFlipX(true);
    }
    if (this.textures.exists("bhf-officer")) {
      this.add.image(280, groundY, "bhf-officer").setOrigin(0.5, 1).setDepth(8);
    }

    // Props use a consistent baseline and balanced spacing.
    // Lamps set to depth 5 (behind the train) so train blocks them if overlapping.
    const boardKey = mode === "departure" ? "bhf-board-abfahrt" : "bhf-board-ankunft";
    const props = [
      ["bhf-lamp-a", 36, groundY, 5],
      ["bhf-bench", 78, groundY, 8],
      ["bhf-ticket-machine", 240, groundY, 8],
      [boardKey, 330, groundY - 48, 8],
      ["bhf-plant", 430, groundY, 8],
      ["bhf-lamp-b", 458, groundY, 5]
    ];
    for (const [key, x, y, depth] of props) {
      if (!this.textures.exists(key)) continue;
      this.add.image(x, y, key)
        .setOrigin(0.5, 1).setScale(1).setDepth(depth);
    }

    this.add.rectangle(W / 2, H - 8, W + 4, 16, 0x313b48).setDepth(10);
    this.add.text(60, groundY - 110, stage.station || "BAHNHOF", {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px",
      color: "#fff3c5", backgroundColor: "#203449", padding: { x: 7, y: 5 },
      stroke: "#111", strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
  }

  createHeader(from, to) {
    const { W } = this;
    const panel = this.add.graphics().setDepth(30);
    panel.fillStyle(0x101c2b, 0.9);
    panel.fillRoundedRect(W * 0.15, 46, W * 0.7, 44, 8);
    panel.lineStyle(2, 0xf6c84a, 1);
    panel.strokeRoundedRect(W * 0.15, 46, W * 0.7, 44, 8);
    this.add.text(W / 2, 58, `${from.name}  →  ${to.name}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px",
      color: "#ffdc72", stroke: "#000", strokeThickness: 3
    }).setOrigin(0.5).setDepth(31);
    this.statusText = this.add.text(W / 2, 76, "ZUG FÄHRT EIN …", {
      fontFamily: "Arial, sans-serif", fontSize: "10px",
      fontStyle: "bold", color: "#ffffff", stroke: "#182435", strokeThickness: 3
    }).setOrigin(0.5).setDepth(31);
  }

  createTrainAndBoardingSequence(from, to) {
    const { W, groundY, trainScale, trainWidth } = this;
    const railY = groundY + 18;
    const trainY = railY + 1;
    const trainKey = this.trainKey;
    this.train = this.add.image(-trainWidth, trainY, trainKey)
      .setOrigin(0.5, 1).setScale(trainScale).setDepth(12);

    // Glowing locomotive headlights pointing forward on the right!
    this.headlight = this.add.graphics().setDepth(13);
    const updateHeadlight = () => {
      this.headlight.clear();
      const fx = this.train.x + trainWidth * 0.5 - 2;
      const fy = this.train.y - Math.round(18 * trainScale);
      this.headlight.fillStyle(0xfff2b0, 0.28);
      this.headlight.fillTriangle(fx, fy, fx + 75, fy - 16, fx + 75, fy + 22);
      this.headlight.fillStyle(0xffffff, 0.85);
      this.headlight.fillCircle(fx, fy, 3);
    };

    // Passenger enters from the Bahnhof entrance hall on the left
    this.passenger = this.createPassenger(-15, groundY - 7);
    this.passenger.setDepth(18);

    // Train enters over stationary platform rails
    const targetTrainX = Math.round(W * 0.44);
    this.tweens.add({
      targets: this.train,
      x: targetTrainX,
      duration: 1500,
      ease: "Cubic.easeOut",
      onUpdate: updateHeadlight,
      onComplete: () => {
        updateHeadlight();
        this.openDoorsAndBoard();
      }
    });
  }

  createPassenger(x, y) {
    const container = this.add.container(x, y).setDepth(18);
    const scale = 1;
    container.avatarSprites = [];
    for (const [part, texture, rowKey, depth] of AVATAR_PARTS) {
      if (!this.textures.exists(texture)) continue;
      const row = Math.max(0, Number(this.avatarSelection[rowKey]) || 0);
      const tex = this.textures.get(texture);
      const cols = Math.max(1, Math.floor((tex.source?.[0]?.width || 128) / 32));
      const rows = Math.max(1, Math.floor((tex.source?.[0]?.height || 32) / 32));
      const safeRow = Phaser.Math.Clamp(row, 0, rows - 1);
      const frame = safeRow * cols;
      const sprite = this.add.sprite(0, 0, texture, frame)
        .setOrigin(0.5, 0.5).setScale(scale).setDepth(depth);
      container.add(sprite);
      container.avatarSprites.push({ part, sprite, row, cols });
    }
    if (!container.list.length && this.textures.exists("hero-idle")) {
      container.add(this.add.image(0, 0, "hero-idle").setScale(0.75));
    }
    return container;
  }

  setPassengerWalk(container, isWalking, facing = "right") {
    if (!container?.avatarSprites) return;
    for (const item of container.avatarSprites) {
      const walkKey = `avatar-${item.part}-walk-${facing}`;
      const texKey = isWalking && this.textures.exists(walkKey) ? walkKey : `avatar-${item.part}`;
      if (item.sprite.texture.key !== texKey) {
        item.sprite.setTexture(texKey);
      }
    }
  }

  openDoorsAndBoard() {
    const { train, trainWidth, groundY } = this;
    this.statusText.setText("MASUK KE BAHNHOF • MENUJU PERON");
    const doorX = train.x - Math.round(trainWidth * 0.08);

    // Passenger walks from station entrance onto the platform and along the peron
    this.setPassengerWalk(this.passenger, true, "right");

    const walkStep = this.tweens.add({
      targets: this.passenger,
      y: groundY - 10,
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: this.passenger,
      x: doorX,
      duration: 1400,
      ease: "Linear",
      onStart: () => {
        this.time.delayedCall(450, () => {
          this.statusText.setText("BERJALAN DI PERON MENUJU GERBONG …");
        });
      },
      onComplete: () => {
        walkStep.stop();
        this.passenger.y = groundY - 7;
        this.setPassengerWalk(this.passenger, false, "right");
        this.statusText.setText("PENUMPANG SUDAH NAIK • PINTU TERTUTUP");

        // Step up into carriage and enter
        this.tweens.add({
          targets: this.passenger,
          y: groundY - 15,
          alpha: 0,
          scale: 0.82,
          duration: 250,
          onComplete: () => {
            this.departTrain();
          }
        });
      }
    });
  }

  departTrain() {
    this.statusText.setText("PINTU TERTUTUP • KERETA BERANGKAT!");
    retroAudio.playTrainWhistle?.();

    // Puff of steam from locomotive roof (locomotive is at the front on the right!)
    const locoX = this.train.x + this.trainWidth * 0.35;
    this.spawnSteamPuff(locoX, this.train.y - 48);

    this.time.delayedCall(350, () => {
      // The train drives forward over the stationary rails and accelerates right!
      this.tweens.add({
        targets: this.train,
        x: this.W + this.trainWidth + 80,
        duration: 1150,
        ease: "Cubic.easeIn",
        onUpdate: () => {
          if (this.headlight && this.train) {
            this.headlight.clear();
            const fx = this.train.x + this.trainWidth * 0.5 - 2;
            const fy = this.train.y - Math.round(18 * this.trainScale);
            this.headlight.fillStyle(0xfff2b0, 0.28);
            this.headlight.fillTriangle(fx, fy, fx + 75, fy - 16, fx + 75, fy + 22);
            this.headlight.fillStyle(0xffffff, 0.85);
            this.headlight.fillCircle(fx, fy, 3);
          }
        },
        onComplete: () => {
          this.startJourneyMotion();
        }
      });
    });
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

  startJourneyMotion() {
    const { W, H, groundY } = this;

    // Clean up departure station objects cleanly
    this.children.list.slice().forEach((child) => {
      if (child !== this.cameras.main) child.destroy();
    });

    const destination = COURSE.stages[this.toIndex] || COURSE.stages[COURSE.stages.length - 1];
    const panoIndex = Phaser.Math.Clamp(this.toIndex - 1, 0, 2);

    const stagePanoramas = [
      "travel-journey-sunset",       // Munich -> Frankfurt
      "travel-journey-countryside",  // Frankfurt -> Berlin
      "travel-journey-mountains"     // Berlin -> Hamburg
    ];
    const selectedKey = stagePanoramas[panoIndex];

    // 1. Sky gradient tailored to route
    const skyGradients = [
      [0x18243b, 0x18243b, 0xd86c42, 0xf0a876], // Munich -> Frankfurt: sunset twilight
      [0x22558c, 0x22558c, 0x5da3d6, 0xaadbf4], // Frankfurt -> Berlin: clear blue day
      [0x1d3552, 0x1d3552, 0x5a86a8, 0xc2dde8]  // Berlin -> Hamburg: coastal Nordic sky
    ];
    const [c1, c2, c3, c4] = skyGradients[panoIndex] || skyGradients[0];
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(c1, c2, c3, c4, 1);
    sky.fillRect(0, 0, W, H);

    // 2. Parallax clouds in upper sky
    this.clouds = [];
    const cloudKeys = ["deco-cloud-1", "deco-cloud-2", "deco-cloud-3", "deco-cloud-5"];
    const cloudYPositions = [14, 28, 42, 22];
    for (let i = 0; i < 4; i++) {
      const key = cloudKeys[i % cloudKeys.length];
      if (this.textures.exists(key)) {
        const cloud = this.add.image(40 + i * 130, cloudYPositions[i], key)
          .setOrigin(0, 0).setDepth(1).setAlpha(0.65).setScale(0.85);
        this.clouds.push(cloud);
      }
    }

    const trackY = groundY + 18;

    // 3. Crisp multi-layer parallax landscape (clean solid pixel-art, zero checkerboard artifacts)
    if (this.textures.exists("bg-snow-peaks")) {
      this.bgMountains = this.add.tileSprite(0, trackY - 145, W, 120, "bg-snow-peaks")
        .setOrigin(0, 0).setDepth(2).setAlpha(0.75);
      this.bgMountains.tileScaleX = 0.65;
      this.bgMountains.tileScaleY = 0.25;
    }

    if (this.textures.exists("bg-hills")) {
      this.bgHills = this.add.tileSprite(0, trackY - 85, W, 70, "bg-hills")
        .setOrigin(0, 0).setDepth(3).setAlpha(0.88);
      this.bgHills.tileScaleX = 0.85;
      this.bgHills.tileScaleY = 0.22;
    }

    if (this.textures.exists("bg-forest")) {
      this.bgForest = this.add.tileSprite(0, trackY - 55, W, 50, "bg-forest")
        .setOrigin(0, 0).setDepth(4).setAlpha(0.96);
      this.bgForest.tileScaleX = 1.0;
      this.bgForest.tileScaleY = 0.20;
    }

    // 4. Ground foundation below the tracks
    const groundBase = this.add.graphics().setDepth(8);
    groundBase.fillStyle(0x313b48, 1);
    groundBase.fillRect(0, trackY + 8, W, H - (trackY + 8));

    // 6. Track ballast and moving ties (sleepers)
    this.trackTiesGraphics = this.add.graphics().setDepth(10);
    this.trackOffset = 0;

    // 7. Solid stationary steel rails (glistening metal lines)
    const rails = this.add.graphics().setDepth(12);
    rails.lineStyle(3, 0xc5ccd6, 1);
    rails.lineBetween(-4, trackY + 2, W + 4, trackY + 2);
    rails.lineBetween(-4, trackY + 10, W + 4, trackY + 10);
    rails.lineStyle(1, 0xffffff, 0.7);
    rails.lineBetween(-4, trackY + 1, W + 4, trackY + 1);

    // 8. Overhead electrical catenary wire (kabel listrik aliran atas)
    const railY = groundY + 18;
    const wireY = railY - Math.round(52 * this.trainScale);
    const messengerY = wireY - 14;

    const catenaryWire = this.add.graphics().setDepth(14);
    catenaryWire.lineStyle(1.5, 0x4a5666, 0.95);
    catenaryWire.lineBetween(-10, wireY, W + 10, wireY);
    catenaryWire.lineStyle(1, 0x3d4754, 0.85);
    catenaryWire.lineBetween(-10, messengerY, W + 10, messengerY);
    catenaryWire.lineStyle(1, 0x5a6678, 0.7);
    for (let x = 8; x < W + 10; x += 28) catenaryWire.lineBetween(x, messengerY, x, wireY);

    this.catenaryPoles = [60, 210, 360, 510];
    // Mast poles at depth 5 (BEHIND the train at depth 13) so the train body occludes them
    this.catenaryGraphics = this.add.graphics().setDepth(5);

    // 9. Long German passenger train (Locomotive + multiple gerbong!)
    // Wheels sit right on top of the rails at railY + 1
    const trainKey = this.trainKey;
    const trainY = railY + 1;
    this.travelTrain = this.add.image(W * 0.44, trainY, trainKey)
      .setOrigin(0.5, 1).setScale(this.trainScale).setDepth(13);

    // Train dynamic movement: subtle speed vibration and sway
    this.tweens.add({
      targets: this.travelTrain,
      y: trainY - 1.5,
      duration: 110,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: this.travelTrain,
      x: W * 0.44 + 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    // Locomotive headlights
    const travelHeadlight = this.add.graphics().setDepth(14);
    const hx = this.travelTrain.x + this.trainWidth * 0.5 - 2;
    const hy = trainY - Math.round(18 * this.trainScale);
    travelHeadlight.fillStyle(0xfff5c0, 0.25);
    travelHeadlight.fillTriangle(hx, hy, hx + 85, hy - 18, hx + 85, hy + 24);
    travelHeadlight.fillStyle(0xffffff, 0.85);
    travelHeadlight.fillCircle(hx, hy, 3);

    this.sparkGraphics = this.add.graphics().setDepth(16);
    this.sparkTimer = 0;

    // 10. Speed wind streaks
    this.speedStreaksGraphics = this.add.graphics().setDepth(17);
    this.streakItems = [];
    for (let i = 0; i < 7; i++) {
      this.streakItems.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(trackY - 45, trackY + 12),
        len: Phaser.Math.Between(24, 65),
        speed: Phaser.Math.Between(550, 850)
      });
    }

    // 11. Route progress HUD banner at top
    const badge = this.add.container(W / 2, 52).setDepth(30);
    const badgeBg = this.add.rectangle(0, 0, 310, 38, 0x101c2b, 0.94)
      .setStrokeStyle(2, 0xf6c84a, 1);
    const fromName = (COURSE.stages[this.fromIndex] || {}).name || "";
    const badgeFromTo = this.add.text(0, -7, `${fromName}  ➔  ${destination.name}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#ffdc72"
    }).setOrigin(0.5);
    const badgeStatus = this.add.text(0, 8, `NÄCHSTER HALT: ${destination.station || destination.name + " HBF"}  •  200 KM/H`, {
      fontFamily: "Arial, sans-serif", fontSize: "9px", fontStyle: "bold", color: "#ffffff"
    }).setOrigin(0.5);
    badge.add([badgeBg, badgeFromTo, badgeStatus]);

    // Active speed cruising immediately so it NEVER feels frozen!
    this.isTraveling = true;
    this.travelSpeed = 480;
    this.wireY = wireY;

    // After 3 seconds of cruising, smoothly decelerate into the destination city
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: this,
        travelSpeed: 80,
        duration: 700,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.isTraveling = false;
          this.arriveAtNextCity();
        }
      });
    });
  }

  update(time, delta) {
    if (!this.isTraveling) return;
    const dt = Math.min(0.05, delta / 1000);
    const spd = this.travelSpeed;

    // 1. Move parallax layers
    if (this.bgMountains) this.bgMountains.tilePositionX += spd * 0.15 * dt;
    if (this.bgHills) this.bgHills.tilePositionX += spd * 0.45 * dt;
    if (this.bgForest) this.bgForest.tilePositionX += spd * 0.85 * dt;

    // 2. Parallax clouds
    for (const cloud of this.clouds || []) {
      cloud.x -= spd * 0.07 * dt;
      if (cloud.x < -120) cloud.x = this.W + Phaser.Math.Between(20, 80);
    }

    // 3. Rushing railway ties (sleepers) beneath train wheels
    if (this.trackTiesGraphics) {
      this.trackOffset = (this.trackOffset + spd * 1.4 * dt) % 22;
      this.trackTiesGraphics.clear();
      this.trackTiesGraphics.fillStyle(0x6d5840, 1);
      const trackY = this.groundY + 18;
      for (let x = -24; x < this.W + 24; x += 22) {
        this.trackTiesGraphics.fillRect(x - this.trackOffset, trackY + 3, 14, 5);
      }
    }

    // 4. Overhead catenary masts (tiang listrik aliran atas) passing by
    if (this.catenaryGraphics && this.catenaryPoles) {
      this.catenaryGraphics.clear();
      const wireY = this.wireY;
      const poleBottom = this.groundY + 18;
      for (let i = 0; i < this.catenaryPoles.length; i++) {
        this.catenaryPoles[i] -= spd * 1.2 * dt;
        if (this.catenaryPoles[i] < -50) {
          this.catenaryPoles[i] += this.W + 150;
        }
        const px = Math.round(this.catenaryPoles[i]);
        // Mast pole
        this.catenaryGraphics.fillStyle(0x3e4754, 1);
        this.catenaryGraphics.fillRect(px - 2, wireY - 20, 5, poleBottom - (wireY - 20));
        // Horizontal cantilever arm extending over the track
        this.catenaryGraphics.fillRect(px - 2, wireY - 20, 24, 4);
        // Ceramic insulator
        this.catenaryGraphics.fillStyle(0xd5e1ed, 1);
        this.catenaryGraphics.fillRect(px + 16, wireY - 14, 4, 6);
      }
    }

    // 5. Electric spark at the pantograph tip
    if (this.sparkGraphics && this.travelTrain) {
      this.sparkGraphics.clear();
      this.sparkTimer = (this.sparkTimer || 0) + dt;
      if (this.sparkTimer > 1.4) {
        if (Phaser.Math.Between(0, 4) === 0) {
          const pantographX = this.travelTrain.x - this.trainWidth * 0.5 + 50;
          const py = this.wireY;
          this.sparkGraphics.fillStyle(0xc8f2ff, 1);
          this.sparkGraphics.fillRect(pantographX - 2, py - 2, 5, 5);
          this.sparkGraphics.fillStyle(0xffffff, 1);
          this.sparkGraphics.fillRect(pantographX - 1, py - 1, 3, 3);
          if (this.sparkTimer > 1.6) this.sparkTimer = 0;
        }
      }
    }

    // 6. Animated speed wind streaks
    if (this.speedStreaksGraphics && this.streakItems) {
      this.speedStreaksGraphics.clear();
      this.speedStreaksGraphics.lineStyle(1.5, 0xffffff, 0.45);
      for (const s of this.streakItems) {
        s.x -= s.speed * dt;
        if (s.x + s.len < 0) {
          s.x = this.W + Phaser.Math.Between(10, 60);
          s.y = Phaser.Math.Between(this.groundY - 30, this.groundY + 18);
          s.len = Phaser.Math.Between(24, 70);
        }
        this.speedStreaksGraphics.lineBetween(s.x, s.y, s.x + s.len, s.y);
      }
    }
  }

  arriveAtNextCity() {
    if (this._arrivalStarted || this._travelFinished) return;
    this._arrivalStarted = true;

    const { W, groundY, trainWidth, trainScale } = this;
    const destination = COURSE.stages[this.toIndex] || COURSE.stages[COURSE.stages.length - 1];

    this.cameras.main.fadeOut(320, 12, 22, 36);
    this.time.delayedCall(340, () => {
      this.children.list.slice().forEach((child) => {
        if (child !== this.cameras.main) child.destroy();
      });

      // Draw clean destination station with stationary rails & catenary
      this.drawStationBackdrop(destination, "arrival");

      const header = this.add.container(W / 2, 52).setDepth(30);
      const headerBg = this.add.rectangle(0, 0, 310, 38, 0x101c2b, 0.94)
        .setStrokeStyle(2, 0x82d82c, 1);
      const title = this.add.text(0, -7, `WILLKOMMEN IN ${destination.name}!`, {
        fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#82d82c"
      }).setOrigin(0.5);
      this.statusText = this.add.text(0, 8, `TIBA DI ${destination.station || destination.name + " HBF"}`, {
        fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold", color: "#ffffff"
      }).setOrigin(0.5);
      header.add([headerBg, title, this.statusText]);

      // Long train rolls in from the left over stationary station rails
      const railY = groundY + 18;
      const trainY = railY + 1;
      const trainKey = this.trainKey;
      const arrivalTrain = this.add.image(-trainWidth, trainY, trainKey)
        .setOrigin(0.5, 1).setScale(trainScale).setDepth(12);

      // Station master on destination platform welcoming passenger
      if (this.textures.exists("bhf-officer")) {
        this.add.image(W * 0.18, groundY, "bhf-officer")
          .setOrigin(0.5, 1).setDepth(8);
      }

      this.cameras.main.fadeIn(320, 12, 22, 36);
      retroAudio.playTrainWhistle?.();

      const targetTrainX = Math.round(W * 0.44);
      this.tweens.add({
        targets: arrivalTrain,
        x: targetTrainX,
        duration: 1600,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.passengerStepsOff(arrivalTrain);
        }
      });
    });
  }

  passengerStepsOff(arrivalTrain) {
    const { groundY, trainWidth } = this;
    const doorX = arrivalTrain.x - Math.round(trainWidth * 0.05);
    const destination = COURSE.stages[this.toIndex] || COURSE.stages[0];

    // 1. Step out onto the peron (keluar dulu ke peron)
    if (this.statusText) {
      this.statusText.setText(`TIBA DI ${destination.name} • TURUN KE PERON`);
    }
    const passenger = this.createPassenger(doorX, groundY - 14);
    passenger.setDepth(18).setAlpha(0).setScale(0.85);

    this.tweens.add({
      targets: passenger,
      y: groundY - 7,
      alpha: 1,
      scale: 1,
      duration: 250,
      onComplete: () => {
        // 2. Walk along the peron towards the Bahnhof entrance/doors
        if (this.statusText) {
          this.statusText.setText("BERJALAN DI PERON MENUJU PINTU KELUAR …");
        }
        this.setPassengerWalk(passenger, true, "left");

        const walkBounce = this.tweens.add({
          targets: passenger,
          y: groundY - 10,
          duration: 120,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });

        this.tweens.add({
          targets: passenger,
          x: 45, // station exit doors
          duration: 1300,
          ease: "Linear",
          onComplete: () => {
            walkBounce.stop();
            passenger.y = groundY - 7;
            this.setPassengerWalk(passenger, false, "left");
            if (this.statusText) {
              this.statusText.setText("KELUAR DARI BAHNHOF …");
            }

            // 3. Walk into the Bahnhof building doors (keluar dari Bahnhof)
            this.tweens.add({
              targets: passenger,
              alpha: 0,
              scale: 0.82,
              duration: 250,
              onComplete: () => {
                this.cameras.main.fadeOut(300, 0, 0, 0);
                this.time.delayedCall(340, () => {
                  this.finishTravel();
                });
              }
            });
          }
        });
      }
    });
  }

  finishTravel() {
    if (this._travelFinished) return;
    this._travelFinished = true;
    window.baiStageIndex = this.toIndex;
    try { sessionStorage.setItem("baiStageIndex", String(this.toIndex)); } catch {}
    if (this.toIndex >= COURSE.stages.length) {
      this.showJourneyComplete();
      return;
    }
    this.scene.start("WorldScene", { stageIndex: this.toIndex, isHostMode: this.isHostMode });
  }

  showJourneyComplete() {
    const { W, H } = this;
    const panel = this.add.container(W / 2, H / 2).setDepth(100);
    const frame = this.add.graphics();
    frame.fillStyle(0x111422, 0.96).fillRect(-190, -62, 380, 124);
    frame.lineStyle(3, 0xf7c83b, 1).strokeRect(-186, -58, 372, 116);
    panel.add([
      frame,
      this.add.text(0, -25, "REISE SELESAI", { fontFamily: "'Press Start 2P', monospace", fontSize: "18px", color: "#f7c83b", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5),
      this.add.text(0, 8, "HAMBURG HBF • ENDSTATION", { fontFamily: "Arial, sans-serif", fontSize: "13px", fontStyle: "bold", color: "#fff", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5),
      this.add.text(0, 35, "4 KOTA • REISE SELESAI", { fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#82d82c", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5)
    ]);
  }
}
