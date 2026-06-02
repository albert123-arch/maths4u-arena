import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getSeriesLeaderboard } from "@/lib/series-scoring";
import { parseSessionSettings } from "@/lib/session-settings";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const student = await requireStudent();
  const registrations = await prisma.seriesRegistration.findMany({
    where: {
      studentId: student.id,
      status: "REGISTERED",
    },
    orderBy: { createdAt: "desc" },
    include: {
      series: {
        include: {
          rounds: {
            orderBy: { roundNumber: "asc" },
            include: {
              session: {
                select: {
                  code: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const recentScores = await prisma.seriesScore.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      series: { select: { title: true } },
      round: { select: { title: true, roundNumber: true } },
    },
  });
  const classMemberships = await prisma.classMembership.findMany({
    where: {
      studentId: student.id,
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "desc" },
    include: {
      classroom: {
        select: {
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
  const liveClassSessions = classIds.length
    ? (
        await prisma.gameSession.findMany({
          where: { status: { in: ["LOBBY", "RUNNING"] } },
          orderBy: { createdAt: "desc" },
          take: 80,
          include: {
            testVersion: {
              select: {
                test: { select: { title: true } },
              },
            },
          },
        })
      ).filter((session) => {
        const settings = parseSessionSettings(session.settingsJson);

        return Boolean(settings.classId && classIds.includes(settings.classId));
      })
    : [];

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">{messages.student.welcome}</p>
          <h1 className="mt-1 text-3xl font-bold">{student.displayName}</h1>
          {student.groupName ? (
            <p className="mt-2 text-sm text-slate-600">
              {messages.student.group}: {student.groupName}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">{messages.student.classesTitle}</h2>
          {classMemberships.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {messages.student.noClasses}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {classMemberships.map((membership) => (
                <article key={membership.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">{membership.classroom.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {membership.classroom.teacher.name ?? membership.classroom.teacher.email}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-teal-800">
                    {messages.teacher.joinCode}: {membership.classroom.joinCode}
                  </p>
                  <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
                    <p>{messages.student.classLiveGamesPlaceholder}</p>
                    <p>{messages.student.classAssignmentsPlaceholder}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {liveClassSessions.length > 0 ? (
          <section className="grid gap-3">
            <h2 className="text-xl font-semibold">{messages.teacher.myLiveSessions}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {liveClassSessions.map((session) => (
                <article key={session.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{session.testVersion.test.title}</h3>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {messages.game.codeLabel}: <span className="font-semibold">{session.code}</span>
                  </p>
                  <Link
                    href={`/student/join/${session.code}`}
                    className="mt-4 inline-flex rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    {messages.student.joinLiveRound}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{messages.student.seriesTitle}</h2>
            <Link href="/student/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {messages.common.view}
            </Link>
          </div>
          {registrations.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {messages.student.noSeries}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {await Promise.all(
                registrations.slice(0, 4).map(async (registration) => {
                  const leaderboard = await getSeriesLeaderboard(registration.seriesId);
                  const row = leaderboard?.rows.find((item) => item.studentId === student.id);
                  const liveRound = registration.series.rounds.find(
                    (round) => round.session && (round.session.status === "LOBBY" || round.session.status === "RUNNING"),
                  );
                  const nextRound = registration.series.rounds.find(
                    (round) => round.status === "SCHEDULED" || round.status === "LOBBY",
                  );

                  return (
                    <article key={registration.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{registration.series.title}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {registration.series.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {messages.student.totalScore}: {row?.totalScore ?? 0}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {messages.student.currentRank}: {row?.rank ?? messages.results.hidden}
                      </p>
                      {nextRound ? (
                        <p className="mt-3 rounded-md bg-teal-50 p-3 text-sm font-medium text-teal-950">
                          {messages.student.nextRound}: {nextRound.title}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/student/series/${registration.seriesId}`}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          {messages.common.open}
                        </Link>
                        {liveRound?.session ? (
                          <Link
                            href={`/play?code=${liveRound.session.code}`}
                            className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                          >
                            {messages.student.joinLiveRound}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                }),
              )}
            </div>
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{messages.student.recentResults}</h2>
          {recentScores.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{messages.student.noResults}</p>
          ) : (
            <div className="mt-4 grid gap-2">
              {recentScores.map((score) => (
                <div key={score.id} className="grid gap-1 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">{score.series.title}</p>
                    <p className="text-sm text-slate-600">
                      {score.round ? `${score.round.roundNumber}. ${score.round.title}` : messages.series.total}
                    </p>
                  </div>
                  <p className="font-bold text-teal-800">{score.points}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
