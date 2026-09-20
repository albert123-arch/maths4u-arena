import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "../src/lib/prisma";
import { saveTask, publicVersion, versionInclude } from "../src/lib/content";
import { publishWork, startAttempt, getAttempt, practice } from "../src/lib/works";
import { upload } from "../src/lib/files";
import { COOKIE, digest, userSelect, type Actor } from "../src/lib/security";
import { GET, POST } from "../src/app/api/[...path]/route";

// Runs inside the populated-migration suite's new, isolated test database.
export async function verifyAssessmentSources(admin: Actor, student: Actor) {
  assert.equal(process.env.MATHS4U_ENV, "test");
  assert.match(process.env.MATHS4U_DATABASE_NAME!, /^maths4u_test_pilot_/);
  const teacher = await db().user.create({ data: { username: "source_teacher", displayName: "Source privacy teacher",
    passwordHash: "test-fixture-no-login", roles: { create: { role: "TEACHER" } } }, select: userSelect });
  const classroom = await db().classroom.create({ data: { teacherId: teacher.id, title: "Source privacy class", joinCode: randomBytes(8).toString("hex"), members: { create: { userId: student.id } } } });
  const marker = "SOURCE_REFERENCE_PRIVATE", title = "June 2024 p11 q7 " + marker;
  const pixels = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer();
  const inline = await upload(teacher, new File([new Uint8Array(pixels)], marker + ".png", { type: "image/png" }));
  const attachment = await upload(teacher, new File([new Uint8Array(pixels)], marker + "-extra.png", { type: "image/png" }));
  const task = await saveTask(admin, { visibility: "PUBLIC", source: marker, syllabus: "0606", examBoard: "Cambridge", year: 2024, examSession: "June", paper: "11", questionNumber: "7",
    sourceReference: marker, sourceUid: marker, component: "11", seriesCode: "s24", qualification: marker,
    texts: [{ locale: "en", title, statement: `<p>Find \\(x+2024\\).</p><img src="/api/files/${inline.id}" alt="${marker}">`, solution: "WITHHELD_SOLUTION" }],
    parts: [{ kind: "MANUAL", maxPoints: 4, texts: [{ locale: "en", prompt: `<p>Explain.</p><img src="/api/files/${inline.id}" alt="${marker}">`, answer: "WITHHELD_ANSWER", rubric: "WITHHELD_CRITERIA" }] }],
    assets: [{ fileId: inline.id, role: "STATEMENT", caption: marker }, { fileId: attachment.id, role: "STATEMENT", caption: marker }],
  });
  const token = randomBytes(32).toString("hex");
  await db().session.create({ data: { userId: student.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600000) } });
  async function request(route: string, body?: unknown, authenticated = true) {
    const method = body === undefined ? "GET" : "POST";
    const response = await (method === "GET" ? GET : POST)(new Request(process.env.APP_URL + "/api/" + route, {
      method, headers: { origin: process.env.APP_URL!, ...(authenticated ? { cookie: `${COOKIE}=${token}` } : {}), "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { params: Promise.resolve({ path: route.split("?")[0].split("/") }) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Cache-Control")!, /no-store/);
    return response;
  }
  function concealed(dto: Awaited<ReturnType<typeof getAttempt>>) {
    assert.equal(dto.sourcesHidden, true);
    const serialized = JSON.stringify(dto);
    assert.ok(!serialized.includes(marker));
    assert.ok(!serialized.includes(title));
    const question = dto.questions[0];
    assert.ok(["Problem 1", "Задача 1"].includes(question.title));
    for (const field of ["taskId", "source", "syllabus", "examBoard", "year", "examSession", "paper", "questionNumber", "sourceReference", "sourceUid"]) assert.ok(!(field in question), field + " must not be sent");
    assert.ok(!serialized.includes("WITHHELD_"));
    assert.ok(question.statement.includes("2024"), "Numbers in mathematical content must not be scrubbed");
    assert.match(question.statement, new RegExp(`/api/files/${inline.id}`));
    assert.ok(!question.statement.includes("katex-error"));
    assert.ok(question.assets.every(a => !a.caption.includes(marker)));
    assert.equal(question.parts[0].kind, "MANUAL");
    assert.equal(question.parts[0].maxPoints, 4);
  }
  for (const kind of ["HOMEWORK", "TEST"] as const) {
    const work = await publishWork(teacher, { kind, classId: classroom.id, title: "Assigned work", taskIds: [task.taskId],
      opensAt: new Date(Date.now() - 60000), dueAt: new Date(Date.now() + 3600000), attemptsAllowed: 2, resultPolicy: "MANUAL", revealSolutions: true });
    assert.ok(!JSON.stringify(await (await request("works/" + work.id)).json()).includes(marker), "Work landing page must not leak question metadata");
    const attempt = await startAttempt(student, work.id);
    concealed(await (await request(`attempts/${attempt.id}?lang=en`)).json());
    concealed(await getAttempt(student, attempt.id, "ru"));
    for (const manager of [teacher, admin]) {
      const dto = await getAttempt(manager, attempt.id, "en");
      assert.equal(dto.sourcesHidden, false); assert.equal(dto.questions[0].title, title); assert.equal(dto.questions[0].source, marker);
    }
    const saved = await (await request(`attempts/${attempt.id}/save?lang=en`, { revision: 0, answers: [] })).json();
    concealed(saved);
    const submitted = await (await request(`attempts/${attempt.id}/submit?lang=en`, { revision: saved.revision, answers: [] })).json();
    assert.equal(submitted.sourcesHidden, false); assert.equal(submitted.questions[0].title, title); assert.equal(submitted.questions[0].source, marker);
    assert.equal(submitted.resultVisible, false); assert.equal(submitted.questions[0].solution, undefined, "Revealing the source must not release solutions or scores");
    const second = await startAttempt(student, work.id, true);
    concealed(await getAttempt(student, second.id, "en"));
    await db().attempt.update({ where: { id: second.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await getAttempt(student, second.id, "en");
    assert.equal(expired.timedOut, true); assert.equal(expired.sourcesHidden, false); assert.equal(expired.questions[0].title, title);
  }
  const practiceWork = await practice(student, task.taskId), practiceAttempt = await startAttempt(student, practiceWork.id);
  const training = await getAttempt(student, practiceAttempt.id, "en");
  assert.equal(training.sourcesHidden, false); assert.equal(training.questions[0].title, title); assert.equal(training.questions[0].source, marker);
  const version = await db().taskVersion.findUniqueOrThrow({ where: { id: task.id }, include: versionInclude });
  assert.equal(publicVersion(version, "en").title, title, "Teacher library and source snapshots retain the original metadata");
  for (const authenticated of [true, false]) for (const variant of ["original", "preview", "thumbnail"]) {
    const response = await request(`files/${attachment.id}?variant=${variant}`, undefined, authenticated);
    assert.ok(!response.headers.get("Content-Disposition")!.includes(marker));
    assert.match(response.headers.get("Content-Disposition")!, /material\.(png|webp)/);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
  assert.equal((await db().storedFile.findUniqueOrThrow({ where: { id: attachment.id } })).originalName, marker + "-extra.png");
}
