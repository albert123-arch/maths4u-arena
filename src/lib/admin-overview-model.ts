// Pure projections of administrator-authorised aggregates. Missing instrumentation
// stays missing; a session or an access grant is never revenue or presence.
export const overviewDayMs = 86_400_000;

export function overviewTimeZone(input?: string) {
  try {
    const timeZone = input || 'UTC';
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
    return timeZone;
  } catch { return 'UTC'; }
}

export function overviewWindow(now: number, timeZone: string) {
  const from = now - 7 * overviewDayMs;
  const label = new Intl.DateTimeFormat('en', { timeZone, month: 'short', day: 'numeric' });
  return {
    kind: 'rolling7days' as const, from: new Date(from).toISOString(), to: new Date(now).toISOString(),
    buckets: Array.from({ length: 7 }, (_, index) => ({
      from: new Date(from + index * overviewDayMs).toISOString(),
      to: new Date(from + (index + 1) * overviewDayMs).toISOString(),
      label: label.format(from + (index + 1) * overviewDayMs - 1),
    })),
  };
}

export type OverviewAggregate = { bucket: number | null; total: number };
export function overviewActivity(window: ReturnType<typeof overviewWindow>, learners: OverviewAggregate[], registrations: OverviewAggregate[]) {
  // The SQL grand total uses COUNT(DISTINCT userId) across the whole window;
  // adding daily distinct counts would count returning learners repeatedly.
  const total = (rows: OverviewAggregate[]) => rows.find(row => row.bucket === null)?.total ?? 0;
  return {
    activeLearners: total(learners), newRegistrations: total(registrations), guestVisitors: null,
    series: window.buckets.map((bucket, index) => ({ ...bucket,
      activeLearners: learners.find(row => row.bucket === index)?.total ?? 0,
      newRegistrations: registrations.find(row => row.bucket === index)?.total ?? 0,
    })),
  };
}

export type OverviewCourseInput = {
  id: string; slug: string; title: string; published: boolean; archived: boolean; free: boolean;
  chapters: { id: string; taskIds: string[] }[];
};
export type OverviewPackageInput = { key: string; courseId: string; state: string };
export function overviewCourseContent(courses: OverviewCourseInput[], packages: OverviewPackageInput[]) {
  const publishedTasks = new Set<string>(), publishedChapters = new Set<string>();
  const uniquePackages = [...new Map(packages.map(pack => [pack.key, pack])).values()];
  const rows = courses.map(course => {
    const published = course.published && !course.archived;
    const chapters = new Map(course.chapters.map(chapter => [chapter.id, chapter]));
    const available = new Set(published && course.free ? [...chapters.values()].flatMap(chapter => chapter.taskIds) : []);
    if (published) for (const chapter of chapters.values()) publishedChapters.add(chapter.id);
    for (const id of available) publishedTasks.add(id);
    const packageStates = uniquePackages.filter(pack => pack.courseId === course.id).map(({ key, state }) => ({ key, state }));
    return {
      id: course.id, slug: course.slug, title: course.title, published: course.published, archived: course.archived,
      publishedChapters: published ? chapters.size : 0, availableQuestions: available.size,
      draftPackages: packageStates.filter(pack => pack.state === 'DRAFT').length, packageStates,
    };
  });
  return {
    courses: rows,
    publishedCourses: rows.filter(course => course.published && !course.archived && course.publishedChapters > 0).length,
    publishedChapters: publishedChapters.size, publishedCourseQuestions: publishedTasks.size,
    draftPackages: uniquePackages.filter(pack => pack.state === 'DRAFT').length,
  };
}

type FsCapacity = { bsize: bigint; blocks: bigint; bavail: bigint; bfree: bigint; files: bigint; ffree: bigint };
const safeInteger = (n: bigint) => n >= BigInt(0) && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : null;
export function overviewStorageCapacity(info: FsCapacity | null, supportsInodes: boolean) {
  const unavailable = { status: 'unavailable' as const, totalBytes: null, availableBytes: null, usedBytes: null, usedPercent: null, inodes: null };
  if (!info || info.bsize <= BigInt(0) || info.blocks <= BigInt(0) || info.bfree > info.blocks || info.bavail > info.bfree) return unavailable;
  const totalBytes = safeInteger(info.blocks * info.bsize), availableBytes = safeInteger(info.bavail * info.bsize);
  const usedBytes = safeInteger((info.blocks - info.bfree) * info.bsize);
  if (totalBytes === null || availableBytes === null || usedBytes === null) return unavailable;
  const total = supportsInodes ? safeInteger(info.files) : null, free = supportsInodes ? safeInteger(info.ffree) : null;
  const inodes = total !== null && free !== null && total > 0 && free <= total ? { total, free, usedPercent: Math.round((total - free) / total * 100) } : null;
  return { status: 'available' as const, totalBytes, availableBytes, usedBytes, usedPercent: Math.round(usedBytes / totalBytes * 100), inodes };
}

export type AdminOverviewDto = {
  generatedAt: string; timeZone: string; window: { kind: 'rolling7days'; from: string; to: string };
  health: {
    database: { status: 'ok' | 'unavailable'; latencyMs: number | null; checkedAt: string };
    build: { sha: string | null; status: 'available' | 'unavailable' };
    backup: null; monitoring: null; errors24h: null; siteSpeed: null; google: null;
  };
  storage: ReturnType<typeof overviewStorageCapacity> & { originalBytes: number; derivativeBytes: number; recordedBytes: number };
  summary: { publicQuestions: number; totalTaskVersions: number; publishedCourses: number; activeLearners7d: number; newRegistrations7d: number; activeSubscriptions: number; revenue: null; guestVisitors: null };
  content: ReturnType<typeof overviewCourseContent> & { publicQuestions: number; privateQuestions: number; cambridgeArchive: number; unknownQuestions: number; demoArchive: number; totalTasks: number; totalTaskVersions: number; presentations: number };
  users: { total: number; active: number; students: number; teachers: number; administrators: number; blocked: number; archived: number; activeSubscriptions: number; subscribers: number; expiringSubscriptions7d: number; classes: number };
  activity: ReturnType<typeof overviewActivity>;
  decisions: { id: 'teacher-submissions' | 'task-reports' | 'provenance' | 'draft-packages'; label: string; count: number | null; href: string; status: 'available' | 'unavailable' }[];
  audit: { id: string; action: string; targetId: string; createdAt: string; actor: { displayName: string; username: string } }[];
  limitations: string[];
};
