import { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { ownClass } from "./works";
import { ensure } from "./errors";
import { type Actor, isAdmin } from "./security";
import { progressInclude, studyProgressStatus } from "./practice-progress";

export async function classProgress(actor: Actor, classId: string) {
  const classroom = await ownClass(actor, classId);
  ensure(!classroom.archivedAt, 404, "NOT_FOUND");
  const members = await db().classMembership.findMany({ where: { classId, removedAt: null },
    select: { user: { select: { id: true, displayName: true, username: true } } }, orderBy: { user: { displayName: "asc" } } });
  const userIds = members.map(m => m.user.id);
  const scope: Prisma.AttemptWhereInput = { userId: { in: userIds }, OR: [
    { workVersion: { work: { classId, ...(isAdmin(actor) ? {} : { ownerId: actor.id }) } } },
    // Only the student's own independent practice, never another teacher's private work.
    ...userIds.map(userId => ({ userId, workVersion: { work: { kind: "PRACTICE" as const, ownerId: userId } } })),
  ] };
  const [counts, active, theory, latestIds] = await Promise.all([
    db().attempt.groupBy({ by: ["userId", "status"], where: scope, _count: true, _max: { startedAt: true, submittedAt: true } }),
    db().attempt.groupBy({ by: ["userId"], where: { AND: [scope, { status: "IN_PROGRESS", expiresAt: { gt: new Date() } }] }, _count: true }),
    db().learningProgress.groupBy({ by: ["userId"], where: { userId: { in: userIds }, completed: true }, _count: true }),
    userIds.length ? db().$queryRaw<{ attemptId: string }[]>(Prisma.sql`SELECT s.attemptId FROM PracticeStudy s JOIN Attempt a ON a.id=s.attemptId
      WHERE a.userId IN (${Prisma.join(userIds)}) AND NOT EXISTS(SELECT 1 FROM PracticeStudy s2 JOIN Attempt a2 ON a2.id=s2.attemptId
        WHERE a2.userId=a.userId AND s2.taskId=s.taskId AND s2.lessonId <=> s.lessonId
        AND (a2.startedAt>a.startedAt OR (a2.startedAt=a.startedAt AND a2.id>a.id)))`) : [],
  ]);
  const latest = await db().practiceStudy.findMany({ where: { attemptId: { in: latestIds.map(r => r.attemptId) } }, include: progressInclude });
  const students = members.map(({ user }) => {
    const attempts = counts.filter(c => c.userId === user.id), practice = latest.filter(r => r.attempt.userId === user.id);
    const total = attempts.reduce((n, a) => n + a._count, 0), inProgress = active.find(a => a.userId === user.id)?._count ?? 0;
    const dates = [...practice.map(r => r.updatedAt), ...attempts.flatMap(a => [a._max.startedAt, a._max.submittedAt])].filter((d): d is Date => !!d);
    return { ...user, attempts: total, inProgress, completed: total - inProgress,
      graded: attempts.find(a => a.status === "GRADED")?._count ?? 0, practiceTasks: practice.length,
      solved: practice.filter(r => studyProgressStatus(r).solved).length, selfSolved: practice.filter(r => r.selfDirected && r.selfSolved).length,
      withoutHelp: practice.filter(r => studyProgressStatus(r).checkedWithoutHelp).length,
      needsRepeat: practice.filter(r => r.needsRepeat).length, theoryRead: theory.find(t => t.userId === user.id)?._count ?? 0,
      lastActive: dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null };
  });
  return { classroom: { id: classId, title: classroom.title }, students, summary: {
    students: students.length, started: students.filter(s => s.attempts > 0).length,
    attempts: students.reduce((n, s) => n + s.attempts, 0), completed: students.reduce((n, s) => n + s.completed, 0),
    needsRepeat: students.reduce((n, s) => n + s.needsRepeat, 0),
  } };
}
export type ClassProgressDto = Awaited<ReturnType<typeof classProgress>>;
