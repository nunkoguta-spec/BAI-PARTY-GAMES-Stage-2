import Phaser from "phaser";
import { COURSE } from "../game/course.js";
import { backdropKey, backdropUrl } from "../game/seasons.js";

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

    // Stage 1 city backdrop: custom panoramic München town-square scene.
    this.load.image("city-munich-gameplay", `${ASSET}/backgrounds/cities/munich-bg-v2.png`);
    // Legacy city backdrops retained for the remaining chapters.
    this.load.image("city-munich-custom", `${ASSET}/backgrounds/cities/munich-custom.svg`);
    this.load.image("city-frankfurt-custom", `${ASSET}/backgrounds/cities/frankfurt-bg-v2.png`);
    this.load.image("city-berlin-custom", `${ASSET}/backgrounds/cities/berlin-bg-v2.png`);
    this.load.image("city-hamburg-custom", `${ASSET}/backgrounds/cities/hamburg-bg-v2.png`);
    // Stage traps (src/game/traps.js). Sheets are made by tools/make-trap-sprites.py.
    this.load.image("trap-spikes", `${ASSET}/traps/spikes.png`);
    this.load.spritesheet("trap-pop", `${ASSET}/traps/pop-spikes.png`, { frameWidth: 32, frameHeight: 20 });
    this.load.spritesheet("trap-barrel", `${ASSET}/traps/barrel.png`, { frameWidth: 26, frameHeight: 26 });
    this.load.image("trap-sign", `${ASSET}/traps/sign.png`);
    // "Not ordinary" traps: tram, rails, signal, icicles, canopy, gull, wrecking ball, censer.
    this.load.image("trap-tram", `${ASSET}/traps/tram.png`);
    this.load.image("trap-rails", `${ASSET}/traps/rails.png`);
    this.load.spritesheet("trap-signal", `${ASSET}/traps/signal.png`, { frameWidth: 14, frameHeight: 40 });
    this.load.spritesheet("trap-icicle", `${ASSET}/traps/icicle.png`, { frameWidth: 48, frameHeight: 30 });
    this.load.image("trap-canopy", `${ASSET}/traps/canopy.png`);
    this.load.spritesheet("trap-gull", `${ASSET}/traps/gull.png`, { frameWidth: 30, frameHeight: 22 });
    this.load.image("trap-ball", `${ASSET}/traps/ball.png`);
    this.load.image("trap-censer", `${ASSET}/traps/censer.png`);

    // Seasonal panoramas: one per stage (season is set per stage in course.js).
    for (const stage of COURSE.stages) {
      this.load.image(backdropKey(stage), backdropUrl(ASSET, stage));
    }
    // Keep the previous Munich asset as a fallback for older builds.
    this.load.image("munich-city-bg", `${ASSET}/backgrounds/cities/munich-marienplatz.png`);

    // BAI asset pack (extracted from the supplied collage by tools/extract-pack.py)
    for (const name of ["idle", "run", "jump", "victory", "hit"]) this.load.image(`hero-${name}`, `${ASSET}/pack/mascot-${name}.png`);
    for (const name of ["tower", "building", "roof", "lamp", "stall", "tree", "bush", "train", "cobble"]) this.load.image(`pack-${name}`, `${ASSET}/pack/${name}.png`);

    // Germany City World seasonal ambient animation strips (8 frames, 32x32 each).
    const cityAnimationAssets = [
      ["hamburg-water", "Hamburg_Summer/Animations/Water_Shimmer_32x32_8frames.png"],
      ["hamburg-seagull", "Hamburg_Summer/Animations/Seagull_Flight_32x32_8frames.png"],
      ["hamburg-sparkle", "Hamburg_Summer/Animations/Sun_Sparkle_32x32_8frames.png"],
      ["hamburg-smoke", "Hamburg_Summer/Animations/Harbor_Smoke_32x32_8frames.png"],
      ["berlin-snow", "Berlin_Winter/Animations/Falling_Snow_32x32_8frames.png"],
      ["berlin-sparkle", "Berlin_Winter/Animations/Snow_Sparkle_32x32_8frames.png"],
      ["berlin-smoke", "Berlin_Winter/Animations/Chimney_Smoke_32x32_8frames.png"],
      ["berlin-breath", "Berlin_Winter/Animations/Winter_Breath_32x32_8frames.png"],
      ["munich-leaves", "Munich_Autumn/Animations/Falling_Leaves_32x32_8frames.png"],
      ["munich-swirl-leaves", "Munich_Autumn/Animations/Swirling_Leaves_32x32_8frames.png"],
      ["munich-steam", "Munich_Autumn/Animations/Cafe_Steam_32x32_8frames.png"],
      ["munich-sparkle", "Munich_Autumn/Animations/Warm_Sparkle_32x32_8frames.png"],
      ["cologne-petals", "Cologne_Spring/Animations/Cherry_Blossom_Petals_32x32_8frames.png"],
      ["cologne-butterflies", "Cologne_Spring/Animations/Butterflies_32x32_8frames.png"],
      ["cologne-river", "Cologne_Spring/Animations/River_Shimmer_32x32_8frames.png"],
      ["cologne-bloom", "Cologne_Spring/Animations/Bloom_Sparkle_32x32_8frames.png"],
      ["frankfurt-water", "Frankfurt_Summer/Animations/Water_Shimmer_32x32_8frames.png"],
      ["frankfurt-fountain", "Frankfurt_Summer/Animations/Fountain_Splash_32x32_8frames.png"],
      ["frankfurt-birds", "Frankfurt_Summer/Animations/Bird_Flight_32x32_8frames.png"],
      ["frankfurt-haze", "Frankfurt_Summer/Animations/Heat_Haze_32x32_8frames.png"]
    ];
    for (const [key, file] of cityAnimationAssets) {
      this.load.spritesheet(key, `${ASSET}/germany-city-world/${file}`, { frameWidth: 32, frameHeight: 32 });
    }

    // Enemy pose assets: each PNG is a separate state image (not a multi-frame sheet).
    for (const enemy of ["muenchen", "frankfurt", "berlin", "hamburg", "boss_tycoon"]) {
      const states = enemy === "boss_tycoon"
        ? ["idle", "walk", "attack", "special", "hit", "defeat"]
        : ["idle", "walk", "attack", "hit", "defeat"];
      for (const state of states) {
        this.load.image(`enemy-${enemy}-${state}`, `${ASSET}/enemy-asset-pack/pack/${enemy}/${state}.png`);
      }
      this.load.image(`enemy-${enemy}-portrait`, `${ASSET}/enemy-asset-pack/pack/${enemy}/portrait.png`);
    }

    // Character and enemy HP bar assets supplied in hp_enemy_asset_pack.
    for (const [key, file] of [
      ["hp-player-red", "red_full.png"],
      ["hp-player-half", "red_half.png"],
      ["hp-player-low", "red_low.png"],
      ["hp-enemy-red", "enemy_red_full.png"],
      ["hp-enemy-half", "enemy_red_half.png"]
    ]) {
      this.load.image(key, `${ASSET}/hp-enemy-asset-pack/06_Individual_HP_Bars/${file}`);
    }

    // Bahnhof / train travel assets.
    const bahnhof = `${ASSET}/bahnhof`;
    for (const [key, file] of [
      ["bahnhof-clean-scene", "bahnhof-clean-scene.png"],
      ["bahnhof-train-clean", "train-clean.png"],
      ["bahnhof-train", "train.png"],
      ["bahnhof-platform", "platform-path.png"],
      ["bahnhof-road", "station-road.png"],
      ["bahnhof-clock", "clock-tower.png"],
      ["bahnhof-wing", "station-wing.png"],
      ["bahnhof-main", "station-main.png"],
      ["bahnhof-props", "station-props.png"],
      ["bahnhof-trees", "trees-greenery.png"],
      ["bahnhof-sign", "bahnhof-sign.png"]
    ]) {
      this.load.image(key, `${bahnhof}/${file}`);
    }
    // Individually extracted, transparent side-view Bahnhof sprites (Bahnhof Asset Pack v2 sheet).
    for (const name of [
      "station", "train", "train-long", "carriage", "track-tile", "platform-a", "platform-b",
      "board-abfahrt", "board-ankunft", "direction-sign", "ticket-machine",
      "bench", "trash", "fence", "lamp-a", "lamp-b", "clocks", "kiosk",
      "stairs", "officer", "traveler", "warning-sign", "plant", "crates"
    ]) {
      this.load.image(`bhf-${name}`, `${bahnhof}/sprites/${name}.png`);
    }

    // Legacy mountain assets remain loaded for fallback/other stages.
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

    // Punch (enemy battle attack): same naming scheme as hurt/interact.
    const punch = `${ASSET}/avatar/Punch`;
    for (const dir of ["Left", "Right"]) {
      const lower = dir.toLowerCase();
      for (const [name, folder, file] of [
        ["body", "Character", "Character"], ["bottoms", "Clothing", "Clothing_Bottoms"],
        ["shoes", "Clothing", "Clothing_Shoes"], ["top", "Clothing", "Clothing_Tops"],
        ["eyes", "Eyes", "Eyes"], ["hair", "Hair", "Hair"]
      ]) {
        this.load.spritesheet(`avatar-${name}-punch-${lower}`, `${punch}/${folder}/${file}_Punch_${dir}-Sheet.png`, { frameWidth: FRAME, frameHeight: FRAME });
      }
    }

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

    // Gear layers (hat / glasses / weapon): same 32x32 sheet format as the avatar layers above.
    // Built by tools/make-gear-sheets.py from the pixel-heroes pack; row 0 of every sheet is empty.
    const gear = `${ASSET}/avatar-gear`;
    const gearSheets = [["idle", "Idle", "Front"], ["walk", "Walk", "Left"], ["walk", "Walk", "Right"], ["jump", "Jump", "Left"], ["jump", "Jump", "Right"],
      ["interact", "Interact", "Left"], ["interact", "Interact", "Right"], ["punch", "Punch", "Left"], ["punch", "Punch", "Right"],
      ["hurt", "Hurt", "Left"], ["hurt", "Hurt", "Right"]];
    for (const part of [["Hat", "hat"], ["Glasses", "glasses"], ["Weapon", "weapon"]]) {
      for (const [pose, anim, dir] of gearSheets) {
        const key = pose === "idle" ? `avatar-${part[1]}` : `avatar-${part[1]}-${pose}-${dir.toLowerCase()}`;
        this.load.spritesheet(key, `${gear}/${part[0]}/${anim}/${part[0]}_${anim}_${dir}-Sheet.png`, { frameWidth: FRAME, frameHeight: FRAME });
      }
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
