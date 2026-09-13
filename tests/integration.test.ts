import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { db } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { GET, POST, PATCH } from "../src/app/api/[...path]/route";
import { renderContent } from "../src/lib/content";
import { databaseConfig } from "../src/lib/database-url";

config({ path: ".local/test.env", override: true, quiet: true });
assert.match(process.env.MATHS4U_DATABASE_NAME ?? "", /^maths4u_test(?:_|$)/);
assert.equal(databaseConfig().host, "127.0.0.1");
const origin = process.env.APP_URL!;
async function call(method: "GET" | "POST" | "PATCH", route: string, cookie = "", data?: unknown, extra: Record<string, string> = {}) {
  const request = new Request(origin + "/api/" + route, { method, headers: { cookie, origin, ...(data instanceof FormData ? {} : { "content-type": "application/json" }), ...extra },
    ...(method === "GET" ? {} : { body: data instanceof FormData ? data : JSON.stringify(data ?? {}) }) });
  const response = await ({ GET, POST, PATCH }[method])(request, { params: Promise.resolve({ path: route.split("?")[0].split("/") }) });
  const body = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, body, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "", response };
}
const run = randomBytes(5).toString("hex"), password = randomBytes(24).toString("base64url");
const taskInput = (suffix = "") => ({
  visibility: "PRIVATE", texts: [
    { locale: "ru", title: "Проверка " + run + suffix, statement: "<p>Вычислите \\(8+7\\).</p>", solution: "SOLUTION_SECRET_" + run, teacherNote: "TEACHER_ONLY_" + run },
    { locale: "en", title: "Check " + run + suffix, statement: "<p>Calculate \\(8+7\\).</p>", solution: "SOLUTION_SECRET_" + run, teacherNote: "TEACHER_ONLY_" + run },
  ],
  parts: [
    { kind: "NUMERIC", maxPoints: 2, numericAnswer: 15, tolerance: 0, texts: [{ locale: "ru", answer: "15", rubric: "Two points for 15" }, { locale: "en", answer: "15", rubric: "Two points for 15" }] },
    { kind: "MANUAL", maxPoints: 7, texts: [{ locale: "ru", prompt: "Докажите чётность n(n+1).", answer: "Одно чётно.", rubric: "Partial credit allowed." }, { locale: "en", prompt: "Prove n(n+1) is even.", answer: "One is even.", rubric: "Partial credit allowed." }] },
  ],
});
const workInput = (classId: string, taskId: string, extra = {}) => ({ title: "Integration " + run, classId, taskIds: [taskId],
  opensAt: new Date(Date.now() - 60000).toISOString(), dueAt: new Date(Date.now() + 3600000).toISOString(),
  timeLimitSeconds: 300, attemptsAllowed: 1, resultPolicy: "MANUAL", revealSolutions: true, ...extra });

test("Maths4U API and real MySQL integration", { timeout: 180000 }, async t => {
  await t.test("database configuration rejects ambiguous targets and never echoes malformed credentials", () => {
    const original = process.env.MATHS4U_DATABASE_URL;
    const environment = process.env.MATHS4U_ENV;
    try {
      process.env.MATHS4U_DATABASE_URL = "invalid-private-password-" + run;
      assert.throws(() => databaseConfig(), error => error instanceof Error && error.message === "Invalid Maths4U database connection format.");
      delete process.env.MATHS4U_DATABASE_URL;
      assert.throws(() => databaseConfig(), /Configure MATHS4U_DATABASE_URL/);
      const remote = new URL(original!); remote.hostname = "example.invalid";
      process.env.MATHS4U_DATABASE_URL = remote.toString(); process.env.MATHS4U_ENV = "development";
      assert.throws(() => databaseConfig(), /loopback/);
      const mismatch = new URL(original!); mismatch.pathname = "/unconfirmed_database";
      process.env.MATHS4U_DATABASE_URL = mismatch.toString();
      assert.throws(() => databaseConfig(), /does not match/);
    } finally {
      process.env.MATHS4U_DATABASE_URL = original;
      process.env.MATHS4U_ENV = environment;
    }
  });
  const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: process.env, encoding: "utf8" });
  assert.equal(migration.status, 0, "Test database migration must actually run");
  const root = await db().user.create({ data: { username: "qa_admin_" + run, displayName: "QA administrator", passwordHash: await hashPassword(password), roles: { create: { role: "ADMIN" } }, profile: { create: {} } } });
  const rootLogin = await call("POST", "auth/login", "", { username: root.username, password });
  assert.equal(rootLogin.status, 200);
  const ac = rootLogin.cookie;
  const student = await call("POST", "auth/register", "", { username: "qa_student_" + run, displayName: "QA student", password, role: "ADMIN", roles: ["ADMIN", "TEACHER"] });
  const outsider = await call("POST", "auth/register", "", { username: "qa_outside_" + run, displayName: "QA outsider", password });
  const teacherUser = await call("POST", "auth/register", "", { username: "qa_teacher_" + run, displayName: "QA teacher", password });
  const otherTeacher = await call("POST", "auth/register", "", { username: "qa_otherteacher_" + run, displayName: "QA other teacher", password });
  for (const u of [student, outsider, teacherUser, otherTeacher]) assert.equal(u.status, 201);
  await call("PATCH", "admin/users/" + teacherUser.body.id, ac, { roles: ["TEACHER", "STUDENT"] });
  await call("PATCH", "admin/users/" + otherTeacher.body.id, ac, { roles: ["TEACHER"] });
  const sc = (await call("POST", "auth/login", "", { username: student.body.username, password })).cookie;
  const oc = (await call("POST", "auth/login", "", { username: outsider.body.username, password })).cookie;
  const tc = (await call("POST", "auth/login", "", { username: teacherUser.body.username, password })).cookie;
  const otc = (await call("POST", "auth/login", "", { username: otherTeacher.body.username, password })).cookie;
  let classId: string, taskId: string, workId: string, attemptId: string, originalVersionId: string, fileId: string;

  await t.test("self-registration cannot grant roles; student cannot manage users; CSRF is rejected", async () => {
    assert.deepEqual(student.body.roles.map((r: { role: string }) => r.role), ["STUDENT"]);
    assert.equal((await call("PATCH", "admin/users/" + student.body.id, sc, { roles: ["ADMIN"] })).status, 403);
    assert.equal((await call("POST", "classes", tc, { title: "CSRF" }, { origin: "https://untrusted.example" })).status, 403);
    const row = await db().user.findUniqueOrThrow({ where: { id: student.body.id } });
    assert.match(row.passwordHash, /^\$2[aby]\$12\$/);
  });
  await t.test("teacher creates class, student joins; strangers and other teachers cannot manage it", async () => {
    const c = await call("POST", "classes", tc, { title: "QA class " + run }); assert.equal(c.status, 201); classId = c.body.id;
    assert.equal((await call("POST", "classes/join", sc, { code: c.body.joinCode })).status, 200);
    assert.equal((await call("GET", "classes/" + classId, otc)).status, 404);
    assert.equal((await call("PATCH", "classes/" + classId, otc, { archive: true })).status, 404);
    const members = await call("GET", "classes/" + classId, tc); assert.equal(members.body.members.length, 1);
  });
  await t.test("teacher publishes immutable work; guests cannot start, save or submit", async () => {
    const task = await call("POST", "tasks", tc, taskInput()); assert.equal(task.status, 201); taskId = task.body.taskId; originalVersionId = task.body.id;
    const w = await call("POST", "works", tc, workInput(classId, taskId)); assert.equal(w.status, 201); workId = w.body.id;
    for (const route of ["works/" + workId + "/start", "attempts/unknown/save", "attempts/unknown/submit", "participants/join", "answers/submit"]) {
      assert.equal((await call("POST", route, "", {})).status, 401);
    }
    assert.equal((await call("GET", "works/" + workId, oc)).status, 404);
    assert.equal((await call("POST", "works/" + workId + "/start", oc)).status, 404);
    const summary = await call("GET", "works/" + workId, sc);
    assert.equal(summary.status, 200);
    assert.ok(!JSON.stringify(summary.body).includes("SOLUTION_SECRET"));
    assert.ok(!JSON.stringify(summary.body).includes("Вычислите"));
  });
  await t.test("parallel starts create one attempt before any questions are returned", async () => {
    const starts = await Promise.all(Array.from({ length: 5 }, () => call("POST", "works/" + workId + "/start", sc)));
    starts.forEach(r => assert.equal(r.status, 200));
    assert.equal(new Set(starts.map(s => s.body.id)).size, 1); attemptId = starts[0].body.id;
    assert.equal(await db().attempt.count({ where: { workVersion: { workId }, userId: student.body.id } }), 1);
    const a = await call("GET", "attempts/" + attemptId, sc);
    assert.equal(a.status, 200); assert.equal(a.body.questions[0].id, originalVersionId);
    assert.ok(!("score" in a.body)); assert.ok(!("solution" in a.body.questions[0]));
    assert.ok(!JSON.stringify(a.body).includes("numericAnswer")); assert.ok(!JSON.stringify(a.body).includes("TEACHER_ONLY"));
  });
  await t.test("answers restore after reload; stale saves cannot overwrite a newer answer", async () => {
    const a = await call("GET", "attempts/" + attemptId, sc);
    const numeric = a.body.questions[0].parts[0].id;
    assert.equal((await call("POST", "attempts/" + attemptId + "/save", sc, { revision: 0, answers: [{ partId: numeric, response: { value: "15" } }] })).status, 200);
    const restored = await call("GET", "attempts/" + attemptId, sc);
    assert.equal(restored.body.answers[0].response.value, "15");
    assert.equal((await call("POST", "attempts/" + attemptId + "/save", sc, { revision: 0, answers: [{ partId: numeric, response: { value: "999" } }] })).status, 409);
    assert.equal((await call("GET", "attempts/" + attemptId, oc)).status, 404);
  });
  await t.test("solution photos/PDF are private; invalid file types rejected", async () => {
    const a = await call("GET", "attempts/" + attemptId, sc);
    const f = new FormData(); f.set("attemptId", attemptId); f.set("partId", a.body.questions[0].parts[1].id);
    f.set("file", new File(["%PDF-1.4\n% minimal integration fixture\n%%EOF"], "solution.pdf", { type: "application/pdf" }));
    const result = await call("POST", "files", sc, f); assert.equal(result.status, 201); fileId = result.body.id;
    assert.equal((await call("GET", "files/" + fileId, sc)).status, 200);
    assert.equal((await call("GET", "files/" + fileId, tc)).status, 200);
    assert.equal((await call("GET", "files/" + fileId, ac)).status, 200);
    assert.equal((await call("GET", "files/" + fileId, oc)).status, 404);
    assert.equal((await call("GET", "files/" + fileId, otc)).status, 404);
    assert.equal((await call("GET", "files/" + fileId)).status, 404);
    f.set("file", new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" }));
    assert.equal((await call("POST", "files", sc, f)).status, 415);
  });
  await t.test("editing a task does not change questions, marking rules or maxima in published work", async () => {
    const updated = taskInput(" edited"); updated.parts[0].numericAnswer = 99; updated.parts[0].maxPoints = 10;
    assert.equal((await call("PATCH", "tasks/" + taskId, tc, updated)).status, 200);
    const a = await call("GET", "attempts/" + attemptId, sc);
    assert.equal(a.body.questions[0].id, originalVersionId); assert.equal(a.body.questions[0].parts[0].maxPoints, 2);
    assert.ok(!a.body.questions[0].title.includes("edited"));
  });
  await t.test("parallel submission produces one final submission, preserves saved responses and hides results", async () => {
    const a = await call("GET", "attempts/" + attemptId, sc);
    const submissions = await Promise.all(Array.from({ length: 6 }, () => call("POST", "attempts/" + attemptId + "/submit", sc, { revision: a.body.revision, answers: [] })));
    submissions.forEach(s => { assert.equal(s.status, 200); assert.equal(s.body.status, "SUBMITTED"); assert.ok(!("score" in s.body)); assert.ok(!("solution" in s.body.questions[0])); });
    const row = await db().attempt.findUniqueOrThrow({ where: { id: attemptId } });
    assert.ok(row.submittedAt); assert.equal(row.revision, a.body.revision + 1);
    assert.equal((await call("POST", "works/" + workId + "/start", sc, { newAttempt: true })).status, 409);
    const repeated = await call("POST", "attempts/" + attemptId + "/submit", sc, { revision: 0, answers: [{ partId: a.body.questions[0].parts[0].id, response: { value: "999" } }] });
    assert.equal(repeated.status, 200);
    assert.equal(repeated.body.answers.find((r: { partId: string }) => r.partId === a.body.questions[0].parts[0].id).response.value, "15");
    assert.equal((await db().attempt.findUniqueOrThrow({ where: { id: attemptId } })).submittedAt!.getTime(), row.submittedAt!.getTime());
  });
  await t.test("manual partial marks and comments release only after teacher publication", async () => {
    const a = await call("GET", "attempts/" + attemptId, tc);
    assert.equal(a.body.answers.find((r: { partId: string }) => r.partId === a.body.questions[0].parts[0].id).autoPoints, 2);
    const review = { reviews: [{ partId: a.body.questions[0].parts[1].id, points: 4.5, comment: "Good idea; justify the conclusion." }] };
    assert.equal((await call("POST", "attempts/" + attemptId + "/review", otc, review)).status, 404);
    assert.equal((await call("POST", "attempts/" + attemptId + "/review", tc, review)).status, 200);
    assert.ok(!("score" in (await call("GET", "attempts/" + attemptId, sc)).body));
    assert.equal((await call("POST", "works/" + workId + "/publish-results", tc)).status, 200);
    const result = await call("GET", "attempts/" + attemptId, sc);
    assert.equal(result.body.status, "GRADED"); assert.equal(result.body.score, 6.5); assert.equal(result.body.maxPoints, 9);
    assert.match(result.body.questions[0].solution, /SOLUTION_SECRET/); assert.ok(!JSON.stringify(result.body).includes("TEACHER_ONLY"));
    assert.ok(result.body.answers.some((a: { comment?: string }) => a.comment?.includes("Good idea")));
    const csv = await call("GET", "works/" + workId + "/export", tc); assert.equal(csv.status, 200); assert.match(csv.body, /6.5/);
  });
  await t.test("server expiry accepts only previously saved responses; no new answers/files", async () => {
    const w = await call("POST", "works", tc, workInput(classId, taskId, { resultPolicy: "AFTER_SUBMIT" }));
    const start = await call("POST", "works/" + w.body.id + "/start", sc), id = start.body.id;
    const a = await call("GET", "attempts/" + id, sc), partId = a.body.questions[0].parts[0].id;
    await call("POST", "attempts/" + id + "/save", sc, { revision: 0, answers: [{ partId, response: { value: "99" } }] });
    await db().attempt.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const late = await call("POST", "attempts/" + id + "/save", sc, { revision: 1, answers: [{ partId, response: { value: "late" } }] });
    assert.equal(late.status, 409); assert.equal(late.body.error, "TIME_EXPIRED");
    const ended = await call("GET", "attempts/" + id, sc); assert.equal(ended.body.timedOut, true);
    assert.equal(ended.body.answers.find((x: { partId: string }) => x.partId === partId).response.value, "99");
    assert.equal(ended.body.score, 10);
    const future = await call("POST", "works", tc, workInput(classId, taskId, { opensAt: new Date(Date.now() + 60000), dueAt: new Date(Date.now() + 120000) }));
    assert.equal((await call("POST", "works/" + future.body.id + "/start", sc)).body.error, "WORK_NOT_OPEN");
  });
  await t.test("subscriptions never change roles; paid practice uses limits, school assignments stay free", async () => {
    const plan = await call("POST", "admin/plans", ac, { name: "QA " + run, features: [{ key: "practice." + run, title: "QA practice", usageLimit: 1 }] });
    assert.equal(plan.status, 200);
    const paid = await call("POST", "tasks", ac, { ...taskInput(" paid"), visibility: "PUBLIC", featureKey: "practice." + run });
    assert.equal(paid.status, 201);
    assert.equal((await call("POST", "tasks/" + paid.body.taskId + "/practice", sc)).status, 403);
    const sub = await call("POST", "admin/subscriptions", ac, { userId: student.body.id, planId: plan.body.id, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 86400000), reason: "Integration test grant" });
    assert.equal(sub.status, 201);
    assert.deepEqual((await call("GET", "auth/me", sc)).body.user.roles.map((r: { role: string }) => r.role), ["STUDENT"]);
    assert.equal((await call("POST", "tasks/" + paid.body.taskId + "/practice", sc)).status, 201);
    assert.equal((await call("POST", "tasks/" + paid.body.taskId + "/practice", sc)).status, 403);
    await call("POST", "admin/subscriptions/" + sub.body.id + "/revoke", ac);
    const school = await call("POST", "works", tc, workInput(classId, paid.body.taskId));
    assert.equal(school.status, 201); assert.equal((await call("POST", "works/" + school.body.id + "/start", sc)).status, 200);
    assert.equal((await call("GET", "attempts/" + attemptId, sc)).body.score, 6.5);
  });
  await t.test("repeatable imports preserve legacy identities; malformed imports leave no partial rows", async () => {
    for (const name of ["arena", "maths4u", "olymp"]) {
      const fixture = JSON.parse(readFileSync("fixtures/" + name + ".json", "utf8"));
      const first = await call("POST", "admin/import", ac, fixture); assert.equal(first.status, 200);
      const second = await call("POST", "admin/import", ac, fixture); assert.equal(second.status, 200); assert.equal(second.body.skipped, 1);
    }
    assert.equal((await call("POST", "admin/import", sc, {})).status, 403);
    const before = await db().task.count();
    assert.equal((await call("POST", "admin/import", ac, { project: "arena", records: [{ id: "broken" }] })).status, 400);
    assert.equal(await db().task.count(), before);
  });
  await t.test("single-round olympiad: registration, closed questions, submission, review, controlled release", async () => {
    const closes = Date.now() + 2500;
    const o = await call("POST", "olympiads", tc, { title: "Olympiad " + run, registrationOpensAt: new Date(Date.now() - 60000),
      registrationClosesAt: new Date(closes), groupTitle: "Junior", minAge: 10, maxAge: 14,
      work: workInput(classId, taskId, { title: "Round 1", opensAt: new Date(Date.now() - 1000), dueAt: new Date(closes + 200), kind: "OLYMPIAD" }) });
    assert.equal(o.status, 201); const groupId = o.body.groups[0].id;
    assert.equal((await call("POST", "olympiads/" + o.body.id + "/register", sc, { groupId, age: 20 })).status, 400);
    assert.equal((await call("POST", "olympiads/" + o.body.id + "/register", sc, { groupId, age: 12 })).status, 200);
    const round = await db().olympiadRound.findFirstOrThrow({ where: { olympiadId: o.body.id } });
    assert.equal((await call("POST", "works/" + round.workId + "/start", oc)).status, 404);
    const start = await call("POST", "works/" + round.workId + "/start", sc); assert.equal(start.status, 200);
    const a = await call("GET", "attempts/" + start.body.id, sc); assert.equal(a.body.resultVisible, false);
    const submitted = await call("POST", "attempts/" + start.body.id + "/submit", sc, { revision: 0, answers: [] }); assert.equal(submitted.status, 200);
    assert.equal((await call("POST", "works/" + round.workId + "/publish-results", tc)).status, 409);
    assert.equal((await call("GET", "olympiads/" + o.body.id + "/results", sc)).status, 403);
    const review = await call("POST", "attempts/" + start.body.id + "/review", tc, { reviews: [{ partId: a.body.questions[0].parts[1].id, points: 3, comment: "Olympiad feedback" }] });
    assert.equal(review.status, 200);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, closes + 300 - Date.now())));
    assert.equal((await call("POST", "works/" + round.workId + "/publish-results", tc)).status, 200);
    const result = await call("GET", "attempts/" + start.body.id, sc); assert.equal(result.body.score, 3);
    const standings = await call("GET", "olympiads/" + o.body.id + "/results", sc); assert.equal(standings.status, 200); assert.equal(standings.body[0].score, 3);
  });
  await t.test("archive preserves submissions, marks and private files", async () => {
    assert.equal((await call("POST", "tasks/" + taskId + "/archive", tc)).status, 200);
    assert.equal((await call("PATCH", "classes/" + classId, tc, { archive: true })).status, 200);
    assert.equal((await call("GET", "attempts/" + attemptId, sc)).body.score, 6.5);
    assert.equal((await call("GET", "files/" + fileId, sc)).status, 200);
  });
  await t.test("deadline policy and multiple attempts withhold solutions; numeric, text and choice rules are explicit", async () => {
    // Use a fresh active class because the preceding archive check closed the original.
    const c = await call("POST", "classes", tc, { title: "Policies " + run });
    await call("POST", "classes/join", sc, { code: c.body.joinCode });
    const task = await call("POST", "tasks", tc, { ...taskInput(" rules"), parts: [
      { kind: "SHORT", maxPoints: 1, acceptedAnswers: ["Sum"], caseSensitive: false, texts: [{ locale: "en", answer: "Sum", rubric: "Exact trimmed answer, ignoring case." }] },
      { kind: "CHOICE", maxPoints: 2, texts: [{ locale: "en", answer: "Yes", rubric: "Correct choice" }], options: [
        { correct: true, texts: [{ locale: "en", text: "Yes" }] }, { correct: false, texts: [{ locale: "en", text: "No" }] },
      ] },
    ] });
    const w = await call("POST", "works", tc, workInput(c.body.id, task.body.taskId, { resultPolicy: "AFTER_SUBMIT", attemptsAllowed: 2 }));
    const start = await call("POST", "works/" + w.body.id + "/start", sc);
    const a = await call("GET", "attempts/" + start.body.id, sc);
    const first = await call("POST", "attempts/" + start.body.id + "/submit", sc, { revision: 0, answers: [
      { partId: a.body.questions[0].parts[0].id, response: { value: " sum " } },
      { partId: a.body.questions[0].parts[1].id, response: { value: "", optionId: a.body.questions[0].parts[1].options[0].id } },
    ] });
    assert.equal(first.body.score, 3); assert.equal(first.body.solutionsVisible, false);
    const secondStart = await call("POST", "works/" + w.body.id + "/start", sc, { newAttempt: true });
    const second = await call("POST", "attempts/" + secondStart.body.id + "/submit", sc, { revision: 0, answers: [] });
    assert.equal(second.body.solutionsVisible, true);
    const due = new Date(Date.now() + 1200);
    const timed = await call("POST", "works", tc, workInput(c.body.id, task.body.taskId, { resultPolicy: "AFTER_DEADLINE", dueAt: due }));
    const timedStart = await call("POST", "works/" + timed.body.id + "/start", sc);
    const hidden = await call("POST", "attempts/" + timedStart.body.id + "/submit", sc, { revision: 0, answers: [] });
    assert.equal(hidden.body.resultVisible, false);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, due.getTime() + 50 - Date.now())));
    assert.equal((await call("GET", "attempts/" + timedStart.body.id, sc)).body.resultVisible, true);
    await call("PATCH", "classes/" + c.body.id, tc, { userId: student.body.id, remove: true });
    assert.equal((await call("POST", "classes/join", sc, { code: c.body.joinCode })).body.error, "MEMBERSHIP_REMOVED");
  });
  await t.test("duplicate payment notifications are constrained; public file references cannot expose solutions", async () => {
    await db().paymentEvent.create({ data: { provider: "TEST_ONLY", externalEventId: run, payload: { synthetic: true } } });
    await assert.rejects(db().paymentEvent.create({ data: { provider: "TEST_ONLY", externalEventId: run, payload: { synthetic: true } } }), (e: unknown) => (e as { code: string }).code === "P2002");
    const f = new FormData(); f.set("file", new File(["%PDF-1.4\n%%EOF"], "teacher-solution.pdf", { type: "application/pdf" }));
    const file = await call("POST", "files", ac, f); assert.equal(file.status, 201);
    const task = await call("POST", "tasks", ac, { ...taskInput(" file guards"), visibility: "PUBLIC", assets: [{ fileId: file.body.id, role: "SOLUTION", caption: "Private solution" }] });
    assert.equal(task.status, 201);
    assert.equal((await call("GET", "files/" + file.body.id, sc)).status, 404);
    assert.equal((await call("GET", "files/" + file.body.id)).status, 404);
    assert.equal((await call("POST", "tasks", ac, { ...taskInput(" private submission"), assets: [{ fileId, role: "STATEMENT", caption: "Cannot publish student work" }] })).status, 400);
  });
  await t.test("account blocking, role change and administrator recovery revoke server sessions", async () => {
    assert.equal((await call("PATCH", "admin/users/" + outsider.body.id, ac, { status: "BLOCKED" })).status, 200);
    assert.equal((await call("GET", "works", oc)).status, 401);
    assert.equal((await call("POST", "auth/login", "", { username: outsider.body.username, password })).status, 401);
    await call("PATCH", "admin/users/" + outsider.body.id, ac, { status: "ACTIVE" });
    const recovery = await call("POST", "admin/users/" + outsider.body.id + "/recovery", ac); assert.equal(recovery.status, 200);
    const newPassword = randomBytes(24).toString("base64url");
    assert.equal((await call("POST", "auth/recover", "", { token: recovery.body.token, password: newPassword })).status, 200);
    assert.equal((await call("POST", "auth/recover", "", { token: recovery.body.token, password: newPassword })).status, 400);
    const next = await call("POST", "auth/login", "", { username: outsider.body.username, password: newPassword }); assert.equal(next.status, 200);
    await call("POST", "auth/logout", next.cookie); assert.equal((await call("GET", "works", next.cookie)).status, 401);
  });
  await t.test("login rate limiting persists in database", async () => {
    let response;
    for (let i = 0; i < 9; i++) response = await call("POST", "auth/login", "", { username: "missing_" + run, password: "invalid" });
    assert.equal(response?.status, 429);
  });
  await t.test("HTML, tables and TeX render safely without scripts or remote/solution file bypass", () => {
    const html = renderContent('<p>\\(x^2+1\\)</p><script>alert(1)</script><img src="https://bad.test/x" onerror="alert(1)"><table><tr><td>safe</td></tr></table>');
    assert.match(html, /katex/); assert.match(html, /<table>/); assert.ok(!/script|onerror|bad.test/.test(html));
    const attack = renderContent("\\(\\href{javascript:alert(1)}{x}\\)");
    assert.ok(!attack.includes('href="javascript:'));
  });
  await db().$disconnect();
});
