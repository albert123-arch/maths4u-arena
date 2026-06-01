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
        select: { participants: true },
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

  const questions =
    session.status === "RUNNING"
      ? await prisma.testVersionQuestion.findMany({
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
        })
      : [];

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
        {session.status === "LOBBY" ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-2xl font-bold">{messages.game.lobbyTitle}</h2>
            <p className="mt-2 text-slate-600">{messages.game.lobbyDescription}</p>
          </section>
        ) : null}
        {session.status === "RUNNING" ? (
          <>
            {questions.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
                {messages.game.noQuestions}
              </p>
            ) : (
              <ClassicGameClient
                code={session.code}
                sessionId={session.id}
                questions={questions.map((item) => ({
                  id: item.question.id,
                  type: item.question.type,
                  prompt: item.question.prompt,
                  sortOrder: item.sortOrder,
                  points: item.points,
                  options: item.question.options,
                }))}
              />
            )}
          </>
        ) : null}
        {session.status === "PAUSED" || session.status === "FINISHED" ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-2xl font-bold">
              {session.status === "PAUSED" ? messages.game.paused : messages.game.finished}
            </h2>
          </section>
        ) : null}
      </section>
    </main>
  );
}
