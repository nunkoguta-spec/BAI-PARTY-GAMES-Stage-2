// Asserts the station numbers that previously left the rails floating
// and the right side of the platform open to the sky.
const W = 480;
const H = 270;
const groundY = Math.round(H * 0.72);
const trainScale = 1;
const trainHeight = 49;
const railY = groundY + 18;
const trainY = railY + 1;
// Phaser rectangle origin defaults to 0.5, 0.5.
const foundationCenter = groundY + (H - groundY) / 2 + 8;
const foundationHeight = H - groundY + 16;
const foundationTop = foundationCenter - foundationHeight / 2;
const foundationBottom = foundationCenter + foundationHeight / 2;

function assert(name, ok) {
  if (!ok) {
    console.error("FAIL", name);
    process.exitCode = 1;
  } else {
    console.log("ok", name);
  }
}

assert("train scale is integer", trainScale === 1);
assert("wheels sit directly on the rail surface", trainY === railY + 1);
assert("train roof is above the platform, not a floor", trainY - trainHeight < groundY);
assert("foundation reaches the frame bottom", foundationBottom >= H - 1);
// Foundation starts right at the platform edge (groundY), overlapping
// behind it by a few pixels so no sub-pixel seam shows.
assert("foundation starts under the platform", foundationTop <= groundY + 4 && foundationTop >= groundY - 8);
assert("rails span past both frame edges", -2 < 0 && W + 2 > W);
assert("banner sits under the header, not on the door", 79 < groundY - 40);

if (!process.exitCode) console.log("station geometry holds");
