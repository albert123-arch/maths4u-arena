import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin } from "./security";
import { ownClass } from "./works";
import { localized } from "./content";
import { progressInclude, studyProgressStatus } from "./study";

const lessonInclude = {
  versions: { take: 1, orderBy: { number: "desc" }, select: { texts: { select: { locale: true, title: true } } } },
  topic: { include: { texts: true, course: { include: { texts: true } } } },
  _count: { select: { tasks: true } },
} satisfies Prisma.LessonInclude;

export async function studentProgress(actor: Actor, classId: string, studentId: string, lang: string, input: unknown = {}) {
  const classroom = await ownClass(actor, classId);
  ensure(!classroom.archivedAt, 404, "NOT_FOUND");
  const membership = await db().classMembership.findUnique({ where: { classId_userId: { classId, userId: studentId } },
    select: { removedAt: true, user: { select: { id: true, displayName: true, username: true } } } });
  ensure(membership && !membership.removedAt, 404, "NOT_FOUND");
  const { page, kind, lessonId } = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1),
    kind: z.enum(["ALL", "PRACTICE", "ASSIGNED"]).default("ALL"), lessonId: z.string().max(100).optional() }).parse(input);
  const practice: Prisma.AttemptWhereInput = { workVersion: { work: { kind: "PRACTICE", ownerId: studentId } } };
  const assigned: Prisma.AttemptWhereInput = { workVersion: { work: { classId, ...(isAdmin(actor) ? {} : { ownerId: actor.id }) } } };
  const scope: Prisma.AttemptWhereInput = { userId: studentId, OR: [practice, assigned] };
  const where: Prisma.AttemptWhereInput = { AND: [scope, ...(kind === "ALL" ? [] : [kind === "PRACTICE" ? practice : assigned]),
    ...(lessonId ? [{ study: { lessonId } }] : [])] };
  const now = new Date();
  const [total, attempts, allAttempts, inProgress, graded, theory, latestIds] = await Promise.all([
    db().attempt.count({ where }),
    db().attempt.findMany({ where, take: 20, skip: (page - 1) * 20, orderBy: [{ startedAt: "desc" }, { id: "desc" }], include: {
      study: { include: { lesson: { include: lessonInclude } } },
      workVersion: { include: { work: true, items: { orderBy: { position: "asc" }, select: { maxPoints: true, taskVersion: { select: { texts: { select: { locale: true, title: true } } } } } } } },
      answers: { select: { autoPoints: true, review: { select: { points: true } }, _count: { select: { files: true } } } },
    } }),
    db().attempt.count({ where: scope }),
    db().attempt.count({ where: { AND: [scope, { status: "IN_PROGRESS", expiresAt: { gt: now } }] } }),
    db().attempt.count({ where: { AND: [scope, { status: "GRADED" }] } }),
    db().learningProgress.findMany({ where: { userId: studentId }, include: { lesson: { include: lessonInclude } } }),
    // One latest attempt per task and topic; retries must not inflate progress.
    db().$queryRaw<{ attemptId: string }[]>(Prisma.sql`SELECT s.attemptId FROM PracticeStudy s JOIN Attempt a ON a.id=s.attemptId
      WHERE a.userId=${studentId} AND NOT EXISTS (
        SELECT 1 FROM PracticeStudy s2 JOIN Attempt a2 ON a2.id=s2.attemptId
        WHERE s2.taskId=s.taskId AND s2.lessonId <=> s.lessonId AND a2.userId=a.userId
        AND (a2.startedAt>a.startedAt OR (a2.startedAt=a.startedAt AND a2.id>a.id)))`),
  ]);
  const latest = await db().practiceStudy.findMany({ where: { attemptId: { in: latestIds.map(r => r.attemptId) } },
    include: { ...progressInclude, lesson: { include: lessonInclude } } });
  const lessons = new Map([...theory.map(r => r.lesson), ...latest.flatMap(r => r.lesson ? [r.lesson] : [])].map(l => [l.id, l]));
  const topics = [...lessons.values()].map(l => {
    const rows = latest.filter(r => r.lessonId === l.id), states = rows.map(studyProgressStatus);
    return { id: l.id, title: localized(l.versions[0]?.texts ?? [], lang)?.title ?? "—", courseId: l.topic.courseId,
      course: localized(l.topic.course.texts, lang).title, chapter: localized(l.topic.texts, lang).title,
      totalTasks: l._count.tasks, practised: rows.length, completed: rows.filter(r => r.attempt.status !== "IN_PROGRESS" || r.attempt.expiresAt <= now).length,
      graded: rows.filter(r => r.attempt.status === "GRADED").length, withoutHelp: states.filter(s => s.checkedWithoutHelp).length,
      needsRepeat: rows.filter(r => r.needsRepeat).length, selfChecked: rows.filter(r => r.selfCheckedAt).length,
      theoryRead: theory.find(r => r.lessonId === l.id)?.completed ?? false };
  }).sort((a, b) => a.course.localeCompare(b.course) || a.chapter.localeCompare(b.chapter) || a.title.localeCompare(b.title));
  return { classroom: { id: classId, title: classroom.title }, student: membership.user,
    summary: { attempts: allAttempts, inProgress, completed: allAttempts - inProgress, graded, theoryRead: theory.filter(r => r.completed).length,
      needsRepeat: latest.filter(r => r.needsRepeat).length }, topics, page, pages: Math.max(1, Math.ceil(total / 20)), total,
    attempts: attempts.map(a => {
      const finished = a.status !== "IN_PROGRESS" || a.expiresAt <= now;
      const study = a.study;
      return { id: a.id, title: study ? localized(a.workVersion.items[0].taskVersion.texts, lang).title : a.workVersion.work.title,
        kind: a.workVersion.work.kind, number: a.number, startedAt: a.startedAt, submittedAt: a.submittedAt,
        status: a.status === "IN_PROGRESS" && finished ? "EXPIRED" : a.status,
        canOpen: a.workVersion.work.kind !== "PRACTICE" || finished,
        score: a.status === "GRADED" ? a.answers.reduce((sum, answer) => sum + (answer.review?.points ?? answer.autoPoints ?? 0), 0) : null,
        maximum: a.workVersion.items.reduce((sum, item) => sum + item.maxPoints, 0), files: a.answers.reduce((sum, answer) => sum + answer._count.files, 0),
        helpUsed: study ? [study.hintAt, study.answerAt, study.solutionAt, study.markSchemeAt].some(Boolean) : null,
        selfChecked: !!study?.selfCheckedAt, needsRepeat: study?.needsRepeat ?? false,
        topic: study?.lesson ? localized(study.lesson.versions[0].texts, lang).title : null };
    }) };
}
export type StudentProgressDto = Awaited<ReturnType<typeof studentProgress>>;
