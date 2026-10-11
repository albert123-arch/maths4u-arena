import { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";

export const progressInclude = {
  attempt: { include: {
    answers: { select: { autoPoints: true, review: { select: { points: true } } } },
    workVersion: { include: { items: { select: {
      maxPoints: true, taskVersion: { select: { texts: { select: { locale: true, title: true } } } },
    } } } },
  } },
} satisfies Prisma.PracticeStudyInclude;
type ProgressRow = Prisma.PracticeStudyGetPayload<{ include: typeof progressInclude }>;

export function studyProgressStatus(row: ProgressRow) {
  const a = row.attempt;
  const state = row.needsRepeat ? "NEEDS_REPEAT" : row.selfCheckedAt ? "SELF_CHECKED" : a.status === "IN_PROGRESS" && a.expiresAt <= new Date() && !row.selfDirected ? "SUBMITTED" : a.status;
  const help = [row.hintAt, row.answerAt, row.solutionAt, row.markSchemeAt].filter((d): d is Date => !!d);
  const score = a.answers.reduce((n, answer) => n + (answer.review?.points ?? answer.autoPoints ?? 0), 0);
  const maximum = a.workVersion.items.reduce((n, i) => n + i.maxPoints, 0);
  const verifiedSolved = a.status === "GRADED" && score === maximum;
  const selfSolved = row.selfDirected && row.selfSolved === true;
  return { state, helpUsed: help.length > 0, solved: row.selfDirected ? selfSolved : verifiedSolved, selfSolved, selfPoints: row.selfPoints, selfDirected: row.selfDirected,
    checkedWithoutHelp: verifiedSolved && !!a.submittedAt && !help.some(d => d <= a.submittedAt!), score: a.status === "GRADED" ? score : null, maximum };
}

// A retry replaces the previous status for this task in this topic.
// With no topic selected, use the latest attempt across all learning contexts.
export async function latestPracticeProgress(userId: string, lessonId?: string) {
  const ids = await db().$queryRaw<{ attemptId: string }[]>(Prisma.sql`SELECT s.attemptId FROM PracticeStudy s JOIN Attempt a ON a.id=s.attemptId
    WHERE a.userId=${userId} ${lessonId ? Prisma.sql`AND s.lessonId=${lessonId}` : Prisma.empty}
    AND NOT EXISTS(SELECT 1 FROM PracticeStudy s2 JOIN Attempt a2 ON a2.id=s2.attemptId
      WHERE s2.taskId=s.taskId AND a2.userId=a.userId ${lessonId ? Prisma.sql`AND s2.lessonId=${lessonId}` : Prisma.empty}
      AND (a2.startedAt>a.startedAt OR (a2.startedAt=a.startedAt AND a2.id>a.id)))`);
  const rows = await db().practiceStudy.findMany({ where: { attemptId: { in: ids.map(r => r.attemptId) } }, include: progressInclude });
  return rows.map(r => ({ taskId: r.taskId, attemptId: r.attemptId, ...studyProgressStatus(r) }));
}
