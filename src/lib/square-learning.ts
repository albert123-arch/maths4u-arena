import { cache } from "react";
import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { digest, lockUser, transaction, type Actor } from "./security";
import { taskSchema, createTaskVersion, versionInclude } from "./content";
import { questionsForTopic, squareQuestion, gradeSquare, squareHelp, squareMarkingRows, questionCriteria, type SourceQuestion } from "./square-content";
import { quadraticTopic, squareSnapshot, type Evidence, type QuadraticTopic } from "./square-model";
import { databaseConfig } from "./database-url";

export function squareTask(q: SourceQuestion, topic: QuadraticTopic = quadraticTopic()) {
  return taskSchema.parse({ visibility: "PUBLIC", materialCategory: q.collection === "exam" ? "EXAM" : "TRAINING", difficulty: q.difficulty ?? 2, difficultyKnown: true,
    source: "Maths4U Original · Quadratics 2026", sourceUid: q.id, sourceReference: `${q.id}; owner-supplied original package; ${topic.version}; not an official Cambridge question`, syllabus: "9709", component: "Pure 1", topicIds: ["orig_9709_p1_quadratics"],
    texts: [{ locale: "en", title: q.title, statement: q.prompt_html, hint: q.hint_html, answer: q.answer_html, solution: q.solution_html, markScheme: (topic.code === "CS" ? q.marking_criteria ?? [] : questionCriteria(q)).map(c => `<p>${c.code} (${c.marks}): ${c.description_html}</p>`).join(""), markSchemeSource: "Maths4U indicative criteria; not official Cambridge criteria", teacherNote: JSON.stringify({ editorialUid: q.id, version: topic.version, hash: digest(JSON.stringify(q)), original: true, teacherEditorialReview: "pending", fullAnswerChecker: topic.code === "CS" ? "square-v1" : "quadratics-v1" }) }],
    // Coursework remains manually reviewed: final-answer checks never award method marks.
    parts: [{ kind: "MANUAL", maxPoints: q.marks, texts: [{ locale: "en", prompt: "Solve the complete question, showing your method.", answer: q.answer_html, rubric: "Use the Maths4U indicative criteria and accept valid alternative methods." }] }],
  });
}
export async function importSquareLocal(actor: Actor, topic: QuadraticTopic = quadraticTopic(), reviseUnusedExtension = false) {
  const squareQuestions = questionsForTopic(topic.key), sourceProject = topic.sourceProject, squareLessonId = topic.lessonId;
  const cfg = databaseConfig();
  ensure(process.env.MATHS4U_ENV === "test" && cfg.host === "127.0.0.1" && cfg.database.startsWith("maths4u_test_bank_") && actor.roles.some(r => r.role === "ADMIN"), 403, "LOCAL_ONLY");
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const lesson = await tx.lesson.findUnique({ where: { id: squareLessonId }, include: { topic: { include: { course: true } } } });
    ensure(lesson && lesson.topic.course.id === "orig_9709_p1" && lesson.topic.course.slug === "maths4u-9709-p1" && !lesson.archivedAt, 409, "LESSON_MAPPING_CHANGED");
    let created = 0, revised = 0;
    for (const [i,q] of squareQuestions.entries()) {
      const data = squareTask(q, topic), hash = digest(JSON.stringify(data)), key = { sourceProject, legacyId: q.id };
      const old = await tx.importRecord.findUnique({ where: { sourceProject_legacyId: key } });
      if (old) {
        if (old.contentHash !== hash) {
          // Explicit local editorial repair before any learner/assignment uses this new batch.
          ensure(reviseUnusedExtension && topic.sourceProject === "arena-original-quadratics-20261105", 409, "EXPLICIT_VERSION_REQUIRED");
          const versions = await tx.taskVersion.findMany({where:{taskId:old.taskId},select:{id:true}}), ids=versions.map(v=>v.id);
          ensure(!await tx.independentCheck.count({where:{taskVersionId:{in:ids}}}) && !await tx.workItem.count({where:{taskVersionId:{in:ids}}}),409,"TASK_ALREADY_USED");
          await createTaskVersion(tx,actor,data,old.taskId);
          await tx.importRecord.update({where:{sourceProject_legacyId:key},data:{contentHash:hash}});revised++;
        }
        continue;
      }
      ensure(!await tx.taskVersion.findFirst({ where: { sourceUid: q.id } }), 409, "EDITORIAL_ID_COLLISION");
      const v = await createTaskVersion(tx, actor, data);
      await tx.importRecord.create({ data: { ...key, taskId: v.taskId, contentHash: hash } });
      await tx.lessonTask.create({ data: { lessonId: squareLessonId, taskId: v.taskId, position: 1000 + i } });
      created++;
    }
    return { created, revised, skipped: squareQuestions.length - created - revised };
  });
}
/** Refuse to grade a different edited version under a cached editorial UID. */
export const squareMappings = cache(async (key = "completing-square") => {
  const topic = quadraticTopic(key), sourceProject = topic.sourceProject, squareLessonId = topic.lessonId, squareQuestions = questionsForTopic(key);
  const rows = await db().importRecord.findMany({ where: { sourceProject }, include: { task: { include: { lessons: true, versions: { orderBy: { number: "desc" }, take: 1, include: versionInclude } } } } });
  const mappings = new Map<string,string>();
  for (const q of squareQuestions) {
    const row = rows.find(r => r.legacyId === q.id), data = squareTask(q, topic), v = row?.task.versions[0], text = v?.texts.find(t => t.locale === "en");
    ensure(row && row.contentHash === digest(JSON.stringify(data)) && v && (topic.code !== "CS" || v.number === 1) && v.sourceUid === q.id && v.source?.name === data.source && !row.task.archivedAt && row.task.visibility === "PUBLIC" && !row.task.featureKey && row.task.lessons.some(l => l.lessonId === squareLessonId) && text && data.texts.every(t => Object.entries(t).every(([k,value]) => text[k as keyof typeof text] === value)), 409, "QUESTION_CHANGED");
    mappings.set(q.id, v.id);
  }
  const lesson = await db().lesson.findUnique({ where: { id: squareLessonId }, include: { topic: { include: { course: true } } } });
  ensure(lesson && !lesson.archivedAt && lesson.topic.course.published && !lesson.topic.course.archivedAt && !lesson.topic.course.featureKey, 404, "NOT_FOUND");
  return mappings;
});
const eventSchema = z.object({ eventKey: z.string().uuid(), uid: z.string().max(80), answers: z.record(z.string().max(50), z.string().max(400)).refine(v => Object.keys(v).length <= 12), helpUsed: z.boolean(), at: z.number().finite().nonnegative() }).strict();
const requestSchema = (topic: QuadraticTopic) => eventSchema.extend({ version: z.literal(topic.version) });
const answerKey = (value: unknown) => JSON.stringify(Object.entries(value as Record<string,string>).sort(([a],[b])=>a.localeCompare(b)));
async function recordCheck(actor: Actor, event: z.infer<typeof eventSchema>, mappings: Map<string,string>, imported: boolean, topic: QuadraticTopic) {
  const q = squareQuestion(event.uid, topic.key), result = gradeSquare(q, event.answers); ensure(result.valid, 400, "INVALID_INPUT");
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const old = await tx.independentCheck.findUnique({ where: { userId_eventKey: { userId: actor.id, eventKey: event.eventKey } } });
    if (old) { ensure(old.taskVersionId === mappings.get(q.id) && old.contentVersion === topic.version && answerKey(old.answers) === answerKey(event.answers), 409, "EVENT_CONFLICT"); return; }
    // Keep device chronology so old guest mistakes cannot overwrite newer account work.
    // Future/extreme clocks are bounded; imported evidence cannot advance mastery.
    const now = Date.now(), checkedAt = new Date(imported ? Math.min(now, Math.max(now - 365 * 86400000, event.at)) : now);
    await tx.independentCheck.create({ data: { userId: actor.id, taskVersionId: mappings.get(q.id)!, eventKey: event.eventKey, contentVersion: topic.version, answers: event.answers, correct: result.correct, helpUsed: event.helpUsed, imported, checkedAt } });
  });
}
export async function checkSquare(actor: Actor | null, input: unknown, topic: QuadraticTopic = quadraticTopic()) {
  const event = requestSchema(topic).parse(input), mappings = await squareMappings(topic.key);
  ensure(mappings.has(event.uid), 404, "NOT_FOUND");
  const result = gradeSquare(squareQuestion(event.uid, topic.key), event.answers);
  if (actor && result.valid) await recordCheck(actor, event, mappings, false, topic);
  return result;
}
export async function helpSquare(input: unknown, topic: QuadraticTopic = quadraticTopic()) {
  const { uid, kind, version, access, answers } = z.object({ uid: z.string().max(80), kind: z.enum(["hint", "solution", "guidance"]), version: z.literal(topic.version), access: z.enum(["attempt", "stuck", "paper"]).optional(), answers: z.record(z.string().max(50),z.string().max(400)).optional() }).strict().parse(input);
  ensure(version === topic.version && (await squareMappings(topic.key)).has(uid), 404, "NOT_FOUND");
  const q = squareQuestion(uid, topic.key);
  ensure(kind === "hint" || !!access, 403, "CHECK_ANSWER_FIRST");
  ensure(kind === "hint" || access !== "attempt" || (answers && Object.keys(answers).length === q.fields.length && q.fields.every(f => Object.hasOwn(answers,f.key)) && Object.values(answers).some(v => v.trim())), 403, "CHECK_ANSWER_FIRST");
  ensure(access !== "paper" || q.collection === "exam" || q.collection === "mixed" || /sketch|explain|justify/i.test(q.prompt_html), 400, "INVALID_INPUT");
  return kind === "guidance" ? { rows: squareMarkingRows(q), total: q.marks } : { html: squareHelp(q, kind) };
}
export async function squareProgress(actor: Actor, topic: QuadraticTopic = quadraticTopic()) {
  const mappings = await squareMappings(topic.key), uids = new Map([...mappings].map(([uid,v]) => [v,uid]));
  const rows = await db().independentCheck.findMany({ where: { userId: actor.id, contentVersion: topic.version, taskVersionId: { in: [...uids.keys()] } }, orderBy: [{ checkedAt: "asc" }, { id: "asc" }] });
  const evidence: Evidence[] = rows.map(r => { const uid = uids.get(r.taskVersionId)!; return { eventKey: r.eventKey, uid, family: squareQuestion(uid, topic.key).family_uid, correct: r.correct, helpUsed: r.helpUsed, at: r.checkedAt.getTime(), imported: r.imported }; });
  const notes = await db().learningProgress.findUnique({ where: { userId_lessonId: { userId: actor.id, lessonId: topic.lessonId } } });
  return { ...squareSnapshot(evidence), notesRead: notes?.completed ?? false };
}
export async function importSquareProgress(actor: Actor, input: unknown, topic: QuadraticTopic = quadraticTopic()) {
  const data = z.object({ version: z.literal(topic.version), events: z.array(eventSchema).max(100) }).strict().parse(input);
  const mappings = await squareMappings(topic.key);
  for (const e of data.events) ensure(mappings.has(e.uid) && gradeSquare(squareQuestion(e.uid, topic.key), e.answers).valid, 400, "INVALID_INPUT");
  for (const event of data.events) await recordCheck(actor, event, mappings, true, topic);
  return squareProgress(actor, topic);
}
