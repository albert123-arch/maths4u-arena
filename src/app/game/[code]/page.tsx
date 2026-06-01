import Link from "next/link";

import { ClassicGameClient } from "@/components/classic-game-client";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      testVersion: {
        include: {
          test: true,
        },
      },
      _count: {
        select: {
          participants: true,
          answers: true,
        },
      },
    },
  });

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{messages.game.notFoundTitle}</h1>
          <Link href="/play" className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.game.enterDifferentCode}
          </Link>
        </section>
      </main>
    );
  }

  const questions = await prisma.testVersionQuestion.findMany({
    where: { testVersionId: session.testVersionId },
    orderBy: { sortOrder: "asc" },
    select: {
      sortOrder: true,
      points: true,
      question: {
        select: {
          id: true,
          type: true,
          prompt: true,
          options: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              optionText: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-4xl gap-6">
        <header className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">
            {messages.game.codeLabel}: {session.code}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{session.testVersion.test.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {session.mode} - {session.status} - {messages.game.participantsLabel}{" "}
            {session._count.participants}
          </p>
        </header>
        <ClassicGameClient
          code={session.code}
          sessionId={session.id}
          initialStatus={session.status}
          initialParticipantCount={session._count.participants}
          initialAnswerCount={session._count.answers}
          questions={questions.map((item) => ({
            id: item.question.id,
            type: item.question.type,
            prompt: item.question.prompt,
            sortOrder: item.sortOrder,
            points: item.points,
            options: item.question.options,
          }))}
        />
      </section>
    </main>
  );
}
