import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { db } from "./prisma";
import { admin, digest, lockUser, transaction, type Actor } from "./security";
import { ensure } from "./errors";
import { pilotId } from "./pilot-schema";
import { createTaskVersion, taskSchema, versionInclude, editableVersion } from "./content";
import { privateStorageRoot } from "./storage-config";
import type { Prisma } from "../generated/prisma/client";

// Exact source-verified correction; the payload itself stays outside Git/build.
export const PILOT_CORRECTION_HASH = "d2a6c900804fa561e8ef1e2a79e9c14c5c00628ba8ce6de1431a191f7fbf8cb3";
const text = z.string().max(100000), hash = z.string().regex(/^[a-f0-9]{64}$/);
const correctionSchema = z.object({ format: z.literal("maths4u-pilot-correction-v1"), baselineHash: hash,
  tasks: z.array(z.object({ project: z.literal("maths4u"), legacyId: z.string(), lessonKey: z.literal("subchapter-576"), position: z.number().int(), locale: z.literal("en"),
    beforeSolutionHash: hash, solution: text, markScheme: text, markSchemeSource: z.string().max(500), files: z.array(z.object({ id: z.string(), sha256: hash, size: z.number().int() })) })).length(36),
  lesson: z.object({ project: z.literal("olymp"), key: z.literal("book2-module1-advanced-gcd-problems"), texts: z.array(z.object({ locale: z.enum(["ru", "en"]), beforeBodyHash: hash, body: text, examples: text })).length(2) }),
});
type Correction = z.infer<typeof correctionSchema>;
function checked(actor: Actor, input: unknown) { admin(actor); ensure(digest(JSON.stringify(input)) === PILOT_CORRECTION_HASH, 400, "PILOT_CORRECTION_NOT_APPROVED"); return correctionSchema.parse(input); }
async function plan(tx: Prisma.TransactionClient, correction: Correction) {
  const tasks = [];
  for (const row of correction.tasks) {
    const imported = await tx.importRecord.findUnique({ where: { sourceProject_legacyId: { sourceProject: row.project, legacyId: row.legacyId } }, include: { task: { include: { topics: true, versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } } } });
    ensure(imported, 409, "PILOT_CORRECTION_SOURCE_MISSING");
    const task = imported.task, v = task.versions[0], t = v.texts.find(t => t.locale === row.locale);
    const lessonId = pilotId("lesson", row.project, row.lessonKey);
    const link = await tx.lessonTask.findUnique({ where: { lessonId_taskId: { lessonId, taskId: task.id } } });
    ensure(link && link.position === row.position && t, 409, "PILOT_CORRECTION_LINK_CONFLICT");
    const already = t.solution === row.solution && t.markScheme === row.markScheme && t.markSchemeSource === row.markSchemeSource
      && row.files.every(f => v.assets.some(a => a.fileId === f.id && a.role === "MARK_SCHEME" && a.locale === row.locale));
    ensure(already || (digest(t.solution) === row.beforeSolutionHash && !t.markScheme && row.files.every(f => v.assets.some(a => a.fileId === f.id && a.role === "SOLUTION" && a.locale === row.locale))), 409, "PILOT_CORRECTION_CONTENT_CONFLICT");
    for (const expected of row.files) {
      const file = await tx.storedFile.findUnique({ where: { id: expected.id } });
      ensure(file && !file.deletedAt && file.sha256 === expected.sha256 && file.size === expected.size, 409, "PILOT_CORRECTION_FILE_CONFLICT");
      ensure(digest(await readFile(path.join(privateStorageRoot(), file.storageKey))) === expected.sha256, 409, "PILOT_CORRECTION_FILE_CONFLICT");
    }
    const material = taskSchema.parse({ ...editableVersion(v), visibility: task.visibility, featureKey: task.featureKey, topicIds: task.topics.map(t => t.topicId),
      texts: v.texts.map(t => ({ ...t, markScheme: t.markScheme ?? "", markSchemeSource: t.markSchemeSource ?? "", ...(t.locale === row.locale ? { solution: row.solution, markScheme: row.markScheme, markSchemeSource: row.markSchemeSource } : {}) })),
      assets: v.assets.map(a => ({ fileId: a.fileId, role: row.files.some(f => f.id === a.fileId) ? "MARK_SCHEME" : a.role, locale: a.locale ?? undefined, caption: a.caption })) });
    tasks.push({ project: row.project, legacyId: row.legacyId, taskId: task.id, versionId: v.id, nextVersion: v.number + (already ? 0 : 1), action: already ? "unchanged" : "new-version", material });
  }
  const lessonId = pilotId("lesson", correction.lesson.project, correction.lesson.key);
  const lesson = await tx.lessonVersion.findFirst({ where: { lessonId }, orderBy: { number: "desc" }, include: { texts: true } });
  ensure(lesson, 409, "PILOT_CORRECTION_SOURCE_MISSING");
  const already = correction.lesson.texts.every(r => lesson.texts.some(t => t.locale === r.locale && t.body === r.body && t.examples === r.examples));
  ensure(already || correction.lesson.texts.every(r => lesson.texts.some(t => t.locale === r.locale && digest(t.body) === r.beforeBodyHash && !t.examples)), 409, "PILOT_CORRECTION_CONTENT_CONFLICT");
  const texts = lesson.texts.map(t => { const row = correction.lesson.texts.find(r => r.locale === t.locale); return { locale: t.locale, title: t.title, body: row?.body ?? t.body, examples: row?.examples ?? t.examples }; });
  const lessonChange = { lessonId, versionId: lesson.id, nextVersion: lesson.number + (already ? 0 : 1), action: already ? "unchanged" : "new-version", texts };
  return { tasks, lesson: lessonChange };
}
function report(p: Awaited<ReturnType<typeof plan>>) {
  return { packageHash: PILOT_CORRECTION_HASH, fingerprint: digest(JSON.stringify(p)), tasks: p.tasks.map(r => ({ project: r.project, legacyId: r.legacyId, taskId: r.taskId, versionId: r.versionId, nextVersion: r.nextVersion, action: r.action })),
    lesson: { id: p.lesson.lessonId, action: p.lesson.action, nextVersion: p.lesson.nextVersion }, updatedTasks: p.tasks.filter(t => t.action === "new-version").length,
    filesCreated: 0, publishedWorkVersionsChanged: 0 };
}
export async function checkPilotCorrection(actor: Actor, input: unknown) { const c = checked(actor, input); return report(await plan(db(), c)); }
export async function applyPilotCorrection(actor: Actor, input: unknown) {
  const data = z.object({ correction: z.unknown(), fingerprint: hash }).parse(input), c = checked(actor, data.correction);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    // Serialize against task editors, including an administrator acting for another owner.
    const sourceIds = c.tasks.map(t => t.legacyId);
    const records = await tx.importRecord.findMany({ where: { sourceProject: "maths4u", legacyId: { in: sourceIds } }, orderBy: { taskId: "asc" } });
    for (const r of records) await tx.$queryRaw`SELECT id FROM Task WHERE id = ${r.taskId} FOR UPDATE`;
    const p = await plan(tx, c), before = report(p);
    ensure(before.fingerprint === data.fingerprint || (!before.updatedTasks && p.lesson.action === "unchanged"), 409, "PILOT_CORRECTION_STALE_DRY_RUN");
    for (const r of p.tasks) if (r.action === "new-version") {
      await createTaskVersion(tx, actor, r.material, r.taskId);
      await tx.importRecord.update({ where: { sourceProject_legacyId: { sourceProject: r.project, legacyId: r.legacyId } }, data: { contentHash: digest(JSON.stringify(r.material)), importedAt: new Date() } });
    }
    if (p.lesson.action === "new-version") await tx.lessonVersion.create({ data: { lessonId: p.lesson.lessonId, number: p.lesson.nextVersion, texts: { create: p.lesson.texts } } });
    if (before.updatedTasks || p.lesson.action === "new-version") await tx.auditEvent.create({ data: { actorId: actor.id, action: "PILOT_CORRECTED", targetId: PILOT_CORRECTION_HASH } });
    return before;
  });
}
