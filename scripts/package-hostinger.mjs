import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import prismaPlatform from "@prisma/get-platform";
import { auditArtifact } from "./verify-hostinger-artifact.mjs";
const root = process.cwd(), output = path.resolve(root, "dist");
if (path.dirname(output) !== root || path.basename(output) !== "dist") throw new Error("Invalid output directory.");
const standalone = path.join(root, ".next/standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) throw new Error("Standalone output is missing.");
// This is the generated deployment directory only, never the repository or storage.
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const name of [".next", "public"]) {
  if (fs.existsSync(path.join(standalone, name))) fs.cpSync(path.join(standalone, name), path.join(output, name), { recursive: true });
}
fs.copyFileSync(path.join(standalone, "server.js"), path.join(output, "next-server.cjs"));
fs.copyFileSync("scripts/hostinger/server.js", path.join(output, "server.js"));
fs.mkdirSync(path.join(output, "runtime"));
fs.copyFileSync("scripts/hostinger/prisma.config.ts", path.join(output, "runtime/prisma.config.ts"));
fs.mkdirSync(path.join(output, "prisma"));
fs.copyFileSync("prisma/schema.prisma", path.join(output, "prisma/schema.prisma"));
fs.cpSync("prisma/migrations", path.join(output, "prisma/migrations"), { recursive: true });
await build({ entryPoints: ["scripts/hostinger/setup.ts"], outfile: path.join(output, "runtime/setup.cjs"),
  bundle: true, platform: "node", target: "node22", format: "cjs", packages: "external", sourcemap: false, logLevel: "warning" });
fs.copyFileSync("package.json", path.join(output, "package.json"));
fs.copyFileSync("package-lock.json", path.join(output, "package-lock.json"));
const npmCli = process.env.npm_execpath;
if (!npmCli || !fs.existsSync(npmCli)) throw new Error("Run packaging through npm run build:hostinger.");
const install = spawnSync(process.execPath, [npmCli, "ci", "--include=prod", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
  { cwd: output, env: process.env, stdio: "inherit" });
if (install.status !== 0) throw new Error("Production dependency installation failed.");
// npm ci at the source root already prepared the native engine. Copy that exact
// locked version; do not rely on a silent postinstall download in the artifact.
const binaryTarget = await prismaPlatform.getBinaryTargetForCurrentPlatform();
const engineRelative = "node_modules/@prisma/engines/schema-engine-" + binaryTarget + (process.platform === "win32" ? ".exe" : "");
const enginePath = path.join(output, engineRelative);
const installedEngine = path.join(root, engineRelative);
if (!fs.existsSync(installedEngine)) throw new Error("Prisma schema engine is missing from the build installation.");
fs.copyFileSync(installedEngine, enginePath);
if (!fs.existsSync(enginePath)) throw new Error("Prisma schema engine was not downloaded during build.");
const engineCheck = spawnSync(enginePath, ["--version"], { encoding: "utf8" });
if (engineCheck.status !== 0 || !engineCheck.stdout.includes("schema-engine")) throw new Error("Packaged Prisma schema engine cannot run on this platform.");
const appPackage = JSON.parse(fs.readFileSync(path.join(output, "package.json"), "utf8"));
appPackage.scripts = { start: "node server.js" };
delete appPackage.devDependencies;
fs.writeFileSync(path.join(output, "package.json"), JSON.stringify(appPackage, null, 2) + "\n");
fs.unlinkSync(path.join(output, "package-lock.json"));
fs.writeFileSync(path.join(output, "hostinger-build.json"), JSON.stringify({ platform: process.platform, arch: process.arch,
  node: process.versions.node, target: "Node.js 22", engine: engineRelative, builtAt: new Date().toISOString(), databaseAccessDuringBuild: false }, null, 2) + "\n");
auditArtifact(output);
console.log("Hostinger artifact ready: dist/server.js. Deploy source via Git so native dependencies are built on Linux.");
