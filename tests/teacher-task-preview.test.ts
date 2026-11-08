import { test } from "node:test";
import assert from "node:assert/strict";
import { taskSchema, type Version } from "../src/lib/content";
import { teacherTaskPreview, teacherPackageTaskPreview, projectTeacherTaskPreview, type TeacherPreviewReaders, type TeacherPackagePreviewReaders } from "../src/lib/teacher-task-preview";
import { teacherPreviewGrantMatches } from "../src/lib/teacher-task-preview-assets";
import { materialGrant, readMaterialGrant } from "../src/lib/material-grant";
import { inRequestView, type ViewLens } from "../src/lib/request-view";
import type { Actor } from "../src/lib/security";
import type { SourceQuestion } from "../src/lib/square-content";
import { contentPackages } from "../src/lib/content-package-content";
import { download } from "../src/lib/files";
import type { PrismaClient } from "../src/generated/prisma/client";

function actor(role: "TEACHER" | "ADMIN" | "STUDENT" = "TEACHER", id = "teacher"): Actor {
  return { id, username: id, displayName: id, status: "ACTIVE", roles: [{ role, userId: id }], profile: null, teacherAccount: null };
}
function version(): Version {
  const input = taskSchema.parse({ visibility: "PUBLIC", source: "Owner-authored test material",
    texts: [{ locale: "en", title: "A complete mixed question", statement: '<p>Use the diagram.</p><img src="/api/files/statement-file">',
      solution: '<p>Show the independent method.</p><img src="/api/files/solution-file">', markScheme: '<p>M1 for the independent method.</p><img src="/api/files/guidance-file">' }],
    parts: [
      { kind: "CHOICE", maxPoints: 2, texts: [{ locale: "en", prompt: "Choose a value.", rubric: "B2: complete choice." }], options: [4, 6, 8, 10].map((value, index) => ({ correct: index === 2, texts: [{ locale: "en", text: `<p>${value}</p>` }] })) },
      { kind: "NUMERIC", numericAnswer: 13, maxPoints: 3, texts: [{ locale: "en", prompt: "Calculate the result.", rubric: "M1, A2 for the calculation." }] },
    ],
    assets: ["STATEMENT", "ANSWER", "SOLUTION", "MARK_SCHEME", "TEACHER", "HINT"].map(role => ({ fileId: ({ STATEMENT: "statement-file", ANSWER: "answer-file", SOLUTION: "solution-file", MARK_SCHEME: "guidance-file", TEACHER: "private-teacher-file", HINT: "hint-file" } as Record<string, string>)[role], role, locale: "en", caption: role, partPosition: null })),
  });
  return {
    ...input, id: "version-1", taskId: "task", number: 1, sourceUid: null,
    source: { name: input.source }, task: { id: "task", visibility: "PUBLIC", ownerId: "owner", archivedAt: null, examArchivedAt: null, origin: "ORIGINAL", originManual: true, featureKey: null },
    assets: input.assets.map(asset => ({ ...asset, file: { mimeType: "image/png" } })),
    parts: input.parts.map((part, index) => ({ ...part, id: `part-${index}`, position: index, acceptedAnswers: part.acceptedAnswers.map(value => ({ value })),
      options: part.options.map((option, optionIndex) => ({ ...option, id: `option-${optionIndex}`, position: optionIndex })) })),
  } as unknown as Version;
}
function service(current: Version | null = version(), source: SourceQuestion | null = null) {
  const reads: string[] = [];
  const readers: TeacherPreviewReaders = {
    readVersion: async (who, id) => { reads.push(who.id + ":" + id); return current; },
    sourceQuestion: async value => { reads.push("source:" + value.id); return source; },
  };
  return { readers, reads };
}
const code = (expected: string) => (error: unknown) => error instanceof Error && error.message === expected;

test("teacher preview requires a real teacher/admin and rejects both lens modes before reading material", async () => {
  const s = service();
  await assert.rejects(() => teacherTaskPreview(null, "task", { versionId: "version-1" }, "en", s.readers), code("LOGIN_REQUIRED"));
  await assert.rejects(() => teacherTaskPreview(actor("STUDENT"), "task", { versionId: "version-1" }, "en", s.readers), code("FORBIDDEN"));
  for (const mode of ["ROLE", "USER"] as const) {
    const admin = actor("ADMIN"), lens = { mode, role: "TEACHER", targetId: mode === "USER" ? "teacher" : null, nonce: "nonce", label: "Test lens", expiresAt: new Date(Date.now() + 60000).toISOString() } as ViewLens;
    await inRequestView({ real: admin, actor: actor(), sessionId: "test", lens }, () => assert.rejects(() => teacherTaskPreview(actor(), "task", { versionId: "version-1" }, "en", s.readers), code("EXIT_VIEW_FIRST")));
  }
  assert.deepEqual(s.reads, []);
});

test("teacher preview accepts only the exact currently readable immutable version", async () => {
  const s = service();
  await assert.rejects(() => teacherTaskPreview(actor(), "task", { versionId: "old-version" }, "en", s.readers), code("QUESTION_CHANGED"));
  assert.deepEqual(s.reads, ["teacher:task"]);
  await assert.rejects(() => teacherTaskPreview(actor(), "task", {}, "en", s.readers));
  const missing = service(null);
  await assert.rejects(() => teacherTaskPreview(actor(), "task", { versionId: "version-1" }, "en", missing.readers), code("NOT_FOUND"));
  for (const change of [{ origin: "UNKNOWN" }, { examArchivedAt: new Date() }, { archivedAt: new Date() }, { visibility: "PRIVATE", ownerId: "another-teacher" }]) {
    const v = version(); Object.assign(v.task, change); const hidden = service(v);
    await assert.rejects(() => teacherTaskPreview(actor(), "task", { versionId: "version-1" }, "en", hidden.readers), code("NOT_FOUND"));
    assert.deepEqual(hidden.reads, ["teacher:task"]);
  }
  const cambridge = version(); cambridge.source!.name = "Cambridge International";
  await assert.rejects(() => teacherTaskPreview(actor("ADMIN"), "task", { versionId: "version-1" }, "en", service(cambridge).readers), code("NOT_FOUND"));
});

test("the read-only legacy projection preserves every choice and separates the complete teacher answer key", async () => {
  const v = version(), original = JSON.stringify(v), s = service(v);
  const preview = await teacherTaskPreview(actor(), "task", { versionId: "version-1" }, "en", s.readers);
  assert.equal(preview.versionId, "version-1");
  assert.equal(preview.question.parts[0].options.length, 4);
  assert.equal(preview.question.parts[1].prompt, "Calculate the result.");
  assert.equal("answer" in preview.question, false);
  assert.equal("solution" in preview.question, false);
  assert.equal("markScheme" in preview.question, false);
  for (const part of preview.question.parts) {
    assert.equal("answer" in part, false);
    assert.equal(part.options.some(option => "correct" in option), false);
  }
  assert.match(preview.answers.html, /Part \(a\)/);
  assert.match(preview.answers.html, /Option C/);
  assert.match(preview.answers.html, /<p>8<\/p>/);
  assert.match(preview.answers.html, /13/);
  assert.match(preview.solution.html, /independent method/);
  assert.match(preview.guidance.html, /B2: complete choice/);
  assert.equal(preview.guidance.total, 5);
  assert.ok(preview.question.statement.includes("?support="));
  assert.ok(preview.solution.html.includes("?support="));
  assert.equal(preview.solution.assets.find(asset => asset.id === "solution-file")?.embedded, true);
  assert.equal(JSON.stringify(preview).includes("private-teacher-file"), false);
  assert.equal(JSON.stringify(preview).includes("hint-file"), false);
  assert.deepEqual(s.reads, ["teacher:task", "source:version-1"]);
  assert.equal(JSON.stringify(v), original);
});

test("packaged answers, separate worked solutions and per-part criteria retain their original values", () => {
  const v = version(), source: SourceQuestion = {
    id: "editorial-uid", family_uid: "family", title: "Packaged question", collection: "exam", prompt_html: "<p>Stem</p>",
    hint_html: "<p>Hint</p>", answer_html: "<p>Exact packaged answer</p>", solution_html: '<p>Independent packaged explanation.</p><img src="/api/files/solution-file">', marks: 5, difficulty: 2, fields: [],
    parts: [{ label: "a", marking_criteria: [{ code: "B2", marks: 2, description_html: "<p>Complete choice.</p>" }] }, { label: "b", marking_criteria: [{ code: "M1", marks: 1, description_html: "<p>Correct method.</p>" }, { code: "A2", marks: 2, description_html: "<p>Exact answer.</p>", guidance_html: "<p>Accept equivalent form.</p>" }] }],
  };
  const before = JSON.stringify(source), preview = projectTeacherTaskPreview(v, actor(), "en", source);
  assert.match(preview.answers.html, /Exact packaged answer/);
  assert.doesNotMatch(preview.solution.html, /Exact packaged answer/);
  assert.match(preview.solution.html, /Independent packaged explanation/);
  assert.deepEqual(preview.guidance.rows?.map(row => [row.part, row.code, row.marks]), [["a", "B2", 2], ["b", "M1", 1], ["b", "A2", 2]]);
  assert.match(preview.guidance.rows![2].guidance!, /equivalent form/);
  assert.equal(preview.guidance.total, 5);
  assert.equal(JSON.stringify(source), before);
});

test("teacher-preview file grants cannot be replayed as another actor, role, lens or immutable version", () => {
  const data = { fileId: "file", versionId: "version-1", role: "SOLUTION", actorId: "teacher", context: "teacher-preview" as const };
  const token = materialGrant(data), grant = readMaterialGrant(token)!;
  assert.equal(grant.context, "teacher-preview");
  assert.equal(teacherPreviewGrantMatches(grant, actor(), null, "version-1"), true);
  assert.equal(teacherPreviewGrantMatches(grant, actor("ADMIN", "teacher"), null, "version-1"), true);
  assert.equal(teacherPreviewGrantMatches(grant, actor("TEACHER", "another"), null, "version-1"), false);
  assert.equal(teacherPreviewGrantMatches(grant, actor("STUDENT"), null, "version-1"), false);
  assert.equal(teacherPreviewGrantMatches(grant, null, null, "version-1"), false);
  for (const mode of ["ROLE", "USER"]) assert.equal(teacherPreviewGrantMatches(grant, actor(), { mode }, "version-1"), false);
  assert.equal(teacherPreviewGrantMatches(grant, actor(), null, "version-2"), false);
  const old = readMaterialGrant(materialGrant({ fileId: "file", versionId: "version-1", role: "SOLUTION", actorId: "teacher" }))!;
  assert.equal(old.context, undefined);
  assert.equal(teacherPreviewGrantMatches(old, actor(), null, "version-1"), false);
  assert.equal(readMaterialGrant(token + "x"), null);
});

test("packaged lesson previews resolve only current visible UID mappings and delegate the exact version", async () => {
  const pack = contentPackages[0], lesson = pack.lessons[0], source = pack.questions.find(question => question.lesson === lesson.key)!;
  const input = { lessonId: lesson.id, uid: source.id, version: pack.version }, calls: string[] = [];
  const result = projectTeacherTaskPreview(version(), actor(), "en", null);
  const readers: TeacherPackagePreviewReaders = {
    mappings: async (who, topic) => { calls.push(`mappings:${who.id}:${topic.lessonId}`); return new Map([[source.id, "mapped-version"]]); },
    taskIdForVersion: async id => { calls.push("identity:" + id); return "mapped-task"; },
    preview: async (who, taskId, query, lang) => { calls.push(`preview:${who.id}:${taskId}:${query.versionId}:${lang}`); return result; },
  };
  assert.equal(await teacherPackageTaskPreview(actor(), input, "en", readers), result);
  assert.deepEqual(calls, [`mappings:teacher:${lesson.id}`, "identity:mapped-version", "preview:teacher:mapped-task:mapped-version:en"]);
  calls.length = 0;
  await assert.rejects(() => teacherPackageTaskPreview(actor(), { ...input, version: "stale-content-version" }, "en", readers), code("QUESTION_CHANGED"));
  await assert.rejects(() => teacherPackageTaskPreview(actor("STUDENT"), input, "en", readers), code("FORBIDDEN"));
  await assert.rejects(() => teacherPackageTaskPreview(null, input, "en", readers), code("LOGIN_REQUIRED"));
  assert.deepEqual(calls, []);
  const missing = { ...readers, mappings: async () => new Map() };
  await assert.rejects(() => teacherPackageTaskPreview(actor(), input, "en", missing), code("NOT_FOUND"));
  const admin = actor("ADMIN");
  for (const mode of ["ROLE", "USER"] as const) {
    const lens = { mode, role: "TEACHER", targetId: mode === "USER" ? "teacher" : null, nonce: "nonce", label: "Test lens", expiresAt: new Date(Date.now() + 60000).toISOString() } as ViewLens;
    await inRequestView({ real: admin, actor: actor(), sessionId: "test", lens }, () => assert.rejects(() => teacherPackageTaskPreview(actor(), input, "en", readers), code("EXIT_VIEW_FIRST")));
  }
  assert.deepEqual(calls, []);
});

test("file-owner shortcuts cannot bypass a teacher-preview token's lens or current-version restriction", async () => {
  const state = globalThis as unknown as { maths4uDb?: PrismaClient }, previous = state.maths4uDb;
  const owner = actor("TEACHER", "file-owner"), fileId = "owner-file", versionId = "old-version";
  const token = materialGrant({ fileId, versionId, actorId: owner.id, role: "SOLUTION", context: "teacher-preview" });
  const file = { id: fileId, ownerId: owner.id, deletedAt: null, derivatives: [], submissions: [], assets: [{ versionId, role: "SOLUTION", version: { taskId: "task", task: { origin: "ORIGINAL", originManual: true, examArchivedAt: null } } }] };
  state.maths4uDb = {
    storedFile: { findUnique: async () => file },
    task: { count: async () => 0, findFirst: async () => ({ versions: [{ id: "new-version" }] }) },
  } as unknown as PrismaClient;
  try {
    for (const mode of ["ROLE", "USER"] as const) {
      const effective = actor(mode === "ROLE" ? "STUDENT" : "TEACHER", owner.id);
      const lens = { mode, role: mode === "ROLE" ? "STUDENT" : "TEACHER", targetId: mode === "USER" ? owner.id : null, nonce: "nonce", label: "Test lens", expiresAt: new Date(Date.now() + 60000).toISOString() } as ViewLens;
      await inRequestView({ real: actor("ADMIN"), actor: effective, sessionId: "test", lens }, () => assert.rejects(() => download(effective, fileId, "original", token), code("NOT_FOUND")));
    }
    await assert.rejects(() => download(owner, fileId, "original", token), code("NOT_FOUND"));
  } finally { state.maths4uDb = previous; }
});
