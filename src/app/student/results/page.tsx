import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
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
  const liveResultsRaw = await prisma.participant.findMany({
    where: {
      studentAccountId: student.id,
      session: {
        status: "FINISHED",
      },
    },
    orderBy: { joinedAt: "desc" },
    take: 20,
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
              test: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const liveResults = liveResultsRaw.filter((participant) => {
    const settings = parseSessionSettings(participant.session.settingsJson);

    return !settings.archived;
  });

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold">{messages.student.resultsTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.student.recentResults}</p>
        </div>
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-xl font-semibold">{messages.student.recentLiveResults}</h2>
          </div>
          {liveResults.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.student.noLiveResults}</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {liveResults.map((participant) => {
                const settings = parseSessionSettings(participant.session.settingsJson);
                const score = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
                const correct = participant.answers.filter((answer) => answer.isCorrect === true).length;

                return (
                  <article
                    key={participant.id}
                    className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{participant.session.testVersion.test.title}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {participant.session.mode === "HOST_PACED"
                            ? messages.sessions.modeHostPaced
                            : messages.sessions.modeClassic}
                        </span>
                      </div>
                      {settings.label ? <p className="mt-1 text-sm text-teal-800">{settings.label}</p> : null}
                      <p className="mt-1 text-sm text-slate-600">
                        {messages.results.score}: {score} - {messages.results.correct}: {correct}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {participant.session.finishedAt
                          ? participant.session.finishedAt.toLocaleString()
                          : messages.game.finished}
                      </p>
                    </div>
                    <Link
                      href={`/game/${participant.session.code}/results`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      {messages.student.viewLiveResult}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-xl font-semibold">{messages.student.seriesTitle}</h2>
          </div>
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
