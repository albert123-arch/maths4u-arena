import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

function copyDirectory(source, destination, { clean = false } = {}) {
  if (!fs.existsSync(source)) {
    return;
  }

  if (clean) {
    fs.rmSync(destination, { recursive: true, force: true });
  }

  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error("Standalone build output was not found.");
}

copyDirectory(path.join(root, "public"), path.join(standaloneDir, "public"));
copyDirectory(
  path.join(root, ".next", "static"),
  path.join(standaloneDir, ".next", "static"),
  { clean: true },
);
copyDirectory(path.join(root, ".next", "static"), path.join(root, "_next", "static"));

console.log("Standalone build prepared for Hostinger.");
