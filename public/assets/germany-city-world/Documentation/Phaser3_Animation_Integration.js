// Phaser 3 example: load and play one 8-frame environmental animation.
// Each sheet is a horizontal strip of 8 frames, each frame is 32x32 px.
//
// preload():
// this.load.spritesheet('hamburg-water',
//   'GERMANY_CITY_WORLD/Hamburg_Summer/Animations/Water_Shimmer_32x32_8frames.png',
//   { frameWidth: 32, frameHeight: 32 });
//
// create():
// this.anims.create({
//   key: 'hamburg-water-loop',
//   frames: this.anims.generateFrameNumbers('hamburg-water', { start: 0, end: 7 }),
//   frameRate: 8,
//   repeat: -1
// });
// this.add.sprite(160, 220, 'hamburg-water').play('hamburg-water-loop');
//
// For ambient particles (snow, petals, leaves), spawn the corresponding
// sprites at varied positions and velocities; use a Phaser ParticleEmitter
// for production particle behavior. These supplied strips are small looping
// pixel-art animation elements, not a complete weather simulation.
