import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");

const processes = [
  spawn(process.execPath, ["scripts/db-api.mjs"], {
    cwd: root,
    stdio: "inherit",
  }),
  spawn(process.execPath, [viteBin], {
    cwd: root,
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) child.kill();
  }

  process.exit(exitCode);
}

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) stopAll(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
