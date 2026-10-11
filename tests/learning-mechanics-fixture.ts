import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/prisma";
import { type Actor, userSelect, COOKIE, digest } from "../src/lib/security";
import { saveTask } from "../src/lib/content";
import { catalog, courseCatalog } from "../src/lib/catalog";
import { beginStudy, revealStudyHelp } from "../src/lib/study";
import { getAttempt, mutateAttempt, publishWork, startAttempt } from "../src/lib/works";
import { classProgress } from "../src/lib/class-progress";
import { myProgress } from "../src/lib/student-progress";
import { editClass } from "../src/lib/classrooms";
import { GET } from "../src/app/api/[...path]/route";

export async function verifyLearningMechanics(admin: Actor) {
  const suffix = randomBytes(4).toString("hex");
  const create = (role: "STUDENT" | "TEACHER", name: string) => db().user.create({ data: { username: `learning_${name}_${suffix}`, displayName: name,
    passwordHash: "test-no-login", roles: { create: { role } }, profile: { create: { locale: "en" } } }, select: userSelect });
  const student = await create("STUDENT", "Alex"), outsider = await create("STUDENT", "Sam"), mentor = await create("TEACHER", "Taylor"), stranger = await create("TEACHER", "Morgan");
  const classroom = await db().classroom.create({ data: { teacherId: mentor.id, title: "Learning mechanics test", joinCode: suffix,
    members: { create: [{ userId: student.id }, { userId: outsider.id }] } } });
  const otherClass = await db().classroom.create({ data: { teacherId: stranger.id, title: "Private other class", joinCode: "other" + suffix, members: { create: { userId: student.id } } } });
  const course = await db().course.create({ data: { slug: "learning-" + suffix, published: true, texts: { create: { locale: "en", title: "Practice modes", description: "Test" } } } });
  const chapter = await db().topic.create({ data: { courseId: course.id, slug: "algebra", texts: { create: { locale: "en", title: "Algebra" } } } });
  const lesson = await db().lesson.create({ data: { topicId: chapter.id, versions: { create: { number: 1, texts: { create: { locale: "en", title: "Equations", body: "Notes", examples: "Example" } } } } } });
  const text = [{ locale: "en", prompt: "Find x", answer: "4" }];
  const numeric = { kind: "NUMERIC", maxPoints: 1, numericAnswer: 4, texts: text };
  const choice = { kind: "CHOICE", maxPoints: 1, texts: text, options: [3, 4, 5].map(n => ({ correct: n === 4, texts: [{ locale: "en", text: String(n) }] })) };
  const manual = { kind: "MANUAL", maxPoints: 2, texts: text };
  const inputs = [choice, numeric, { kind: "SHORT", maxPoints: 1, acceptedAnswers: ["quadratic"], texts: text }, manual];
  const tasks = [];
  for (let n = 0; n < inputs.length + 1; n++) {
    const v = await saveTask(admin, { visibility: "PUBLIC", materialCategory: "TRAINING", texts: [{ locale: "en", title: "Learning question " + n, statement: "Question", hint: "Hint", solution: "Solution" }],
      parts: n === inputs.length ? [choice, manual] : [inputs[n]] });
    tasks.push(v.taskId); await db().lessonTask.create({ data: { lessonId: lesson.id, taskId: v.taskId, position: n } });
  }
  const privateTask = await saveTask(admin, { visibility: "PRIVATE", texts: [{ locale: "en", title: "Private MC", statement: "Secret" }], parts: [choice] });
  await db().lessonTask.create({ data: { lessonId: lesson.id, taskId: privateTask.taskId, position: 5 } });
  const counts = (await courseCatalog(student, "en", course.slug))[0].chapters[0].topics[0].questionCounts;
  assert.deepEqual(counts, { MC: 1, SHORT: 2, WRITTEN: 2 }, "Mixed questions are written; private questions excluded");
  assert.equal((await catalog(null, "en", { topic: lesson.id, mode: "MC" })).total, 1);
  assert.equal((await catalog(student, "en", { topic: lesson.id, mode: "SHORT" })).total, 2);
  assert.equal((await catalog(student, "en", { topic: lesson.id, mode: "WRITTEN" })).total, 2);
  await assert.rejects(catalog(null, "en", { topic: lesson.id, progress: "SOLVED" }), /LOGIN_REQUIRED/);
  const submit = async (taskId: string, value: string, help = false) => {
    const a = await beginStudy(student, { taskId, lessonId: lesson.id }, "en");
    if (help) await revealStudyHelp(student, a.id, { kind: "hint" }, "en");
    const dto = await getAttempt(student, a.id, "en"), p = dto.questions[0].parts[0];
    const response = p.kind === "CHOICE" ? { optionId: p.options[Number(value)].id, value: "" } : { value };
    await mutateAttempt(student, a.id, { revision: dto.revision, answers: [{ partId: p.id, response }] }, true);
    return a.id;
  };
  await submit(tasks[0], "1"); await submit(tasks[1], "4", true);
  assert.equal((await catalog(student, "en", { topic: lesson.id, progress: "SOLVED" })).total, 2);
  assert.equal((await catalog(student, "en", { topic: lesson.id, progress: "UNSOLVED" })).total, 3);
  assert.equal((await catalog(outsider, "en", { topic: lesson.id, progress: "ATTEMPTED" })).total, 0);
  await submit(tasks[0], "0");
  assert.equal((await catalog(student, "en", { topic: lesson.id, progress: "SOLVED" })).total, 1, "Latest unsuccessful retry replaces the solved status");
  assert.equal((await catalog(student, "en", { topic: lesson.id, progress: "ATTEMPTED" })).total, 2);
  const ownWork = await publishWork(mentor, { title: "Unpublished teacher results", kind: "HOMEWORK", classId: classroom.id, taskIds: [tasks[1]],
    opensAt: new Date(Date.now() - 1000), dueAt: new Date(Date.now() + 3600000), resultPolicy: "MANUAL" });
  const a = await startAttempt(student, ownWork.id), dto = await getAttempt(student, a.id, "en");
  await mutateAttempt(student, a.id, { revision: dto.revision, answers: [{ partId: dto.questions[0].parts[0].id, response: { value: "4" } }] }, true);
  const privateWork = await publishWork(stranger, { title: "Other teacher private assignment", kind: "HOMEWORK", classId: otherClass.id, taskIds: [tasks[1]],
    opensAt: new Date(Date.now() - 1000), dueAt: new Date(Date.now() + 3600000) });
  const privateAttempt = await startAttempt(student, privateWork.id);
  const own = await myProgress(student, "en");
  assert.equal(own.summary.attempts, 5);
  assert.equal(own.topics[0].totalTasks, 5, "Own progress totals exclude private questions");
  assert.equal(own.attempts.find(r => r.id === a.id)?.score, null, "Self progress must respect unpublished result policy");
  assert.equal(own.attempts.find(r => r.id === a.id)?.resultVisible, false);
  assert.ok(!JSON.stringify(own).includes("optionId"), "Progress reports never contain answer content");
  const group = await classProgress(mentor, classroom.id);
  assert.equal(group.summary.students, 2); assert.equal(group.summary.started, 1);
  assert.equal(group.students.find(s => s.id === student.id)?.attempts, 4, "Other teacher's private assignment excluded");
  assert.equal(group.students.find(s => s.id === student.id)?.practiceTasks, 2);
  assert.equal(group.students.find(s => s.id === student.id)?.withoutHelp, 0);
  assert.equal(group.students.find(s => s.id === outsider.id)?.attempts, 0);
  await assert.rejects(classProgress(stranger, classroom.id), /NOT_FOUND/);
  await assert.rejects(classProgress(student, classroom.id), /FORBIDDEN/);
  assert.equal((await getAttempt(student, privateAttempt.id)).sourcesHidden, true, "Source hiding remains active for assigned work");
  const token = randomBytes(32).toString("hex");
  await db().session.create({ data: { userId: student.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600000) } });
  const route = ["learning", "progress"];
  const response = await GET(new Request(process.env.APP_URL + "/api/learning/progress?studentId=" + outsider.id, { headers: { cookie: `${COOKIE}=${token}` } }), { params: Promise.resolve({ path: route }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).student.id, student.id, "Own progress cannot select another student");
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const guest = await GET(new Request(process.env.APP_URL + "/api/learning/progress"), { params: Promise.resolve({ path: route }) });
  assert.equal(guest.status, 401);
  await editClass(mentor, classroom.id, { userId: student.id, remove: true });
  assert.equal((await classProgress(mentor, classroom.id)).students.length, 1);
  await editClass(mentor, classroom.id, { archive: true }); await assert.rejects(classProgress(mentor, classroom.id), /NOT_FOUND/);
  await saveTask(admin, { visibility: "PUBLIC", texts: [{ locale: "en", title: "Updated question", statement: "Question" }], parts: [choice] }, tasks[3]);
  assert.equal((await catalog(null, "en", { topic: lesson.id, mode: "MC" })).total, 2, "Answer mode uses the latest version");
  assert.deepEqual((await courseCatalog(student, "en", course.slug))[0].questionCounts, { MC: 2, SHORT: 2, WRITTEN: 1 });
}
