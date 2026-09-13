import fs from "node:fs";
import path from "node:path";
import { ensure } from "./errors";

function within(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}
// Resolve existing ancestors too: a symlink must not hide a deployment/public path.
function actualPath(input: string): string {
  if (fs.existsSync(input)) return fs.realpathSync(input);
  const parent = path.dirname(input);
  ensure(parent !== input, 503, "STORAGE_PARENT_UNAVAILABLE");
  return path.join(actualPath(parent), path.basename(input));
}
export function privateStorageRoot(applicationRoot = process.cwd()) {
  const input = process.env.PRIVATE_STORAGE_PATH;
  ensure(input && path.isAbsolute(input), 503, "STORAGE_NOT_CONFIGURED");
  const resolved = actualPath(path.resolve(input));
  ensure(!within(actualPath(path.resolve(applicationRoot, "public")), resolved), 503, "STORAGE_MUST_BE_PRIVATE");
  if (process.env.MATHS4U_ENV === "production") {
    ensure(!resolved.split(/[\\/]/).some(segment => ["hbuilds", "public_html"].includes(segment.toLowerCase()))
      && !within(actualPath(path.resolve(applicationRoot)), resolved), 503, "STORAGE_MUST_SURVIVE_DEPLOYMENTS");
  }
  return resolved;
}
