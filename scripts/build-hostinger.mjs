import { spawnSync } from "node:child_process";
if (Number(process.versions.node.split('.')[0]) !== 22) {
  console.error('Build requires Node.js 22. Select Node.js 22 before running npm run build.');
  process.exit(1);
}
const environment = { ...process.env, MATHS4U_BUILD: "1", NODE_ENV: "production" };
// The build does not need runtime credentials or initial-administrator input.
for (const key of Object.keys(environment)) {
  if (/^(NEW_ADMIN_|MATHS4U_DATABASE_|MATHS4U_BOOTSTRAP_|DATABASE_URL$|DB_)/.test(key)) delete environment[key];
}
for (const command of [
  ["scripts/prepare-pdf-viewer.mjs"],
  ["node_modules/prisma/build/index.js", "generate"],
  ["node_modules/next/dist/bin/next", "build"],
  ["scripts/prepare-standalone.mjs"],
  ["scripts/package-hostinger.mjs"],
]) {
  const result = spawnSync(process.execPath, command, { env: environment, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
