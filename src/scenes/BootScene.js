import Phaser from "phaser";

const ASSET = "/assets";
const FRAME = 32;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.tilemapTiledJSON("level-01", "/maps/level-01.json");

    // Question Box Stage 4
    this.load.image("question-box", "/assets/question-box-32x32.png");

    this.load.image(
      "mountains-tiles",
      `${ASSET}/tiles/mountains-tiles-bright.png`
    );

    // Background.
    const bg = `${ASSET}/backgrounds/mountains`;

    this.load.image("bg-sky", `${bg}/sky-bright.png`);
    this.load.image("bg-snow-peaks", `${bg}/mountains-snow-blue.png`);
    this.load.image("bg-hills", `${bg}/hills-green.png`);
    this.load.image("bg-forest", `${bg}/forest-green.png`);

    // Awan.
    for (const n of [1, 2, 3, 5, 6]) {
      this.load.image(
        `deco-cloud-${n}`,
        `${ASSET}/decorations/mountains/cloud-${n}.png`
      );
    }

    // Dekorasi.
    const decorationFiles = [
      "tree-1", "tree-2", "tree-3", "house", "wooden-shed", "laundry", "standing-torch",
      "flower-1", "flower-2", "flower-3",
      "flower-4", "flower-5",
      "grass-1", "grass-2", "grass-3", "grass-4",
      "rock-1", "rock-2", "rock-3", "rock-4", "rock-5",
      "stacked-rocks", "fence-1", "fence-2", "barrel"
    ];

    for (const key of decorationFiles) {
      this.load.image(
        `deco-${key}`,
        `${ASSET}/decorations/mountains/${key}.png`
      );
    }

    // Avatar idle.
    const idle = `${ASSET}/avatar/Idle`;

    const idleSheets = [
      ["avatar-body", `${idle}/Character/Character_Idle_Front-Sheet.png`],
      ["avatar-bottoms", `${idle}/Clothing/Clothing_Bottoms_Idle_Front-Sheet.png`],
      ["avatar-shoes", `${idle}/Clothing/Clothing_Shoes_Idle_Front-Sheet.png`],
      ["avatar-top", `${idle}/Clothing/Clothing_Tops_Idle_Front-Sheet.png`],
      ["avatar-eyes", `${idle}/Eyes/Eyes_Idle_Front-Sheet.png`],
      ["avatar-hair", `${idle}/Hair/Hair_Idle_Front-Sheet.png`]
    ];

    for (const [key, url] of idleSheets) {
      this.load.spritesheet(key, url, {
        frameWidth: FRAME,
        frameHeight: FRAME
      });
    }

    // Avatar berjalan ke kiri dan kanan.
    const walk = `${ASSET}/avatar/Walk`;

    const walkSheets = [
      ["avatar-body-walk-left", `${walk}/Character/Character_Walk_Left-Sheet.png`],
      ["avatar-body-walk-right", `${walk}/Character/Character_Walk_Right-Sheet.png`],

      ["avatar-bottoms-walk-left", `${walk}/Clothing/Clothing_Bottoms_Walk_Left-Sheet.png`],
      ["avatar-bottoms-walk-right", `${walk}/Clothing/Clothing_Bottoms_Walk_Right-Sheet.png`],

      ["avatar-shoes-walk-left", `${walk}/Clothing/Clothing_Shoes_Walk_Left-Sheet.png`],
      ["avatar-shoes-walk-right", `${walk}/Clothing/Clothing_Shoes_Walk_Right-Sheet.png`],

      ["avatar-top-walk-left", `${walk}/Clothing/Clothing_Tops_Walk_Left-Sheet.png`],
      ["avatar-top-walk-right", `${walk}/Clothing/Clothing_Tops_Walk_Right-Sheet.png`],

      ["avatar-eyes-walk-left", `${walk}/Eyes/Eyes_Walk_Left-Sheet.png`],
      ["avatar-eyes-walk-right", `${walk}/Eyes/Eyes_Walk_Right-Sheet.png`],

      ["avatar-hair-walk-left", `${walk}/Hair/Hair_Walk_Left-Sheet.png`],
      ["avatar-hair-walk-right", `${walk}/Hair/Hair_Walk_Right-Sheet.png`]
    ];

    for (const [key, url] of walkSheets) {
      this.load.spritesheet(key, url, {
        frameWidth: FRAME,
        frameHeight: FRAME
      });
    }

    const jump = `${ASSET}/avatar/Jump`;
    for (const [key, url] of [
      ["avatar-body-jump-left", `${jump}/Character/Character_Jump_Left-Sheet.png`],
      ["avatar-body-jump-right", `${jump}/Character/Character_Jump_Right-Sheet.png`],
      ["avatar-bottoms-jump-left", `${jump}/Clothing/Clothing_Bottoms_Jump_Left-Sheet.png`],
      ["avatar-bottoms-jump-right", `${jump}/Clothing/Clothing_Bottoms_Jump_Right-Sheet.png`],
      ["avatar-shoes-jump-left", `${jump}/Clothing/Clothing_Shoes_Jump_Left-Sheet.png`],
      ["avatar-shoes-jump-right", `${jump}/Clothing/Clothing_Shoes_Jump_Right-Sheet.png`],
      ["avatar-top-jump-left", `${jump}/Clothing/Clothing_Tops_Jump_Left-Sheet.png`],
      ["avatar-top-jump-right", `${jump}/Clothing/Clothing_Tops_Jump_Right-Sheet.png`],
      ["avatar-eyes-jump-left", `${jump}/Eyes/Eyes_Jump_Left-Sheet.png`],
      ["avatar-eyes-jump-right", `${jump}/Eyes/Eyes_Jump_Right-Sheet.png`],
      ["avatar-hair-jump-left", `${jump}/Hair/Hair_Jump_Left-Sheet.png`],
      ["avatar-hair-jump-right", `${jump}/Hair/Hair_Jump_Right-Sheet.png`]
    ]) this.load.spritesheet(key, url, { frameWidth: FRAME, frameHeight: FRAME });

    const interact = `${ASSET}/avatar/Interact`;
    for (const [key, url] of [
      ["avatar-body-interact-left", `${interact}/Character/Character_Interact_Left-Sheet.png`],
      ["avatar-body-interact-right", `${interact}/Character/Character_Interact_Right-Sheet.png`],
      ["avatar-bottoms-interact-left", `${interact}/Clothing/Clothing_Bottoms_Interact_Left-Sheet.png`],
      ["avatar-bottoms-interact-right", `${interact}/Clothing/Clothing_Bottoms_Interact_Right-Sheet.png`],
      ["avatar-shoes-interact-left", `${interact}/Clothing/Clothing_Shoes_Interact_Left-Sheet.png`],
      ["avatar-shoes-interact-right", `${interact}/Clothing/Clothing_Shoes_Interact_Right-Sheet.png`],
      ["avatar-top-interact-left", `${interact}/Clothing/Clothing_Tops_Interact_Left-Sheet.png`],
      ["avatar-top-interact-right", `${interact}/Clothing/Clothing_Tops_Interact_Right-Sheet.png`],
      ["avatar-eyes-interact-left", `${interact}/Eyes/Eyes_Interact_Left-Sheet.png`],
      ["avatar-eyes-interact-right", `${interact}/Eyes/Eyes_Interact_Right-Sheet.png`],
      ["avatar-hair-interact-left", `${interact}/Hair/Hair_Interact_Left-Sheet.png`],
      ["avatar-hair-interact-right", `${interact}/Hair/Hair_Interact_Right-Sheet.png`]
    ]) this.load.spritesheet(key, url, { frameWidth: FRAME, frameHeight: FRAME });

    const hurt = `${ASSET}/avatar/Hurt`;
    for (const [key, url] of [
      ["avatar-body-hurt-left", `${hurt}/Character/Character_Hurt_Left-Sheet.png`],
      ["avatar-body-hurt-right", `${hurt}/Character/Character_Hurt_Right-Sheet.png`],
      ["avatar-bottoms-hurt-left", `${hurt}/Clothing/Clothing_Bottoms_Hurt_Left-Sheet.png`],
      ["avatar-bottoms-hurt-right", `${hurt}/Clothing/Clothing_Bottoms_Hurt_Right-Sheet.png`],
      ["avatar-shoes-hurt-left", `${hurt}/Clothing/Clothing_Shoes_Hurt_Left-Sheet.png`],
      ["avatar-shoes-hurt-right", `${hurt}/Clothing/Clothing_Shoes_Hurt_Right-Sheet.png`],
      ["avatar-top-hurt-left", `${hurt}/Clothing/Clothing_Tops_Hurt_Left-Sheet.png`],
      ["avatar-top-hurt-right", `${hurt}/Clothing/Clothing_Tops_Hurt_Right-Sheet.png`],
      ["avatar-eyes-hurt-left", `${hurt}/Eyes/Eyes_Hurt_Left-Sheet.png`],
      ["avatar-eyes-hurt-right", `${hurt}/Eyes/Eyes_Hurt_Right-Sheet.png`],
      ["avatar-hair-hurt-left", `${hurt}/Hair/Hair_Hurt_Left-Sheet.png`],
      ["avatar-hair-hurt-right", `${hurt}/Hair/Hair_Hurt_Right-Sheet.png`]
    ]) this.load.spritesheet(key, url, { frameWidth: FRAME, frameHeight: FRAME });

    // Laporan jika ada aset yang gagal dimuat.
    this.load.on("loaderror", (file) => {
      console.error(
        `[BAI PARTY GAMES] Gagal memuat aset: ${file.key}`,
        file.src
      );
    });
  }

  create() {
    window.deutschStartWorld = () => {
      if (this.scene.isActive("WorldScene")) return;
      this.scene.start("WorldScene");
    };

    this.game.events.on("step", () => {
      if (!window.deutschWorldError) return;
      const error = window.deutschWorldError;
      window.deutschWorldError = null;
      window.dispatchEvent(new CustomEvent("deutsch:world-error", { detail: error }));
    });

    window.dispatchEvent(new Event("deutsch:boot-ready"));
  }
}
