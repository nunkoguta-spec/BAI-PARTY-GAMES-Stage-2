import "./style.css";
import Phaser from "phaser";
import { THEME } from "./theme.js";
import { BootScene } from "./scenes/BootScene.js";
import { WorldScene } from "./scenes/WorldScene.js";

const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;
const shell = document.getElementById("stage-shell");

// Ukuran parent selalu kelipatan bulat dari resolusi dasar 480x270.
// Phaser FIT kemudian mengisi parent dengan faktor skala integer.
let game;
function fitIntegerScale() {
  const factor = Math.max(
    1,
    Math.floor(Math.min(
      window.innerWidth / GAME_WIDTH,
      window.innerHeight / GAME_HEIGHT
    ))
  );

  shell.style.width = `${GAME_WIDTH * factor}px`;
  shell.style.height = `${GAME_HEIGHT * factor}px`;
  if (game) game.scale.refresh();
}

// Ukuran kotak ditetapkan SEBELUM Phaser dibuat agar skala FIT dihitung benar.
fitIntegerScale();

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
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
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: [BootScene, WorldScene]
};

game = new Phaser.Game(config);
window.addEventListener("resize", fitIntegerScale, { passive: true });

