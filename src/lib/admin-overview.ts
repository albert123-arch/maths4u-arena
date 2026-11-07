import { readFile, stat, statfs } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Prisma } from '../generated/prisma/client';
import { db } from './prisma';
import { admin, isAdmin, type Actor } from './security';
import { ensure } from './errors';
import { requestView } from './request-view';
import { cambridgeTask } from './cambridge-access';
import { approvedWhere, hierarchyTaskWhere, visibleLessonWhere } from './content-access';
import { privateStorageRoot } from './storage-config';
import { displayTitle } from './public-presentation';
import { overviewActivity, overviewCourseContent, overviewDayMs, overviewStorageCapacity, overviewTimeZone, overviewWindow, type AdminOverviewDto, type OverviewAggregate } from './admin-overview-model';

export type { AdminOverviewDto } from './admin-overview-model';

// The same eligibility as the unfiltered English guest question catalogue:
// approved, non-archived, public, a real version, no subscription required.
const publicTask: Prisma.TaskWhereInput = { AND: [hierarchyTaskWhere(null), { featureKey: null, versions: { some: {} } }] };

async function databaseHealth(): Promise<AdminOverviewDto['health']['database']> {
  const started = performance.now();
  try {
    await db().$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Math.round((performance.now() - started) * 10) / 10, checkedAt: new Date().toISOString() };
  } catch {
    return { status: 'unavailable', latencyMs: null, checkedAt: new Date().toISOString() };
  }
}

async function buildMetadata(): Promise<AdminOverviewDto['health']['build']> {
  // Read only the deployed artifact's existing metadata. A checkout's HEAD is
  // not proof of the running build, so never run git or read an unrelated dist.
  try {
    const file = path.join(process.cwd(), 'hostinger-build.json');
    if ((await stat(file)).size <= 16_384) {
      const data = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
      const sha = data.commitSha ?? data.gitSha ?? data.sha;
      if (typeof sha === 'string' && /^[a-f0-9]{7,40}$/i.test(sha)) return { status: 'available', sha };
    }
  } catch { /* The current build format does not guarantee a source SHA. */ }
  return { status: 'unavailable', sha: null };
}

async function storageCapacity() {
  try {
    const root = privateStorageRoot();
    if (!(await stat(root)).isDirectory()) return overviewStorageCapacity(null, false);
    const info = await statfs(root, { bigint: true });
    return overviewStorageCapacity(info, ['linux', 'darwin', 'freebsd', 'openbsd', 'aix'].includes(process.platform));
  } catch { return overviewStorageCapacity(null, false); }
}

type RawAggregate = { bucket: number | bigint | null; total: number | bigint };
function aggregateRows(rows: RawAggregate[]): OverviewAggregate[] {
  return rows.map(row => {
    const total = Number(row.total), bucket = row.bucket === null ? null : Number(row.bucket);
    ensure(Number.isSafeInteger(total) && total >= 0 && (bucket === null || Number.isInteger(bucket) && bucket >= 0 && bucket < 7), 503, 'OVERVIEW_AGGREGATE_UNAVAILABLE');
    return { bucket, total };
  });
}

async function activityAggregates(from: Date, to: Date) {
  // Aggregate in SQL and return at most eight rows. No answers, session tokens,
  // pupil identities or per-learner histories enter this overview response.
  // WITH ROLLUP computes a distinct whole-window total, not daily-count sums.
  const rows = await db().$queryRaw<RawAggregate[]>(Prisma.sql`
    SELECT FLOOR(TIMESTAMPDIFF(MICROSECOND, ${from}, evidence.at) / 86400000000) AS bucket,
      COUNT(DISTINCT evidence.userId) AS total
    FROM (
      SELECT userId, startedAt AS at FROM Attempt WHERE startedAt >= ${from} AND startedAt < ${to}
      UNION ALL SELECT userId, submittedAt AS at FROM Attempt WHERE submittedAt >= ${from} AND submittedAt < ${to} AND timedOut = false
      UNION ALL SELECT a.userId, answer.savedAt AS at FROM Answer answer JOIN Attempt a ON a.id = answer.attemptId WHERE answer.savedAt >= ${from} AND answer.savedAt < ${to}
      UNION ALL SELECT userId, openedAt AS at FROM LearningProgress WHERE openedAt >= ${from} AND openedAt < ${to}
      UNION ALL SELECT userId, checkedAt AS at FROM IndependentCheck WHERE checkedAt >= ${from} AND checkedAt < ${to} AND imported = false
      UNION ALL SELECT a.userId, study.updatedAt AS at FROM PracticeStudy study JOIN Attempt a ON a.id = study.attemptId WHERE study.updatedAt >= ${from} AND study.updatedAt < ${to}
    ) evidence JOIN User learner ON learner.id = evidence.userId
    WHERE learner.status = 'ACTIVE' AND EXISTS (SELECT 1 FROM UserRole role WHERE role.userId = learner.id AND role.role = 'STUDENT')
    GROUP BY bucket WITH ROLLUP
  `);
  return aggregateRows(rows);
}

async function registrationAggregates(from: Date, to: Date) {
  const rows = await db().$queryRaw<RawAggregate[]>(Prisma.sql`
    SELECT FLOOR(TIMESTAMPDIFF(MICROSECOND, ${from}, createdAt) / 86400000000) AS bucket, COUNT(*) AS total
    FROM User WHERE createdAt >= ${from} AND createdAt < ${to}
    GROUP BY bucket WITH ROLLUP
  `);
  return aggregateRows(rows);
}

async function openReports(): Promise<number | null> {
  try {
    // Optional until the additive report migration has been applied. An absent
    // table is unavailable, never a fabricated zero. The query is read-only.
    const [row] = await db().$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM TaskReport WHERE status IN ('OPEN', 'IN_REVIEW')`;
    const count = Number(row.total);
    return Number.isSafeInteger(count) ? count : null;
  } catch { return null; }
}

export async function adminOverview(actor: Actor, options: { timeZone?: string } = {}): Promise<AdminOverviewDto> {
  admin(actor);
  const view = requestView();
  ensure(actor.status === 'ACTIVE' && !view?.lens && (!view || !!view.real && view.real.id === actor.id && isAdmin(view.real)), 403, 'FORBIDDEN');
  const now = new Date(), timeZone = overviewTimeZone(options.timeZone), window = overviewWindow(now.getTime(), timeZone);
  const from = new Date(window.from);
  const activeSubscription: Prisma.SubscriptionWhereInput = { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now }, user: { status: 'ACTIVE' } };
  // Test reachability before the aggregate queue; this measures a SELECT 1,
  // including connection acquisition, and makes no uptime/HTTP-speed claim.
  const database = await databaseHealth();
  const [publicQuestions, privateQuestions, cambridgeArchive, unknownQuestions, demoArchive, totalTasks, totalTaskVersions,
    courses, packages, userStatuses, userRoles, activeSubscriptions, subscribers, expiringSubscriptions7d,
    learners, registrations, audit, capacity, originals, derivatives, reports, build, classes, presentations, teacherSubmissions] = await Promise.all([
    db().task.count({ where: publicTask }),
    db().task.count({ where: { AND: [approvedWhere, { visibility: 'PRIVATE', archivedAt: null, examArchivedAt: null, versions: { some: {} } }] } }),
    db().task.count({ where: { OR: [{ origin: 'CAMBRIDGE_EXAM' }, cambridgeTask] } }),
    db().task.count({ where: { origin: 'UNKNOWN' } }),
    db().task.count({ where: { origin: 'DEMO', OR: [{ examArchivedAt: { not: null } }, { archivedAt: { not: null } }] } }),
    db().task.count(), db().taskVersion.count(),
    db().course.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }], select: {
      id: true, slug: true, published: true, archivedAt: true, featureKey: true, texts: { select: { locale: true, title: true } },
      topics: { where: { lessons: { some: { archivedAt: null, ...visibleLessonWhere(null) } } }, select: { id: true, lessons: {
        where: { archivedAt: null, ...visibleLessonWhere(null) }, select: { tasks: { where: { task: publicTask }, select: { taskId: true } } },
      } } },
    } }),
    db().contentPackage.findMany({ orderBy: { key: 'asc' }, select: { key: true, courseId: true, state: true } }),
    db().user.groupBy({ by: ['status'], _count: true }),
    db().userRole.groupBy({ by: ['role'], where: { user: { status: 'ACTIVE' } }, _count: true }),
    db().subscription.count({ where: activeSubscription }),
    db().user.count({ where: { subscriptions: { some: activeSubscription } } }),
    db().subscription.count({ where: { AND: [activeSubscription, { endsAt: { lte: new Date(now.getTime() + 7 * overviewDayMs) } }] } }),
    activityAggregates(from, now), registrationAggregates(from, now),
    db().auditEvent.findMany({ take: 8, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, action: true, targetId: true, createdAt: true, actor: { select: { displayName: true, username: true } } } }),
    storageCapacity(),
    db().storedFile.aggregate({ where: { deletedAt: null }, _sum: { size: true } }),
    db().fileDerivative.aggregate({ where: { file: { deletedAt: null } }, _sum: { size: true } }),
    openReports(), buildMetadata(),
    db().classroom.count({ where: { archivedAt: null } }),
    db().lessonPresentation.count({ where: { archivedAt: null, lesson: { archivedAt: null, topic: { course: { archivedAt: null } } } } }),
    db().taskAuthoringSubmission.count({where:{status:'SUBMITTED'}}),
  ]);
  const courseContent = overviewCourseContent(courses.map(course => ({ id: course.id, slug: course.slug,
    title: displayTitle(course.texts.find(text => text.locale === 'en')?.title ?? course.texts[0]?.title ?? course.slug),
    published: course.published, archived: !!course.archivedAt, free: !course.featureKey,
    chapters: course.topics.map(chapter => ({ id: chapter.id, taskIds: chapter.lessons.flatMap(lesson => lesson.tasks.map(task => task.taskId)) })),
  })), packages);
  const activity = overviewActivity(window, learners, registrations), originalBytes = originals._sum.size ?? 0, derivativeBytes = derivatives._sum.size ?? 0;
  const statusCount = (status: string) => userStatuses.find(row => row.status === status)?._count ?? 0;
  const roleCount = (role: string) => userRoles.find(row => row.role === role)?._count ?? 0;
  return {
    generatedAt: now.toISOString(), timeZone, window: { kind: window.kind, from: window.from, to: window.to },
    health: { database, build, backup: null, monitoring: null, errors24h: null, siteSpeed: null, google: null },
    storage: { ...capacity, originalBytes, derivativeBytes, recordedBytes: originalBytes + derivativeBytes },
    summary: { publicQuestions, totalTaskVersions, publishedCourses: courseContent.publishedCourses, activeLearners7d: activity.activeLearners,
      newRegistrations7d: activity.newRegistrations, activeSubscriptions, revenue: null, guestVisitors: null },
    content: { ...courseContent, publicQuestions, privateQuestions, cambridgeArchive, unknownQuestions, demoArchive, totalTasks, totalTaskVersions, presentations },
    users: { total: userStatuses.reduce((sum, row) => sum + row._count, 0), active: statusCount('ACTIVE'), students: roleCount('STUDENT'), teachers: roleCount('TEACHER'), administrators: roleCount('ADMIN'),
      blocked: statusCount('BLOCKED'), archived: statusCount('ARCHIVED'), activeSubscriptions, subscribers, expiringSubscriptions7d, classes },
    activity,
    decisions: [
      {id:'teacher-submissions',label:'Teacher questions awaiting publication',count:teacherSubmissions,href:'/admin/teacher-submissions',status:'available'},
      { id: 'task-reports', label: 'Open content reports', count: reports, href: '/admin/task-reports', status: reports === null ? 'unavailable' : 'available' },
      { id: 'provenance', label: 'Provenance review', count: unknownQuestions, href: '/admin/archive', status: 'available' },
      { id: 'draft-packages', label: 'Installed draft packages', count: courseContent.draftPackages, href: '/admin/content-packages', status: 'available' },
    ],
    audit: audit.map(event => ({ ...event, createdAt: event.createdAt.toISOString() })),
    limitations: [
      'Public questions are unique approved, non-archived PUBLIC Task records with a version and no subscription requirement, matching the unfiltered English guest catalogue. Historical Cambridge versions remain excluded.',
      'Private questions are approved, non-archived PRIVATE tasks. Cambridge, UNKNOWN and Demo are independent policy dimensions and must not be added to produce the Task total. TaskVersion counts include historical versions.',
      'Published courses and chapters have non-archived lessons visible under guest content policy. Available course questions require a published, non-archived free course and guest-accessible tasks; totals deduplicate Task identities across lessons and courses.',
      'Draft packages are installed ContentPackage records whose actual state is DRAFT. Uninstalled package definitions are not publication drafts.',
      'Activity is distinct active accounts with the STUDENT role and recorded attempt starts, manual submissions, answer saves, lesson progress, non-imported independent checks or study actions. It is not online presence; automatic timeout submissions and session creation are excluded.',
      'The rolling7days window contains seven consecutive 24-hour intervals ending at generation time, not seven calendar dates. Registrations count User.createdAt. Last-event-only fields can undercount earlier daily activity.',
      'Role counts include active accounts and can overlap for accounts with multiple roles. Subscriptions count ACTIVE grants valid now on active accounts; multiple grants can belong to one subscriber. Access grants are not revenue.',
      'Storage capacity describes the filesystem hosting configured private storage, not an Arena quota. Recorded active original and derivative bytes come from the database; no file scan or missing-file audit runs here. Inodes are shown only when the platform reports a positive supported count.',
      'Database latency measures one SELECT 1 with connection acquisition, not site response speed or uptime. Build SHA is available only when existing deployed hostinger-build.json metadata provides it.',
      'Backups, uptime/error monitoring, site-speed telemetry, guest analytics, Google integrations and revenue are not connected. No successful state or zero result is inferred for them.',
      ...(reports === null ? ['Content reports are unavailable until the TaskReport model and local migration are present.'] : []),
    ],
  };
}
