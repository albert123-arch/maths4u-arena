import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getSeriesLeaderboard } from "@/lib/series-scoring";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentSeriesDetailPage({ params }: PageProps) {
  const student = await requireStudent();
  const { id } = await params;
  const registration = await prisma.seriesRegistration.findUnique({
    where: {
      seriesId_studentId: {
        seriesId: id,
        studentId: student.id,
      },
    },
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
              scores: {
                where: { studentId: student.id },
              },
            },
          },
        },
      },
    },
  });

  if (!registration || registration.status !== "REGISTERED") {
    return (
      <StudentShell student={student}>
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.student.notRegisteredForSeries}</h1>
          <p className="text-sm text-slate-600">{messages.api.studentRegistrationRequired}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/student"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.student.backToDashboard}
            </Link>
            <Link
              href="/student/series"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {messages.student.seriesTitle}
            </Link>
          </div>
        </section>
      </StudentShell>
    );
  }

  const leaderboard = await getSeriesLeaderboard(id);
  const row = leaderboard?.rows.find((item) => item.studentId === student.id);

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <div className="flex flex-wrap gap-3">
            <Link href="/student" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {messages.student.backToDashboard}
            </Link>
            <Link href="/student/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {messages.common.back}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{registration.series.title}</h1>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {registration.series.status}
            </span>
          </div>
          <p className="mt-2 text-slate-600">
            {messages.student.registrationStatus}: {registration.status}
          </p>
        </div>
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{messages.student.totalScore}</p>
            <p className="mt-1 text-3xl font-bold">{row?.totalScore ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{messages.student.currentRank}</p>
            <p className="mt-1 text-3xl font-bold">{row?.rank ?? messages.results.hidden}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{messages.series.averagePercentage}</p>
            <p className="mt-1 text-3xl font-bold">{row?.averagePercentage ?? 0}%</p>
          </div>
        </section>
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-xl font-semibold">{messages.series.rounds}</h2>
          </div>
          {registration.series.rounds.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.series.noRounds}</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {registration.series.rounds.map((round) => {
                const score = round.scores[0];

                return (
                  <article key={round.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {round.roundNumber}. {round.title}
                        </h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {round.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {messages.student.roundScore}: {score?.points ?? 0} -{" "}
                        {messages.results.rank}: {score?.rank ?? messages.results.hidden}
                      </p>
                      {round.scheduledAt ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {messages.series.scheduledAt}: {round.scheduledAt.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    {round.session && (round.session.status === "LOBBY" || round.session.status === "RUNNING") ? (
                      <Link
                        href={`/play?code=${round.session.code}`}
                        className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                      >
                        {messages.student.joinLiveRound}
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <Link href={`/series/${id}/leaderboard`} className="font-semibold text-teal-800 hover:text-teal-950">
          {messages.series.publicLeaderboard}
        </Link>
      </div>
    </StudentShell>
  );
}
