import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "./prisma";
import { ensure, AppError } from "./errors";
import { type Actor, digest, secret, isAdmin, isTeacher, transaction, lockUser } from "./security";
import { lockAttempt, finalize, workAccess, maySeeMaterialFile, attemptInclude } from "./works";
import { hasFeature } from "./subscriptions";
import { privateStorageRoot } from "./storage-config";
import { imagePreviews } from "./image-previews";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
function storageRoot() {
  return privateStorageRoot();
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
export async function upload(actor: Actor, file: File, attemptId?: string, partId?: string, replaceId?: string) {
  const data = Buffer.from(await file.arrayBuffer());
  verifyFile(data, file.type, file.name);
  ensure(attemptId || isTeacher(actor), 403, "FORBIDDEN");
  ensure(!replaceId || !!attemptId, 400, "INVALID_REPLACEMENT");
  const image = await imagePreviews(data, file.type);
  const derivatives = image.derivatives.map(d => ({ ...d, storageKey: secret(), size: d.data.length, sha256: digest(d.data) }));
  const key = secret();
  await mkdir(storageRoot(), { recursive: true });
  try {
    await writeFile(storagePath(key), data, { flag: "wx" });
    for (const d of derivatives) await writeFile(storagePath(d.storageKey), d.data, { flag: "wx" });
    const result = await transaction(async tx => {
      await lockUser(tx, actor.id);
      const usage = await tx.storedFile.aggregate({ where: { ownerId: actor.id, deletedAt: null }, _sum: { size: true } });
      let replacedSize = 0;
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
        if (replaceId) {
          const prior = a.answers.find(r => r.partId === partId)?.files.find(f => f.file.id === replaceId);
          ensure(prior, 409, "REPLACEMENT_MISSING");
          replacedSize = prior.file.size;
          await tx.answerFile.delete({ where: { fileId: replaceId } });
          await tx.storedFile.update({ where: { id: replaceId }, data: { deletedAt: new Date() } });
        }
        ensure(count - (replaceId ? 1 : 0) < 5, 413, "FILE_LIMIT");
        const answer = await tx.answer.upsert({ where: { attemptId_partId: { attemptId, partId } }, create: { attemptId, partId, response: { value: "" } }, update: {} });
        answerId = answer.id;
        await tx.attempt.update({ where: { id: attemptId }, data: { revision: { increment: 1 } } });
      }
      ensure((usage._sum.size ?? 0) - replacedSize + data.length <= 250 * 1024 * 1024, 413, "STORAGE_QUOTA");
      const saved = await tx.storedFile.create({ data: { ownerId: actor.id, storageKey: key, originalName: path.basename(file.name).slice(0, 191),
        mimeType: file.type, size: data.length, sha256: digest(data), width: image.width, height: image.height, previewError: image.previewError,
        derivatives: { create: derivatives.map(d => ({ kind: d.kind, width: d.width, height: d.height, mimeType: d.mimeType, storageKey: d.storageKey, size: d.size, sha256: d.sha256 })) }, ...(answerId ? { submissions: { create: { answerId } } } : {}) } });
      return { id: saved.id, originalName: saved.originalName, size: saved.size };
    });
    if ("expired" in result) throw new AppError(409, "TIME_EXPIRED");
    if (replaceId) await cleanDeletedFile(replaceId).catch(() => {});
    return result;
  } catch (e) { await Promise.all([key, ...derivatives.map(d => d.storageKey)].map(k => unlink(storagePath(k)).catch(() => {}))); throw e; }
}
export async function download(actor: Actor | null, id: string, variant = "original") {
  ensure(["original", "preview", "thumbnail"].includes(variant), 404, "NOT_FOUND");
  const file = await db().storedFile.findUnique({ where: { id }, include: { derivatives: true, submissions: { include: { answer: { include: { attempt: { include: attemptInclude } } } } },
    assets: { include: { version: { include: { task: true } } } } } });
  ensure(file && !file.deletedAt, 404, "NOT_FOUND");
  let allowed = !!actor && (file.ownerId === actor.id || isAdmin(actor));
  if (!allowed && actor) allowed = file.submissions.some(s => s.answer.attempt.userId === actor.id || (isTeacher(actor) && s.answer.attempt.workVersion.work.ownerId === actor.id));
  if (!allowed && !file.submissions.length) {
    for (const asset of file.assets) {
      const task = asset.version.task;
      if (actor && isTeacher(actor) && task.ownerId === actor.id) { allowed = true; break; }
      if (actor && isTeacher(actor) && await db().workItem.count({ where: { taskVersionId: asset.versionId, workVersion: { work: { ownerId: actor.id } } } })) { allowed = true; break; }
      if (asset.role === "STATEMENT" && task.visibility === "PUBLIC" && !task.archivedAt && (!task.featureKey || (actor && await hasFeature(actor, task.featureKey)))) { allowed = true; break; }
      if (actor && asset.role !== "TEACHER") {
        const attempts = await db().attempt.findMany({ where: { userId: actor.id, workVersion: { items: { some: { taskVersionId: asset.versionId } } } }, include: attemptInclude });
        if (attempts.some(a => maySeeMaterialFile(a, asset.role))) { allowed = true; break; }
      }
    }
  }
  ensure(allowed, 404, "NOT_FOUND");
  const derivative = file.derivatives.find(d => d.kind === variant);
  // Legacy uploads remain readable without any migration-time image conversion.
  const selected = derivative ? { ...file, ...derivative } : file;
  // The same material URL is usable outside an attempt, so a query parameter
  // cannot protect the source filename. Learner/public material downloads always
  // use a neutral name; their own uploaded answers keep their original names.
  const anonymous = file.assets.length > 0 && !(actor && isTeacher(actor));
  const extension = ({ "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" } as Record<string, string>)[selected.mimeType] ?? "";
  return { file: anonymous ? { ...selected, originalName: "material" + extension } : selected, data: await readFile(storagePath(selected.storageKey)) };
}

export async function removeAnswerFile(actor: Actor, id: string, attemptId: string) {
  const result = await transaction(async tx => {
    await lockUser(tx, actor.id);
    const a = await lockAttempt(tx, attemptId);
    ensure(a && a.userId === actor.id, 404, "NOT_FOUND");
    await workAccess(actor, a.workVersion.work, tx);
    ensure(a.status === "IN_PROGRESS", 409, "ATTEMPT_FINISHED");
    if (a.expiresAt <= new Date()) { await finalize(tx, a, true); return { expired: true }; }
    ensure(!a.workVersion.work.archivedAt && a.workVersion.allowFiles, 403, "FILES_DISABLED");
    ensure(a.answers.some(r => r.files.some(f => f.file.id === id)), 404, "NOT_FOUND");
    await tx.answerFile.delete({ where: { fileId: id } });
    await tx.storedFile.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.attempt.update({ where: { id: attemptId }, data: { revision: { increment: 1 } } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "ANSWER_FILE_REMOVED", targetId: id } });
    return { expired: false };
  });
  if (result.expired) throw new AppError(409, "TIME_EXPIRED");
  await cleanDeletedFile(id).catch(() => {});
  return { ok: true };
}

// Retain tombstones and derivative byte records until every unlink succeeds.
// The explicit maintenance command retries failures; startup never scans files.
export async function cleanDeletedFile(id: string) {
  const file = await db().storedFile.findUnique({ where: { id }, include: { derivatives: true } });
  if (!file?.deletedAt) return;
  for (const key of [file.storageKey, ...file.derivatives.map(d => d.storageKey)]) {
    try { await unlink(storagePath(key)); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") return; }
  }
  await db().fileDerivative.deleteMany({ where: { fileId: id } });
}
