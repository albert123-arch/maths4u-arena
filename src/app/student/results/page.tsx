import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage() {
  const student = await requireStudent();
  const scores = await prisma.seriesScore.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: {
      series: { select: { id: true, title: true } },
      round: { select: { title: true, roundNumber: true } },
      session: { select: { code: true } },
    },
  });

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold">{messages.student.resultsTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.student.recentResults}</p>
        </div>
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {scores.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.student.noResults}</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {scores.map((score) => (
                <article
                  key={score.id}
                  className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <h2 className="font-semibold">{score.series.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {score.round
                        ? `${score.round.roundNumber}. ${score.round.title}`
                        : messages.series.total}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {messages.results.correct}: {score.correctCount} - {messages.results.answers}:{" "}
                      {score.answeredCount}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold text-teal-800">{score.points}</span>
                    {score.session ? (
                      <Link
                        href={`/game/${score.session.code}/results`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        {messages.game.viewResults}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
