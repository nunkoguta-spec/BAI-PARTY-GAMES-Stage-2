// Build frontend, then run multiplayer server (3001) + built frontend preview (4173) together.
import { spawn, spawnSync } from "node:child_process";

console.log("Build frontend...");
const build = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

const children = [
  spawn(process.execPath, ["server/index.js"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "0.0.0.0"], { stdio: "inherit" })
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (c.exitCode === null) c.kill();
  process.exitCode = code;
}
for (const c of children) {
  c.on("error", e => { console.error("Gagal menjalankan proses:", e.message); stop(1); });
  c.on("exit", code => { if (!stopping && code !== 0) stop(code || 1); });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
