import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "./prisma";
import { databaseConfig } from "./database-url";
import { privateStorageRoot } from "./storage-config";
import { admin, digest, lockUser, secret, transaction, type Actor } from "./security";
import { ensure } from "./errors";
import { verifyFile } from "./files";
import { bundleSchema, validatePilot } from "./pilot-schema";
import { writePilot } from "./pilot-import";

// Only the exact locally reviewed package may use this publication flow.
// The archive and its copyrighted content remain outside the repository/build.
export const APPROVED_PILOT = "9bb8f7ce308223af6e3a7a7a92d0032c78a572d01926fcd3a1b2c19ece156db5";
function approved(actor: Actor, input: unknown) {
  admin(actor);
  const target = databaseConfig();
  ensure(process.env.MATHS4U_ENV === "production"
    ? target.database === "u770916388_arena" && process.env.APP_URL?.replace(/\/$/, "") === "https://arena.maths4u.sbs"
    : process.env.MATHS4U_ENV === "test" && target.host === "127.0.0.1" && /^maths4u_test_pilot_/.test(target.database), 403, "PILOT_TARGET_NOT_ALLOWED");
  ensure(digest(JSON.stringify(input)) === APPROVED_PILOT, 400, "PILOT_PACKAGE_NOT_APPROVED");
  return bundleSchema.parse(input);
}
async function checkedFile(actor: Actor, asset: ReturnType<typeof bundleSchema.parse>["assets"][number]) {
  const file = await db().storedFile.findUnique({ where: { id: "pilot_" + asset.key } });
  if (!file) return null;
  ensure(file.ownerId === actor.id && file.sha256 === asset.sha256 && file.size === asset.size && file.mimeType === asset.mimeType, 409, "PILOT_FILE_CONFLICT");
  const data = await readFile(path.join(privateStorageRoot(), file.storageKey));
  ensure(data.length === asset.size && digest(data) === asset.sha256, 409, "PILOT_FILE_CONFLICT");
  return file;
}
export async function checkPilotPublication(actor: Actor, input: unknown) {
  const bundle = approved(actor, input), missing = [];
  for (const asset of bundle.assets) if (!await checkedFile(actor, asset)) missing.push(asset.key);
  return { packageHash: APPROVED_PILOT, tasks: 56, translations: 76, images: 37, missing };
}
export async function stagePilotAsset(actor: Actor, input: unknown) {
  admin(actor);
  const data = z.object({ bundle: z.unknown(), key: z.string(), base64: z.string().max(1500000) }).parse(input);
  const bundle = approved(actor, data.bundle), asset = bundle.assets.find(a => a.key === data.key);
  ensure(asset, 400, "PILOT_ASSET_NOT_APPROVED");
  const bytes = Buffer.from(data.base64, "base64");
  ensure(bytes.toString("base64") === data.base64 && bytes.length === asset.size && digest(bytes) === asset.sha256, 400, "PILOT_ASSET_HASH_MISMATCH");
  verifyFile(bytes, asset.mimeType, asset.file);
  if (await checkedFile(actor, asset)) return { created: false };
  const storage = privateStorageRoot();
  await mkdir(storage, { recursive: true });
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    // Another request may have completed while this request waited for the lock.
    const exists = await tx.storedFile.findUnique({ where: { id: "pilot_" + asset.key } });
    if (exists) { ensure(exists.ownerId === actor.id && exists.sha256 === asset.sha256, 409, "PILOT_FILE_CONFLICT"); return { created: false }; }
    const usage = await tx.storedFile.aggregate({ where: { ownerId: actor.id }, _sum: { size: true } });
    ensure((usage._sum.size || 0) + bytes.length <= 250 * 1024 * 1024, 413, "STORAGE_QUOTA");
    const storageKey = secret();
    await writeFile(path.join(storage, storageKey), bytes, { flag: "wx" });
    await tx.storedFile.create({ data: { id: "pilot_" + asset.key, ownerId: actor.id, storageKey, originalName: path.basename(asset.file), mimeType: asset.mimeType, size: asset.size, sha256: asset.sha256 } });
    return { created: true };
  });
}
export async function publishPilot(actor: Actor, input: unknown) {
  approved(actor, input);
  const bundle = validatePilot(input);
  const checked = await checkPilotPublication(actor, input);
  ensure(!checked.missing.length, 409, "PILOT_IMAGES_REQUIRED");
  const result = await writePilot(actor, bundle, new Map(), APPROVED_PILOT);
  return { ...result, packageHash: APPROVED_PILOT,
    courses: bundle.sections.map(s => "/courses/" + s.project + "-" + s.course.key) };
}
