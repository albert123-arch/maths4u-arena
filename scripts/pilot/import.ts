import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { databaseConfig } from "../../src/lib/database-url";
import { privateStorageRoot } from "../../src/lib/storage-config";
import { verifyFile } from "../../src/lib/files";
import { admin, digest, type Actor } from "../../src/lib/security";
import { validatePilot } from "../../src/lib/pilot-schema";
import { writePilot } from "../../src/lib/pilot-import";
export { pilotId } from "../../src/lib/pilot-schema";
export function requirePilotDatabase() {
  const config = databaseConfig();
  if (process.env.MATHS4U_ENV !== "test" || !/^maths4u_test_pilot_/.test(config.database) || config.host !== "127.0.0.1") throw new Error("PILOT_REQUIRES_ISOLATED_TEST_DATABASE");
}


export async function readPilot(root: string) {
  const base = await realpath(root);
  const bytes = await readFile(path.join(base,"bundle.json"));
  if(bytes.length > 2 * 1024 * 1024) throw new Error("PILOT_BUNDLE_TOO_LARGE");
  const bundle = validatePilot(JSON.parse(bytes.toString("utf8")));
  const fileData = new Map<string, Buffer>();
  for (const asset of bundle.assets) {
    const filename = await realpath(path.join(base, asset.file));
    const rel = path.relative(base, filename);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("PILOT_ASSET_OUTSIDE_PACKAGE");
    const data = await readFile(filename);
    verifyFile(data, asset.mimeType, asset.file);
    if (digest(data) !== asset.sha256 || data.length !== asset.size) throw new Error("PILOT_ASSET_HASH_MISMATCH");
    fileData.set(asset.key, data);
  }
  return {bundle,fileData};
}
export async function importPilot(actor: Actor, root: string) {
  requirePilotDatabase(); admin(actor);
  const {bundle,fileData} = await readPilot(root);
  const relative = path.relative(path.join(await realpath(path.resolve(".local/content-pilot")),"storage"),privateStorageRoot());
  if(relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("PILOT_STORAGE_OUTSIDE_ARENA");
  return writePilot(actor,bundle,fileData);
}
