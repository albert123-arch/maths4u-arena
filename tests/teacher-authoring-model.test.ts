import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authoredMaterialSchema, authoringCompleteness, authoringRevisionMatches, authoringTransitionAllowed,
  createAuthoredTaskSchema, decideAuthoredTaskSchema, saveAuthoredTaskSchema, submitAuthoredTaskSchema, withdrawAuthoredTaskSchema,
} from "../src/lib/teacher-authoring-model";
import {
  createTeacherAuthoredTask, decideAuthoringSubmission, getAuthoringSubmission, getTeacherAuthoredTask,
  listAuthoringSubmissions, listTeacherAuthoredTasks, saveTeacherAuthoredTask, submitTeacherAuthoredTask, withdrawTeacherAuthoredTask,
} from "../src/lib/teacher-authoring";
import { createTaskVersion, taskSchema, type TaskInput } from "../src/lib/content";
import { inRequestView, type ViewLens } from "../src/lib/request-view";
import type { Actor } from "../src/lib/security";
import type { Prisma } from "../src/generated/prisma/client";

function material(change: Partial<TaskInput> = {}): TaskInput {
  return taskSchema.parse({ visibility: "PRIVATE", texts: [{ locale: "en", title: "An independently authored calculation",
    statement: "<p>Calculate \\(14+9\\).</p>", solution: "<p>14+9=14+10-1=23.</p>" }],
    parts: [{ kind: "NUMERIC", maxPoints: 2, numericAnswer: 23, texts: [{ locale: "en", rubric: "M1: add 10 and subtract 1; A1: 23." }] }], ...change });
}
const create = () => ({ material: material(), declaredOriginal: true });
const submit = { revision: 3, taskVersionId: "private-version-3", courseId: "course", topicId: "chapter", declaredOriginal: true, permissionToPublish: true };

test("authoring allocates a new private identity and requires the author's declaration", () => {
  assert.equal(createAuthoredTaskSchema.safeParse(create()).success, true);
  for (const extra of [{ taskId: "imported-identity" }, { id: "other-teacher-task" }, { ownerId: "other-teacher" },
    { publicTaskId: "existing-public-bank-task" }, { origin: "ORIGINAL" }, { originManual: true }, { declaredOriginal: false },
    { declaredOriginal: undefined }, { reviewed: true }]) {
    assert.equal(createAuthoredTaskSchema.safeParse({ ...create(), ...extra }).success, false);
  }
  assert.equal(authoredMaterialSchema.safeParse({ ...material(), visibility: "PUBLIC" }).success, false);
  assert.equal(authoredMaterialSchema.safeParse({ ...material(), featureKey: "premium" }).success, false);
  assert.equal(authoredMaterialSchema.safeParse({ ...material(), id: "imported-identity" }).success, false);
});

test("the first-party workflow rejects both historical Cambridge aliases and external/import provenance", () => {
  for (const source of ["Cambridge", "Cambridge International", "cambridge international", "Cambridge University Press", "Maths4U Original", "Unknown imported source"]) {
    assert.equal(authoredMaterialSchema.safeParse({ ...material(), source }).success, false);
    assert.equal(authoredMaterialSchema.safeParse({ ...material(), examBoard: source }).success, false);
  }
  for (const field of ["sourceUid", "sourceReference", "paper", "questionNumber", "examSession", "component", "seriesCode", "qualification"]) {
    assert.equal(authoredMaterialSchema.safeParse({ ...material(), [field]: "imported-provenance" }).success, false);
  }
  assert.equal(authoredMaterialSchema.safeParse({ ...material(), year: 2026 }).success, false);
});

test("inline private files must be registered for the existing asset ownership checks", () => {
  const value = material();
  value.texts[0].statement = '<img src="/api/files/another-owners-file">';
  assert.equal(authoredMaterialSchema.safeParse(value).success, false);
  value.assets = [{ fileId: "another-owners-file", role: "STATEMENT", caption: "" }];
  // The shared createTaskVersion still enforces the file owner's identity and
  // rejects AnswerFile links. Registration is necessary, never sufficient.
  assert.equal(authoredMaterialSchema.safeParse(value).success, true);
});

test("draft saving allows unfinished solution/answer/rubric while submission completeness lists the gaps", () => {
  const draft = material({ texts: [{ locale: "en", title: "Draft", statement: "A question", hint: "", solution: "", markScheme: "", markSchemeSource: "", teacherNote: "" }],
    parts: [{ kind: "MANUAL", maxPoints: 4, caseSensitive: false, tolerance: 0, acceptedAnswers: [], options: [], texts: [{ locale: "en", prompt: "", answer: "", rubric: "" }] }] });
  assert.equal(saveAuthoredTaskSchema.safeParse({ material: draft, declaredOriginal: true, revision: 0 }).success, true);
  assert.deepEqual(authoringCompleteness(draft), ["en:solution", "en:part-1:rubric", "en:part-1:answer"]);
  draft.texts[0].solution = '<script>not a solution</script><p> &nbsp; </p>';
  assert.ok(authoringCompleteness(draft).includes("en:solution"));
  draft.texts[0].statement = '<p><br></p><script>not a question</script>';
  assert.ok(authoringCompleteness(draft).includes("en:question"));
});

test("complete automatic answer kinds do not require a redundant task-level answer", () => {
  const numeric = material();
  assert.deepEqual(authoringCompleteness(numeric), []);
  const short = material();
  short.parts[0] = { ...short.parts[0], kind: "SHORT", numericAnswer: undefined, acceptedAnswers: ["23"] };
  assert.deepEqual(authoringCompleteness(short), []);
  short.parts[0].acceptedAnswers = ["  "];
  assert.ok(authoringCompleteness(short).includes("en:part-1:answer"));
  const choice = material();
  choice.parts[0] = { ...choice.parts[0], kind: "CHOICE", numericAnswer: undefined, options: [
    { correct: true, texts: [{ locale: "en", text: "23" }] }, { correct: false, texts: [{ locale: "en", text: "24" }] },
  ] };
  assert.deepEqual(authoringCompleteness(choice), []);
  choice.parts[0].options[1].texts[0].text = '<script>missing option</script>';
  assert.ok(authoringCompleteness(choice).includes("en:part-1:answer"));
});

test("manual answers and rubrics must cover each offered language", () => {
  const value = material();
  value.parts[0].kind = "MANUAL";
  value.parts[0].numericAnswer = undefined;
  assert.ok(authoringCompleteness(value).includes("en:part-1:answer"));
  value.parts[0].texts[0].answer = "23";
  assert.deepEqual(authoringCompleteness(value), []);
  value.texts.push({ ...value.texts[0], locale: "ru" });
  assert.ok(authoringCompleteness(value).includes("ru:part-1:rubric"));
  assert.ok(authoringCompleteness(value).includes("ru:part-1:answer"));
});

test("submit freezes an explicit version, placement and publication permission without accepting client decisions", () => {
  assert.equal(submitAuthoredTaskSchema.safeParse(submit).success, true);
  for (const change of [{ taskVersionId: "" }, { taskVersionId: "../existing-version" }, { revision: -1 }, { courseId: "" }, { topicId: "" },
    { declaredOriginal: false }, { permissionToPublish: false }, { permissionToPublish: undefined }, { status: "APPROVED" }, { reviewerId: "admin" }]) {
    assert.equal(submitAuthoredTaskSchema.safeParse({ ...submit, ...change }).success, false);
  }
});

test("only pending submissions can be decided or withdrawn; terminal decisions cannot be rewritten", () => {
  for (const next of ["APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const) assert.equal(authoringTransitionAllowed("SUBMITTED", next), true);
  assert.equal(authoringTransitionAllowed("SUBMITTED", "WITHDRAWN", true), true);
  assert.equal(authoringTransitionAllowed("SUBMITTED", "APPROVED", true), false);
  assert.equal(authoringTransitionAllowed("SUBMITTED", "WITHDRAWN"), false);
  for (const state of ["APPROVED", "CHANGES_REQUESTED", "REJECTED", "WITHDRAWN"] as const) {
    assert.equal(authoringTransitionAllowed(state, "APPROVED"), false);
    assert.equal(authoringTransitionAllowed(state, "WITHDRAWN", true), false);
  }
  assert.equal(authoringRevisionMatches(4, 3), false);
  assert.equal(authoringRevisionMatches(4, 4), true);
  assert.equal(withdrawAuthoredTaskSchema.safeParse({ revision: 4, submissionId: "submission", submissionRevision: 0 }).success, true);
  assert.equal(decideAuthoredTaskSchema.safeParse({ revision: 0, status: "CHANGES_REQUESTED", feedback: "" }).success, false);
  assert.equal(decideAuthoredTaskSchema.safeParse({ revision: 0, status: "REJECTED", feedback: "Please supply the original solution and permission." }).success, true);
  assert.equal(decideAuthoredTaskSchema.safeParse({ revision: 0, status: "APPROVED", taskVersionId: "replace-the-snapshot" }).success, false);
});

const actor = (role: "TEACHER" | "ADMIN" | "STUDENT"): Actor => ({ id: role.toLowerCase(), username: role.toLowerCase(), displayName: role,
  status: "ACTIVE", roles: [{ userId: role.toLowerCase(), role }], profile: null, teacherAccount: null });
const teacherCalls = (user: Actor) => [
  () => listTeacherAuthoredTasks(user), () => getTeacherAuthoredTask(user, "private-task"),
  () => createTeacherAuthoredTask(user, {}), () => saveTeacherAuthoredTask(user, "private-task", {}),
  () => submitTeacherAuthoredTask(user, "private-task", {}), () => withdrawTeacherAuthoredTask(user, "private-task", {}),
];
const adminCalls = (user: Actor) => [() => listAuthoringSubmissions(user), () => getAuthoringSubmission(user, "submission"), () => decideAuthoringSubmission(user, "submission", {})];

test("students cannot reach authoring and teachers cannot reach owner moderation before any database access", async () => {
  for (const call of [...teacherCalls(actor("STUDENT")), ...adminCalls(actor("TEACHER"))]) await assert.rejects(call, /FORBIDDEN/);
});

test("ROLE and mismatched USER lenses cannot read or mutate the authoring workspace or moderation queue", async () => {
  for (const mode of ["ROLE", "USER"] as const) {
    const admin = actor("ADMIN"), lens: ViewLens = { mode, role: "TEACHER", targetId: mode === "USER" ? "teacher" : null,
      label: "Read-only view", nonce: "nonce", expiresAt: new Date(Date.now() + 10000).toISOString() };
    await inRequestView({ real: admin, actor: admin, sessionId: "session", lens }, async () => {
      for (const call of [...teacherCalls(admin), ...adminCalls(admin)]) await assert.rejects(call, /VIEW_READ_ONLY/);
    });
  }
});

test("legacy task editors cannot revise either personal authoring records or their approved public projection", async () => {
  const admin = actor("ADMIN");
  for (const taskId of ["personal-task", "public-projection"]) {
    const tx = {
      $queryRaw: async () => [],
      task: { findUnique: async () => ({ id: taskId, ownerId: "teacher", origin: "ORIGINAL", originManual: taskId === "public-projection", examArchivedAt: null }) },
      taskAuthoring: { findFirst: async () => ({ taskId: "personal-task" }) },
    } as unknown as Prisma.TransactionClient;
    await assert.rejects(() => createTaskVersion(tx, admin, material(), taskId), /AUTHORING_WORKFLOW_REQUIRED/);
  }
});
