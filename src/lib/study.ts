import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin, lockUser, transaction } from "./security";
import { availableHelp, localized } from "./content";
import { createWork, workSchema, lockAttempt, studyHelp } from "./works";
import { topicContent, taskPermission } from "./catalog";
import { hasFeature } from "./subscriptions";

export async function beginStudy(actor: Actor, input: unknown, lang: string) {
  const data = z.object({ taskId: z.string(), lessonId: z.string().nullable().optional() }).parse(input);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const task = await tx.task.findUnique({ where: { id: data.taskId }, include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } } } });
    ensure(task && !task.archivedAt && task.versions.length && (task.visibility === "PUBLIC" || task.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
    if (data.lessonId) {
      const link = await tx.lessonTask.findUnique({ where: { lessonId_taskId: { lessonId: data.lessonId, taskId: data.taskId } }, include: { lesson: { include: { topic: { include: { course: true } } } } } });
      ensure(link && !link.lesson.archivedAt && !link.lesson.topic.course.archivedAt && link.lesson.topic.course.published, 404, "NOT_FOUND");
      const key = link.lesson.topic.course.featureKey;
      ensure(!key || await hasFeature(actor, key), 403, "SUBSCRIPTION_REQUIRED");
    }
    const existing = await tx.practiceStudy.findFirst({ where: { taskId: data.taskId, lessonId: data.lessonId ?? null, attempt: { userId: actor.id, status: "IN_PROGRESS", expiresAt: { gt: new Date() } } }, orderBy: { updatedAt: "desc" } });
    if (existing) return { id: existing.attemptId, resumed: true };
    const work = await createWork(tx, actor, workSchema.parse({ title: localized(task.versions[0].texts, lang).title, kind: "PRACTICE", taskIds: [data.taskId], opensAt: new Date(), dueAt: new Date(Date.now() + 30 * 86400000), resultPolicy: "AFTER_SUBMIT", revealSolutions: false }));
    const attempt = await tx.attempt.create({ data: { userId: actor.id, workVersionId: work.versions[0].id, number: 1, expiresAt: work.versions[0].dueAt,
      study: { create: { taskId: data.taskId, lessonId: data.lessonId ?? null } } } });
    return { id: attempt.id, resumed: false };
  });
}
export async function revealStudyHelp(actor: Actor, attemptId: string, input: unknown, lang: string) {
  const { kind } = z.object({ kind: z.enum(["hint", "answer", "solution", "markScheme"]) }).parse(input);
  return transaction(async tx => {
    const a = await lockAttempt(tx, attemptId);
    ensure(a && a.userId === actor.id && a.study && a.workVersion.work.kind === "PRACTICE", 404, "STUDY_ONLY");
    ensure(availableHelp(a.workVersion.items[0].taskVersion, lang)[kind], 404, "HELP_NOT_PROVIDED");
    const fields = { hint: "hintAt", answer: "answerAt", solution: "solutionAt", markScheme: "markSchemeAt" } as const;
    if (!studyHelp(a)[kind]) await tx.practiceStudy.update({ where: { attemptId }, data: { [fields[kind]]: new Date(), updatedAt: new Date() } });
    return { ok: true };
  });
}
export async function selfCheckStudy(actor: Actor, attemptId: string, input: unknown) {
  const { state } = z.object({ state: z.enum(["SELF_CHECKED", "NEEDS_REPEAT"]) }).parse(input);
  return transaction(async tx => {
    const a = await lockAttempt(tx, attemptId);
    ensure(a && a.userId === actor.id && a.study && a.workVersion.work.kind === "PRACTICE", 404, "STUDY_ONLY");
    ensure(a.status !== "IN_PROGRESS", 409, "SUBMIT_BEFORE_SELF_CHECK");
    await tx.practiceStudy.update({ where: { attemptId }, data: { selfCheckedAt: new Date(), needsRepeat: state === "NEEDS_REPEAT", updatedAt: new Date() } });
    // A self-check records the learner's reflection, never a mark or teacher review.
    return { ok: true };
  });
}
export const progressInclude = {
  attempt: { include: {
    answers: { select: { autoPoints: true, review: { select: { points: true } } } },
    workVersion: { include: { items: { select: {
      maxPoints: true, taskVersion: { select: { texts: { select: { locale: true, title: true } } } },
    } } } },
  } },
} satisfies Prisma.PracticeStudyInclude;
type ProgressRow = Prisma.PracticeStudyGetPayload<{ include: typeof progressInclude }>;
export function studyProgressStatus(row: ProgressRow) {
  const a = row.attempt;
  const state = row.needsRepeat ? "NEEDS_REPEAT" : row.selfCheckedAt ? "SELF_CHECKED" : a.status === "IN_PROGRESS" && a.expiresAt <= new Date() ? "SUBMITTED" : a.status;
  const help = [row.hintAt, row.answerAt, row.solutionAt, row.markSchemeAt].filter((d): d is Date => !!d);
  const score = a.answers.reduce((n, a) => n + (a.review?.points ?? a.autoPoints ?? 0), 0), maximum = a.workVersion.items.reduce((n, i) => n + i.maxPoints, 0);
  return { state, helpUsed: help.length > 0, checkedWithoutHelp: a.status === "GRADED" && score === maximum && !!a.submittedAt && !help.some(d => d <= a.submittedAt!), score: a.status === "GRADED" ? score : null, maximum };
}
export async function topicStudy(actor: Actor, lessonId: string, lang: string, historyPage = 1) {
  await topicContent(actor, lessonId, lang);
  ensure(Number.isInteger(historyPage) && historyPage >= 1 && historyPage <= 100000, 400, "INVALID_INPUT");
  const tasks = await db().lessonTask.findMany({ where: { lessonId, task: await taskPermission(actor) }, orderBy: { position: "asc" }, include: { task: { include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: { select: { locale: true, title: true } } } } } } } });
  const ids = await db().$queryRaw<{ attemptId: string }[]>(Prisma.sql`SELECT s.attemptId FROM PracticeStudy s JOIN Attempt a ON a.id=s.attemptId
    WHERE s.lessonId=${lessonId} AND a.userId=${actor.id} AND NOT EXISTS(
      SELECT 1 FROM PracticeStudy s2 JOIN Attempt a2 ON a2.id=s2.attemptId WHERE s2.lessonId=s.lessonId AND s2.taskId=s.taskId AND a2.userId=a.userId
      AND (a2.startedAt > a.startedAt OR (a2.startedAt=a.startedAt AND a2.id > a.id)))`);
  const rows = await db().practiceStudy.findMany({ where: { attemptId: { in: ids.map(r => r.attemptId) } }, include: progressInclude });
  const items = tasks.map(link => { const row = rows.find(r => r.taskId === link.taskId); return { taskId: link.taskId, title: localized(link.task.versions[0].texts, lang).title, position: link.position, attemptId: row?.attemptId ?? null,
    ...(row ? studyProgressStatus(row) : { state: "NOT_STARTED", helpUsed: false, checkedWithoutHelp: false, score: null, maximum: null }) }; });
  const historyCount = await db().practiceStudy.count({ where: { lessonId, attempt: { userId: actor.id } } });
  const history = await db().practiceStudy.findMany({ where: { lessonId, attempt: { userId: actor.id } }, orderBy: [{ attempt: { startedAt: "desc" } }, { attemptId: "desc" }], take: 20, skip: (historyPage - 1) * 20, include: progressInclude });
  const theory = await db().learningProgress.findUnique({ where: { userId_lessonId: { userId: actor.id, lessonId } } });
  return { lessonId, items, theoryRead: theory?.completed ?? false, completedWithoutHelp: items.filter(i => i.checkedWithoutHelp).length,
    historyPage, historyPages: Math.max(1, Math.ceil(historyCount / 20)), history: history.map(r => ({ id: r.attemptId, taskId: r.taskId, title: localized(r.attempt.workVersion.items[0].taskVersion.texts, lang).title, startedAt: r.attempt.startedAt, ...studyProgressStatus(r) })) };
}
export type TopicStudyDto = Awaited<ReturnType<typeof topicStudy>>;
