import {taskPermission} from "./catalog";
import {canUseTeacherLibrary} from "./teacher-account-model";
import {hasFeature} from "./subscriptions";
import { z } from 'zod';
import { db } from './prisma';
import type { Prisma } from '../generated/prisma/client';
import { teacher, type Actor } from './security';
import { ensure } from './errors';
import { approvedWhere, restrictedWhere } from './content-access';
import { mentoredPracticeWhere } from './practice-access';
import { rolePreview } from './request-view';
import { localized } from './content';
import { displayTitle } from './public-presentation';
import { validDashboardTimeZone } from './student-dashboard-model';
import { teacherDashboardModel, hasUnmarkedManualPart, type TeacherAttempt, type TeacherQuestion, type TeacherWork } from './teacher-dashboard-model';

// Keep the historical provenance guard on the whole immutable work, including
// old versions. Staff dashboards are not a route into the administrator archive.
const safeVersions = { none: { items: { some: { taskVersion: { task: restrictedWhere } } } } };
const questionSelect = {
  taskId: true, materialCategory: true, texts: { select: { locale: true, title: true } },
  parts: { select: { id: true, kind: true, maxPoints: true } },
  task: { select: { lessons: { where: { lesson: { archivedAt: null, topic: { course: { published: true, archivedAt: null } } } }, select: { lesson: { select: { id: true, topicId: true, topic: { select: { courseId: true, course: { select: { slug: true } } } } } } } } } },
} satisfies Prisma.TaskVersionSelect;
const attemptSelect = { id: true, userId: true, status: true, startedAt: true, submittedAt: true, gradedAt: true, expiresAt: true,
  user: { select: { displayName: true } },
  study: { select: { hintAt: true, answerAt: true, solutionAt: true, markSchemeAt: true, needsRepeat: true, selfDirected: true } },
  answers: { select: { partId: true, autoPoints: true, review: { select: { points: true } } } },
} satisfies Prisma.AttemptSelect;
type Question = Prisma.TaskVersionGetPayload<{ select: typeof questionSelect }>;
type Attempt = Prisma.AttemptGetPayload<{ select: typeof attemptSelect }>;
function question(q: Question): TeacherQuestion {
  return { id: q.taskId, title: displayTitle(localized(q.texts, 'en')?.title ?? 'Question'), maximum: q.parts.reduce((n, p) => n + p.maxPoints, 0), examStyle: q.materialCategory === 'EXAM',
    locations: q.task.lessons.map(l => ({ courseId: l.lesson.topic.courseId, chapterId: l.lesson.topicId, lessonId: l.lesson.id, href: `/courses/${l.lesson.topic.course.slug}/topics/${l.lesson.id}` })) };
}
function attempt(a: Attempt, questions: Question[]): TeacherAttempt {
  return { id: a.id, userId: a.userId, student: a.user.displayName, status: a.status, startedAt: a.startedAt.getTime(), submittedAt: a.submittedAt?.getTime() ?? null, markedAt:a.gradedAt?.getTime()??null, expiresAt: a.expiresAt.getTime(),
    pending: a.status === 'SUBMITTED' && hasUnmarkedManualPart(questions.flatMap(q=>q.parts),a.answers),
    helped: !!a.study && [a.study.hintAt, a.study.answerAt, a.study.solutionAt, a.study.markSchemeAt].some(Boolean),
    questions: questions.map(q => { const points = q.parts.map(p => { const answer = a.answers.find(answer => answer.partId === p.id); return answer?.review?.points ?? answer?.autoPoints ?? null; });
      return { ...question(q), points: a.status === 'GRADED' && points.length > 0 && points.every(p => p !== null) ? points.reduce<number>((n, p) => n + p!, 0) : null }; }) };
}
function pendingWhere(actor: Actor): Prisma.AttemptWhereInput {
  return { status: 'SUBMITTED',
    AND: [{ workVersion: { work: { versions: safeVersions } } }, { OR: [
      { workVersion: { work: { ownerId: actor.id, kind: { not: 'PRACTICE' }, archivedAt: null, OR: [{ classroom: null }, { classroom: { archivedAt: null } }] } } },
      { AND: [mentoredPracticeWhere(actor), { workVersion: { work: { archivedAt: null } } }] },
    ] }] };
}
export async function teacherDashboardCounts(actor: Actor) {
  teacher(actor);
  if (rolePreview()) return { pendingCount: 0 };
  const rows = await db().attempt.findMany({ where: pendingWhere(actor), select: { userId: true, answers:{select:{partId:true,review:{select:{points:true}}}}, workVersion: { select: { work: { select: { ownerId: true, kind: true } },items:{select:{taskVersion:{select:{parts:{select:{id:true,kind:true}}}}}} } } } });
  return { pendingCount: rows.filter(a => (a.workVersion.work.kind !== 'PRACTICE' || a.workVersion.work.ownerId === a.userId)&&hasUnmarkedManualPart(a.workVersion.items.flatMap(i=>i.taskVersion.parts),a.answers)).length };
}
export async function teacherDashboard(actor: Actor, input: unknown = {}) {
  teacher(actor);
  const options = z.object({ classId: z.string().max(100).optional(), courseId: z.string().max(100).optional(), timeZone: z.string().max(100).refine(validDashboardTimeZone).default('UTC') }).parse(input);
  const now = Date.now(), preview = rolePreview();
  const publicTask = { archivedAt: null, examArchivedAt: null, visibility: 'PUBLIC' as const, ...approvedWhere, AND:[await taskPermission(actor)] };
  const [classes, works, courseRows] = await Promise.all([
    preview ? [] : db().classroom.findMany({ where: { teacherId: actor.id, archivedAt: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, title: true, joinCode: true, members: { where: { removedAt: null }, orderBy: { user: { displayName: 'asc' } }, select: { user: { select: { id: true, displayName: true, username: true } } } } } }),
    preview ? [] : db().work.findMany({ where: { ownerId: actor.id, kind: { not: 'PRACTICE' }, versions: safeVersions }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: {
      id: true, title: true, kind: true, classId: true, archivedAt: true, resultsPublishedAt: true, classroom: { select: { title: true, archivedAt: true } },
      versions: { orderBy: { number: 'desc' }, select: { id: true, opensAt: true, dueAt: true, items: { orderBy: { position: 'asc' }, select: { taskVersion: { select: questionSelect } } }, attempts: { select: attemptSelect } } },
    } }),
    db().course.findMany({ where: { published: true, archivedAt: null, topics: { some: { lessons: { some: { archivedAt: null, tasks: { some: { task: publicTask } } } } } } }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true, slug: true, featureKey:true, texts: { select: { locale: true, title: true } } } }),
  ]);
  const courses = canUseTeacherLibrary(actor) ? courseRows : (await Promise.all(courseRows.map(async c => !c.featureKey || await hasFeature(actor,c.featureKey) ? c : null))).filter(c=>c!==null);
  if (options.classId) ensure(classes.some(c => c.id === options.classId), 404, 'NOT_FOUND');
  const modelClasses = classes.map(c => ({ id: c.id, title: c.title, joinCode: c.joinCode, students: c.members.map(m => m.user) }));
  const modelWorks: TeacherWork[] = works.filter(w => w.versions.length > 0).map(w => ({ id: w.id, title: w.title, classId: w.classId, classTitle: w.classroom?.title ?? null, kind: w.kind,
    archived: !!w.archivedAt || !!w.classroom?.archivedAt, resultsPublished: !!w.resultsPublishedAt,
    versions: w.versions.map(v => ({ id: v.id, opensAt: v.opensAt.getTime(), dueAt: v.dueAt.getTime(), questions: v.items.map(i => question(i.taskVersion)), attempts: v.attempts.map(a => attempt(a, v.items.map(i => i.taskVersion))) })) }));
  const relevantWorks = modelWorks.filter(w => !options.classId || w.classId === options.classId);
  const courseCounts = new Map<string, number>();
  for (const q of relevantWorks.flatMap(w => w.versions[0].questions)) for (const id of new Set(q.locations.map(l => l.courseId))) courseCounts.set(id, (courseCounts.get(id) ?? 0) + 1);
  const courseId = options.courseId ?? [...courses].sort((a, b) => (courseCounts.get(b.id) ?? 0) - (courseCounts.get(a.id) ?? 0))[0]?.id ?? '';
  if (courseId) ensure(courses.some(c => c.id === courseId), 404, 'NOT_FOUND');
  const studentIds = [...new Set(classes.flatMap(c => c.members.map(m => m.user.id)))];
  const [chapters, practice] = await Promise.all([
    courseId ? db().topic.findMany({ where: { courseId, lessons: { some: { archivedAt: null, tasks: { some: { task: publicTask } } } } }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: {
      id: true, texts: { select: { locale: true, title: true } }, lessons: { where: { archivedAt: null, tasks: { some: { task: publicTask } } }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true,
        versions: { take: 1, orderBy: { number: 'desc' }, select: { texts: { select: { locale: true, title: true } } } },
        tasks: { where: { task: publicTask }, select: { task: { select: { versions: { take: 1, orderBy: { number: 'desc' }, select: questionSelect } } } } },
      } },
    } }) : [],
    studentIds.length ? db().attempt.findMany({ where: { AND: [
      mentoredPracticeWhere(actor),
      { workVersion: { work: { archivedAt: null, versions: safeVersions } } },
      { OR: studentIds.map(id => ({ userId: id, workVersion: { work: { ownerId: id } } })) },
    ] }, select: { ...attemptSelect,
        workVersion: { select: { items: { orderBy: { position: 'asc' }, select: { taskVersion: { select: questionSelect } } } } },
    } }) : [],
  ]);
  const result = teacherDashboardModel({ classes: modelClasses, works: modelWorks, courses: courses.map(c => ({ id: c.id, slug: c.slug, title: displayTitle(localized(c.texts, 'en').title) })),
    chapters: chapters.map(ch => ({ id: ch.id, title: displayTitle(localized(ch.texts, 'en').title), lessons: ch.lessons.map(l => ({ id: l.id, title: displayTitle(localized(l.versions[0]?.texts ?? [], 'en')?.title ?? 'Lesson'),
      href: `/courses/${courses.find(c => c.id === courseId)!.slug}/topics/${l.id}`, questions: l.tasks.flatMap(t => t.task.versions.map(question)) })) })),
    practice: practice.map(a => ({ ...attempt(a, a.workVersion.items.map(i => i.taskVersion)), repeat: !!a.study?.needsRepeat, classIds: classes.filter(c => c.members.some(m => m.user.id === a.userId)).map(c => c.id) })),
    classId: options.classId ?? null, courseId, now, weekStart: now - 7 * 86400000 });
  return { ...result, timeZone: options.timeZone, generatedAt: now };
}
export type TeacherDashboardDto = Awaited<ReturnType<typeof teacherDashboard>>;
