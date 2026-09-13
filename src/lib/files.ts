import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "./prisma";
import { ensure, AppError } from "./errors";
import { type Actor, digest, secret, isAdmin, isTeacher, transaction, lockUser } from "./security";
import { lockAttempt, finalize, workAccess, maySeeSolutions, attemptInclude } from "./works";
import { hasFeature } from "./subscriptions";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
function storageRoot() {
  const root = process.env.PRIVATE_STORAGE_PATH;
  ensure(root && path.isAbsolute(root), 503, "STORAGE_NOT_CONFIGURED");
  const resolved = path.resolve(root);
  ensure(!resolved.startsWith(path.resolve("public") + path.sep) && resolved !== path.resolve("public"), 503, "STORAGE_MUST_BE_PRIVATE");
  return resolved;
}
function storagePath(key: string) {
  ensure(/^[A-Za-z0-9_-]{43}$/.test(key), 404, "NOT_FOUND");
  return path.join(storageRoot(), key);
}
export function verifyFile(data: Buffer, mime: string, name: string) {
  ensure(data.length > 0 && data.length <= MAX_FILE_BYTES, 413, "FILE_TOO_LARGE");
  const pdf = mime === "application/pdf" && /\.pdf$/i.test(name) && data.subarray(0, 5).toString() === "%PDF-";
  const png = mime === "image/png" && /\.png$/i.test(name) && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = mime === "image/jpeg" && /\.jpe?g$/i.test(name) && data[0] === 255 && data[1] === 216 && data[2] === 255;
  ensure(pdf || png || jpeg, 415, "INVALID_FILE_TYPE");
}
export async function upload(actor: Actor, file: File, attemptId?: string, partId?: string) {
  const data = Buffer.from(await file.arrayBuffer());
  verifyFile(data, file.type, file.name);
  ensure(attemptId || isTeacher(actor), 403, "FORBIDDEN");
  const key = secret();
  await mkdir(storageRoot(), { recursive: true });
  await writeFile(storagePath(key), data, { flag: "wx" });
  try {
    const result = await transaction(async tx => {
      await lockUser(tx, actor.id);
      const usage = await tx.storedFile.aggregate({ where: { ownerId: actor.id }, _sum: { size: true } });
      ensure((usage._sum.size ?? 0) + data.length <= 250 * 1024 * 1024, 413, "STORAGE_QUOTA");
      let answerId: string | undefined;
      if (attemptId) {
        const a = await lockAttempt(tx, attemptId);
        ensure(a && a.userId === actor.id, 404, "NOT_FOUND");
        await workAccess(actor, a.workVersion.work, tx);
        ensure(a.status === "IN_PROGRESS", 409, "ATTEMPT_FINISHED");
        if (a.expiresAt <= new Date()) { await finalize(tx, a, true); return { expired: true as const }; }
        ensure(!a.workVersion.work.archivedAt && a.workVersion.allowFiles, 403, "FILES_DISABLED");
        ensure(partId && a.workVersion.items.some(i => i.taskVersion.parts.some(p => p.id === partId)), 400, "INVALID_PART");
        const count = a.answers.find(r => r.partId === partId)?.files.length ?? 0;
        ensure(count < 5, 413, "FILE_LIMIT");
        const answer = await tx.answer.upsert({ where: { attemptId_partId: { attemptId, partId } }, create: { attemptId, partId, response: { value: "" } }, update: {} });
        answerId = answer.id;
        await tx.attempt.update({ where: { id: attemptId }, data: { revision: { increment: 1 } } });
      }
      const saved = await tx.storedFile.create({ data: { ownerId: actor.id, storageKey: key, originalName: path.basename(file.name).slice(0, 191),
        mimeType: file.type, size: data.length, sha256: digest(data), ...(answerId ? { submissions: { create: { answerId } } } : {}) } });
      return { id: saved.id, originalName: saved.originalName, size: saved.size };
    });
    if ("expired" in result) throw new AppError(409, "TIME_EXPIRED");
    return result;
  } catch (e) { await unlink(storagePath(key)).catch(() => {}); throw e; }
}
export async function download(actor: Actor | null, id: string) {
  const file = await db().storedFile.findUnique({ where: { id }, include: { submissions: { include: { answer: { include: { attempt: { include: attemptInclude } } } } },
    assets: { include: { version: { include: { task: true } } } } } });
  ensure(file, 404, "NOT_FOUND");
  let allowed = !!actor && (file.ownerId === actor.id || isAdmin(actor));
  if (!allowed && actor) allowed = file.submissions.some(s => s.answer.attempt.userId === actor.id || (isTeacher(actor) && s.answer.attempt.workVersion.work.ownerId === actor.id));
  if (!allowed && !file.submissions.length) {
    for (const asset of file.assets) {
      const task = asset.version.task;
      if (actor && isTeacher(actor) && task.ownerId === actor.id) { allowed = true; break; }
      if (asset.role === "STATEMENT" && task.visibility === "PUBLIC" && !task.archivedAt && (!task.featureKey || (actor && await hasFeature(actor, task.featureKey)))) { allowed = true; break; }
      if (actor && asset.role !== "TEACHER") {
        const attempts = await db().attempt.findMany({ where: { userId: actor.id, workVersion: { items: { some: { taskVersionId: asset.versionId } } } }, include: attemptInclude });
        if (attempts.some(a => asset.role === "STATEMENT" || maySeeSolutions(a))) { allowed = true; break; }
      }
    }
  }
  ensure(allowed, 404, "NOT_FOUND");
  return { file, data: await readFile(storagePath(file.storageKey)) };
}
