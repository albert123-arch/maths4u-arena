/** Local-only classification, dry-run, reversible archival and audit reports. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../src/lib/prisma";
import { classifyTask, originRule, origins, type ContentOrigin } from "../src/lib/content-origin";

let localValidated=false;
type Entry = { id: string; before: string | null; after: string };
type Journal = { schema: 1; runId: string; database: string; state: string; entries: Entry[] };
async function main() {
  const u = new URL(process.env.MATHS4U_DATABASE_URL ?? "http://invalid");
  const productionReport=process.argv.includes("--production-report");
  const readOnlyProduction=productionReport&&process.env.MATHS4U_ENV==="production"&&!process.argv.includes("--apply")&&(!process.argv.includes("--mode")||process.argv[process.argv.indexOf("--mode")+1]==="classify")&&process.env.MATHS4U_DATABASE_NAME===decodeURIComponent(u.pathname.slice(1));
  if (!readOnlyProduction && (productionReport||process.env.MATHS4U_ENV !== "test" || u.hostname !== "127.0.0.1" || !u.pathname.startsWith("/maths4u_test_bank_"))) throw Error("LOCAL_TEST_DATABASE_ONLY: production requires a separate owner command, backup and reviewed dry-run");
  localValidated=true;
  const args = process.argv.slice(2), value = (key: string, fallback = "") => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
  const mode = value("--mode", "classify"), apply = args.includes("--apply"), reportPath = path.resolve(value("--report", ".local/stage6-20261106/" + mode + ".json")), journalPath = value("--journal"), fingerprint = createHash("sha256").update(u.host + u.pathname).digest("hex");
  if (!["classify", "archive", "restore"].includes(mode)) throw Error("INVALID_MODE");
  const actorId = value("--actor");
  if (apply && !await db().user.count({ where: { id: actorId, status: "ACTIVE", roles: { some: { role: "ADMIN" } } } })) throw Error("ACTIVE_LOCAL_ADMIN_REQUIRED");
  if (mode === "restore") {
    if (!journalPath) throw Error("JOURNAL_REQUIRED");
    const j = JSON.parse(await fs.readFile(journalPath, "utf8")) as Journal;
    if (!Array.isArray(j.entries) || j.entries.length>100000 || j.entries.some(e=>typeof e.id!=="string"||!e.id||e.id.length>191||typeof e.after!=="string"||!Number.isFinite(Date.parse(e.after))||e.before!==null&&(typeof e.before!=="string"||!Number.isFinite(Date.parse(e.before))))) throw Error("INVALID_JOURNAL");
    if (j.schema !== 1 || j.database !== fingerprint || !Array.isArray(j.entries) || new Set(j.entries.map(e => e.id)).size !== j.entries.length) throw Error("INVALID_JOURNAL");
    const before = await db().task.findMany({ where: { id: { in: j.entries.map(e => e.id) } }, select: { id: true, origin:true, examArchivedAt: true } });
    if (before.length !== j.entries.length || j.entries.some(e => !before.some(t => t.id === e.id && [e.before, e.after].includes(t.examArchivedAt?.toISOString() ?? null)))) throw Error("ARCHIVE_STATE_CHANGED: refusing to overwrite a later owner decision");
    if (apply) {
      if(j.entries.some(e=>before.some(t=>t.id===e.id&&t.examArchivedAt?.toISOString()===e.after&&t.origin!=="CAMBRIDGE_EXAM")))throw Error("CLASSIFICATION_CHANGED");
      await db().$transaction(async tx => {
        for (const e of j.entries) {
          const current = before.find(t => t.id === e.id)!; if ((current.examArchivedAt?.toISOString() ?? null) === e.before) continue;
          const result = await tx.task.updateMany({ where: { id: e.id, origin: current.origin, examArchivedAt: new Date(e.after) }, data: { examArchivedAt: e.before ? new Date(e.before) : null } }); if (result.count !== 1) throw Error("ARCHIVE_STATE_CHANGED");
        }
        await tx.auditEvent.create({ data: { actorId, action: "CONTENT_ARCHIVE_RESTORED", targetId: j.runId } });
      }, { timeout: 120000 });
      j.state = "RESTORED"; await fs.writeFile(journalPath, JSON.stringify(j, null, 2));
    }
    await fs.mkdir(path.dirname(reportPath),{recursive:true});
    await fs.writeFile(reportPath, JSON.stringify({ mode, dryRun: !apply, tasks: before.length, runId: j.runId }, null, 2));
    console.log(JSON.stringify({ mode, dryRun: !apply, tasks: before.length })); return;
  }
  const rows = await db().task.findMany({ orderBy: { id: "asc" }, include: {
    imports: { select: { sourceProject: true, legacyId: true } },
    versions: { orderBy: { number: "desc" }, include: { source: true, texts: { select: { locale: true, title: true, teacherNote: true } } } },
    lessons: { include: { lesson: { include: {
      versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } },
      topic: { include: { texts: true, course: { include: { texts: true } } } },
    } } } },
  } });
  const decisions = rows.map(t => {const evidence=classifyTask(t.versions.map(v => ({ ...v, source: v.source?.name ?? null, sourceUrl: v.source?.url ?? null, titles: v.texts.map(x => x.title) })));return {task:t,decision:t.originManual?{origin:t.origin,reason:t.originReason??"Owner manual classification"}:evidence.origin==="CAMBRIDGE_EXAM"?evidence:t.origin==="ORIGINAL"&&evidence.origin==="ORIGINAL"?evidence:{origin:"UNKNOWN" as const,reason:"Awaiting owner review. "+evidence.reason}};});
  const counts = Object.fromEntries(origins.map(o => [o, decisions.filter(d => d.decision.origin === o).length]));
  if (mode === "classify" && apply) {
    for (let i = 0; i < decisions.length; i += 100) await db().$transaction(decisions.slice(i, i + 100).filter(d => !d.task.originManual).map(({ task: t, decision: d }) => db().task.updateMany({ where: { id: t.id, originManual: false }, data: { origin: d.origin, originReason: d.reason, originRule, ...(d.origin==="CAMBRIDGE_EXAM"?{examArchivedAt:t.examArchivedAt??new Date()}:{}) } })));
    await db().auditEvent.create({ data: { actorId, action: "CONTENT_CLASSIFIED", targetId: originRule } });
  }
  const classified = mode === "archive" ? rows.filter(t => t.origin === "CAMBRIDGE_EXAM" && !t.examArchivedAt) : [];
  let runId: string | undefined;
  if (mode === "archive" && apply) {
    if (!journalPath) throw Error("JOURNAL_REQUIRED");
    runId = randomUUID(); const at = new Date(), j: Journal = { schema: 1, runId, database: fingerprint, state: "PREPARED", entries: classified.map(t => ({ id: t.id, before: t.examArchivedAt?.toISOString() ?? null, after: at.toISOString() })) };
    await fs.mkdir(path.dirname(path.resolve(journalPath)), { recursive: true }); await fs.writeFile(journalPath, JSON.stringify(j, null, 2), { flag: "wx" });
    await db().$transaction(async tx => {
      for (const t of classified) { const result = await tx.task.updateMany({ where: { id: t.id, origin: "CAMBRIDGE_EXAM", originManual: t.originManual, examArchivedAt: null }, data: { examArchivedAt: at } }); if (result.count !== 1) throw Error("CLASSIFICATION_CHANGED"); }
      await tx.auditEvent.create({ data: { actorId, action: "CONTENT_ARCHIVE_APPLIED", targetId: runId! } });
    }, { timeout: 120000 });
    j.state = "APPLIED"; await fs.writeFile(journalPath, JSON.stringify(j, null, 2));
  }
  const label = (texts: { locale: string; title: string }[]) => (texts.find(t => t.locale === "en") ?? texts[0])?.title ?? "";
  const rollups = new Map<string, { kind: string; id: string; title: string; origins: Record<ContentOrigin, Set<string>> }>();
  for (const { task: t, decision: d } of decisions) for (const { lesson: l } of t.lessons) for (const [kind, id, title] of [["course", l.topic.courseId, label(l.topic.course.texts)], ["chapter", l.topicId, label(l.topic.texts)], ["topic", l.id, label(l.versions[0]?.texts ?? [])]]) {
    const key = kind + ":" + id, group = rollups.get(key) ?? { kind, id, title, origins: Object.fromEntries(origins.map(o => [o, new Set<string>()])) as Record<ContentOrigin, Set<string>> }; group.origins[d.origin].add(t.id); rollups.set(key, group);
  }
  const allLessons = await db().lesson.findMany({ include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } }, tasks: { include: { task: true } }, topic: { include: { course: true } } } });
  const hiddenLessons = allLessons.filter(l => !l.tasks.some(link => { const d = decisions.find(d => d.task.id === link.taskId); return !link.task.archivedAt && link.task.visibility === "PUBLIC" && d?.decision.origin !== "CAMBRIDGE_EXAM"; }));
  const impacted = await db().work.findMany({ where: { versions: { some: { items: { some: { taskVersion: { task: { origin: "CAMBRIDGE_EXAM" } } } } } } }, include: { classroom: { include: { members: { where: { removedAt: null }, select: { userId: true } } } }, versions: { include: { attempts: { select: { userId: true } } } } } });
  const unknown = decisions.filter(d => d.decision.origin === "UNKNOWN").map(({ task: t, decision: d }) => ({ id: t.id, title: label(t.versions[0]?.texts ?? []), reason: d.reason, source: t.versions[0]?.source?.name ?? null, imports: t.imports, lessonIds: t.lessons.map(l => l.lessonId) }));
  const report = { mode, dryRun: !apply, rule: originRule, total: rows.length, counts, manualPreserved: rows.filter(t => t.originManual).length, archiveCandidates: classified.length, runId,
    hierarchy: [...rollups.values()].map(g => ({ kind: g.kind, id: g.id, title: g.title, counts: Object.fromEntries(origins.map(o => [o, g.origins[o].size])) })), unknown,
    hiddenLessons: hiddenLessons.map(l => ({ id: l.id, course: l.topic.course.slug, title: label(l.versions[0]?.texts ?? []), hasNotes: l.versions[0]?.texts.some(t => /\S/.test(t.body.replace(/<[^>]*>/g, "")) || /<(?:img|svg|math|video|iframe)\b/i.test(t.body)) ?? false })),
    affectedWorks: impacted.map(w => ({ id: w.id, kind: w.kind, classId: w.classId, studentsWithAttempts: new Set(w.versions.flatMap(v => v.attempts.map(a => a.userId))).size, assignedStudents: w.classroom?.members.length ?? 0 })), affectedStudentsWithAttempts: new Set(impacted.flatMap(w => w.versions.flatMap(v => v.attempts.map(a => a.userId)))).size,
    importerProposal: {
      tasksRequiringNewVersions: decisions.filter(d=>/^M4U-(?:ORIG-|P1-QP-)/.test(d.task.versions[0]?.sourceUid??"")&&d.task.versions[0]?.source?.name==="Maths4U Original (AI-assisted)").length,
      existingVersionsPreserved: await db().taskVersion.count({where:{source:{name:"Maths4U Original (AI-assisted)"}}}),
      lessonTextRows: await db().lessonText.count({where:{OR:[{title:{startsWith:"Maths4U Original"}},{body:{contains:"AI-assisted"}}]}}), applied:false } };
  await fs.mkdir(path.dirname(reportPath), { recursive: true }); await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ mode, dryRun: !apply, total: rows.length, counts, unknown: unknown.length, archiveCandidates: classified.length }));
}
void main().catch(e => { const message=e instanceof Error?e.message:""; console.error(/^[A-Z_]+(?:: [A-Za-z .,_-]+)?$/.test(message)?message:"CONTENT_POLICY_FAILED"); process.exitCode = 1; }).finally(() => localValidated ? db().$disconnect() : undefined);
