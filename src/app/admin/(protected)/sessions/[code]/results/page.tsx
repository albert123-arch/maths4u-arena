import Link from "next/link";
import { notFound } from "next/navigation";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function SessionResultsPage({ params }: PageProps) {
  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      testVersion: {
        include: {
          test: true,
          questions: {
            select: {
              points: true,
            },
          },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  prompt: true,
                },
              },
            },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  const totalPossible = session.testVersion.questions.reduce((sum, item) => sum + item.points, 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.results.title}</h1>
          <p className="mt-2 text-slate-600">
            {session.testVersion.test.title} - {messages.game.codeLabel} {session.code}
          </p>
        </div>
        <Link href="/admin/sessions" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.results.back}
        </Link>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">{messages.host.status}</p>
            <p className="mt-1 text-xl font-bold">{session.status}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.host.participants}</p>
            <p className="mt-1 text-xl font-bold">{session.participants.length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.results.totalPossible}</p>
            <p className="mt-1 text-xl font-bold">{totalPossible}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.results.exportTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{messages.results.exportPlaceholder}</p>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {session.participants.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.results.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">{messages.results.participant}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.score}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.answers}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.correctness}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.lastAnswer}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {session.participants.map((participant) => {
                  const totalScore = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
                  const correct = participant.answers.filter((answer) => answer.isCorrect === true).length;
                  const answered = participant.answers.length;
                  const lastAnswer = participant.answers.at(-1);

                  return (
                    <tr key={participant.id}>
                      <td className="px-4 py-3 font-medium">{participant.displayName}</td>
                      <td className="px-4 py-3">
                        {totalScore} / {totalPossible}
                      </td>
                      <td className="px-4 py-3">{answered}</td>
                      <td className="px-4 py-3">
                        {answered === 0 ? "0%" : `${Math.round((correct / answered) * 100)}%`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lastAnswer ? lastAnswer.question.prompt.slice(0, 80) : messages.results.noAnswers}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
