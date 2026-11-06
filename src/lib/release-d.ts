/** One reviewed, additive content release. Invoked behind Hostinger's readiness gate. */
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "./prisma";
import { digest, userSelect, type Actor } from "./security";
import { databaseConfig } from "./database-url";
import type { Prisma } from "../generated/prisma/client";
import { originalBlockSchema, originalTask, originalLessonId, writeOriginalBlock } from "./original-blocks";
import { pure1ShortSchema, pure1ShortTask, writePure1PracticeMaterials } from "./pure1-short-practice";
import { pure1VariantsPack } from "./pure1-variants";
import { versionInclude } from "./content";
import { appendTaskRevision, appendLessonRevision, versionContent } from "./content-revisions";
import { cleanAuthoredMarkup, cleanAuthoredTitle } from "./content-text-cleanup";
import { cambridgeTask } from "./cambridge-access";
import quadratics from "../../content/original/quadratics-v1.json";
import functions from "../../content/original/functions-v1.json";
import coordinate from "../../content/original/coordinate-geometry-v1.json";
import circular from "../../content/original/circular-measure-v1.json";
import trigonometry from "../../content/original/trigonometry-v1.json";
import series from "../../content/original/series-v1.json";
import binomial from "../../content/original/binomial-expansion-v1.json";
import differentiation from "../../content/original/differentiation-v1.json";
import integration from "../../content/original/integration-v1.json";
import revision from "../../content/original/cross-topic-revision-v1.json";
import short from "../../content/original/pure1-short-practice-v1.json";

export const releaseDKey = "release-d-20261106";
export const releaseDBlocks = [quadratics, functions, coordinate, circular, trigonometry, series, binomial, differentiation, integration, revision].map(p => originalBlockSchema.parse(p));
const base = pure1ShortSchema.parse(short);
const practice = [base, pure1VariantsPack];
export const releaseDMaterials = [
  ...releaseDBlocks.flatMap(p => p.problems.map(q => ({ key: "original:" + q.uid, material: originalTask(p, q) }))),
  ...practice.flatMap(p => p.questions.map(q => ({ key: "short-practice:" + q.uid, material: pure1ShortTask(p, q) }))),
];
export const releaseDFingerprint = digest(JSON.stringify({ blocks: releaseDBlocks, practice, materials: releaseDMaterials }));
if (releaseDMaterials.length !== 516 || new Set(releaseDMaterials.map(r => r.key)).size !== 516) throw Error("RELEASE_D_INVALID_BUNDLE");

function fail(condition: unknown, code: string): asserts condition { if (!condition) throw Error(code); }
type Tx = Prisma.TransactionClient;
export async function planReleaseD(client: Tx = db()) {
  const [tasks, imports, lessons] = await Promise.all([
    client.task.findMany({ orderBy: { id: "asc" }, select: { id: true, origin: true, originManual: true, originRule: true, originReason: true, examArchivedAt: true,
      versions: { orderBy: { number: "desc" }, select: { id: true, number: true, sourceUid: true, sourceId: true, examBoard: true, source: { select: { name: true } } } } } }),
    client.importRecord.findMany({ where: { OR: [{ sourceProject: "maths4u", legacyId: { in: releaseDMaterials.map(r => r.key) } }, { sourceProject: "olymp" }] }, orderBy: { id: "asc" } }),
    client.lesson.findMany({ where: { id: { in: releaseDBlocks.flatMap(p => p.lessons.map(l => originalLessonId(p.key, l.key))) } }, orderBy: { id: "asc" },
      include: { versions: { orderBy: { number: "desc" }, take: 1, include: { texts: true } } } }),
  ]);
  const cam = await client.task.count({ where: cambridgeTask });
  const olymp = imports.filter(i => i.sourceProject === "olymp" && Number(i.legacyId) >= 493 && Number(i.legacyId) <= 512);
  fail(cam === 2654, "RELEASE_D_CAMBRIDGE_COUNT_CHANGED");
  fail(olymp.length === 20 && new Set(olymp.map(i => i.taskId)).size === 20, "RELEASE_D_BOOK2_IDENTITIES_CHANGED");
  fail(olymp.every(i => tasks.some(t => t.id === i.taskId && t.origin === "ORIGINAL" && t.originManual && !t.examArchivedAt)), "RELEASE_D_BOOK2_NOT_APPROVED");
  fail(tasks.filter(t => t.versions.some(v => v.source?.name === "Maths4U Original · Quadratics 2026")).length === 152, "RELEASE_D_PILOT_COUNT_CHANGED");
  fail(tasks.every(t => t.origin !== "UNKNOWN"), "RELEASE_D_UNKNOWN_REQUIRES_OWNER_REVIEW");
  const demos = tasks.filter(t => t.origin === "DEMO");
  fail([0,10].includes(demos.length) && demos.every(t => t.examArchivedAt), "RELEASE_D_DEMO_CHANGED");
  const matched = imports.filter(i => i.sourceProject === "maths4u");
  fail(tasks.length === 2654 + 152 + 20 + demos.length + matched.length, "RELEASE_D_UNEXPECTED_TASKS");
  fail(tasks.filter(t => t.origin === "ORIGINAL").every(t => !t.examArchivedAt), "RELEASE_D_ORIGINAL_ARCHIVED");
  const taskRevisions: { taskId: string; before: string; imports: { id: string; before: string; after: string }[] }[] = [];
  for (const t of tasks.filter(t => t.origin === "ORIGINAL")) {
    const v = await client.taskVersion.findUniqueOrThrow({ where: { id: t.versions[0].id }, include: versionInclude });
    if (digest(JSON.stringify(versionContent(v))) !== digest(JSON.stringify(versionContent(v, true)))) {
      const expected = releaseDMaterials.find(r => r.material.sourceUid === v.sourceUid);
      // The pilot has a strict content hash. Do not silently revise it without a matching approved payload.
      fail(expected, "RELEASE_D_PILOT_TEXT_REVIEW_REQUIRED");
      const refs = matched.filter(i => i.taskId === t.id);
      fail(refs.length === 1 && refs[0].legacyId === expected.key, "RELEASE_D_REVISION_IMPORT_CHANGED");
      taskRevisions.push({ taskId: t.id, before: v.id, imports: refs.map(i => ({ id: i.id, before: i.contentHash, after: digest(JSON.stringify(expected.material)) })) });
    }
  }
  const lessonRevisions = lessons.filter(l => l.versions[0]?.texts.some(t => t.title !== cleanAuthoredTitle(t.title) || t.body !== cleanAuthoredMarkup(t.body)))
    .map(l => ({ lessonId: l.id, before: l.versions[0].id }));
  const present = new Set(matched.map(i => i.legacyId));
  const snapshot = { tasks, imports, lessons: lessons.map(l => ({ id: l.id, topicId: l.topicId, archivedAt: l.archivedAt, version: l.versions[0] })) };
  return { key: releaseDKey, fingerprint: releaseDFingerprint, snapshot: digest(JSON.stringify(snapshot)), beforeTasks: tasks.length, cambridge: cam, book2: olymp.length, demos: demos.length,
    existing: matched.length, create: releaseDMaterials.filter(r => !present.has(r.key)).length, taskRevisions, lessonRevisions };
}

export async function applyReleaseD(storage: string, options: { apply: boolean; backupId?: string }) {
  const config = databaseConfig();
  const local = config.host === "127.0.0.1" && config.database.startsWith("maths4u_test_bank_release_d_");
  fail(process.env.MATHS4U_ENV === "production" || process.env.MATHS4U_ENV === "test" && local, "RELEASE_D_ENVIRONMENT_DENIED");
  const complete = await db().contentRelease.findUnique({ where: { key: releaseDKey } });
  if (complete) {
    fail(complete.state === "APPLIED" && complete.fingerprint === releaseDFingerprint, "RELEASE_D_COMMITTED_BUNDLE_CHANGED");
    return { state: "ALREADY_APPLIED", details: complete.details };
  }
  const plan = await planReleaseD();
  if (!options.apply) return { state: "DRY_RUN", plan };
  fail(options.backupId && options.backupId.length >= 8 && options.backupId.length <= 200, "RELEASE_D_BACKUP_REQUIRED");
  const actor: Actor = await db().user.findFirstOrThrow({ where: { status: "ACTIVE", roles: { some: { role: "ADMIN" } } }, orderBy: { id: "asc" }, select: userSelect });
  const journal = { schema: 1, key: releaseDKey, run: randomUUID(), state: "PREPARED", database: digest(config.host + ":" + config.port + "/" + config.database),
    backup: digest(options.backupId), plan, createdAt: new Date().toISOString() };
  const folder = path.join(storage, "release-journals");
  await fs.mkdir(folder, { recursive: true, mode: 0o700 });
  const filename = path.join(folder, journal.run + ".json");
  const handle = await fs.open(filename, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(journal, null, 2)); await handle.sync(); } finally { await handle.close(); }
  const details = await db().$transaction(async tx => {
    fail((await planReleaseD(tx)).snapshot === plan.snapshot, "RELEASE_D_STALE_PLAN");
    for (const r of plan.taskRevisions) {
      const v = await tx.taskVersion.findUniqueOrThrow({ where: { id: r.before }, include: versionInclude });
      await appendTaskRevision(tx, v, true);
      for (const i of r.imports) {
        const changed = await tx.importRecord.updateMany({ where: { id: i.id, contentHash: i.before }, data: { contentHash: i.after } });
        fail(changed.count === 1, "RELEASE_D_IMPORT_CHANGED");
      }
    }
    for (const r of plan.lessonRevisions) await appendLessonRevision(tx, r.before, true);
    let created = 0, skipped = 0;
    for (const pack of releaseDBlocks) { const result = await writeOriginalBlock(tx, actor, pack); created += result.created; skipped += result.skipped; }
    for (const [index, pack] of practice.entries()) { const result = await writePure1PracticeMaterials(tx, actor, pack, index === 1); created += result.created; skipped += result.skipped; }
    fail(created === plan.create && created + skipped === 516, "RELEASE_D_IMPORT_COUNT_CHANGED");
    const mappings = await tx.importRecord.findMany({ where: { sourceProject: "maths4u", legacyId: { in: releaseDMaterials.map(r => r.key) } } });
    fail(mappings.length === 516, "RELEASE_D_MAPPING_INCOMPLETE");
    for (const row of mappings) {
      const expected = releaseDMaterials.find(r => r.key === row.legacyId)!;
      fail(row.contentHash === digest(JSON.stringify(expected.material)), "RELEASE_D_PAYLOAD_MISMATCH");
      const task = await tx.task.findUniqueOrThrow({ where: { id: row.taskId } });
      fail(!task.examArchivedAt && (!task.originManual || task.origin === "ORIGINAL"), "RELEASE_D_OWNER_DECISION_CONFLICT");
      fail(!await tx.task.count({ where: { id: task.id, ...cambridgeTask } }), "RELEASE_D_CAMBRIDGE_IN_ORIGINAL_BUNDLE");
      if (!task.originManual) await tx.task.update({ where: { id: task.id }, data: { origin: "ORIGINAL", originReason: "Owner-approved Release D authored bundle " + releaseDFingerprint, originRule: releaseDKey } });
    }
    const visible = await tx.task.count({ where: { origin: "ORIGINAL", examArchivedAt: null, visibility: "PUBLIC", archivedAt: null } });
    fail(visible === 688, "RELEASE_D_VISIBLE_TOTAL_CHANGED");
    const result = { created, skipped, originals: 668, book2: 20, cambridge: 2654, demos: plan.demos, taskRevisions: plan.taskRevisions.length, lessonRevisions: plan.lessonRevisions.length, journal: journal.run };
    await tx.contentRelease.create({ data: { key: releaseDKey, fingerprint: releaseDFingerprint, state: "APPLIED", completedAt: new Date(), details: result } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "CONTENT_RELEASE_D_APPLIED", targetId: releaseDKey } });
    return result;
  }, { maxWait: 30000, timeout: 600000, isolationLevel: "Serializable" });
  // The transactional database marker is authoritative if writing this final receipt fails.
  await fs.writeFile(filename, JSON.stringify({ ...journal, state: "APPLIED", details }, null, 2));
  return { state: "APPLIED", details };
}
