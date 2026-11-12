import Phaser from "phaser";
import { COURSE } from "../game/course.js";
import { DEFAULT_AVATAR } from "../avatar/defaultAvatar.js";

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
  }

  preload() {
    // Environment strips supplied for the train journey and destination station.
    const assets = [
      "journey-sunset", "journey-mountains", "journey-countryside",
      "tunnel-cave", "tunnel-industrial", "tunnel-rock",
      "underground-platform", "arrival-modern-station"
    ];
    for (const key of assets) {
      this.load.image(`travel-${key}`, `/assets/travel/${key}.png`);
    }
  }

  create() {
    const camera = this.cameras.main;
    const W = Math.max(320, Number(camera.width || this.scale.width || 480));
    const H = Math.max(180, Number(camera.height || this.scale.height || 270));
    this.W = W;
    this.H = H;
    camera.setScroll(0, 0);
    camera.setZoom(1);
    camera.setBackgroundColor("#91b8d0");

    const from = COURSE.stages[this.fromIndex] || COURSE.stages[0];
    const to = COURSE.stages[this.toIndex] || COURSE.stages[COURSE.stages.length - 1];
    this.groundY = H * 0.79;
    this.trainScale = Phaser.Math.Clamp(W / 850, 0.9, 1.5);
    this.trainWidth = 302 * this.trainScale;

    this.drawStationBackdrop(from);
    this.createHeader(from, to);
    this.createTrainAndBoardingSequence(from, to);
  }

  drawStationBackdrop(stage) {
    const { W, H, groundY } = this;
    const bg = this.add.graphics().setDepth(0);
    // Clean sky gradient; avoid the old floating grey skyline rectangles.
    bg.fillGradientStyle(0x83b8d7, 0x83b8d7, 0xc6dce5, 0xc6dce5, 1);
    bg.fillRect(0, 0, W, H);

    // Soft distant city silhouette: grounded rooftops with varied heights,
    // not isolated blocks. Kept low contrast so Bahnhof remains the focal point.
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
      const bh = h * this.trainScale * 0.72;
      skyline.fillRect(bx, skylineBase - bh, bw, bh);
      skyline.fillStyle(0x7896a5, 0.22);
      skyline.fillRect(bx - 3, skylineBase - bh - 4, bw + 6, 5);
      skyline.fillStyle(0x7896a5, 0.42);
    }

    // Station façade is set back from the train and reduced slightly so the
    // full building reads clearly without dominating the whole scene.
    if (this.textures.exists("bhf-station")) {
      this.add.image(W * 0.255, groundY - 8, "bhf-station")
        .setOrigin(0.5, 1).setScale(this.trainScale * 1.02).setDepth(3);
    }

    // Platform paving, tactile edge and ballast are separate horizontal layers.
    this.add.rectangle(W / 2, groundY + 5, W, 22, 0x89969a).setDepth(4);
    this.add.rectangle(W / 2, groundY - 7, W, 4, 0xd9cba9).setDepth(5);
    this.add.rectangle(W / 2, groundY + 18, W, 13, 0x53616a).setDepth(5);
    this.add.rectangle(W / 2, groundY + 25, W, 3, 0x343e49).setDepth(5);

    // Canopy and departure board sit behind the train so neither is obscured.
    if (this.textures.exists("bhf-platform-b")) {
      this.add.image(W * 0.76, groundY + 1, "bhf-platform-b")
        .setOrigin(0.5, 1).setScale(this.trainScale * 1.02).setDepth(6);
    }

    // Track sleepers, rails and yellow safety line are deliberately aligned.
    const rails = this.add.graphics().setDepth(7);
    const railY = groundY + 27 * this.trainScale;
    rails.fillStyle(0x4c5159, 1);
    for (let x = -8; x < W + 20; x += 24) {
      rails.fillRect(x, railY - 2, 15, 13);
    }
    rails.lineStyle(3, 0x424b55, 1);
    rails.lineBetween(0, railY, W, railY);
    rails.lineBetween(0, railY + 10, W, railY + 10);
    rails.lineStyle(1, 0xc3b38d, 0.95);
    rails.lineBetween(0, railY - 2, W, railY - 2);

    // Props use a consistent baseline and balanced spacing. Keep the board
    // above the canopy, clear of the train body and door.
    const props = [
      ["bhf-lamp-a", W * 0.075, 0.92],
      ["bhf-bench", W * 0.145, 1.02],
      ["bhf-ticket-machine", W * 0.385, 0.96],
      ["bhf-board-abfahrt", W * 0.765, 1.04],
      ["bhf-plant", W * 0.91, 1.02],
      ["bhf-lamp-b", W * 0.95, 0.92]
    ];
    for (const [key, x, scale] of props) {
      if (!this.textures.exists(key)) continue;
      const y = key === "bhf-board-abfahrt" ? groundY - 49 * this.trainScale : groundY - 1;
      this.add.image(x, y, key)
        .setOrigin(0.5, 1).setScale(this.trainScale * scale).setDepth(key === "bhf-board-abfahrt" ? 8 : 9);
    }

    this.add.rectangle(W / 2, H - 9, W, 18, 0x313b48).setDepth(10);
    this.add.text(W * 0.255, groundY - 126 * this.trainScale, stage.station || "BAHNHOF", {
      fontFamily: "'Press Start 2P', monospace", fontSize: `${Math.max(7, W / 120)}px`,
      color: "#fff3c5", backgroundColor: "#203449", padding: { x: 7, y: 5 },
      stroke: "#111", strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
  }

  createHeader(from, to) {
    const { W } = this;
    const panel = this.add.graphics().setDepth(30);
    panel.fillStyle(0x101c2b, 0.9);
    panel.fillRoundedRect(W * 0.2, 8, W * 0.6, 58, 8);
    panel.lineStyle(2, 0xf6c84a, 1);
    panel.strokeRoundedRect(W * 0.2, 8, W * 0.6, 58, 8);
    this.add.text(W / 2, 22, `${from.name}  →  ${to.name}`, {
      fontFamily: "'Press Start 2P', monospace", fontSize: `${Math.max(7, W / 145)}px`,
      color: "#ffdc72", stroke: "#000", strokeThickness: 3
    }).setOrigin(0.5).setDepth(31);
    this.statusText = this.add.text(W / 2, 47, "ZUG FÄHRT EIN …", {
      fontFamily: "Arial, sans-serif", fontSize: `${Math.max(12, W / 55)}px`,
      fontStyle: "bold", color: "#ffffff", stroke: "#182435", strokeThickness: 3
    }).setOrigin(0.5).setDepth(31);
  }

  createTrainAndBoardingSequence(from, to) {
    const { W, groundY, trainScale, trainWidth } = this;
    const railY = groundY + 20 * trainScale;
    const trainY = railY + 13 * trainScale;
    const trainKey = this.textures.exists("bhf-train") ? "bhf-train" : "bahnhof-train";
    this.train = this.add.image(-trainWidth, trainY, trainKey)
      .setOrigin(0.5, 1).setScale(trainScale).setDepth(12);

    // Sliding door panels are layered over the train's doorway during boarding.
    this.doorLeft = this.add.rectangle(0, trainY - 25 * trainScale, 10 * trainScale, 38 * trainScale, 0x9ec5d4, 1)
      .setStrokeStyle(2, 0x253849).setDepth(13).setVisible(false);
    this.doorRight = this.add.rectangle(0, trainY - 25 * trainScale, 10 * trainScale, 38 * trainScale, 0x9ec5d4, 1)
      .setStrokeStyle(2, 0x253849).setDepth(13).setVisible(false);

    this.passenger = this.createPassenger(W * 0.22, groundY - 7);
    this.passenger.setDepth(18);

    this.tweens.add({
      targets: this.train, x: W * 0.64, duration: 1700, ease: "Cubic.easeOut",
      onComplete: () => this.openDoorsAndBoard()
    });
  }

  createPassenger(x, y) {
    const container = this.add.container(x, y).setDepth(18);
    const scale = this.trainScale * 1.18;
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
    }
    if (!container.list.length && this.textures.exists("hero-idle")) {
      container.add(this.add.image(0, 0, "hero-idle").setScale(0.75));
    }
    return container;
  }

  openDoorsAndBoard() {
    const { train, trainScale, trainWidth, W } = this;
    this.statusText.setText("PINTU TERBUKA • SILAKAN NAIK");
    const doorX = train.x + trainWidth * 0.28;
    this.doorLeft.setPosition(doorX - 5 * trainScale, train.y - 25 * trainScale).setVisible(true);
    this.doorRight.setPosition(doorX + 5 * trainScale, train.y - 25 * trainScale).setVisible(true);
    this.tweens.add({
      targets: this.doorLeft, x: doorX - 15 * trainScale, duration: 380, ease: "Quad.easeOut"
    });
    this.tweens.add({
      targets: this.doorRight, x: doorX + 15 * trainScale, duration: 380, ease: "Quad.easeOut",
      onComplete: () => this.boardPassenger(doorX)
    });
  }

  boardPassenger(doorX) {
    this.statusText.setText("PENUMPANG SEDANG NAIK …");
    this.tweens.add({
      targets: this.passenger,
      x: doorX,
      y: this.passenger.y - 2,
      duration: 900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.tweens.add({ targets: this.passenger, alpha: 0, duration: 260 });
        this.closeDoorsAndDepart();
      }
    });
  }

  closeDoorsAndDepart() {
    const { train, trainScale, trainWidth, W } = this;
    this.statusText.setText("PINTU TERTUTUP • BERANGKAT!");
    const doorX = this.train.x + this.trainWidth * 0.28;
    this.doorLeft.setAlpha(1).setPosition(doorX - 15 * trainScale, this.train.y - 25 * trainScale).setVisible(true);
    this.doorRight.setAlpha(1).setPosition(doorX + 15 * trainScale, this.train.y - 25 * trainScale).setVisible(true);
    this.tweens.add({ targets: this.doorLeft, x: doorX, duration: 320, ease: "Quad.easeIn" });
    this.tweens.add({ targets: this.doorRight, x: doorX, duration: 320, ease: "Quad.easeIn", onComplete: () => {
      this.doorLeft.setVisible(false);
      this.doorRight.setVisible(false);
      this.startJourneyMotion();
    }});
  }

  startJourneyMotion() {
    const { W, H, train, trainWidth, trainScale } = this;
    this.statusText.setText("ZUG FÄHRT • DALAM PERJALANAN …");
    this.createMovingScenery();
    const motion = this.add.graphics().setDepth(22);
    motion.fillStyle(0x101c2b, 0.88);
    motion.fillRoundedRect(W * 0.24, H * 0.72, W * 0.52, 28, 5);
    this.add.text(W / 2, H * 0.72 + 14, "NÄCHSTER HALT: " + (COURSE.stages[this.toIndex]?.station || "ENDSTATION"), {
      fontFamily: "'Press Start 2P', monospace", fontSize: `${Math.max(6, W / 180)}px`,
      color: "#f7d36c"
    }).setOrigin(0.5).setDepth(23);

    this.tweens.add({
      targets: train, x: W + trainWidth, duration: 3600, ease: "Cubic.easeIn",
      onComplete: () => this.arriveAtNextCity()
    });
    this.sceneryItems.forEach((item, index) => {
      this.tweens.add({
        targets: item,
        x: item.x - W * (index % 2 ? 2.15 : 1.75),
        duration: 3600,
        ease: "Linear"
      });
    });
  }

  createMovingScenery() {
    const { W, H } = this;
    this.sceneryItems = [];

    // Exactly ONE panorama is selected for the destination stage.
    // The supplied sprite sheets contain several separate environments;
    // stacking all strips caused the checkerboard-like overlapping scene.
    const stagePanoramas = [
      "travel-journey-sunset",       // Stage 1: sunset route
      "travel-journey-mountains",    // Stage 2: mountain route
      "travel-journey-countryside", // Stage 3: countryside route
      "travel-tunnel-cave"           // Stage 4: cave/tunnel route
    ];
    const stageIndex = Phaser.Math.Clamp(Number(this.toIndex) || 0, 0, stagePanoramas.length - 1);
    const selectedKey = stagePanoramas[stageIndex];

    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x283653, 0x283653, 0xe49a72, 0xe49a72, 1);
    sky.fillRect(0, 0, W, H);

    if (this.textures.exists(selectedKey)) {
      const source = this.textures.get(selectedKey).getSourceImage();
      const panorama = this.add.tileSprite(0, H * 0.17, W, H * 0.61, selectedKey)
        .setOrigin(0, 0)
        .setDepth(2);
      // Fit one complete panorama segment across the gameplay viewport.
      panorama.tileScaleX = (W * 1.18) / Math.max(1, source.width);
      panorama.tileScaleY = (H * 0.61) / Math.max(1, source.height);
      this.sceneryItems.push(panorama);
    }

    // Foreground track is independent of the selected background.
    const trackY = H * 0.84;
    const track = this.add.graphics().setDepth(10);
    track.fillStyle(0x343e49, 1);
    track.fillRect(0, trackY, W, H - trackY);
    track.lineStyle(4, 0x8d9298, 1);
    track.lineBetween(0, trackY + 8, W, trackY + 8);
    track.lineBetween(0, trackY + 30, W, trackY + 30);
    track.fillStyle(0x9a8b70, 1);
    for (let x = 0; x < W + 20; x += 26) track.fillRect(x, trackY + 5, 15, 8);
    this.tweens.add({
      targets: track,
      x: -W * 0.22,
      duration: 3600,
      ease: "Linear"
    });

    // Move only the one selected panorama; never layer other stage assets on top.
    for (const panorama of this.sceneryItems) {
      this.tweens.add({
        targets: panorama,
        tilePositionX: W * 1.18,
        duration: 3600,
        ease: "Linear"
      });
    }

    this.statusText.setText("ZUG FÄHRT • " + (COURSE.stages[this.toIndex]?.name || "NÄCHSTE STADT"));
  }

  arriveAtNextCity() {
    if (this._arrivalStarted || this._travelFinished) return;
    this._arrivalStarted = true;

    const { W, H, groundY, train, trainWidth, trainScale } = this;
    const destination = COURSE.stages[this.toIndex] || COURSE.stages[COURSE.stages.length - 1];
    this.statusText.setText("ZIELBAHNHOF WIRD ERREICHT …");

    // Briefly fade the moving countryside, then reveal a stationary destination
    // Bahnhof. The station is fixed; only the train and passenger animate.
    this.cameras.main.fadeOut(360, 12, 22, 36);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.children.list.forEach((child) => {
        if (child !== this.cameras.main) child.setVisible?.(false);
      });

      const arrivalBg = this.add.graphics().setDepth(0);
      arrivalBg.fillGradientStyle(0x83b8d7, 0x83b8d7, 0xc6dce5, 0xc6dce5, 1);
      arrivalBg.fillRect(0, 0, W, H);
      arrivalBg.fillStyle(0x7896a5, 0.35);
      for (let i = 0; i < 10; i++) {
        const bw = W * 0.07;
        const bh = 24 + (i * 17 % 45);
        arrivalBg.fillRect(i * W / 9, groundY - 75 - bh, bw, bh);
      }

      const arrivalStageAssets = [
        "travel-underground-platform",
        "travel-tunnel-industrial",
        "travel-tunnel-rock",
        "travel-arrival-modern-station"
      ];
      const arrivalKey = arrivalStageAssets[
        Phaser.Math.Clamp(Number(this.toIndex) || 0, 0, arrivalStageAssets.length - 1)
      ];
      if (this.textures.exists(arrivalKey)) {
        const stationArt = this.add.image(W / 2, groundY + 2, arrivalKey)
          .setOrigin(0.5, 1)
          .setDisplaySize(W, H * 0.48)
          .setDepth(2);
        stationArt.setAlpha(0.98);
      } else if (this.textures.exists("bhf-station")) {
        this.add.image(W * 0.27, groundY - 7, "bhf-station")
          .setOrigin(0.5, 1).setScale(trainScale * 0.92).setDepth(3);
      }

      this.add.rectangle(W / 2, groundY + 5, W, 22, 0x89969a).setDepth(4);
      this.add.rectangle(W / 2, groundY - 7, W, 4, 0xd9cba9).setDepth(5);
      this.add.rectangle(W / 2, groundY + 18, W, 13, 0x53616a).setDepth(5);
      const rail = this.add.graphics().setDepth(7);
      rail.fillStyle(0x4c5159, 1);
      for (let x = -8; x < W + 20; x += 24) rail.fillRect(x, groundY + 25, 15, 12);
      rail.lineStyle(3, 0x424b55, 1);
      rail.lineBetween(0, groundY + 27, W, groundY + 27);
      rail.lineBetween(0, groundY + 37, W, groundY + 37);

      this.add.text(W * 0.27, groundY - 122 * trainScale, destination.station || destination.name + " HBF", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: `${Math.max(7, W / 125)}px`,
        color: "#fff3c5", backgroundColor: "#203449",
        padding: { x: 7, y: 5 }, stroke: "#111", strokeThickness: 3
      }).setOrigin(0.5).setDepth(11);

      this.statusText.setText("ANGEKOMMEN • " + (destination.name || "ZIEL"));
      this.train.setVisible(true).setPosition(-trainWidth, groundY + 40 * trainScale);
      this.train.setDepth(12);

      this.cameras.main.fadeIn(380, 12, 22, 36);
      this.tweens.add({
        targets: this.train,
        x: W * 0.64,
        duration: 1550,
        ease: "Cubic.easeOut",
        onComplete: () => this.openArrivalDoors()
      });
    });
  }

  openArrivalDoors() {
    const { train, trainScale, trainWidth } = this;
    const doorX = train.x + trainWidth * 0.28;
    const doorY = train.y - 25 * trainScale;
    this.statusText.setText("TÜR ÖFFNET SICH • BITTE AUSSTEIGEN");

    this.doorLeft.setVisible(true).setAlpha(1).setPosition(doorX - 5 * trainScale, doorY);
    this.doorRight.setVisible(true).setAlpha(1).setPosition(doorX + 5 * trainScale, doorY);
    this.tweens.add({
      targets: this.doorLeft,
      x: doorX - 15 * trainScale,
      duration: 350,
      ease: "Quad.easeOut"
    });
    this.tweens.add({
      targets: this.doorRight,
      x: doorX + 15 * trainScale,
      duration: 350,
      ease: "Quad.easeOut",
      onComplete: () => this.passengerStepsOff(doorX)
    });
  }

  passengerStepsOff(doorX) {
    const { groundY, trainScale } = this;
    this.statusText.setText("BITTE AUSSTEIGEN …");

    const passenger = this.createPassenger(doorX, groundY - 7);
    passenger.setDepth(18).setAlpha(0);
    this.tweens.add({
      targets: passenger,
      alpha: 1,
      duration: 220,
      onComplete: () => {
        this.tweens.add({
          targets: passenger,
          x: doorX + 62 * trainScale,
          y: groundY - 7,
          duration: 760,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.statusText.setText("WILLKOMMEN IN " + (COURSE.stages[this.toIndex]?.name || "DER NEUEN STADT"));
            this.doorLeft.setVisible(false);
            this.doorRight.setVisible(false);
            this.time.delayedCall(650, () => this.finishTravel());
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
