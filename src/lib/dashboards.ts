import { db } from "./prisma";
import { type Actor, admin, teacher } from "./security";
import { localized } from "./content";
import { displayTitle } from "./public-presentation";
import { taskPermission } from "./catalog";
import { listWorks } from "./works";
import { lensAttemptScope } from "./request-view";
import { progressInclude, studyProgressStatus } from "./practice-progress";
import { squareProgress } from "./square-learning";
import { quadraticTopics } from "./square-model";
import { mentoredPracticeWhere } from "./practice-access";
import { freshIndependent } from "./dashboard-evidence";

export async function studentDashboard(actor: Actor, lang: string) {
  const [works, bookmarks, lessons, checks] = await Promise.all([
    listWorks(actor),
    db().taskBookmark.findMany({ where: { userId: actor.id, task: await taskPermission(actor) }, take: 6, orderBy: { createdAt: "desc" }, include: { task: { include: { versions: { take: 1, orderBy: { number: "desc" }, select: { texts: true } } } } } }),
    db().lesson.findMany({ where: { archivedAt: null, topic: { course: { published: true, archivedAt: null, featureKey: null, followers: { some: { userId: actor.id } } } } }, include: {
      topic: { include: { course: true } }, versions: { take: 1, orderBy: { number: "desc" }, select: { texts: true } },
      progress: { where: { userId: actor.id } }, practiceStudies: { where: { attempt: { userId: actor.id, AND: [lensAttemptScope()] } }, include: progressInclude, orderBy: { updatedAt: "desc" } },
    } }),
    Promise.all(quadraticTopics.map(async t => ({ topic: t, snapshot: await squareProgress(actor, t) }))),
  ]);
  const now = Date.now();
  const topics = lessons.map(l => {
    const snapshot = checks.find(c => c.topic.lessonId === l.id)?.snapshot;
    const evidence = snapshot?.evidence ?? [];
    const fresh = freshIndependent(evidence);
    const latest = l.practiceStudies.filter((s, i, all) => all.findIndex(p => p.taskId === s.taskId) === i);
    const due = Object.values(snapshot?.states ?? {}).some(s => s.dueAt <= now) || latest.some(s => s.needsRepeat);
    const helped = evidence.some(e => e.correct && e.helpUsed) || l.practiceStudies.some(s => studyProgressStatus(s).solved && [s.hintAt, s.answerAt, s.solutionAt, s.markSchemeAt].some(Boolean));
    const tried = !!evidence.length || !!l.practiceStudies.length;
    // Reading notes or assigning oneself marks never establishes mastery.
    const state = due ? "DUE" : fresh ? "FRESH_INDEPENDENT" : helped ? "WITH_HELP" : tried ? "TRIED" : "NOT_TRIED";
    const last = Math.max(0, ...evidence.map(e => e.at), ...l.practiceStudies.map(s => s.updatedAt.getTime()), ...l.progress.map(p => p.openedAt.getTime()));
    const active = l.practiceStudies[0];
    const resumeHref = active?.attempt.status === "IN_PROGRESS" && active.attempt.expiresAt.getTime() > now && active.updatedAt.getTime() === last ? "/attempts/" + active.attemptId : null;
    return { id: l.id, title: displayTitle(localized(l.versions[0]?.texts ?? [], lang)?.title ?? "Topic"), href: `/courses/${l.topic.course.slug}/topics/${l.id}`, resumeHref, state, notesRead: !!l.progress[0]?.completed, last };
  }).sort((a, b) => b.last - a.last || a.title.localeCompare(b.title));
  return { assignments: works.filter(w => w.kind !== "PRACTICE" && !w.archived).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
    bookmarks: bookmarks.map(b => ({ id: b.taskId, title: displayTitle(localized(b.task.versions[0]?.texts ?? [], lang)?.title ?? "Problem"), href: "/library?bookmarks=1#question-" + b.taskId })),
    topics, review: topics.filter(t => t.state === "DUE"), continue: topics.find(t => t.last > 0) ?? null };
}
export async function teacherDashboard(actor: Actor) {
  teacher(actor);
  const pendingWhere = { status: "SUBMITTED" as const, answers: { some: { autoPoints: null, review: { is: null } } }, OR: [{ workVersion: { work: { ownerId: actor.id, kind: { not: "PRACTICE" as const } } } }, mentoredPracticeWhere(actor)] };
  const [classes, pending, pendingCount] = await Promise.all([
    db().classroom.findMany({ where: { teacherId: actor.id, archivedAt: null }, orderBy: { createdAt: "desc" }, include: { members: { where: { removedAt: null }, select: { user: { select: { id: true, displayName: true, username: true } } } }, _count: { select: { works: { where: { archivedAt: null } } } } } }),
    db().attempt.findMany({ where: pendingWhere, take: 20, orderBy: { submittedAt: "asc" }, select: { id: true, submittedAt: true, user: { select: { displayName: true } }, workVersion: { select: { work: { select: { title: true, classroom: { select: { title: true } } } } } } } }),
    db().attempt.count({ where: pendingWhere }),
  ]);
  return { classes: classes.map(c => ({ id: c.id, title: c.title, assignments: c._count.works, students: c.members.map(m => m.user) })), pendingCount,
    pending: pending.map(p => ({ id: p.id, student: p.user.displayName, title: p.workVersion.work.title, classTitle: p.workVersion.work.classroom?.title ?? "Independent practice", submittedAt: p.submittedAt })) };
}
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
export type TeacherDashboardDto = Awaited<ReturnType<typeof teacherDashboard>>;
export type AdminDashboardDto = Awaited<ReturnType<typeof adminDashboard>>;
