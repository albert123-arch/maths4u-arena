import { z } from "zod";
import { db } from "./prisma";
import { AppError, ensure } from "./errors";
import { type Actor, isAdmin, isTeacher, teacher, transaction, lockUser } from "./security";
import { publicVersion, versionInclude, localized, renderContent } from "./content";
import { hasFeature } from "./subscriptions";
import type { Prisma } from "../generated/prisma/client";

const contextInclude = { classroom: true, round: { include: { olympiad: true } } } satisfies Prisma.WorkInclude;
type Context = Prisma.WorkGetPayload<{ include: typeof contextInclude }>;
export const workSchema = z.object({
  title: z.string().trim().min(2).max(191), classId: z.string().optional(), kind: z.enum(["HOMEWORK", "TEST", "PRACTICE", "OLYMPIAD"]).default("HOMEWORK"),
  taskIds: z.array(z.string()).min(1).max(50).refine(v => new Set(v).size === v.length),
  opensAt: z.coerce.date(), dueAt: z.coerce.date(), timeLimitSeconds: z.number().int().min(30).max(86400).nullable().default(null),
  attemptsAllowed: z.number().int().min(1).max(10).default(1), resultPolicy: z.enum(["AFTER_SUBMIT", "AFTER_DEADLINE", "MANUAL"]).default("MANUAL"),
  revealSolutions: z.boolean().default(false), allowFiles: z.boolean().default(true),
}).refine(d => d.dueAt > d.opensAt, "Deadline must follow opening");
export type WorkInput = z.infer<typeof workSchema>;
export async function ownClass(actor: Actor, id: string, tx: Prisma.TransactionClient = db()) {
  teacher(actor);
  const classroom = await tx.classroom.findUnique({ where: { id } });
  ensure(classroom && (classroom.teacherId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  return classroom;
}
export async function ownWork(actor: Actor, id: string, tx: Prisma.TransactionClient = db()) {
  teacher(actor);
  const work = await tx.work.findUnique({ where: { id }, include: contextInclude });
  ensure(work && (work.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  return work;
}
export async function workAccess(actor: Actor, work: Context, tx: Prisma.TransactionClient = db()) {
  if (work.kind === "PRACTICE") { ensure(work.ownerId === actor.id || isAdmin(actor), 404, "NOT_FOUND"); return; }
  if (work.classId) {
    const membership = await tx.classMembership.findUnique({ where: { classId_userId: { classId: work.classId, userId: actor.id } } });
    ensure(membership && !membership.removedAt && !work.classroom?.archivedAt, 404, "NOT_FOUND");
  } else if (work.round) {
    const registration = await tx.olympiadRegistration.findUnique({ where: { olympiadId_userId: { olympiadId: work.round.olympiadId, userId: actor.id } } });
    ensure(registration && !registration.withdrawnAt && registration.groupId === work.round.groupId && !work.round.olympiad.archivedAt, 404, "NOT_FOUND");
  } else throw new AppError(404, "NOT_FOUND");
}
export async function createWork(tx: Prisma.TransactionClient, actor: Actor, data: WorkInput) {
  if (data.classId) {
    const classroom = await ownClass(actor, data.classId, tx);
    ensure(!classroom.archivedAt, 400, "CLASS_ARCHIVED");
  }
  const tasks = await tx.task.findMany({ where: { id: { in: data.taskIds }, archivedAt: null }, include: {
    versions: { orderBy: { number: "desc" }, take: 1, include: versionInclude },
  } });
  ensure(tasks.length === data.taskIds.length, 400, "TASK_UNAVAILABLE");
  for (const task of tasks) {
    ensure(task.visibility === "PUBLIC" || task.ownerId === actor.id || isAdmin(actor), 403, "TASK_UNAVAILABLE");
    if (data.kind === "PRACTICE" && task.featureKey) ensure(await hasFeature(actor, task.featureKey), 403, "SUBSCRIPTION_REQUIRED");
  }
  const work = await tx.work.create({ data: { title: data.title, ownerId: actor.id, kind: data.kind, classId: data.classId,
    versions: { create: { opensAt: data.opensAt, dueAt: data.dueAt, timeLimitSeconds: data.timeLimitSeconds, attemptsAllowed: data.attemptsAllowed,
      resultPolicy: data.resultPolicy, revealSolutions: data.revealSolutions, allowFiles: data.allowFiles,
      items: { create: data.taskIds.map((id, position) => {
        const v = tasks.find(t => t.id === id)!.versions[0];
        return { taskVersionId: v.id, position, maxPoints: v.parts.reduce((s, p) => s + p.maxPoints, 0) };
      }) } } },
  }, include: { versions: true } });
  if (data.kind === "PRACTICE") for (const featureKey of new Set(tasks.map(t => t.featureKey).filter((k): k is string => !!k))) {
    await tx.usageEvent.create({ data: { userId: actor.id, featureKey, units: 1, requestKey: "practice:" + work.id + ":" + featureKey } });
  }
  return work;
}
export async function publishWork(actor: Actor, input: unknown) {
  teacher(actor);
  const data = workSchema.parse(input);
  ensure(["HOMEWORK", "TEST"].includes(data.kind) && data.classId, 400, "CLASS_REQUIRED");
  return transaction(tx => createWork(tx, actor, data));
}
export async function practice(actor: Actor, taskId: string) {
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const previous = await tx.work.findFirst({ where: { ownerId: actor.id, kind: "PRACTICE",
      versions: { some: { items: { some: { taskVersion: { taskId } } }, attempts: { some: { status: "IN_PROGRESS", expiresAt: { gt: new Date() } } } } } } });
    if (previous) return previous;
    return createWork(tx, actor, workSchema.parse({ title: "Практика / Practice", kind: "PRACTICE", taskIds: [taskId], opensAt: new Date(),
      dueAt: new Date(Date.now() + 86400000), resultPolicy: "AFTER_SUBMIT", revealSolutions: true }));
  });
}
export const attemptInclude = {
  workVersion: { include: { work: { include: contextInclude }, items: { orderBy: { position: "asc" }, include: { taskVersion: { include: versionInclude } } } } },
  answers: { include: { review: true, files: { include: { file: { select: { id: true, originalName: true, size: true } } } } } },
} satisfies Prisma.AttemptInclude;
export type FullAttempt = Prisma.AttemptGetPayload<{ include: typeof attemptInclude }>;
export async function lockAttempt(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRawUnsafe("SELECT id FROM Attempt WHERE id = ? FOR UPDATE", id);
  return tx.attempt.findUnique({ where: { id }, include: attemptInclude });
}
export const responseSchema = z.object({ value: z.string().max(30000).default(""), optionId: z.string().max(100).optional() }).strict();
const saveSchema = z.object({ revision: z.number().int().min(0), answers: z.array(z.object({ partId: z.string(), response: responseSchema })).max(1500) }).strict();
export function automaticPoints(part: FullAttempt["workVersion"]["items"][number]["taskVersion"]["parts"][number], response: z.infer<typeof responseSchema>) {
  if (part.kind === "MANUAL") return null;
  if (part.kind === "CHOICE") return part.options.some(o => o.id === response.optionId && o.correct) ? part.maxPoints : 0;
  const value = response.value.trim();
  if (!value) return 0;
  if (part.kind === "NUMERIC") {
    // Decimal notation only, with optional scientific exponent; no eval or blank-to-zero.
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(value)) return 0;
    const actual = Number(value.replace(",", "."));
    return Number.isFinite(actual) && part.numericAnswer !== null && Math.abs(actual - part.numericAnswer) <= part.tolerance ? part.maxPoints : 0;
  }
  const normalize = (s: string) => part.caseSensitive ? s.trim() : s.trim().toLowerCase();
  return part.acceptedAnswers.some(a => normalize(a.value) === normalize(value)) ? part.maxPoints : 0;
}
export async function finalize(tx: Prisma.TransactionClient, attempt: FullAttempt, timedOut: boolean) {
  if (attempt.status !== "IN_PROGRESS") return;
  let manual = false;
  for (const item of attempt.workVersion.items) for (const part of item.taskVersion.parts) {
    const answer = attempt.answers.find(a => a.partId === part.id);
    const response = responseSchema.parse(answer?.response ?? { value: "" });
    const autoPoints = automaticPoints(part, response);
    if (autoPoints === null) manual = true;
    await tx.answer.upsert({ where: { attemptId_partId: { attemptId: attempt.id, partId: part.id } },
      create: { attemptId: attempt.id, partId: part.id, response, autoPoints }, update: { autoPoints } });
  }
  await tx.attempt.update({ where: { id: attempt.id }, data: { status: manual ? "SUBMITTED" : "GRADED",
    submittedAt: timedOut ? attempt.expiresAt : new Date(), timedOut, gradedAt: manual ? null : new Date(), revision: { increment: 1 } } });
}
export async function startAttempt(actor: Actor, workId: string, newAttempt = false) {
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const work = await tx.work.findUnique({ where: { id: workId }, include: { ...contextInclude, versions: { take: 1, orderBy: { number: "desc" } } } });
    ensure(work, 404, "NOT_FOUND");
    await workAccess(actor, work, tx);
    const v = work.versions[0], now = new Date();
    const last = await tx.attempt.findFirst({ where: { workVersionId: v.id, userId: actor.id }, orderBy: { number: "desc" } });
    if (last) {
      const locked = (await lockAttempt(tx, last.id))!;
      if (locked.status === "IN_PROGRESS" && locked.expiresAt <= now) await finalize(tx, locked, true);
      if ((locked.status === "IN_PROGRESS" && locked.expiresAt > now) || !newAttempt) return { id: last.id };
    }
    ensure(!work.archivedAt && v.opensAt <= now, 403, "WORK_NOT_OPEN");
    ensure(v.dueAt > now, 409, "WORK_CLOSED");
    ensure((last?.number ?? 0) < v.attemptsAllowed, 409, "ATTEMPT_LIMIT");
    const expiresAt = new Date(Math.min(v.dueAt.getTime(), now.getTime() + (v.timeLimitSeconds ?? 10 * 365 * 86400) * 1000));
    const attempt = await tx.attempt.create({ data: { userId: actor.id, workVersionId: v.id, number: (last?.number ?? 0) + 1, startedAt: now, expiresAt } });
    return { id: attempt.id };
  });
}
export async function mutateAttempt(actor: Actor, id: string, input: unknown, submit = false) {
  const data = saveSchema.parse(input);
  const outcome = await transaction(async tx => {
    const a = await lockAttempt(tx, id);
    ensure(a && a.userId === actor.id, 404, "NOT_FOUND");
    // Repeated submissions cannot change a finished attempt, even with stale revisions.
    if (a.status !== "IN_PROGRESS") { ensure(submit, 409, "ATTEMPT_FINISHED"); return { id }; }
    await workAccess(actor, a.workVersion.work, tx);
    if (a.expiresAt <= new Date()) { await finalize(tx, a, true); return { id, expired: true }; }
    ensure(!a.workVersion.work.archivedAt, 409, "WORK_CLOSED");
    ensure(a.revision === data.revision, 409, "STALE_REVISION");
    const parts = new Map(a.workVersion.items.flatMap(i => i.taskVersion.parts).map(p => [p.id, p]));
    ensure(new Set(data.answers.map(x => x.partId)).size === data.answers.length, 400, "DUPLICATE_ANSWER");
    for (const row of data.answers) {
      const part = parts.get(row.partId);
      ensure(part, 400, "INVALID_PART");
      if (row.response.optionId) ensure(part.options.some(o => o.id === row.response.optionId), 400, "INVALID_OPTION");
      await tx.answer.upsert({ where: { attemptId_partId: { attemptId: id, partId: row.partId } }, create: { attemptId: id, ...row, savedAt: new Date() },
        update: { response: row.response, savedAt: new Date() } });
    }
    if (submit) await finalize(tx, (await tx.attempt.findUnique({ where: { id }, include: attemptInclude }))!, false);
    else await tx.attempt.update({ where: { id }, data: { revision: { increment: 1 } } });
    return { id };
  });
  // Outside the transaction: expiry finalization must remain committed.
  if (outcome.expired) throw new AppError(409, "TIME_EXPIRED");
  return outcome;
}
export function maySeeResult(a: FullAttempt, now = new Date()) {
  if (a.status === "IN_PROGRESS") return false;
  const v = a.workVersion;
  if (v.work.kind === "OLYMPIAD") return !!v.work.resultsPublishedAt && now >= v.dueAt;
  return v.resultPolicy === "AFTER_SUBMIT" || (v.resultPolicy === "AFTER_DEADLINE" && now >= v.dueAt) || (v.resultPolicy === "MANUAL" && !!v.work.resultsPublishedAt);
}
export function maySeeSolutions(a: FullAttempt, now = new Date()) {
  return maySeeResult(a, now) && a.workVersion.revealSolutions && (a.number >= a.workVersion.attemptsAllowed || now >= a.workVersion.dueAt);
}
export async function getAttempt(actor: Actor, id: string, lang = "ru") {
  const a = await transaction(async tx => {
    let row = await lockAttempt(tx, id);
    ensure(row && (row.userId === actor.id || isAdmin(actor) || (isTeacher(actor) && row.workVersion.work.ownerId === actor.id)), 404, "NOT_FOUND");
    if (row.status === "IN_PROGRESS" && row.expiresAt > new Date() && row.userId === actor.id) await workAccess(actor, row.workVersion.work, tx);
    if (row.status === "IN_PROGRESS" && row.expiresAt <= new Date()) { await finalize(tx, row, true); row = (await tx.attempt.findUnique({ where: { id }, include: attemptInclude }))!; }
    return row;
  });
  const manager = isAdmin(actor) || (isTeacher(actor) && a.workVersion.work.ownerId === actor.id && a.userId !== actor.id);
  const resultVisible = manager || maySeeResult(a), solutions = manager || maySeeSolutions(a);
  const maxPoints = a.workVersion.items.reduce((s, i) => s + i.maxPoints, 0);
  const score = a.answers.reduce((s, r) => s + (r.review?.points ?? r.autoPoints ?? 0), 0);
  return { id: a.id, userId: a.userId, workId: a.workVersion.workId, title: a.workVersion.work.title, number: a.number, status: a.status,
    startedAt: a.startedAt, expiresAt: a.expiresAt, submittedAt: a.submittedAt, timedOut: a.timedOut, revision: a.revision,
    serverTime: new Date(), allowFiles: a.workVersion.allowFiles, resultVisible, solutionsVisible: solutions,
    ...(resultVisible ? { score, maxPoints, pendingReview: a.answers.some(r => r.autoPoints === null && !r.review) } : {}),
    questions: a.workVersion.items.map(i => ({ ...publicVersion(i.taskVersion, lang, solutions),
      ...(manager ? { teacherNote: renderContent(localized(i.taskVersion.texts, lang).teacherNote) } : {}) })),
    answers: a.answers.map(r => ({ id: r.id, partId: r.partId, response: r.response, savedAt: r.savedAt, files: r.files.map(f => f.file),
      ...(resultVisible ? { points: r.review?.points ?? r.autoPoints, comment: r.review?.comment ?? "", ...(manager ? { autoPoints: r.autoPoints } : {}) } : {}) })),
  };
}
export async function gradeAttempt(actor: Actor, id: string, input: unknown) {
  teacher(actor);
  const data = z.object({ reviews: z.array(z.object({ partId: z.string(), points: z.number().min(0), comment: z.string().max(10000).default("") })).min(1).max(1500) }).parse(input);
  return transaction(async tx => {
    const a = await lockAttempt(tx, id);
    ensure(a && (isAdmin(actor) || a.workVersion.work.ownerId === actor.id), 404, "NOT_FOUND");
    if (a.status === "IN_PROGRESS" && a.expiresAt <= new Date()) await finalize(tx, a, true);
    else ensure(a.status !== "IN_PROGRESS", 409, "NOT_SUBMITTED");
    const current = (await tx.attempt.findUnique({ where: { id }, include: attemptInclude }))!;
    const parts = current.workVersion.items.flatMap(i => i.taskVersion.parts);
    for (const review of data.reviews) {
      const part = parts.find(p => p.id === review.partId);
      const answer = current.answers.find(r => r.partId === review.partId);
      ensure(part && answer && review.points <= part.maxPoints, 400, "INVALID_POINTS");
      await tx.review.upsert({ where: { answerId: answer.id }, create: { answerId: answer.id, reviewerId: actor.id, points: review.points, comment: review.comment },
        update: { reviewerId: actor.id, points: review.points, comment: review.comment, reviewedAt: new Date() } });
    }
    const pending = await tx.answer.count({ where: { attemptId: id, autoPoints: null, review: null } });
    await tx.attempt.update({ where: { id }, data: { status: pending ? "SUBMITTED" : "GRADED", gradedAt: pending ? null : new Date() } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "ATTEMPT_REVIEWED", targetId: id } });
    return { id, pending };
  });
}
export async function publishResults(actor: Actor, id: string) {
  const work = await ownWork(actor, id);
  const version = await db().workVersion.findFirstOrThrow({ where: { workId: id } });
  ensure(work.kind !== "OLYMPIAD" || version.dueAt <= new Date(), 409, "ROUND_NOT_FINISHED");
  return db().work.update({ where: { id }, data: { resultsPublishedAt: new Date() } });
}
export async function workSummary(actor: Actor, id: string) {
  const work = await db().work.findUnique({ where: { id }, include: { ...contextInclude, versions: { orderBy: { number: "desc" }, take: 1, include: {
    attempts: { where: { userId: actor.id }, select: { id: true, number: true, status: true }, orderBy: { number: "desc" } },
    _count: { select: { items: true } },
  } } } });
  ensure(work, 404, "NOT_FOUND");
  const manager = isAdmin(actor) || (isTeacher(actor) && work.ownerId === actor.id);
  if (!manager && !work.versions[0].attempts.length) await workAccess(actor, work);
  return { id, title: work.title, kind: work.kind, classTitle: work.classroom?.title, version: work.versions[0], manager, archived: !!work.archivedAt, resultsPublished: !!work.resultsPublishedAt };
}
export async function listWorks(actor: Actor, manage = false) {
  if (manage) teacher(actor);
  const rows = await db().work.findMany({ where: manage ? { ownerId: isAdmin(actor) ? undefined : actor.id, kind: { not: "PRACTICE" } } : { OR: [
    { classId: { not: null }, archivedAt: null, classroom: { archivedAt: null, members: { some: { userId: actor.id, removedAt: null } } } },
    { versions: { some: { attempts: { some: { userId: actor.id } } } } },
    { round: { olympiad: { registrations: { some: { userId: actor.id, withdrawnAt: null } } } }, archivedAt: null },
  ] }, take: 100, orderBy: { createdAt: "desc" }, include: { classroom: true, versions: { take: 1, orderBy: { number: "desc" }, include: { attempts: {
    where: manage ? undefined : { userId: actor.id }, select: { id: true, status: true, number: true, user: { select: { displayName: true } } } },
  } } } });
  return rows.map(w => ({ id: w.id, title: w.title, kind: w.kind, archived: !!w.archivedAt, classTitle: w.classroom?.title,
    opensAt: w.versions[0].opensAt, dueAt: w.versions[0].dueAt, attempts: w.versions[0].attempts, resultsPublished: !!w.resultsPublishedAt }));
}
export async function workResults(actor: Actor, id: string) {
  await ownWork(actor, id);
  const attempts = await db().attempt.findMany({ where: { workVersion: { workId: id } }, include: { user: { select: { displayName: true, username: true } } }, orderBy: [{ userId: "asc" }, { number: "asc" }] });
  return Promise.all(attempts.map(async a => ({ ...await getAttempt(actor, a.id), student: a.user })));
}
export type AttemptDto = Awaited<ReturnType<typeof getAttempt>>;
