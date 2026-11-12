#!/usr/bin/env node
import fs from "node:fs";

const world = fs.readFileSync(new URL("../src/scenes/WorldScene.js", import.meta.url), "utf8");
const course = fs.readFileSync(new URL("../src/game/course.js", import.meta.url), "utf8");

const checks = [
  ["legacy Ground collision removed", !world.includes("setCollisionBetween")],
  ["legacy face collision removed", !world.includes("calculateFacesWithin")],
  ["player uses continuous ground collider", world.includes("this.physics.add.collider(this.player, this.groundCollider)")],
  ["question box definitions empty", course.includes("questionBoxes: Object.freeze([])")],
  ["question box runtime array empty", world.includes("this.questionBoxes = [];")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok) failed++;
}
process.exitCode = failed ? 1 : 0;
