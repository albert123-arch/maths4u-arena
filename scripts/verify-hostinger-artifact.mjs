import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import { fileURLToPath } from "node:url";

export function auditArtifact(directory) {
  const privateValues = [];
  const environments = [process.env];
  for (const filename of [".env", ".env.local", ".local/test.env"]) {
    if (fs.existsSync(filename)) environments.push(parse(fs.readFileSync(filename)));
  }
  for (const environment of environments) for (const [key, value] of Object.entries(environment)) {
    if (!value) continue;
    if (/PASSWORD|SECRET|TOKEN|API_KEY/.test(key) && value.length >= 8) privateValues.push(Buffer.from(value));
    if (/DATABASE_URL/.test(key)) { try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 8) privateValues.push(Buffer.from(password)); } catch {} }
  }
  const forbiddenRoot = new Set([".local", "tests", "test-results", "fixtures", "storage", ".git", ".github", "src"]);
  let files = 0;
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name), relative = path.relative(directory, filename);
      const segments = relative.split(path.sep);
      if (segments.some(segment => segment === ".env" || segment.startsWith(".env.")) || forbiddenRoot.has(segments[0])) {
        throw new Error("Forbidden private/test content found in deployment artifact: " + relative);
      }
      if (entry.isSymbolicLink()) {
        const target = fs.realpathSync(filename);
        if (!target.startsWith(path.resolve(directory) + path.sep)) throw new Error("Artifact symlink escapes the package.");
      } else if (entry.isDirectory()) visit(filename);
      else {
        files++;
        const data = fs.readFileSync(filename);
        if (privateValues.some(value => data.includes(value))) throw new Error("Private value found in deployment artifact; file: " + relative);
      }
    }
  }
  visit(directory);
  for (const required of ["server.js", "next-server.cjs", "runtime/setup.cjs", "runtime/prisma.config.ts", "prisma/migrations/migration_lock.toml", "node_modules/prisma/build/index.js"]) {
    if (!fs.existsSync(path.join(directory, required))) throw new Error("Incomplete deployment artifact: " + required);
  }
  console.log("Artifact audit passed: " + files + " files; no local environment files, application fixtures or detected credentials.");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) auditArtifact(path.resolve(process.argv[2] || "dist"));
