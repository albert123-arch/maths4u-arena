import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function prepareEngine(root: string, relative: string, expectedHash: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash || "")) throw new Error("ENGINE_DIGEST_REQUIRED");
  const release = fs.realpathSync(root), engine = fs.realpathSync(path.join(release, relative));
  const within = path.relative(release, engine);
  if (!within || within === ".." || within.startsWith(".." + path.sep) || path.isAbsolute(within)) throw new Error("ENGINE_OUTSIDE_RELEASE");
  const stat = fs.statSync(engine);
  if (!stat.isFile() || createHash("sha256").update(fs.readFileSync(engine)).digest("hex") !== expectedHash) throw new Error("ENGINE_DIGEST_MISMATCH");
  const originalMode = stat.mode & 0o777;
  let repaired = false;
  // Restore only owner execute on our own, digest-verified engine after a
  // hosting release copy removes executable bits. Never change system Node.
  if (process.platform !== "win32" && !(originalMode & 0o100)) {
    if (stat.uid !== process.geteuid?.()) throw Object.assign(new Error(), { code: "EACCES" });
    fs.chmodSync(engine, originalMode | 0o100);
    repaired = true;
  }
  fs.accessSync(engine, fs.constants.R_OK | fs.constants.X_OK);
  return { repaired, originalMode: originalMode.toString(8), mode: (fs.statSync(engine).mode & 0o777).toString(8) };
}
