import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getSeriesLeaderboard } from "@/lib/series-scoring";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

export default async function StudentSeriesPage() {
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

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold">{messages.student.seriesTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.student.seriesDescription}</p>
        </div>
        {registrations.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.student.noSeries}
          </p>
        ) : (
          <div className="grid gap-3">
            {await Promise.all(
              registrations.map(async (registration) => {
                const leaderboard = await getSeriesLeaderboard(registration.seriesId);
                const row = leaderboard?.rows.find((item) => item.studentId === student.id);
                const liveRound = registration.series.rounds.find(
                  (round) => round.session && (round.session.status === "LOBBY" || round.session.status === "RUNNING"),
                );

                return (
                  <article
                    key={registration.id}
                    className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{registration.series.title}</h2>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {registration.series.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {messages.student.totalScore}: {row?.totalScore ?? 0} -{" "}
                        {messages.student.currentRank}: {row?.rank ?? messages.results.hidden}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
      </div>
    </StudentShell>
  );
}
