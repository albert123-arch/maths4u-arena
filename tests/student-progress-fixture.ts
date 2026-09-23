import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { db } from "../src/lib/prisma";
import { type Actor, COOKIE, digest, userSelect, transaction } from "../src/lib/security";
import { saveTask } from "../src/lib/content";
import { studentProgress } from "../src/lib/student-progress";
import { beginStudy, revealStudyHelp, selfCheckStudy } from "../src/lib/study";
import { createWork, workSchema, getAttempt, mutateAttempt, gradeAttempt, publishWork, startAttempt, workResults, publishResults } from "../src/lib/works";
import { download, upload } from "../src/lib/files";
import { editClass } from "../src/lib/classrooms";
import { GET, POST } from "../src/app/api/[...path]/route";

export async function verifyStudentProgress(admin: Actor) {
  assert.equal(process.env.MATHS4U_ENV, "test");
  assert.match(process.env.MATHS4U_DATABASE_NAME!, /^maths4u_test_pilot_/);
  const user = (username: string, role: "TEACHER" | "STUDENT") => db().user.create({ data: {
    username, displayName: username === "progress_student" ? "Alex · progress preview" : username,
    passwordHash: "test-fixture-no-login", roles: { create: { role } }, profile: { create: { locale: "en" } },
  }, select: userSelect });
  const mentor = await user("progress_teacher", "TEACHER"), stranger = await user("progress_other_teacher", "TEACHER");
  const student = await user("progress_student", "STUDENT"), outsider = await user("progress_other_student", "STUDENT");
  const classroom = await db().classroom.create({ data: { title: "Progress preview class", teacherId: mentor.id, joinCode: randomBytes(8).toString("hex"),
    members: { create: [{ userId: student.id }, { userId: outsider.id }] } } });
  const otherClass = await db().classroom.create({ data: { title: "Other teacher's private class", teacherId: stranger.id, joinCode: randomBytes(8).toString("hex"), members: { create: { userId: student.id } } } });
  // Revoke the second teacher for now; later restore to test concurrent reviews.
  await editClass(stranger, otherClass.id, { userId: student.id, remove: true });
  const course = await db().course.create({ data: { slug: "progress-fixture", published: true, texts: { create: { locale: "en", title: "Independent learning", description: "Synthetic test course" } } } });
  const chapter = await db().topic.create({ data: { courseId: course.id, slug: "algebra", texts: { create: { locale: "en", title: "Algebra" } } } });
  const lesson = await db().lesson.create({ data: { topicId: chapter.id, versions: { create: { number: 1, texts: { create: { locale: "en", title: "Quadratic equations", body: "Theory", examples: "" } } } } } });
  const pixels = await sharp({ create: { width: 100, height: 60, channels: 3, background: "#cee5df" } }).png().toBuffer();
  const solutionFile = await upload(admin, new File([new Uint8Array(pixels)], "solution.png", { type: "image/png" }));
  const task = await saveTask(admin, { visibility: "PUBLIC", texts: [{ locale: "en", title: "Independent quadratic exercise", statement: "<p>Solve \\(x^2-5x+6=0\\).</p>", hint: "Factor the expression.", solution: "The roots are 2 and 3.", markScheme: "One mark for factorisation." }],
    parts: [{ kind: "MANUAL", maxPoints: 5, texts: [{ locale: "en", prompt: "Explain your reasoning.", answer: "2 and 3", rubric: "Show the steps." }] }], assets: [{ fileId: solutionFile.id, role: "SOLUTION", caption: "Worked solution" }] });
  await db().lessonTask.create({ data: { lessonId: lesson.id, taskId: task.taskId, position: 0 } });
  await db().learningProgress.create({ data: { userId: student.id, lessonId: lesson.id, completed: true } });
  const attempt = await beginStudy(student, { taskId: task.taskId, lessonId: lesson.id }, "en");
  let dto = await getAttempt(student, attempt.id, "en");
  const partId = dto.questions[0].parts[0].id;
  const answerFile = await upload(student, new File([new Uint8Array(pixels)], "my-working.png", { type: "image/png" }), attempt.id, partId);
  dto = await getAttempt(student, attempt.id, "en");
  await mutateAttempt(student, attempt.id, { revision: dto.revision, answers: [{ partId, response: { value: "(x-2)(x-3)=0, so x=2 or x=3." } }] });
  await assert.rejects(getAttempt(mentor, attempt.id), /NOT_FOUND/);
  await assert.rejects(download(mentor, answerFile.id), /NOT_FOUND/);
  let progress = await studentProgress(mentor, classroom.id, student.id, "en");
  assert.equal(progress.summary.inProgress, 1); assert.equal(progress.attempts[0].canOpen, false);
  assert.ok(!JSON.stringify(progress).includes("(x-2)(x-3)"), "Progress lists never expose saved answer drafts");
  assert.equal((await studentProgress(mentor, classroom.id, outsider.id, "en")).summary.attempts, 0);
  await assert.rejects(studentProgress(stranger, classroom.id, student.id, "en"), /NOT_FOUND/);
  await assert.rejects(studentProgress(student, classroom.id, student.id, "en"), /FORBIDDEN/);
  await assert.rejects(studentProgress(mentor, classroom.id, stranger.id, "en"), /NOT_FOUND/);
  await revealStudyHelp(student, attempt.id, { kind: "hint" }, "en");
  dto = await getAttempt(student, attempt.id);
  await mutateAttempt(student, attempt.id, { revision: dto.revision, answers: [] }, true);
  await selfCheckStudy(student, attempt.id, { state: "NEEDS_REPEAT" });
  const reviewed = await getAttempt(mentor, attempt.id, "en");
  assert.equal(reviewed.manager, false); assert.equal(reviewed.practiceReview, true);
  assert.equal(reviewed.questions[0].solution, "The roots are 2 and 3.");
  assert.equal((reviewed.answers[0].response as { value: string }).value, "(x-2)(x-3)=0, so x=2 or x=3.");
  for (const variant of ["original", "preview", "thumbnail"]) assert.ok((await download(mentor, answerFile.id, variant)).data.length);
  assert.ok((await download(mentor, solutionFile.id)).data.length);
  await assert.rejects(download(student, solutionFile.id), /NOT_FOUND/, "Teacher viewing references must not reveal them to the student");
  await assert.rejects(getAttempt(stranger, attempt.id), /NOT_FOUND/);
  await assert.rejects(download(stranger, answerFile.id), /NOT_FOUND/);
  await assert.rejects(gradeAttempt(stranger, attempt.id, { reviews: [{ partId, points: 5 }] }), /NOT_FOUND/);
  await assert.rejects(workResults(mentor, reviewed.workId), /NOT_FOUND/);
  await assert.rejects(publishResults(mentor, reviewed.workId), /NOT_FOUND/);
  await gradeAttempt(mentor, attempt.id, { reviews: [{ partId, points: 4, comment: "Good factorisation; explain the final step.", revision: 0 }] });
  dto = await getAttempt(student, attempt.id);
  assert.equal(dto.score, 4); assert.match(dto.answers[0].comment!, /Good factorisation/); assert.ok(dto.study?.needsRepeat);
  progress = await studentProgress(mentor, classroom.id, student.id, "en");
  assert.equal(progress.summary.graded, 1); assert.equal(progress.summary.theoryRead, 1); assert.equal(progress.summary.needsRepeat, 1);
  assert.equal(progress.topics[0].practised, 1); assert.equal(progress.topics[0].withoutHelp, 0);
  assert.equal(progress.attempts[0].helpUsed, true); assert.equal(progress.attempts[0].files, 1);
  await editClass(stranger, otherClass.id, { userId: student.id, remove: false });
  await assert.rejects(gradeAttempt(stranger, attempt.id, { reviews: [{ partId, points: 3, revision: 0 }] }), /STALE_REVIEW/);
  const privateWork = await publishWork(stranger, { classId: otherClass.id, title: "Other teacher's homework", taskIds: [task.taskId], opensAt: new Date(Date.now() - 1000), dueAt: new Date(Date.now() + 60000) });
  const privateAttempt = await startAttempt(student, privateWork.id);
  await mutateAttempt(student, privateAttempt.id, { revision: 0, answers: [] }, true);
  await assert.rejects(getAttempt(mentor, privateAttempt.id), /NOT_FOUND/);
  await assert.rejects(gradeAttempt(mentor, privateAttempt.id, { reviews: [{ partId, points: 3 }] }), /NOT_FOUND/);
  const work = await publishWork(mentor, { classId: classroom.id, title: "Class assignment", taskIds: [task.taskId], opensAt: new Date(Date.now() - 1000), dueAt: new Date(Date.now() + 3600000) });
  const assignedAttempt = await startAttempt(student, work.id);
  assert.equal((await getAttempt(student, assignedAttempt.id)).sourcesHidden, true);
  const repeat = await beginStudy(student, { taskId: task.taskId, lessonId: lesson.id }, "en");
  progress = await studentProgress(mentor, classroom.id, student.id, "en");
  assert.equal(progress.topics[0].practised, 1); assert.equal(progress.topics[0].completed, 0); assert.equal(progress.summary.needsRepeat, 0);
  assert.equal(progress.total, 3); assert.ok(!progress.attempts.some(a => a.id === privateAttempt.id));
  await db().attempt.update({ where: { id: repeat.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await getAttempt(mentor, repeat.id)).timedOut, true);
  for (let n = 0; n < 21; n++) {
    const w = await transaction(tx => createWork(tx, student, workSchema.parse({ kind: "PRACTICE", title: "Problem-bank practice " + (n + 1), taskIds: [task.taskId], opensAt: new Date(Date.now() - 1000), dueAt: new Date(Date.now() + 3600000), resultPolicy: "AFTER_SUBMIT" })));
    const a = await startAttempt(student, w.id); await mutateAttempt(student, a.id, { revision: 0, answers: [] }, true);
  }
  const p1 = await studentProgress(mentor, classroom.id, student.id, "en", { kind: "PRACTICE", page: 1 });
  const p2 = await studentProgress(mentor, classroom.id, student.id, "ru", { kind: "PRACTICE", page: 2 });
  assert.equal(p1.total, 23); assert.equal(p1.attempts.length, 20); assert.equal(p2.attempts.length, 3);
  assert.ok(!p1.attempts.some(a => p2.attempts.some(b => a.id === b.id)));
  assert.equal((await studentProgress(mentor, classroom.id, student.id, "en", { lessonId: lesson.id })).total, 2);
  assert.equal((await studentProgress(mentor, classroom.id, student.id, "en", { kind: "ASSIGNED" })).total, 1);
  const token = randomBytes(32).toString("hex");
  await db().session.create({ data: { userId: mentor.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600000) } });
  const apiPath = `classes/${classroom.id}/students/${student.id}/progress`;
  const response = await GET(new Request(process.env.APP_URL + "/api/" + apiPath, { headers: { cookie: `${COOKIE}=${token}` } }), { params: Promise.resolve({ path: apiPath.split("/") }) });
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal((await response.json()).total, 24);
  const guest = await GET(new Request(process.env.APP_URL + "/api/" + apiPath), { params: Promise.resolve({ path: apiPath.split("/") }) });
  assert.equal(guest.status, 401);
  await editClass(mentor, classroom.id, { userId: student.id, remove: true });
  await assert.rejects(studentProgress(mentor, classroom.id, student.id, "en"), /NOT_FOUND/);
  await assert.rejects(getAttempt(mentor, attempt.id), /NOT_FOUND/);
  await assert.rejects(download(mentor, answerFile.id), /NOT_FOUND/);
  await assert.rejects(gradeAttempt(mentor, attempt.id, { reviews: [{ partId, points: 5, revision: 1 }] }), /NOT_FOUND/);
  await editClass(mentor, classroom.id, { userId: student.id, remove: false });
  await editClass(mentor, classroom.id, { archive: true });
  await assert.rejects(getAttempt(mentor, attempt.id), /NOT_FOUND/);
  await assert.rejects(download(mentor, answerFile.id, "preview"), /NOT_FOUND/);
  await assert.rejects(studentProgress(mentor, classroom.id, student.id, "en"), /NOT_FOUND/);
  await editClass(mentor, classroom.id, { archive: false });
  const postPath = `attempts/${attempt.id}/review`;
  const denied = await POST(new Request(process.env.APP_URL + "/api/" + postPath, { method: "POST", headers: { origin: "https://untrusted.example", cookie: `${COOKIE}=${token}`, "content-type": "application/json" }, body: "{}" }), { params: Promise.resolve({ path: postPath.split("/") }) });
  assert.equal(denied.status, 403);
  if (process.env.PILOT_LOCAL_TEST === "1") {
    await mkdir(".local/student-progress", { recursive: true });
    await writeFile(".local/student-progress/runtime.json", JSON.stringify(Object.fromEntries(["MATHS4U_ENV", "MATHS4U_DATABASE_URL", "MATHS4U_DATABASE_NAME", "PRIVATE_STORAGE_PATH", "APP_URL"].map(key => [key, process.env[key]]))));
    await writeFile(".local/student-progress/preview.json", JSON.stringify({ teacher: mentor.username, student: student.username, classId: classroom.id, studentId: student.id, attemptId: attempt.id, lessonId: lesson.id }));
  }
}
