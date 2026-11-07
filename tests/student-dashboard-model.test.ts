import test from "node:test";
import assert from "node:assert/strict";
import { dashboardActivity, dashboardAssignment, prioritizeDashboardAssignments, studentDashboardModel, validDashboardTimeZone, type DashboardLesson } from "../src/lib/student-dashboard-model";
import type { Evidence } from "../src/lib/square-model";

const now = Date.parse("2026-11-07T12:00:00Z");
const day = 86400000;
function lesson(): DashboardLesson { return { id: "momentum", title: "Signed impulse", href: "/courses/mechanics/topics/momentum", position: 0, notesRead: false, openedAt: 0,
  course: { id: "mechanics", slug: "mechanics", title: "9231 Further Mechanics", position: 0, code: "9231" }, chapter: { id: "chapter", slug: "momentum", title: "Momentum", position: 0 },
  questions: [{ id: "t1", versionId: "v1", uid: "q1", title: "Impulse one", family: "impulse", collection: "short", quick: true, examStyle: false, maximum: 2 }, { id: "t2", versionId: "v2", uid: "q2", title: "Impulse two", family: "impulse", collection: "variant", quick: true, examStyle: false, maximum: 2 }, { id: "written", versionId: "vw", uid: "w1", title: "Successive impacts", family: "written", collection: "exam", quick: false, examStyle: true, maximum: 8 }], evidence: [], studies: [] }; }
function event(uid: string, correct: boolean, at: number, extras: Partial<Evidence> = {}): Evidence { return { eventKey: uid + at, uid, family: "impulse", correct, helpUsed: false, imported: false, at, ...extras }; }
function model(l: DashboardLesson, extras: Partial<Parameters<typeof studentDashboardModel>[0]> = {}) { return studentDashboardModel({ lessons: [l], now, analytics: true, marks: [], activityAt: [], bookmarkedCount: 9, ...extras }); }

test("notes and first correct answers do not claim fresh independent mastery", () => {
  const l = lesson(); l.notesRead = true; l.openedAt = now - 1000;
  const read = model(l); assert.equal(read.topics[0].state, "NOT_TRIED"); assert.equal(read.courses[0].segments.untouched, 1); assert.equal(read.courses[0].practisedLessons, 0);
  l.evidence = [event("q1", true, now - 100)]; const first = model(l);
  assert.equal(first.courses[0].segments.solved, 0); assert.equal(first.courses[0].segments.tried, 1); assert.equal(first.currentLesson?.quickChecked, 1); assert.equal(first.currentLesson.quickTotal, 1);
});
test("retrying a seen answer stays tried; only a new independent variant turns green", () => {
  const l = lesson(); l.evidence = [event("q1", false, now - 1000), event("q1", true, now - 500)];
  assert.equal(model(l).courses[0].segments.solved, 0);
  l.evidence.push(event("q2", true, now - 100)); const fresh = model(l);
  assert.equal(fresh.topics[0].state, "FRESH_INDEPENDENT"); assert.equal(fresh.courses[0].segments.solved, 1);
  l.evidence.push(event("q2", false, now - 50)); const failed = model(l);
  assert.equal(failed.courses[0].segments.solved, 0); assert.equal(failed.courses[0].segments.due, 1); assert.equal(failed.reviewQuestions.length, 1);
});
test("helped or imported variants do not certify independent success", () => {
  for (const extras of [{ helpUsed: true }, { imported: true }]) { const l = lesson(); l.evidence = [event("q1", true, now - 2000), event("q2", true, now - 1000, extras)]; assert.equal(model(l).courses[0].segments.solved, 0); }
});
test("review links choose an unseen fresh variant and deduplicate paired variants", () => {
  const l = lesson(); l.evidence = [event("q1", false, now - 1000)]; const d = model(l);
  assert.equal(d.reviewQuestions.length, 1); assert.equal(d.reviewQuestions[0].uid, "q2"); assert.match(d.reviewQuestions[0].href, /item=q2#practice$/);
  assert.equal(d.notebook.mistakesCount, 1); assert.equal(d.notebook.bookmarkedCount, 9); assert.equal(d.courses[0].segments.total, 1);
});
test("the notebook retains incorrect families before due time and includes written repeat flags", () => {
  const l = lesson();
  // A check can arrive concurrently after the dashboard's request clock.
  // Notebook membership must not depend on the due-now filter.
  l.evidence = [event("q1", false, now + 1)];
  l.studies = [{ taskId: "written", at: now - 100, needsRepeat: true, helped: false, solved: false, verified: false, selfChecked: true, selfPoints: 0, attemptId: "paper", inProgress: true, expiresAt: now + day }];
  const d = model(l, { analytics: false });
  assert.equal(d.reviewQuestions.length, 1); assert.equal(d.reviewQuestions[0].uid, "w1");
  assert.equal(d.mistakeQuestions.length, 2); assert.equal(d.mistakeQuestions.find(q => q.family === "impulse")?.uid, "q2");
  assert.equal(d.notebook.mistakesCount, 2); assert.equal(d.notebook.firstHref, d.mistakeQuestions[0].href); assert.equal(d.notebook.mistakesHref, d.mistakeQuestions[0].href);
});
test("self-awarded written scores stay separate from verified marks and green segments", () => {
  const l = lesson(); l.studies = [{ taskId: "written", at: now - 100, needsRepeat: false, helped: false, solved: true, verified: false, selfChecked: true, selfPoints: 8, attemptId: "paper", inProgress: true, expiresAt: now + day }];
  const d = model(l, { marks: [{ taskId: "written", courseId: "mechanics", at: now - 100, source: "self", points: 8, maximum: 8 }] });
  assert.equal(d.currentLesson?.writtenWorked, 1); assert.equal(d.examReadiness?.markedQuestions, 0); assert.equal(d.examReadiness.average, null); assert.equal(d.examReadiness.markedBy.self.earnedMarks, 8); assert.equal(d.courses[0].segments.solved, 0);
});
test("a retake replaces the older complete result while mixed marking sources stay distinct", () => {
  const d = model(lesson(), { marks: [
    { taskId: "written", courseId: "mechanics", at: now - 2000, attemptId: "old", source: "automatic", points: 4, maximum: 8 },
    { taskId: "written", courseId: "mechanics", at: now - 1000, attemptId: "new", source: "teacher", points: 5, maximum: 6 },
    { taskId: "written", courseId: "mechanics", at: now - 1000, attemptId: "new", source: "automatic", points: 1, maximum: 2 },
    { taskId: "written", courseId: "mechanics", at: now - 50, attemptId: "self", source: "self", points: 8, maximum: 8 },
  ] });
  assert.equal(d.examReadiness?.markedQuestions, 1); assert.equal(d.examReadiness.earnedMarks, 6); assert.equal(d.examReadiness.availableMarks, 8); assert.equal(d.examReadiness.average, 75);
  assert.equal(d.examReadiness.markedBy.teacher.questions, 1); assert.equal(d.examReadiness.markedBy.automatic.earnedMarks, 1); assert.equal(d.examReadiness.markedBy.self.earnedMarks, 8); assert.equal(d.examReadiness.predictedGrade, null);
});
test("free accounts receive no detailed analytics in JSON but keep learning and review", () => {
  const l = lesson(); l.evidence = [event("q1", false, now - 1000)]; const d = model(l, { analytics: false });
  assert.equal(d.focusAreas, null); assert.equal(d.examReadiness, null); assert.equal(d.reviewQuestions.length, 1); assert.equal(d.courses.length, 1); assert.equal(d.notebook.mistakesCount, 1);
});
test("chapter segments and lesson coverage use real practice rather than note completion", () => {
  const first = lesson(), second = { ...lesson(), id: "next", title: "Next lesson", position: 1, notesRead: true, questions: lesson().questions.map(q => ({ ...q, id: q.id + "next", family: q.family + "next" })) };
  first.evidence = [event("q1", true, now - 2000), event("q2", true, now - 1000)];
  const d = model(first, { lessons: [first, second] }), c = d.courses[0];
  assert.deepEqual(c.segments, { solved: 1, tried: 0, due: 0, untouched: 1, total: 2 }); assert.equal(c.practisedLessons, 1); assert.equal(c.totalLessons, 2); assert.equal(c.chapters[0].totalLessons, 2);
});
test("assignment cards distinguish unopened, overdue, expired and actually graded work", () => {
  const base = { id: "work", title: "Test", classTitle: "Class", opensAt: now - day, dueAt: now + day, totalQuestions: 4, maximum: 32, latest: null };
  assert.equal(dashboardAssignment(base, now).status, "NOT_STARTED"); assert.equal(dashboardAssignment({ ...base, opensAt: now + day }, now).status, "UPCOMING"); assert.equal(dashboardAssignment({ ...base, dueAt: now - 1 }, now).status, "OVERDUE");
  const a = dashboardAssignment({ ...base, latest: { id: "attempt", status: "IN_PROGRESS", expiresAt: now - 1, answeredQuestions: 2, points: null } }, now);
  assert.equal(a.status, "EXPIRED"); assert.equal(a.questionsDone, 2); assert.equal(a.maxPoints, 32); assert.equal(a.points, null); assert.equal(a.href, "/attempts/attempt");
  const withheld = dashboardAssignment({ ...base, latest: { id: "graded", status: "GRADED", expiresAt: now - 1, answeredQuestions: 4, points: null } }, now);
  assert.equal(withheld.status, "GRADED"); assert.equal(withheld.points, null);
});
test("actionable assignments precede submitted and graded work with stable due-date ordering", () => {
  const cards = [{ id: "grade", dueAt: 1, status: "GRADED" }, { id: "submitted", dueAt: 2, status: "SUBMITTED" }, { id: "z", dueAt: 10, status: "IN_PROGRESS" }, { id: "a", dueAt: 10, status: "NOT_STARTED" }, { id: "overdue", dueAt: 5, status: "OVERDUE" }];
  assert.deepEqual(prioritizeDashboardAssignments(cards).map(c => c.id), ["overdue", "a", "z", "submitted", "grade"]);
  assert.equal(cards[0].id, "grade", "sorting must not mutate the existing assignment DTO array");
});
test("activity uses the requested local week, including timezone date boundaries and DST", () => {
  const n = Date.parse("2026-11-08T20:00:00Z"), timestamp = Date.parse("2026-11-08T19:30:00Z");
  const tashkent = dashboardActivity([timestamp, n + day, 0, NaN], n, "Asia/Tashkent"), utc = dashboardActivity([timestamp], n);
  assert.equal(tashkent.days[0].date, "2026-11-09"); assert.equal(tashkent.days[0].active, true); assert.equal(tashkent.activeDays, 1); assert.equal(utc.days[0].date, "2026-11-02");
  const ny = dashboardActivity([Date.parse("2026-11-01T05:30:00Z"), Date.parse("2026-11-01T06:30:00Z")], Date.parse("2026-11-01T12:00:00Z"), "America/New_York");
  assert.equal(ny.days[6].eventCount, 2); assert.equal(ny.activeDays, 1); assert.equal(validDashboardTimeZone("Not/A_TimeZone"), false); assert.equal(validDashboardTimeZone("UTC"), true);
});
test("no selected content produces an honest empty state", () => {
  const d = model(lesson(), { lessons: [], marks: [] }); assert.equal(d.currentLesson, null); assert.deepEqual(d.courses, []); assert.deepEqual(d.reviewQuestions, []); assert.equal(d.examReadiness?.average, null); assert.equal(d.activity.activeDays, 0);
});
