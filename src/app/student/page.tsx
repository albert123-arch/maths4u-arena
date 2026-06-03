import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { isAssignmentsMigrationError } from "@/lib/assignments";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

function classAccent(index: number) {
  return ["bg-blue-600", "bg-teal-600", "bg-orange-600", "bg-violet-600"][index % 4];
}

function modeLabel(mode: string) {
  return mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic;
}

function statusLabel(status: string) {
  return status === "RUNNING" ? messages.host.liveStatus : messages.host.waitingStatus;
}

function scoreSummary(score: number, maxScore: number) {
  return `${score} / ${maxScore}`;
}

export default async function StudentDashboardPage() {
  const student = await requireStudent();
  const classMemberships = await prisma.classMembership.findMany({
    where: {
      studentId: student.id,
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "desc" },
    include: {
      classroom: {
        select: {
          id: true,
          title: true,
          joinCode: true,
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
  const classIds = classMemberships.map((membership) => membership.classId);
  const classTitleById = new Map(
    classMemberships.map((membership) => [membership.classId, membership.classroom.title]),
  );
  const liveClassSessions = classIds.length
    ? (await prisma.gameSession.findMany({
        where: { status: { in: ["LOBBY", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          code: true,
          mode: true,
          status: true,
          settingsJson: true,
          createdAt: true,
          testVersion: {
            select: {
              test: { select: { title: true } },
              questions: { select: { id: true } },
            },
          },
        },
      })).flatMap((session) => {
        const settings = parseSessionSettings(session.settingsJson);
        const isClassGame = settings.audience === "CLASS" || Boolean(settings.classId && !settings.seriesId);

        if (settings.archived || !isClassGame || !settings.classId || !classIds.includes(settings.classId)) {
          return [];
        }

        return [
          {
            ...session,
            classTitle: classTitleById.get(settings.classId) ?? messages.teacher.classOnly,
            sessionLabel: settings.label,
            questionCount: session.testVersion.questions.length,
          },
        ];
      }).sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "RUNNING" ? -1 : 1;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      })
    : [];
  const assignmentSubmissions = await prisma.assignmentSubmission
    .findMany({
      where: {
        studentId: student.id,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        assignment: { status: "ASSIGNED" },
      },
      orderBy: { assignment: { dueAt: "asc" } },
      take: 6,
      include: {
        assignment: {
          include: {
            classroom: { select: { title: true } },
            testVersion: { select: { test: { select: { title: true } } } },
          },
        },
      },
    })
    .catch((error) => {
      if (isAssignmentsMigrationError(error)) {
        return null;
      }

      throw error;
    });
  const recentParticipantsRaw = await prisma.participant.findMany({
    where: {
      studentAccountId: student.id,
      session: {
        status: "FINISHED",
      },
    },
    orderBy: { joinedAt: "desc" },
    take: 50,
    select: {
      id: true,
      answers: {
        select: {
          points: true,
          isCorrect: true,
        },
      },
      session: {
        select: {
          code: true,
          mode: true,
          finishedAt: true,
          settingsJson: true,
          testVersion: {
            select: {
              questions: { select: { points: true } },
              test: { select: { title: true } },
            },
          },
        },
      },
    },
  });
  const recentResults = recentParticipantsRaw.flatMap((participant) => {
    const settings = parseSessionSettings(participant.session.settingsJson);

    if (settings.archived) {
      return [];
    }

    const score = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
    const maxScore = participant.session.testVersion.questions.reduce(
      (sum, question) => sum + question.points,
      0,
    );
    const percentage = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
    const correct = participant.answers.filter((answer) => answer.isCorrect === true).length;

    return [
      {
        ...participant,
        settings,
        score,
        maxScore,
        percentage,
        correct,
        classTitle: settings.classId ? classTitleById.get(settings.classId) ?? messages.teacher.classOnly : "",
      },
    ];
  });
  const completedTests = recentResults.length;
  const averagePercentage =
    completedTests === 0
      ? null
      : Math.round(recentResults.reduce((sum, result) => sum + result.percentage, 0) / completedTests);

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">{messages.student.welcome}</p>
          <h1 className="mt-1 text-3xl font-bold">{student.displayName}</h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricCard label={messages.student.classesTitle} value={classMemberships.length} />
            <MetricCard label={messages.student.completedTests} value={completedTests} />
            <MetricCard
              label={messages.results.averageScore}
              value={averagePercentage === null ? "-" : `${averagePercentage}%`}
            />
          </div>
          {student.groupName ? (
            <p className="mt-4 text-sm text-slate-600">
              {messages.student.group}: {student.groupName}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{messages.student.liveNow}</h2>
            <Link href="/play" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {messages.play.joinAnotherGame}
            </Link>
          </div>
          {liveClassSessions.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {messages.student.noLiveClassGames}
            </p>
          ) : (
            <div className="grid gap-3">
              {liveClassSessions.map((session) => (
                <article
                  key={session.id}
                  className="grid gap-4 rounded-md border border-blue-200 bg-blue-50 p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-800">
                        {statusLabel(session.status)}
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                        {modeLabel(session.mode)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-blue-950">
                      {session.testVersion.test.title}
                    </h3>
                    <p className="mt-1 text-sm text-blue-900">
                      {session.classTitle}
                      {session.questionCount > 0 ? ` - ${session.questionCount} questions` : ""}
                    </p>
                    {session.sessionLabel ? (
                      <p className="mt-1 text-sm font-semibold text-blue-900">{session.sessionLabel}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/play?code=${session.code}`}
                    className="rounded-md border border-blue-300 bg-white px-5 py-3 text-center font-semibold text-blue-950 shadow-sm hover:bg-blue-100"
                  >
                    {messages.student.joinLiveRound}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{messages.student.assignmentsTitle}</h2>
            <Link href="/student/assignments" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {messages.common.view}
            </Link>
          </div>
          {assignmentSubmissions === null ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              {messages.api.assignmentMigrationRequired}
            </p>
          ) : assignmentSubmissions.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {messages.student.noActiveAssignments}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assignmentSubmissions.map((submission) => (
                <article key={submission.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{submission.assignment.title}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {submission.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {submission.assignment.classroom.title} - {submission.assignment.testVersion.test.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Due: {submission.assignment.dueAt ? submission.assignment.dueAt.toLocaleString() : "No due date"}
                  </p>
                  <Link
                    href={`/student/assignments/${submission.assignmentId}`}
                    className="mt-4 inline-flex rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    {messages.common.open}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">{messages.student.classesTitle}</h2>
          {classMemberships.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {messages.student.noClasses}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {classMemberships.map((membership, index) => (
                <article key={membership.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${classAccent(index)}`} />
                    <h3 className="font-semibold">{membership.classroom.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {membership.classroom.teacher.name ?? membership.classroom.teacher.email}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-teal-800">
                    {messages.teacher.joinCode}: {membership.classroom.joinCode}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{messages.student.recentResults}</h2>
            <Link href="/student/results" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {messages.common.view}
            </Link>
          </div>
          {recentResults.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {messages.student.noResults}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentResults.slice(0, 6).map((result) => (
                <article key={result.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{result.session.testVersion.test.title}</h3>
                    <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">
                      {modeLabel(result.session.mode)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {result.classTitle || result.settings.label || messages.sessions.audienceGuest}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {messages.results.score}:{" "}
                    <span className="font-semibold">{scoreSummary(result.score, result.maxScore)}</span> -{" "}
                    {messages.results.percentage}: <span className="font-semibold">{result.percentage}%</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {messages.results.correct}: <span className="font-semibold">{result.correct}</span>
                    {result.session.finishedAt ? ` - ${result.session.finishedAt.toLocaleString()}` : ""}
                  </p>
                  <Link
                    href={`/game/${result.session.code}/results`}
                    className="mt-4 inline-flex rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    {messages.student.viewLiveResult}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );
}
