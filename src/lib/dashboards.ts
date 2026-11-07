import { db } from "./prisma";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { type Actor, admin } from "./security";
import { localized } from "./content";
import { displayTitle } from "./public-presentation";
import { taskPermission } from "./catalog";
import { listWorks, maySeeResult } from "./works";
import { lensAttemptScope, userViewTeacher } from "./request-view";
import { progressInclude, studyProgressStatus } from "./practice-progress";
import { quadraticTopics } from "./square-model";
import { questionsForTopic } from "./square-content";
import { contentPackages, packageTopic } from "./content-package-content";
import { visibleLessonWhere, approvedWhere, restrictedWhere } from "./content-access";
import { hasFeature } from "./subscriptions";
import { dashboardAssignment, prioritizeDashboardAssignments, studentDashboardModel, validDashboardTimeZone, type DashboardLesson, type DashboardMarkedQuestion } from "./student-dashboard-model";

const dashboardProgressInclude = {
  ...progressInclude,
  attempt: { include: { ...progressInclude.attempt.include,
    workVersion: { include: { ...progressInclude.attempt.include.workVersion.include, work: { select: { kind: true, resultsPublishedAt: true } } } },
  } },
} satisfies Prisma.PracticeStudyInclude;

export async function studentDashboard(actor: Actor, lang: string, input: unknown = {}) {
  // This dashboard is English; stored course/content translations are untouched.
  lang = "en";
  const { timeZone } = z.object({ timeZone: z.string().max(100).refine(validDashboardTimeZone, "Invalid time zone").default("UTC") }).parse(input);
  const now = Date.now(), teacherLens = !!userViewTeacher();
  const [works, selected, permission, analytics, aiChecking] = await Promise.all([
    listWorks(actor),
    db().course.findMany({ where: { published: true, archivedAt: null, followers: { some: { userId: actor.id } } }, orderBy: [{ position: "asc" }, { id: "asc" }], include: { texts: true } }),
    taskPermission(actor), teacherLens ? false : hasFeature(actor, "student_analytics"), teacherLens ? false : hasFeature(actor, "ai_check"),
  ]);
  const selections = await Promise.all(selected.map(async course => ({ course, locked: !!course.featureKey && (teacherLens || !await hasFeature(actor, course.featureKey)) })));
  const courses = selections.filter(s => !s.locked).map(s => s.course), courseIds = courses.map(c => c.id);
  // A student's learning dashboard never turns into the administrator archive.
  const permittedTask: Prisma.TaskWhereInput = { AND: [permission, approvedWhere, { examArchivedAt: null, visibility: "PUBLIC" }] };
  // Saved questions remain available after unfollowing a course, as on /bookmarks.
  const bookmarkWhere = { userId: actor.id, task: permittedTask };
  const [lessons, bookmarks, bookmarkedCount, packages, materialCourses] = await Promise.all([
    db().lesson.findMany({ where: { archivedAt: null, ...visibleLessonWhere(actor), tasks: { some: { task: permittedTask } }, topic: { courseId: { in: courseIds } } }, include: {
      topic: { include: { texts: true } }, versions: { take: 1, orderBy: { number: "desc" }, select: { texts: true } }, progress: { where: { userId: actor.id } },
      tasks: { where: { task: permittedTask }, select: { taskId: true, task: { select: { versions: { take: 1, orderBy: { number: "desc" }, select: { id: true, sourceUid: true, materialCategory: true, texts: { select: { locale: true, title: true } }, parts: { select: { kind: true, maxPoints: true } } } } } } } },
      practiceStudies: { where: { task: permittedTask, attempt: { userId: actor.id, AND: [lensAttemptScope()] } }, include: dashboardProgressInclude, orderBy: { updatedAt: "desc" } },
    } }),
    db().taskBookmark.findMany({ where: bookmarkWhere, take: 6, orderBy: { createdAt: "desc" }, include: { task: { include: { versions: { take: 1, orderBy: { number: "desc" }, select: { texts: true } } } } } }),
    db().taskBookmark.count({ where: bookmarkWhere }),
    db().contentPackage.findMany({ where: { state: "PUBLISHED", courseId: { in: courseIds } }, select: { key: true, version: true } }),
    db().topic.findMany({ where: { courseId: { in: selected.map(c => c.id) }, lessons: { some: { archivedAt: null, tasks: { some: { task: permittedTask } } } } }, distinct: ["courseId"], select: { courseId: true } }),
  ]);
  const lessonIds = new Set(lessons.map(l => l.id));
  const practiceTopics = [...quadraticTopics, ...contentPackages.filter(p => packages.some(s => s.key === p.key && s.version === p.version)).flatMap(p => p.lessons.map(l => packageTopic(l.id)!))].filter(t => lessonIds.has(t.lessonId));
  const descriptors = new Map(practiceTopics.map(t => [t.lessonId, new Map(questionsForTopic(t.key).map(q => [q.id, q]))]));
  const versionIds = [...new Set(lessons.flatMap(l => l.tasks.flatMap(t => t.task.versions.map(v => v.id))))];
  const taskIds = [...new Set(lessons.flatMap(l => l.tasks.map(t => t.taskId)))];
  const [checks, attempts, assignmentDetails] = await Promise.all([
    // IndependentCheck has no teacher/attempt relationship. A teacher USER lens
    // cannot use this summary to inspect the learner's private self-study.
    teacherLens ? [] : db().independentCheck.findMany({ where: { userId: actor.id, taskVersionId: { in: versionIds } }, orderBy: [{ checkedAt: "asc" }, { id: "asc" }], select: { eventKey: true, taskVersionId: true, contentVersion: true, correct: true, helpUsed: true, imported: true, checkedAt: true } }),
    db().attempt.findMany({ where: { userId: actor.id, AND: [lensAttemptScope()], workVersion: { items: { some: { taskVersion: { taskId: { in: taskIds } } }, none: { taskVersion: { task: restrictedWhere } } } } }, orderBy: [{ startedAt: "desc" }, { id: "desc" }], include: {
      workVersion: { include: { work: { select: { id: true, kind: true, title: true, resultsPublishedAt: true } }, items: { include: { taskVersion: { select: { taskId: true, texts: { select: { locale: true, title: true } }, parts: { select: { id: true, kind: true, maxPoints: true } } } } } } } },
      answers: { select: { partId: true, response: true, savedAt: true, autoPoints: true, _count: { select: { files: true } }, review: { select: { id: true, points: true, comment: true, reviewedAt: true, reviewer: { select: { displayName: true } } } } } },
    } }),
    db().work.findMany({ where: { id: { in: works.filter(w => w.kind !== "PRACTICE" && !w.archived).map(w => w.id) }, versions: { none: { items: { some: { taskVersion: { task: restrictedWhere } } } } } }, select: { id: true, versions: { take: 1, orderBy: { number: "desc" }, select: { id: true, items: { select: { maxPoints: true, taskVersion: { select: { taskId: true } } } } } } } }),
  ]);
  const modelLessons: DashboardLesson[] = lessons.map(l => {
    const course = courses.find(c => c.id === l.topic.courseId)!, topic = practiceTopics.find(t => t.lessonId === l.id);
    const questions = l.tasks.flatMap(t => { const v = t.task.versions[0]; if (!v) return []; const q = v.sourceUid ? descriptors.get(l.id)?.get(v.sourceUid) : null;
      const quick = q ? !["exam", "mixed"].includes(q.collection) && q.fields.length > 0 : v.parts.length > 0 && v.parts.every(p => p.kind !== "MANUAL");
      return [{ id: t.taskId, versionId: v.id, uid: q?.id ?? null, title: displayTitle(localized(v.texts, lang)?.title ?? "Question"), family: q?.family_uid ?? t.taskId, collection: q?.collection ?? (quick ? "short" : "exam"), quick, examStyle: q ? ["exam", "mixed"].includes(q.collection) : v.materialCategory === "EXAM", maximum: v.parts.reduce((sum, p) => sum + p.maxPoints, 0) }];
    });
    const byVersion = new Map(questions.map(q => [q.versionId, q]));
    const evidence = checks.flatMap(e => { const q = byVersion.get(e.taskVersionId); return q && (!topic || topic.packageKey || e.contentVersion === topic.version) ? [{ eventKey: e.eventKey, uid: q.uid ?? q.id, family: q.family, correct: e.correct, helpUsed: e.helpUsed, imported: e.imported, at: e.checkedAt.getTime() }] : []; });
    return { id: l.id, title: displayTitle(localized(l.versions[0]?.texts ?? [], lang)?.title ?? "Topic"), href: `/courses/${course.slug}/topics/${l.id}`, position: l.position, notesRead: !!l.progress[0]?.completed, openedAt: l.progress[0]?.openedAt.getTime() ?? 0,
      course: { id: course.id, slug: course.slug, title: displayTitle(localized(course.texts, lang).title), position: course.position, code: contentPackages.find(p => p.course.slug === course.slug)?.course.code ?? (course.slug === "maths4u-9709-p1" ? "9709" : null) },
      chapter: { id: l.topic.id, slug: l.topic.slug, title: displayTitle(localized(l.topic.texts, lang).title), position: l.topic.position }, questions, evidence,
      studies: l.practiceStudies.map(s => { const status = studyProgressStatus(s); return { taskId: s.taskId, at: s.updatedAt.getTime(), needsRepeat: s.needsRepeat, helped: status.helpUsed, solved: status.solved, verified: !s.selfDirected && s.attempt.status === "GRADED" && maySeeResult(s.attempt), selfChecked: !!s.selfCheckedAt, selfPoints: s.selfPoints, attemptId: s.attemptId, inProgress: s.attempt.status === "IN_PROGRESS", expiresAt: s.attempt.expiresAt.getTime() }; }),
    };
  });
  const marks: DashboardMarkedQuestion[] = [], feedback: { id: string; comment: string; reviewer: string; reviewedAt: number; href: string; title: string; points: number | null; maxPoints: number }[] = [];
  const activityAt: number[] = [];
  const courseByTask = new Map(modelLessons.flatMap(l => l.questions.map(q => [q.id, l.course.id] as const)));
  for (const a of attempts) {
    const selectedItems = a.workVersion.items.filter(i => courseByTask.has(i.taskVersion.taskId));
    const selectedParts = new Set(selectedItems.flatMap(i => i.taskVersion.parts.map(p => p.id)));
    activityAt.push(a.startedAt.getTime(), ...(a.submittedAt ? [a.submittedAt.getTime()] : []), ...a.answers.filter(answer => selectedParts.has(answer.partId)).map(answer => answer.savedAt.getTime()));
    if (!maySeeResult(a)) continue;
    for (const item of selectedItems) {
      const version = item.taskVersion, answers = a.answers.filter(answer => version.parts.some(p => p.id === answer.partId));
      for (const answer of answers) if (answer.review?.comment.trim()) feedback.push({ id: answer.review.id, comment: answer.review.comment, reviewer: answer.review.reviewer.displayName, reviewedAt: answer.review.reviewedAt.getTime(), href: "/attempts/" + a.id, title: displayTitle(localized(version.texts, lang)?.title ?? a.workVersion.work.title), points: answer.review.points, maxPoints: version.parts.find(p => p.id === answer.partId)!.maxPoints });
      if (a.status !== "GRADED" || !version.parts.every(p => answers.some(answer => answer.partId === p.id && (answer.review?.points ?? answer.autoPoints) !== null))) continue;
      for (const source of ["teacher", "automatic"] as const) {
        const partAnswers = answers.filter(answer => source === "teacher" ? answer.review?.points != null : answer.review?.points == null && answer.autoPoints != null);
        if (!partAnswers.length) continue;
        marks.push({ taskId: version.taskId, courseId: courseByTask.get(version.taskId)!, at: a.startedAt.getTime(), attemptId: a.id, source, points: partAnswers.reduce((n, answer) => n + (source === "teacher" ? answer.review!.points! : answer.autoPoints!), 0), maximum: partAnswers.reduce((n, answer) => n + version.parts.find(p => p.id === answer.partId)!.maxPoints, 0) });
      }
    }
  }
  for (const l of modelLessons) for (const s of l.studies) if (s.selfChecked && s.selfPoints !== null) { const q = l.questions.find(q => q.id === s.taskId); if (q) marks.push({ taskId: q.id, courseId: l.course.id, at: s.at, attemptId: s.attemptId, source: "self", points: s.selfPoints, maximum: q.maximum }); }
  const relevantWorks = works.filter(w => w.kind !== "PRACTICE" && !w.archived && assignmentDetails.some(d => d.id === w.id && d.versions[0]?.items.some(i => courseByTask.has(i.taskVersion.taskId))));
  const assignmentCards = prioritizeDashboardAssignments(relevantWorks.map(w => {
    const version = assignmentDetails.find(d => d.id === w.id)!.versions[0], allowedAttempts = attempts.filter(a => a.workVersionId === version.id), a = allowedAttempts[0];
    const answered = a ? new Set(a.answers.filter(answer => { const r = answer.response as { value?: unknown; optionId?: unknown }; return typeof r.value === "string" && !!r.value.trim() || !!r.optionId || answer._count.files > 0; }).flatMap(answer => a.workVersion.items.filter(i => i.taskVersion.parts.some(p => p.id === answer.partId)).map(i => i.taskVersion.taskId))).size : 0;
    return dashboardAssignment({ id: w.id, title: w.title, classTitle: w.classTitle ?? null, opensAt: w.opensAt.getTime(), dueAt: w.dueAt.getTime(), totalQuestions: version.items.length, maximum: version.items.reduce((n, i) => n + i.maxPoints, 0),
      latest: a ? { id: a.id, status: a.status, expiresAt: a.expiresAt.getTime(), answeredQuestions: answered, points: a.status === "GRADED" && maySeeResult(a) ? a.answers.reduce((n, answer) => n + (answer.review?.points ?? answer.autoPoints ?? 0), 0) : null } : null }, now);
  }));
  return { ...studentDashboardModel({ lessons: modelLessons, now, analytics, marks, activityAt, bookmarkedCount, timeZone }),
    student: { displayName: actor.displayName }, entitlements: { analytics, aiChecking, aiConnected: false as const }, assignmentCards,
    selectedCourses: selections.map(({ course, locked }) => ({ id: course.id, slug: course.slug, title: displayTitle(localized(course.texts, lang).title), locked, hasMaterials: materialCourses.some(c => c.courseId === course.id) })),
    feedback: feedback.sort((a, b) => b.reviewedAt - a.reviewedAt).slice(0, 6),
    assignments: relevantWorks.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
    bookmarks: bookmarks.map(b => ({ id: b.taskId, title: displayTitle(localized(b.task.versions[0]?.texts ?? [], lang)?.title ?? "Problem"), href: "/library?bookmarks=1#question-" + b.taskId })),
  };
}
export { teacherDashboard, teacherDashboardCounts } from './teacher-dashboard';
export type { TeacherDashboardDto } from './teacher-dashboard';
export async function adminDashboard(actor: Actor) {
  admin(actor);
  const [sources, recordedSources, audit] = await Promise.all([
    // Counts describe recorded metadata only; Stage 6 will classify provenance.
    db().taskVersion.groupBy({ by: ["materialCategory"], _count: true }),
    db().source.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { tasks: true } } } }),
    db().auditEvent.findMany({ take: 50, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, action: true, targetId: true, createdAt: true, actor: { select: { displayName: true, username: true } } } }),
  ]);
  return { sources: sources.map(s => ({ label: s.materialCategory, versions: s._count })), recordedSources: recordedSources.map(s => ({ id: s.id, name: s.name, versions: s._count.tasks })), audit };
}
export type StudentDashboardDto = Awaited<ReturnType<typeof studentDashboard>>;
export type AdminDashboardDto = Awaited<ReturnType<typeof adminDashboard>>;
