import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canReportCatalogVersion, isReportableIndependentPractice, taskReportChangeSchema, taskReportMaterialAllowed, taskReportQuerySchema, taskReportSchema,
  taskReportSubmissionDecision, type ReportActor, type ReportTask,
} from "../src/lib/task-report-model";
import { changeTaskReport, createTaskReport, getTaskReport, listTaskReports, requireReportableWork } from "../src/lib/task-reports";
import { inRequestView, type ViewLens } from "../src/lib/request-view";
import type { Actor } from "../src/lib/security";
import type { Prisma } from "../src/generated/prisma/client";
import { restrictedWhere } from "../src/lib/content-access";

const input = { taskVersionId: "version-2", category: "QUESTION", message: "The second value appears incorrect.", requestKey: "7A5DA4D6-36FD-49CC-8E0E-112480932468" };
const student: ReportActor = { id: "student", admin: false, teacher: false };
const teacher: ReportActor = { id: "teacher", admin: false, teacher: true };
const admin: ReportActor = { id: "admin", admin: true, teacher: true };
function task(extra: Partial<ReportTask> = {}): ReportTask {
  return { ownerId: "teacher", visibility: "PUBLIC", archivedAt: null, examArchivedAt: null, origin: "ORIGINAL", originManual: true,
    featureKey: null, versions: [
      { id: "version-1", number: 1, examBoard: null, source: { name: "Maths4U Original" } },
      { id: "version-2", number: 2, examBoard: null, source: { name: "Maths4U Original" } },
    ], ...extra };
}
test("create schema normalises UUID retries and trims plain text without interpreting HTML", () => {
  const parsed = taskReportSchema.parse({ ...input, message: "  <script>text, not executable markup</script>  " });
  assert.equal(parsed.requestKey, input.requestKey.toLowerCase());
  assert.equal(parsed.message, "<script>text, not executable markup</script>");
});
test("create accepts only exact version/category/message/key/context and bounded nonblank input", () => {
  for (const change of [
    { taskVersionId: "" }, { taskVersionId: "../hidden" }, { category: "MARK_SCHEME" }, { message: "    " },
    { message: "x".repeat(4001) }, { message: "has\u0000null" }, { requestKey: "same-request" }, { attemptId: "" }, { status: "RESOLVED" },
    { reporterId: "other-user" }, { taskId: "client-selected-task" },
  ]) assert.equal(taskReportSchema.safeParse({ ...input, ...change }).success, false);
});
test("retries preserve one report without charging quotas, and UUID reuse cannot change its target or body", () => {
  const parsed = taskReportSchema.parse(input), stored = { ...parsed, attemptId: null };
  assert.equal(taskReportSubmissionDecision(stored, parsed, { hour: 10, day: 50 }), "DEDUPLICATED");
  for (const changed of [
    { ...parsed, taskVersionId: "hidden-version" }, { ...parsed, category: "ANSWER" as const },
    { ...parsed, message: "A changed report body" }, { ...parsed, attemptId: "another-attempt" },
  ]) assert.equal(taskReportSubmissionDecision(stored, changed), "REQUEST_KEY_REUSED");
  assert.equal(taskReportSubmissionDecision(null, parsed, { hour: 9, day: 49 }), "CREATE");
  assert.equal(taskReportSubmissionDecision(null, parsed, { hour: 10, day: 10 }), "RATE_LIMITED");
  assert.equal(taskReportSubmissionDecision(null, parsed, { hour: 0, day: 50 }), "RATE_LIMITED");
});
test("catalog reports bind to the displayed latest version and require current visibility", () => {
  assert.equal(canReportCatalogVersion(student, task(), "version-2", false), true);
  assert.equal(canReportCatalogVersion(student, task(), "version-1", false), false);
  assert.equal(canReportCatalogVersion(student, task({ archivedAt: new Date() }), "version-2", true), false);
  assert.equal(canReportCatalogVersion(student, task({ visibility: "PRIVATE" }), "version-2", true), false);
  assert.equal(canReportCatalogVersion(teacher, task({ visibility: "PRIVATE" }), "version-2", false), true);
  assert.equal(canReportCatalogVersion({ ...teacher, id: "other-teacher" }, task({ visibility: "PRIVATE" }), "version-2", true), false);
});
test("subscription and owner approval gates match the existing bank policy", () => {
  assert.equal(canReportCatalogVersion(student, task({ featureKey: "premium" }), "version-2", false), false);
  assert.equal(canReportCatalogVersion(student, task({ featureKey: "premium" }), "version-2", true), true);
  assert.equal(canReportCatalogVersion(teacher, task({ featureKey: "premium" }), "version-2", false), true);
  for (const extra of [{ origin: "UNKNOWN" }, { origin: "OTHER_THIRD_PARTY", originManual: false }, { examArchivedAt: new Date() }, { origin: "CAMBRIDGE_EXAM" }]) {
    assert.equal(taskReportMaterialAllowed(student, task(extra)), false);
    assert.equal(taskReportMaterialAllowed(teacher, task(extra)), false);
    assert.equal(taskReportMaterialAllowed(admin, task(extra)), true);
  }
  assert.equal(taskReportMaterialAllowed(student, task({ origin: "OTHER_THIRD_PARTY", originManual: true })), true);
});
test("self-registered teachers cannot use the report dialog to bypass another owner's paid content", () => {
  const selfTeacher: ReportActor = { id: "self-registered-teacher", admin: false, teacher: true };
  const premium = task({ ownerId: "editorial-owner", featureKey: "premium" });
  assert.equal(canReportCatalogVersion(selfTeacher, premium, "version-2", false), false);
  assert.equal(canReportCatalogVersion(selfTeacher, premium, "version-2", true), true);
  assert.equal(canReportCatalogVersion(selfTeacher, task({ ...premium, ownerId: selfTeacher.id, visibility: "PRIVATE" }), "version-2", false), true);
  assert.equal(canReportCatalogVersion(admin, premium, "version-1", false), true);
});
test("Cambridge aliases in any preserved historical version stay restricted even after a clean revision", () => {
  for (const name of ["Cambridge", "Cambridge International"]) for (const field of ["examBoard", "source"]) {
    const restricted = task();
    restricted.versions[0] = { ...restricted.versions[0], ...(field === "examBoard" ? { examBoard: name } : { source: { name } }) };
    assert.equal(taskReportMaterialAllowed(student, restricted), false);
    assert.equal(canReportCatalogVersion(teacher, restricted, "version-2", true), false);
    assert.equal(canReportCatalogVersion(admin, restricted, "version-1", false), true);
  }
});
test("attempt access rejects a restricted item anywhere in the work history before reporting", async () => {
  let calls = 0;
  const tx = { workItem: { count: async (query: { where: Prisma.WorkItemWhereInput }) => {
    calls++;
    // A versionId/current-attempt filter here would miss a restricted older work
    // version. The guard must scan by workId and use the entire bank policy.
    assert.deepEqual(query.where.workVersion, { workId: "work-with-history" });
    assert.deepEqual(query.where.taskVersion, { task: restrictedWhere });
    assert.deepEqual(Object.keys(query.where).sort(), ["taskVersion", "workVersion"]);
    return 1;
  } } } as unknown as Pick<Prisma.TransactionClient, "workItem">;
  for (const actor of [student, teacher]) await assert.rejects(() => requireReportableWork(tx, actor, "work-with-history"), error =>
    (error as { status: number; code: string }).status === 404 && (error as { code: string }).code === "NOT_FOUND");
  assert.equal(calls, 2);
  await requireReportableWork(tx, admin, "work-with-history");
  assert.equal(calls, 2);
  const clear = { workItem: { count: async () => 0 } } as unknown as Pick<Prisma.TransactionClient, "workItem">;
  await requireReportableWork(clear, student, "clean-work");
});
test("mentored practice cannot confer access to another teacher's private assignments", () => {
  const independent = { kind: "PRACTICE", ownerId: "student", classId: null, round: null };
  assert.equal(isReportableIndependentPractice(independent, "student"), true);
  assert.equal(isReportableIndependentPractice({ ...independent, ownerId: "other-teacher" }, "student"), false);
  for (const kind of ["HOMEWORK", "TEST", "OLYMPIAD"]) assert.equal(isReportableIndependentPractice({ ...independent, kind }, "student"), false);
  assert.equal(isReportableIndependentPractice({ ...independent, classId: "other-class" }, "student"), false);
  assert.equal(isReportableIndependentPractice({ ...independent, round: { id: "other-competition" } }, "student"), false);
});
test("administrative queries and moderation use bounded paging, explicit statuses and a required revision", () => {
  assert.deepEqual(taskReportQuerySchema.parse({ page: "2", pageSize: "50", q: "  denominator  " }), { status: "", q: "denominator", page: 2, pageSize: 50 });
  for (const invalid of [{ page: 0 }, { page: 1.2 }, { pageSize: 100 }, { status: "CLOSED" }, { q: "x".repeat(101) }]) assert.equal(taskReportQuerySchema.safeParse(invalid).success, false);
  assert.equal(taskReportChangeSchema.safeParse({ status: "RESOLVED", resolution: "Reviewed", revision: 0 }).success, true);
  for (const invalid of [{ status: "RESOLVED" }, { status: "RESOLVED", revision: -1 }, { status: "RESOLVED", revision: 0, taskId: "rewrite" }, { status: "OPEN", revision: 0, resolution: "x".repeat(4001) }]) assert.equal(taskReportChangeSchema.safeParse(invalid).success, false);
});
test("all report reads and writes reject USER and ROLE lenses before database access", async () => {
  const actor = { id: "admin", status: "ACTIVE", roles: [{ userId: "admin", role: "ADMIN" }] } as Actor;
  for (const mode of ["USER", "ROLE"] as const) {
    const lens: ViewLens = { mode, role: "STUDENT", targetId: mode === "USER" ? "student" : null, label: "test", nonce: "test", expiresAt: new Date(Date.now() + 1000).toISOString() };
    await inRequestView({ real: actor, actor, sessionId: "session", lens }, async () => {
      for (const operation of [() => createTaskReport(actor, input), () => listTaskReports(actor), () => getTaskReport(actor, "report"), () => changeTaskReport(actor, "report", { status: "RESOLVED", revision: 0 })]) {
        await assert.rejects(operation, error => (error as { status: number; code: string }).status === 403 && (error as { code: string }).code === "VIEW_READ_ONLY");
      }
    });
  }
});
test("nonadmin and inactive actors cannot read or moderate other reporters' records", async () => {
  const studentActor = { id: "student", status: "ACTIVE", roles: [{ userId: "student", role: "STUDENT" }] } as Actor;
  for (const operation of [() => listTaskReports(studentActor), () => getTaskReport(studentActor, "report"), () => changeTaskReport(studentActor, "report", { status: "RESOLVED", revision: 0 })]) {
    await assert.rejects(operation, error => (error as { status: number }).status === 403);
  }
  for (const status of ["BLOCKED", "ARCHIVED"] as const) await assert.rejects(() => createTaskReport({ ...studentActor, status }, input), error => (error as { status: number }).status === 401);
});
