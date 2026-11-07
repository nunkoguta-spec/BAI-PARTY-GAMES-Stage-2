import Phaser from "phaser";

const ASSET = "/assets";
const FRAME = 32;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.tilemapTiledJSON("level-01", "/maps/level-01.json");

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
      "tree-1", "tree-2", "tree-3", "house",
      "flower-1", "flower-2", "flower-3",
      "flower-4", "flower-5",
      "grass-1", "grass-2", "grass-3", "grass-4",
      "rock-1", "rock-2", "rock-3",
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

    // Laporan jika ada aset yang gagal dimuat.
    this.load.on("loaderror", (file) => {
      console.error(
        `[BAI PARTY GAMES] Gagal memuat aset: ${file.key}`,
        file.src
      );
    });
  }

  create() {
    this.scene.start("WorldScene");
  }
}