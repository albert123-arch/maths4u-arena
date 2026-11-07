import { freshIndependent } from "./dashboard-evidence";
import { squareSnapshot, type Evidence } from "./square-model";

export type DashboardQuestion = { id: string; versionId: string; uid: string | null; title: string; family: string; collection: string; quick: boolean; examStyle: boolean; maximum: number };
export type DashboardStudy = { taskId: string; at: number; needsRepeat: boolean; helped: boolean; solved: boolean; verified: boolean; selfChecked: boolean; selfPoints: number | null; attemptId: string; inProgress: boolean; expiresAt: number };
export type DashboardLesson = {
  id: string; title: string; href: string; position: number; notesRead: boolean; openedAt: number;
  course: { id: string; slug: string; title: string; position: number; code: string | null };
  chapter: { id: string; slug: string; title: string; position: number };
  questions: DashboardQuestion[]; evidence: Evidence[]; studies: DashboardStudy[];
};
export type DashboardMarkedQuestion = { taskId: string; courseId: string; at: number; attemptId?: string; source: "teacher" | "automatic" | "self"; points: number; maximum: number };
export type DashboardSegments = { solved: number; tried: number; due: number; untouched: number; total: number };
export type DashboardAssignmentInput = { id: string; title: string; classTitle: string | null; opensAt: number; dueAt: number; totalQuestions: number; maximum: number; latest: { id: string; status: string; expiresAt: number; answeredQuestions: number; points: number | null } | null };
export function validDashboardTimeZone(value: string) { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; } catch { return false; } }

export function dashboardAssignment(input: DashboardAssignmentInput, now: number) {
  const a = input.latest;
  const status = a ? a.status === "IN_PROGRESS" ? a.expiresAt <= now ? "EXPIRED" : "IN_PROGRESS" : a.status : input.opensAt > now ? "UPCOMING" : input.dueAt < now ? "OVERDUE" : "NOT_STARTED";
  return { ...input, status, latestAttemptId: a?.id ?? null, href: a ? "/attempts/" + a.id : "/works/" + input.id,
    questionsDone: a?.answeredQuestions ?? 0, questionsTotal: input.totalQuestions, points: a?.points ?? null, maxPoints: input.maximum, overdue: input.dueAt < now && ["NOT_STARTED", "OVERDUE", "IN_PROGRESS", "EXPIRED"].includes(status) };
}

export function prioritizeDashboardAssignments<T extends { id: string; dueAt: number; status: string }>(cards: T[]) {
  const priority = (status: string) => ["OVERDUE", "IN_PROGRESS", "NOT_STARTED", "EXPIRED"].includes(status) ? 0 : status === "SUBMITTED" ? 1 : status === "UPCOMING" ? 2 : 3;
  return [...cards].sort((a, b) => priority(a.status) - priority(b.status) || a.dueAt - b.dueAt || a.id.localeCompare(b.id));
}

const emptySegments = (): DashboardSegments => ({ solved: 0, tried: 0, due: 0, untouched: 0, total: 0 });
const plusSegments = (items: DashboardSegments[]) => items.reduce((s, x) => ({ solved: s.solved + x.solved, tried: s.tried + x.tried, due: s.due + x.due, untouched: s.untouched + x.untouched, total: s.total + x.total }), emptySegments());
const statusFor = (segments: DashboardSegments) => segments.due ? "DUE" : segments.total > 0 && segments.solved === segments.total ? "SOLVED" : segments.solved + segments.tried ? "IN_PROGRESS" : "NOT_STARTED";

export function dashboardActivity(timestamps: number[], now: number, timeZone = "UTC") {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const localDay = (at: number) => { const p = Object.fromEntries(formatter.formatToParts(at).map(p => [p.type, p.value])); return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)); };
  const day = 86400000, today = localDay(now), weekday = (new Date(today).getUTCDay() + 6) % 7, monday = today - weekday * day;
  const counts = new Map<number, number>();
  for (const at of timestamps) if (Number.isFinite(at) && at > 0 && at <= now) { const date = localDay(at); counts.set(date, (counts.get(date) ?? 0) + 1); }
  const days = Array.from({ length: 7 }, (_, i) => { const at = monday + i * day, count = counts.get(at) ?? 0; return { date: new Date(at).toISOString().slice(0, 10), active: count > 0, eventCount: count, future: at > today }; });
  return { timeZone, basis: "recorded-actions" as const, days, activeDays: days.filter(d => d.active).length, lastActivityAt: Math.max(0, ...timestamps.filter(at => Number.isFinite(at) && at <= now)) || null };
}

/** Recorded checks are evidence of answers, never a prediction of an exam grade. */
export function studentDashboardModel(input: { lessons: DashboardLesson[]; now: number; analytics: boolean; marks: DashboardMarkedQuestion[]; activityAt: number[]; bookmarkedCount: number; timeZone?: string }) {
  const { now } = input;
  const models = input.lessons.map(l => {
    const evidence = [...l.evidence].sort((a, b) => a.at - b.at || a.eventKey.localeCompare(b.eventKey)), snapshot = squareSnapshot(evidence);
    const latestStudies = l.studies.filter((s, i, all) => all.findIndex(x => x.taskId === s.taskId) === i);
    const quick = l.questions.filter(q => q.quick), basisQuestions = quick.length ? quick : l.questions;
    const families = [...new Set(basisQuestions.map(q => q.family))], segments = emptySegments();
    for (const family of families) {
      const ids = new Set(basisQuestions.filter(q => q.family === family).map(q => q.id));
      const events = evidence.filter(e => e.family === family), studies = latestStudies.filter(s => ids.has(s.taskId)), state = snapshot.states[family];
      segments.total++;
      if (state?.dueAt <= now || studies.some(s => s.needsRepeat)) segments.due++;
      else if (freshIndependent(events) || !quick.length && studies.some(s => s.verified && s.solved && !s.helped)) segments.solved++;
      else if (events.length || studies.length) segments.tried++;
      else segments.untouched++;
    }
    const quickFamilies = [...new Set(quick.map(q => q.family))];
    const quickChecked = quickFamilies.filter(f => evidence.some(e => e.family === f) || latestStudies.some(s => quick.some(q => q.family === f && q.id === s.taskId))).length;
    const written = l.questions.filter(q => !q.quick), writtenWorked = written.filter(q => latestStudies.some(s => s.taskId === q.id && (s.selfChecked || s.verified))).length;
    const due = Object.values(snapshot.states).some(s => s.dueAt <= now) || latestStudies.some(s => s.needsRepeat);
    const helped = evidence.some(e => e.correct && e.helpUsed) || latestStudies.some(s => s.solved && s.helped);
    const tried = evidence.length > 0 || l.studies.length > 0;
    const state = due ? "DUE" : freshIndependent(evidence) ? "FRESH_INDEPENDENT" : helped ? "WITH_HELP" : tried ? "TRIED" : "NOT_TRIED";
    const last = Math.max(0, l.openedAt, ...evidence.map(e => e.at), ...l.studies.map(s => s.at)), active = l.studies[0];
    const resumeHref = active?.inProgress && active.expiresAt > now && active.at === last ? "/attempts/" + active.attemptId : null;
    const quickReviewItems = quickFamilies.filter(f => snapshot.states[f]).map(family => {
      const pool = quick.filter(q => q.family === family).sort((a, b) => (snapshot.seen[a.uid ?? a.id] ?? 0) - (snapshot.seen[b.uid ?? b.id] ?? 0) || (a.uid ?? a.id).localeCompare(b.uid ?? b.id));
      const q = pool[0], s = snapshot.states[family];
      return { uid: q.uid ?? q.id, family, lessonId: l.id, lessonTitle: l.title, courseTitle: l.course.title, courseId: l.course.id,
        title: q.title, href: q.uid ? l.href + "?item=" + encodeURIComponent(q.uid) + "#practice" : l.href + "?mode=SHORT&reviewTask=" + encodeURIComponent(q.id) + "#practice",
        dueAt: s.dueAt, reason: !s.correct ? "Try a fresh question after your last answer" : s.helpUsed ? "Try again without help" : "Spaced review is due", failed: !s.correct };
    });
    const reviews = quickReviewItems.filter(q => q.dueAt <= now);
    const writtenReviews = latestStudies.filter(s => s.needsRepeat && !quick.some(q => q.id === s.taskId)).flatMap(s => {
      const q = written.find(q => q.id === s.taskId); if (!q) return [];
      return [{ uid: q.uid ?? q.id, family: q.family, lessonId: l.id, lessonTitle: l.title, courseTitle: l.course.title, courseId: l.course.id, title: q.title,
        href: q.uid ? l.href + "?item=" + encodeURIComponent(q.uid) + "#practice" : l.href + "?mode=WRITTEN&reviewTask=" + encodeURIComponent(q.id) + "#practice", dueAt: s.at, reason: "You marked this question for another attempt", failed: true }];
    });
    return { lesson: l, snapshot, segments, basis: quick.length ? "quick-check-families" as const : "recorded-question-practice" as const,
      topic: { id: l.id, title: l.title, href: l.href, resumeHref, state, notesRead: l.notesRead, last },
      practised: tried, quickChecked, quickTotal: quickFamilies.length, writtenWorked, writtenTotal: written.length, reviews: [...reviews, ...writtenReviews], mistakes: [...quickReviewItems.filter(q => q.failed), ...writtenReviews] };
  });
  const byOrder = [...models].sort((a, b) => a.lesson.course.position - b.lesson.course.position || a.lesson.chapter.position - b.lesson.chapter.position || a.lesson.position - b.lesson.position || a.lesson.id.localeCompare(b.lesson.id));
  const topics = models.map(m => m.topic).sort((a, b) => b.last - a.last || a.title.localeCompare(b.title));
  const resume = topics.find(t => t.last > 0) ?? null, current = resume ? models.find(m => m.topic.id === resume.id)! : byOrder[0];
  const reviewQuestions = models.flatMap(m => m.reviews).sort((a, b) => Number(b.failed) - Number(a.failed) || a.dueAt - b.dueAt || a.uid.localeCompare(b.uid));
  const mistakeQuestions = [...new Map(models.flatMap(m => m.mistakes).map(q => [q.lessonId + ":" + q.family, q])).values()].sort((a, b) => a.dueAt - b.dueAt || a.uid.localeCompare(b.uid));
  const courseIds = [...new Set(byOrder.map(m => m.lesson.course.id))];
  const courses = courseIds.map(id => {
    const rows = byOrder.filter(m => m.lesson.course.id === id), course = rows[0].lesson.course;
    const chapters = [...new Set(rows.map(m => m.lesson.chapter.id))].map(chapterId => {
      const chapterRows = rows.filter(m => m.lesson.chapter.id === chapterId), chapter = chapterRows[0].lesson.chapter, segments = plusSegments(chapterRows.map(m => m.segments));
      const next = chapterRows.find(m => !m.lesson.notesRead || m.segments.untouched > 0 || m.segments.due > 0) ?? chapterRows[0];
      return { id: chapter.id, title: chapter.title, href: "/courses/" + course.slug + "/chapters/" + chapter.slug, status: statusFor(segments), segments,
        basis: chapterRows.every(m => m.basis === "quick-check-families") ? "quick-check-families" : "mixed-recorded-practice",
        notesRead: chapterRows.filter(m => m.lesson.notesRead).length, practisedLessons: chapterRows.filter(m => m.practised).length, totalLessons: chapterRows.length,
        quickChecked: chapterRows.reduce((n, m) => n + m.quickChecked, 0), quickTotal: chapterRows.reduce((n, m) => n + m.quickTotal, 0),
        writtenWorked: chapterRows.reduce((n, m) => n + m.writtenWorked, 0), writtenTotal: chapterRows.reduce((n, m) => n + m.writtenTotal, 0), nextLesson: { title: next.lesson.title, href: next.topic.resumeHref ?? next.lesson.href } };
    });
    const segments = plusSegments(rows.map(m => m.segments)), latest = [...rows].sort((a, b) => b.topic.last - a.topic.last)[0];
    const next = rows.find(m => !m.lesson.notesRead || m.segments.untouched > 0 || m.segments.due > 0) ?? rows[0];
    return { ...course, href: "/courses/" + course.slug, chapters, segments, basis: chapters.every(c => c.basis === "quick-check-families") ? "quick-check-families" : "mixed-recorded-practice",
      status: statusFor(segments), practisedLessons: rows.filter(m => m.practised).length, totalLessons: rows.length, notesRead: rows.filter(m => m.lesson.notesRead).length,
      nextLesson: { title: next.lesson.title, href: next.topic.resumeHref ?? next.lesson.href }, resume: latest.topic.last ? { title: latest.lesson.title, href: latest.topic.resumeHref ?? latest.lesson.href } : null };
  });
  const examQuestions = input.lessons.flatMap(l => l.questions.filter(q => q.examStyle).map(q => ({ ...q, courseId: l.course.id }))), examIds = new Set(examQuestions.map(q => q.id));
  const marks = input.marks.filter(m => examIds.has(m.taskId));
  // Retakes replace the entire older question result, not just whichever
  // source happened to mark it. Teacher and automatic parts of one attempt
  // remain separate; a self-awarded score never replaces a verified result.
  const attemptKey = (m: DashboardMarkedQuestion) => m.attemptId ?? String(m.at);
  const latestMarks = marks.filter((m, i, all) => !all.some((other, j) => other.taskId === m.taskId &&
    (m.source === "self" ? other.source === "self" : other.source !== "self") &&
    (other.at > m.at || other.at === m.at && (attemptKey(other) > attemptKey(m) || attemptKey(other) === attemptKey(m) && m.source === "self" && j > i))));
  function readiness(courseId?: string) {
    const qs = examQuestions.filter(q => !courseId || q.courseId === courseId), ids = new Set(qs.map(q => q.id)), ms = latestMarks.filter(m => ids.has(m.taskId));
    const markedBy = Object.fromEntries((["teacher", "automatic", "self"] as const).map(source => { const rows = ms.filter(m => m.source === source); return [source, { questions: new Set(rows.map(m => m.taskId)).size, earnedMarks: rows.reduce((n, m) => n + m.points, 0), availableMarks: rows.reduce((n, m) => n + m.maximum, 0) }]; })) as Record<DashboardMarkedQuestion["source"], { questions: number; earnedMarks: number; availableMarks: number }>;
    const verified = ms.filter(m => m.source !== "self"), markedQuestions = new Set(verified.map(m => m.taskId)).size, earnedMarks = verified.reduce((n, m) => n + m.points, 0), availableMarks = verified.reduce((n, m) => n + m.maximum, 0), totalQuestions = ids.size;
    return { markedQuestions, totalQuestions, earnedMarks, availableMarks, coverage: totalQuestions ? markedQuestions / totalQuestions : 0, average: availableMarks ? earnedMarks / availableMarks * 100 : null, markedBy, sourcesMayOverlap: true, basis: "published-graded-exam-style-results" as const, predictedGrade: null };
  }
  const latestActivity = [...input.activityAt, ...models.flatMap(m => [...m.lesson.evidence.filter(e => !e.imported).map(e => e.at), ...m.lesson.studies.map(s => s.at), m.lesson.openedAt])];
  return { serverNow: now, topics, review: topics.filter(t => t.state === "DUE"), continue: resume,
    currentLesson: current ? { ...current.topic, courseId: current.lesson.course.id, courseTitle: current.lesson.course.title, chapterTitle: current.lesson.chapter.title,
      quickChecked: current.quickChecked, quickTotal: current.quickTotal, writtenWorked: current.writtenWorked, writtenTotal: current.writtenTotal,
      nextStepHref: current.topic.resumeHref ?? (current.quickChecked ? current.lesson.href + "#practice" : current.lesson.href + "#notes") } : null,
    courses, reviewQuestions, mistakeQuestions, activity: dashboardActivity(latestActivity, now, input.timeZone),
    focusAreas: input.analytics ? models.map(m => ({ lessonId: m.lesson.id, title: m.lesson.title, courseTitle: m.lesson.course.title, href: m.reviews[0]?.href ?? m.lesson.href + "#practice", dueCount: m.reviews.length,
      incorrectCount: Object.values(m.snapshot.states).filter(s => !s.correct).length, helpedCount: Object.values(m.snapshot.states).filter(s => s.helpUsed).length })).filter(m => m.dueCount || m.incorrectCount || m.helpedCount).sort((a, b) => b.incorrectCount - a.incorrectCount || b.dueCount - a.dueCount) : null,
    examReadiness: input.analytics ? { ...readiness(), courses: courses.map(c => ({ id: c.id, title: c.title, ...readiness(c.id) })) } : null,
    notebook: { bookmarkedCount: input.bookmarkedCount, bookmarksHref: "/bookmarks", mistakesCount: mistakeQuestions.length, firstHref: mistakeQuestions[0]?.href ?? null, mistakesHref: mistakeQuestions[0]?.href ?? "/student/notebook#mistakes" },
  };
}
