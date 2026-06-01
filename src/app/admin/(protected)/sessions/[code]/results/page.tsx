import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionResultsTable } from "@/components/session-results-table";
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
      <SessionResultsTable
        initialData={{
          code: session.code,
          status: session.status,
          testTitle: session.testVersion.test.title,
          totalPossible,
          participants: session.participants.map((participant) => {
            const totalScore = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
            const correct = participant.answers.filter((answer) => answer.isCorrect === true).length;
            const answered = participant.answers.length;
            const lastAnswer = participant.answers.at(-1);

            return {
              id: participant.id,
              displayName: participant.displayName,
              totalScore,
              answered,
              correctness: answered === 0 ? 0 : Math.round((correct / answered) * 100),
              lastAnswerPrompt: lastAnswer?.question.prompt ?? null,
            };
          }),
        }}
      />
    </div>
  );
}
