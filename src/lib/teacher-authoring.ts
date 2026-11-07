import { createHash } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import { createTaskVersion, editableVersion, localized, publicVersion, renderContent, taskSchema, teacherAuthoringVersionPermit, versionInclude, type TaskInput, type Version } from "./content";
import { restrictedMaterial } from "./content-access";
import { ensure } from "./errors";
import { db } from "./prisma";
import { requestView } from "./request-view";
import { type Actor, isAdmin, isTeacher, lockUser, rateLimit, transaction, userSelect } from "./security";
import {
  authoringCompleteness, authoringDeclarationVersion, authoringOriginRule, authoringQuerySchema, authoringRevisionMatches,
  authoringTransitionAllowed, createAuthoredTaskSchema, decideAuthoredTaskSchema, privateAuthorshipReason, saveAuthoredTaskSchema, submitAuthoredTaskSchema,
  withdrawAuthoredTaskSchema, type AuthoringSubmissionDetailDto, type AuthoringSubmissionDto, type AuthoringSubmissionListDto,
  type TeacherAuthoredTaskDetailDto, type TeacherAuthoredTaskDto,
} from "./teacher-authoring-model";
export * from "./teacher-authoring-model";

const personSelect = { id: true, username: true, displayName: true } as const;
const submissionSummaryInclude = {
  authoring: { include: { owner: { select: personSelect } } }, reviewer: { select: personSelect },
  taskVersion: { select: { number: true, texts: { select: { title: true, locale: true } } } },
  course: { include: { texts: true } }, topic: { include: { texts: true } },
} satisfies Prisma.TaskAuthoringSubmissionInclude;
const submissionInclude = {
  ...submissionSummaryInclude, taskVersion: { include: versionInclude },
} satisfies Prisma.TaskAuthoringSubmissionInclude;
const authoringInclude = {
  task: { include: { imports: { select: { id: true } }, versions: { select: { examBoard: true, source: { select: { name: true } } } } } },
  latestVersion: { include: versionInclude },
  submissions: { include: submissionSummaryInclude, orderBy: [{ submittedAt: "desc" }, { id: "desc" }] },
} satisfies Prisma.TaskAuthoringInclude;
type AuthoredTask = Prisma.TaskAuthoringGetPayload<{ include: typeof authoringInclude }>;
type SubmissionSummary = Prisma.TaskAuthoringSubmissionGetPayload<{ include: typeof submissionSummaryInclude }>;
type Submission = Prisma.TaskAuthoringSubmissionGetPayload<{ include: typeof submissionInclude }>;

function assertAuthoringSession(actor: Actor, adminOnly = false, allowOwnerRead = false) {
  const view = requestView(), lens = view?.lens;
  ensure(!lens || allowOwnerRead && !adminOnly && lens.mode === "USER" && lens.targetId === actor.id && view?.actor?.id === actor.id, 403, "VIEW_READ_ONLY");
  ensure(actor?.status === "ACTIVE", 401, "LOGIN_REQUIRED");
  ensure(adminOnly ? isAdmin(actor) : isTeacher(actor), 403, "FORBIDDEN");
}
async function currentActor(actor: Actor, tx: Prisma.TransactionClient, adminOnly = false) {
  const current = await tx.user.findFirst({ where: { id: actor.id, status: "ACTIVE" }, select: userSelect });
  ensure(current, 401, "LOGIN_REQUIRED");
  ensure(adminOnly ? isAdmin(current) : isTeacher(current), 403, "FORBIDDEN");
  return current;
}
async function lockAuthoring(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM TaskAuthoring WHERE id = ${id} FOR UPDATE`;
}
function assertPersonalIdentity(row: AuthoredTask, ownerId?: string) {
  ensure(!ownerId || row.ownerId === ownerId, 404, "NOT_FOUND");
  ensure(row.task.ownerId === row.ownerId && row.task.visibility === "PRIVATE" && !row.task.featureKey && !row.task.archivedAt &&
    row.task.origin === "ORIGINAL" && !row.task.originManual && !row.task.imports.length && !restrictedMaterial(row.task) &&
    row.latestVersion.taskId === row.taskId, 409, "AUTHORING_IDENTITY_CHANGED");
}
async function recommendation(tx: Prisma.TransactionClient, courseId?: string | null, topicId?: string | null) {
  ensure(!topicId || courseId, 400, "COURSE_REQUIRED");
  if (courseId) ensure(await tx.course.count({ where: { id: courseId, published: true, archivedAt: null } }), 400, "INVALID_COURSE_SELECTION");
  if (topicId) ensure(await tx.topic.count({ where: { id: topicId, courseId: courseId! } }), 400, "INVALID_TOPIC_SELECTION");
}
function versionMaterial(version: Version, topicIds: string[] = []): TaskInput {
  return taskSchema.parse({ ...editableVersion(version), visibility: "PRIVATE", featureKey: null, topicIds });
}
function contentFingerprint(version: Version) {
  const material = versionMaterial(version);
  // Database row order is not content. Keep part/option order, canonicalise the
  // unordered translations, accepted answers and asset links before hashing.
  const texts = <T extends { locale: string }>(rows: T[]) => [...rows].sort((a, b) => a.locale.localeCompare(b.locale));
  material.texts = texts(material.texts);
  material.assets = [...material.assets].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  material.parts = material.parts.map(part => ({ ...part, texts: texts(part.texts), acceptedAnswers: [...part.acceptedAnswers].sort(),
    options: part.options.map(option => ({ ...option, texts: texts(option.texts) })) }));
  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}
function submissionDto(row: SubmissionSummary): AuthoringSubmissionDto {
  return {
    id: row.id, authoringId: row.authoringId, taskId: row.authoring.taskId, taskVersionId: row.taskVersionId,
    versionNumber: row.taskVersion.number, title: localized(row.taskVersion.texts, "en")?.title ?? "Untitled task",
    courseId: row.courseId, topicId: row.topicId,
    courseTitle: localized(row.course.texts, "en")?.title ?? "", topicTitle: localized(row.topic.texts, "en")?.title ?? "",
    status: row.status, revision: row.revision, note: row.note, feedback: row.feedback ?? "",
    authorDeclaration: row.authorDeclaration, permissionToPublish: row.permissionToPublish, declarationVersion: row.declarationVersion,
    contentFingerprint: row.contentFingerprint, submittedAt: row.submittedAt.toISOString(), reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedVersionId: row.publishedVersionId, owner: row.authoring.owner, reviewer: row.reviewer,
  };
}
function taskDto(row: AuthoredTask): TeacherAuthoredTaskDto {
  const last = row.submissions[0], published = row.submissions.find(submission => submission.status === "APPROVED");
  return {
    id: row.id, taskId: row.taskId, revision: row.revision,
    title: localized(row.latestVersion.texts, "en")?.title ?? "Untitled task",
    latestVersionId: row.latestVersionId, latestVersionNumber: row.latestVersion.number,
    status: last?.status ?? "DRAFT", courseId: row.courseId, topicId: row.topicId,
    publicTaskId: row.publicTaskId, publicVersionId: published?.publishedVersionId ?? null,
    reviewFeedback: last?.feedback ?? "", updatedAt: row.updatedAt.toISOString(),
    declaredOriginal: true, declarationVersion: row.declarationVersion, declaredAt: row.declaredAt.toISOString(),
    hasUnsubmittedChanges: !last || last.taskVersionId !== row.latestVersionId,
  };
}
function detailDto(row: AuthoredTask): TeacherAuthoredTaskDetailDto {
  const material = versionMaterial(row.latestVersion, row.topicId ? [row.topicId] : []);
  return { ...taskDto(row), material, preview: publicVersion(row.latestVersion, "en", true, undefined, undefined, true),
    completeness: authoringCompleteness(material), submissions: row.submissions.map(submissionDto) };
}
async function readPersonal(tx: Prisma.TransactionClient, id: string, ownerId: string) {
  const row = await tx.taskAuthoring.findUnique({ where: { id }, include: authoringInclude });
  ensure(row, 404, "NOT_FOUND");
  assertPersonalIdentity(row, ownerId);
  return row;
}
async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, targetId: string) {
  await tx.auditEvent.create({ data: { actorId, action, targetId } });
}
async function classifyPersonal(tx: Prisma.TransactionClient, taskId: string) {
  await tx.task.update({ where: { id: taskId }, data: { origin: "ORIGINAL", originManual: false,
    originReason: privateAuthorshipReason, originRule: authoringOriginRule } });
}

export async function listTeacherAuthoredTasks(actor: Actor): Promise<{ items: TeacherAuthoredTaskDto[] }> {
  assertAuthoringSession(actor, false, true);
  await currentActor(actor, db());
  const rows = await db().taskAuthoring.findMany({ where: { ownerId: actor.id }, include: authoringInclude, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 200 });
  return { items: rows.filter(row => { try { assertPersonalIdentity(row, actor.id); return true; } catch { return false; } }).map(taskDto) };
}
export async function getTeacherAuthoredTask(actor: Actor, id: string): Promise<TeacherAuthoredTaskDetailDto> {
  assertAuthoringSession(actor, false, true);
  await currentActor(actor, db());
  return detailDto(await readPersonal(db(), id, actor.id));
}
export async function createTeacherAuthoredTask(actor: Actor, input: unknown): Promise<TeacherAuthoredTaskDetailDto> {
  assertAuthoringSession(actor);
  const data = createAuthoredTaskSchema.parse(input);
  await rateLimit("teacher-authoring-create:" + actor.id, 30, 3600);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const current = await currentActor(actor, tx);
    await recommendation(tx, data.courseId, data.topicId);
    const material = { ...data.material, topicIds: data.topicId ? [data.topicId] : [] };
    const version = await createTaskVersion(tx, current, material);
    // This exception applies only to a freshly allocated private identity in
    // this explicit workflow. It never changes an imported task's provenance.
    await classifyPersonal(tx, version.taskId);
    const authored = await tx.taskAuthoring.create({ data: { taskId: version.taskId, ownerId: current.id, latestVersionId: version.id,
      courseId: data.courseId, topicId: data.topicId, declarationVersion: authoringDeclarationVersion }, select: { id: true } });
    await audit(tx, current.id, "TEACHER_TASK_CREATED_PRIVATE", authored.id);
    return detailDto(await readPersonal(tx, authored.id, current.id));
  });
}
export async function saveTeacherAuthoredTask(actor: Actor, id: string, input: unknown): Promise<TeacherAuthoredTaskDetailDto> {
  assertAuthoringSession(actor);
  const data = saveAuthoredTaskSchema.parse(input);
  await rateLimit("teacher-authoring-save:" + actor.id, 180, 3600);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const current = await currentActor(actor, tx);
    await lockAuthoring(tx, id);
    const row = await readPersonal(tx, id, current.id);
    ensure(authoringRevisionMatches(row.revision, data.revision), 409, "STALE_REVISION");
    await recommendation(tx, data.courseId, data.topicId);
    const material = { ...data.material, topicIds: data.topicId ? [data.topicId] : [] };
    const version = await createTaskVersion(tx, current, material, row.taskId, teacherAuthoringVersionPermit);
    await classifyPersonal(tx, row.taskId);
    const changed = await tx.taskAuthoring.updateMany({ where: { id, revision: data.revision }, data: { latestVersionId: version.id,
      courseId: data.courseId ?? null, topicId: data.topicId ?? null, revision: { increment: 1 } } });
    ensure(changed.count === 1, 409, "STALE_REVISION");
    await audit(tx, current.id, "TEACHER_TASK_PRIVATE_VERSION_SAVED", version.id);
    return detailDto(await readPersonal(tx, id, current.id));
  });
}
export async function submitTeacherAuthoredTask(actor: Actor, id: string, input: unknown): Promise<TeacherAuthoredTaskDetailDto> {
  assertAuthoringSession(actor);
  const data = submitAuthoredTaskSchema.parse(input);
  await rateLimit("teacher-authoring-submit:" + actor.id, 20, 86400);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const current = await currentActor(actor, tx);
    await lockAuthoring(tx, id);
    const row = await readPersonal(tx, id, current.id);
    ensure(authoringRevisionMatches(row.revision, data.revision) && row.latestVersionId === data.taskVersionId, 409, "STALE_REVISION");
    ensure(!row.submissions.some(submission => submission.status === "SUBMITTED"), 409, "AUTHORING_ALREADY_SUBMITTED");
    ensure(!row.submissions.some(submission => submission.taskVersionId === data.taskVersionId && submission.status === "APPROVED"), 409, "AUTHORING_VERSION_ALREADY_APPROVED");
    await recommendation(tx, data.courseId, data.topicId);
    ensure(!authoringCompleteness(versionMaterial(row.latestVersion)).length, 400, "AUTHORING_INCOMPLETE");
    const submission = await tx.taskAuthoringSubmission.create({ data: {
      authoringId: id, taskVersionId: data.taskVersionId, courseId: data.courseId, topicId: data.topicId,
      contentFingerprint: contentFingerprint(row.latestVersion), authorDeclaration: true, permissionToPublish: true,
      declarationVersion: authoringDeclarationVersion, note: data.note,
    } });
    await tx.taskAuthoring.update({ where: { id }, data: { courseId: data.courseId, topicId: data.topicId, revision: { increment: 1 } } });
    await audit(tx, current.id, "TEACHER_TASK_SUBMITTED", submission.id);
    return detailDto(await readPersonal(tx, id, current.id));
  });
}
export async function withdrawTeacherAuthoredTask(actor: Actor, id: string, input: unknown): Promise<TeacherAuthoredTaskDetailDto> {
  assertAuthoringSession(actor);
  const data = withdrawAuthoredTaskSchema.parse(input);
  await rateLimit("teacher-authoring-withdraw:" + actor.id, 30, 86400);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const current = await currentActor(actor, tx);
    await lockAuthoring(tx, id);
    const row = await readPersonal(tx, id, current.id), submission = row.submissions.find(item => item.id === data.submissionId);
    ensure(authoringRevisionMatches(row.revision, data.revision), 409, "STALE_REVISION");
    ensure(submission && submission.revision === data.submissionRevision, 409, "STALE_REVISION");
    ensure(authoringTransitionAllowed(submission.status, "WITHDRAWN", true), 409, "AUTHORING_DECISION_FINAL");
    const changed = await tx.taskAuthoringSubmission.updateMany({ where: { id: submission.id, revision: data.submissionRevision, status: "SUBMITTED" },
      data: { status: "WITHDRAWN", revision: { increment: 1 } } });
    ensure(changed.count === 1, 409, "STALE_REVISION");
    await tx.taskAuthoring.update({ where: { id }, data: { revision: { increment: 1 } } });
    await audit(tx, current.id, "TEACHER_TASK_WITHDRAWN", submission.id);
    return detailDto(await readPersonal(tx, id, current.id));
  });
}

export async function listAuthoringSubmissions(actor: Actor, input: unknown = {}): Promise<AuthoringSubmissionListDto> {
  assertAuthoringSession(actor, true);
  const data = authoringQuerySchema.parse(input);
  await currentActor(actor, db(), true);
  const where: Prisma.TaskAuthoringSubmissionWhereInput = {
    ...(data.status ? { status: data.status } : {}),
    ...(data.q ? { OR: [{ id: { contains: data.q } }, { note: { contains: data.q } },
      { taskVersion: { texts: { some: { title: { contains: data.q } } } } },
      { authoring: { owner: { OR: [{ username: { contains: data.q } }, { displayName: { contains: data.q } }] } } }] } : {}),
  };
  const [total, grouped] = await Promise.all([db().taskAuthoringSubmission.count({ where }), db().taskAuthoringSubmission.groupBy({ by: ["status"], _count: true })]);
  const pages = Math.max(1, Math.ceil(total / data.pageSize)), page = Math.min(data.page, pages);
  const rows = await db().taskAuthoringSubmission.findMany({ where, include: submissionSummaryInclude, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], take: data.pageSize, skip: (page - 1) * data.pageSize });
  const counts = { SUBMITTED: 0, CHANGES_REQUESTED: 0, REJECTED: 0, APPROVED: 0, WITHDRAWN: 0 };
  for (const row of grouped) counts[row.status] = row._count;
  return { items: rows.map(submissionDto), total, page, pageSize: data.pageSize, pages, counts };
}
export async function getAuthoringSubmission(actor: Actor, id: string): Promise<AuthoringSubmissionDetailDto> {
  assertAuthoringSession(actor, true);
  await currentActor(actor, db(), true);
  const row = await db().taskAuthoringSubmission.findUnique({ where: { id }, include: submissionInclude });
  ensure(row && row.taskVersion.taskId === row.authoring.taskId, 404, "NOT_FOUND");
  const material = versionMaterial(row.taskVersion, [row.topicId]);
  return { ...submissionDto(row), material, preview: publicVersion(row.taskVersion, "en", true, undefined, undefined, true),
    previews: row.taskVersion.texts.map(text => publicVersion(row.taskVersion, text.locale, true, undefined, undefined, true)),
    teacherNotes: row.taskVersion.texts.map(text => ({ locale: text.locale, html: renderContent(text.teacherNote) })),
    teacherAssets: row.taskVersion.assets.filter(asset => asset.role === "TEACHER").map(asset => ({ id: asset.fileId, caption: asset.caption,
      mimeType: asset.file.mimeType, role: "TEACHER" as const, partPosition: asset.partPosition })),
    completeness: authoringCompleteness(material), latestPrivateVersionId: row.authoring.latestVersionId, publicTaskId: row.authoring.publicTaskId };
}

async function publishSubmission(tx: Prisma.TransactionClient, actor: Actor, row: Submission, authoring: AuthoredTask) {
  ensure(row.taskVersion.taskId === authoring.taskId && row.authorDeclaration && row.permissionToPublish &&
    row.declarationVersion === authoringDeclarationVersion && row.contentFingerprint === contentFingerprint(row.taskVersion), 409, "AUTHORING_SNAPSHOT_CHANGED");
  const material = versionMaterial(row.taskVersion, [row.topicId]);
  ensure(!authoringCompleteness(material).length, 400, "AUTHORING_INCOMPLETE");
  await recommendation(tx, row.courseId, row.topicId);
  const mapping = await tx.importRecord.findUnique({ where: { sourceProject_legacyId: { sourceProject: "teacher-authoring", legacyId: authoring.id } } });
  if (authoring.publicTaskId) {
    const projected = await tx.task.findUnique({ where: { id: authoring.publicTaskId }, include: { owner: { include: { roles: true } }, versions: { select: { examBoard: true, source: { select: { name: true } } } } } });
    ensure(mapping?.taskId === authoring.publicTaskId && projected && projected.id !== authoring.taskId &&
      projected.owner.roles.some(role => role.role === "ADMIN") && projected.origin === "ORIGINAL" && projected.originManual &&
      !projected.archivedAt && !restrictedMaterial(projected), 409, "AUTHORING_PUBLIC_MAPPING_CHANGED");
  } else ensure(!mapping, 409, "AUTHORING_PUBLIC_MAPPING_CHANGED");
  // Never select the latest private version here: a teacher may be drafting
  // further changes while the owner reviews this frozen submission.
  const published = await createTaskVersion(tx, actor, { ...material, visibility: "PUBLIC" }, authoring.publicTaskId ?? undefined, teacherAuthoringVersionPermit);
  ensure(contentFingerprint(published) === row.contentFingerprint, 409, "AUTHORING_PUBLIC_COPY_CHANGED");
  await tx.task.update({ where: { id: published.taskId }, data: { origin: "ORIGINAL", originManual: true,
    originReason: "Administrator approved teacher-declared original submission " + row.id, originRule: authoringOriginRule } });
  await tx.importRecord.upsert({ where: { sourceProject_legacyId: { sourceProject: "teacher-authoring", legacyId: authoring.id } },
    create: { sourceProject: "teacher-authoring", legacyId: authoring.id, taskId: published.taskId, contentHash: row.contentFingerprint },
    update: { contentHash: row.contentFingerprint } });
  await tx.taskAuthoring.update({ where: { id: authoring.id }, data: { publicTaskId: published.taskId } });
  return published.id;
}
export async function decideAuthoringSubmission(actor: Actor, id: string, input: unknown): Promise<AuthoringSubmissionDetailDto> {
  assertAuthoringSession(actor, true);
  const data = decideAuthoredTaskSchema.parse(input);
  await rateLimit("teacher-authoring-decision:" + actor.id, 100, 3600);
  await transaction(async tx => {
    await lockUser(tx, actor.id);
    const current = await currentActor(actor, tx, true);
    const found = await tx.taskAuthoringSubmission.findUnique({ where: { id }, select: { authoringId: true } });
    ensure(found, 404, "NOT_FOUND");
    await lockAuthoring(tx, found.authoringId);
    const row = await tx.taskAuthoringSubmission.findUniqueOrThrow({ where: { id }, include: submissionInclude });
    ensure(authoringRevisionMatches(row.revision, data.revision), 409, "STALE_REVISION");
    ensure(authoringTransitionAllowed(row.status, data.status), 409, "AUTHORING_DECISION_FINAL");
    const authoring = await tx.taskAuthoring.findUniqueOrThrow({ where: { id: row.authoringId }, include: authoringInclude });
    assertPersonalIdentity(authoring);
    const publishedVersionId = data.status === "APPROVED" ? await publishSubmission(tx, current, row, authoring) : undefined;
    const changed = await tx.taskAuthoringSubmission.updateMany({ where: { id, revision: data.revision, status: "SUBMITTED" }, data: {
      status: data.status, feedback: data.feedback, reviewerId: current.id, reviewedAt: new Date(), revision: { increment: 1 }, publishedVersionId,
    } });
    ensure(changed.count === 1, 409, "STALE_REVISION");
    await tx.taskAuthoring.update({ where: { id: row.authoringId }, data: { revision: { increment: 1 } } });
    await audit(tx, current.id, "TEACHER_TASK_" + data.status, id);
  });
  return getAuthoringSubmission(actor, id);
}
