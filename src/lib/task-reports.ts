import {canUseTeacherLibrary} from "./teacher-account-model";
import type { Prisma } from "../generated/prisma/client";
import { localized, publicVersion, versionInclude } from "./content";
import { restrictedWhere } from "./content-access";
import { ensure } from "./errors";
import { mayReviewPractice } from "./practice-access";
import { db } from "./prisma";
import { requestView } from "./request-view";
import { type Actor, isAdmin, isTeacher, lockUser, transaction, userSelect } from "./security";
import { hasFeature } from "./subscriptions";
import {
  canReportCatalogVersion, isReportableIndependentPractice, taskReportChangeSchema, taskReportMaterialAllowed, taskReportQuerySchema, taskReportSchema,
  taskReportSubmissionDecision, type TaskReportDetailDto, type TaskReportDto, type TaskReportListDto,
} from "./task-report-model";
import { workAccess } from "./works";
export * from "./task-report-model";

const personSelect = { id: true, username: true, displayName: true } as const;
const reportInclude = {
  reporter: { select: personSelect }, reviewer: { select: personSelect },
  taskVersion: { select: { number: true, sourceUid: true, texts: { select: { title: true, locale: true } } } },
} satisfies Prisma.TaskReportInclude;
type Report = Prisma.TaskReportGetPayload<{ include: typeof reportInclude }>;
function reportDto(row: Report): TaskReportDto {
  return {
    id: row.id, taskId: row.taskId, taskVersionId: row.taskVersionId, versionNumber: row.taskVersion.number,
    taskTitle: localized(row.taskVersion.texts, "en")?.title ?? "Untitled question", sourceUid: row.taskVersion.sourceUid,
    category: row.category, message: row.message, status: row.status, revision: row.revision, resolution: row.resolution ?? "",
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reporter: row.reporter, reviewer: row.reviewer,
  };
}
function assertReportSession(actor: Actor, adminOnly = false) {
  ensure(!requestView()?.lens, 403, "VIEW_READ_ONLY");
  ensure(actor?.status === "ACTIVE", 401, "LOGIN_REQUIRED");
  if (adminOnly) ensure(isAdmin(actor), 403, "FORBIDDEN");
}
async function currentActor(actor: Actor, tx: Prisma.TransactionClient, adminOnly = false) {
  const current = await tx.user.findFirst({ where: { id: actor.id, status: "ACTIVE" }, select: userSelect });
  ensure(current, 401, "LOGIN_REQUIRED");
  if (adminOnly) ensure(isAdmin(current), 403, "FORBIDDEN");
  return current;
}

export async function requireReportableWork(tx: Pick<Prisma.TransactionClient, "workItem">, actor: { admin: boolean }, workId: string) {
  if (actor.admin) return;
  // Match the work's historical H1/archive boundary: a clean reported item does
  // not make a work visible when any item in any preserved work version is held.
  ensure(!await tx.workItem.count({ where: { workVersion: { workId }, taskVersion: { task: restrictedWhere } } }), 404, "NOT_FOUND");
}

async function authorizedReportVersion(tx: Prisma.TransactionClient, actor: Actor, taskVersionId: string, attemptId?: string) {
  const version = await tx.taskVersion.findUnique({ where: { id: taskVersionId }, select: { id: true, taskId: true,
    task: { include: { versions: { select: { id: true, number: true, examBoard: true, source: { select: { name: true } } } } } },
  } });
  const viewer = { id: actor.id, admin: isAdmin(actor), teacher: isTeacher(actor) };
  ensure(version && taskReportMaterialAllowed(viewer, version.task), 404, "NOT_FOUND");
  if (attemptId) {
    // Only an attempt containing this exact immutable version can establish
    // assigned/private access. Never call getAttempt: it may finalise work.
    const attempt = await tx.attempt.findFirst({ where: { id: attemptId, workVersion: { items: { some: { taskVersionId } } } }, include: {
      workVersion: { include: { work: { include: { classroom: true, round: { include: { olympiad: true } } } } } },
    } });
    ensure(attempt, 404, "NOT_FOUND");
    const work = attempt.workVersion.work;
    if (!viewer.admin) {
      await requireReportableWork(tx, viewer, work.id);
      ensure(!work.archivedAt && !work.classroom?.archivedAt && !work.round?.olympiad.archivedAt, 404, "NOT_FOUND");
      if (attempt.userId === actor.id) await workAccess(actor, work, tx);
      else ensure(viewer.teacher && (work.ownerId === actor.id ||
        isReportableIndependentPractice(work, attempt.userId) && await mayReviewPractice(actor, attempt.id, tx)), 404, "NOT_FOUND");
    }
  } else {
    const featureAllowed = !version.task.featureKey || canUseTeacherLibrary(actor) || await hasFeature(actor, version.task.featureKey);
    ensure(canReportCatalogVersion(viewer, version.task, version.id, featureAllowed), 404, "NOT_FOUND");
  }
  return version;
}

export async function createTaskReport(actor: Actor, input: unknown) {
  assertReportSession(actor);
  const data = taskReportSchema.parse(input);
  return transaction(async tx => {
    // User row serialises requests, making both quotas and idempotency atomic.
    await lockUser(tx, actor.id);
    const current = await currentActor(actor, tx);
    const version = await authorizedReportVersion(tx, current, data.taskVersionId, data.attemptId);
    const existing = await tx.taskReport.findUnique({ where: { reporterId_requestKey: { reporterId: actor.id, requestKey: data.requestKey } } });
    if (existing) {
      ensure(taskReportSubmissionDecision(existing, data) === "DEDUPLICATED", 409, "REQUEST_KEY_REUSED");
      return { id: existing.id, status: existing.status, deduplicated: true };
    }
    const now = Date.now();
    const [hour, day] = await Promise.all([
      tx.taskReport.count({ where: { reporterId: actor.id, createdAt: { gte: new Date(now - 3600000) } } }),
      tx.taskReport.count({ where: { reporterId: actor.id, createdAt: { gte: new Date(now - 86400000) } } }),
    ]);
    ensure(taskReportSubmissionDecision(null, data, { hour, day }) === "CREATE", 429, "TOO_MANY_REQUESTS");
    const report = await tx.taskReport.create({ data: {
      reporterId: actor.id, taskId: version.taskId, taskVersionId: version.id, attemptId: data.attemptId,
      requestKey: data.requestKey, category: data.category, message: data.message,
    }, select: { id: true, status: true } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "TASK_REPORT_CREATED", targetId: report.id } });
    return { ...report, deduplicated: false };
  });
}

export async function listTaskReports(actor: Actor, input: unknown = {}): Promise<TaskReportListDto> {
  assertReportSession(actor, true);
  const data = taskReportQuerySchema.parse(input);
  await currentActor(actor, db(), true);
  const where: Prisma.TaskReportWhereInput = {
    ...(data.status ? { status: data.status } : {}),
    ...(data.q ? { OR: [
      { id: { contains: data.q } }, { message: { contains: data.q } }, { taskId: { contains: data.q } },
      { taskVersionId: { contains: data.q } }, { reporter: { username: { contains: data.q } } },
      { reporter: { displayName: { contains: data.q } } }, { taskVersion: { sourceUid: { contains: data.q } } },
      { taskVersion: { texts: { some: { title: { contains: data.q } } } } },
    ] } : {}),
  };
  const [total, grouped] = await Promise.all([
    db().taskReport.count({ where }), db().taskReport.groupBy({ by: ["status"], _count: true }),
  ]);
  const pages = Math.max(1, Math.ceil(total / data.pageSize)), page = Math.min(data.page, pages);
  const rows = await db().taskReport.findMany({ where, include: reportInclude, skip: (page - 1) * data.pageSize, take: data.pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const counts = { OPEN: 0, IN_REVIEW: 0, RESOLVED: 0, DISMISSED: 0 };
  for (const row of grouped) counts[row.status] = row._count;
  return { items: rows.map(reportDto), total, page, pageSize: data.pageSize, pages, counts };
}

export async function getTaskReport(actor: Actor, id: string): Promise<TaskReportDetailDto> {
  assertReportSession(actor, true);
  await currentActor(actor, db(), true);
  const row = await db().taskReport.findUnique({ where: { id }, include: reportInclude });
  ensure(row, 404, "NOT_FOUND");
  const version = await db().taskVersion.findUnique({ where: { id: row.taskVersionId }, include: versionInclude });
  ensure(version && version.taskId === row.taskId, 404, "NOT_FOUND");
  const shown = publicVersion(version, "en", true, undefined, undefined, true);
  return { ...reportDto(row), context: {
    statementHtml: shown.statement,
    parts: shown.parts.map((part, index) => ({ id: part.id, label: String.fromCharCode(97 + index), kind: part.kind,
      statementHtml: part.prompt, maxPoints: part.maxPoints, options: part.options })),
    assets: shown.assets,
    answerHtml: [shown.answer, ...shown.parts.map(part => part.answer)].filter(Boolean).join("\n"),
    solutionHtml: shown.solution ?? "",
  } };
}

export async function changeTaskReport(actor: Actor, id: string, input: unknown): Promise<TaskReportDto> {
  assertReportSession(actor, true);
  const data = taskReportChangeSchema.parse(input);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    await currentActor(actor, tx, true);
    const row = await tx.taskReport.findUnique({ where: { id }, select: { id: true, status: true, revision: true } });
    ensure(row, 404, "NOT_FOUND");
    ensure(row.revision === data.revision, 409, "STALE_REVISION");
    const result = await tx.taskReport.updateMany({ where: { id, revision: data.revision }, data: {
      status: data.status, resolution: data.resolution || null, revision: { increment: 1 }, reviewerId: actor.id, reviewedAt: new Date(),
    } });
    ensure(result.count === 1, 409, "STALE_REVISION");
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "TASK_REPORT_" + row.status + "_TO_" + data.status, targetId: id } });
    return reportDto(await tx.taskReport.findUniqueOrThrow({ where: { id }, include: reportInclude }));
  });
}
