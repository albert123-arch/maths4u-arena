import Link from "next/link";

import { ClassicGameClient } from "@/components/classic-game-client";
import { HostPacedGameClient } from "@/components/host-paced-game-client";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

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
          <p className="text-sm text-slate-600">{messages.game.notFoundDescription}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/play"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.common.backToPlay}
            </Link>
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {messages.common.home}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const settings = parseSessionSettings(session.settingsJson);

  if (session.mode === "HOST_PACED") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <section className="mx-auto grid max-w-4xl gap-6">
          <Link href="/play" className="w-fit text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.common.backToPlay}
          </Link>
          <header className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-teal-800">
              {messages.game.codeLabel}: {session.code}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{session.testVersion.test.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {messages.sessions.modeHostPaced} - {session.status} - {messages.game.participantsLabel}{" "}
              {session._count.participants}
            </p>
            {settings.label ? <p className="mt-2 text-sm font-semibold text-teal-800">{settings.label}</p> : null}
          </header>
          <HostPacedGameClient code={session.code} sessionId={session.id} initialLive={null} />
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
        <Link href="/play" className="w-fit text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.backToPlay}
        </Link>
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
          initialTestTitle={session.testVersion.test.title}
          initialSessionLabel={settings.label}
          initialParticipantCount={session._count.participants}
          initialAnswerCount={session._count.answers}
          initialSettings={{
            showStudentResults: settings.showStudentResults,
            showCorrectAnswers: settings.showCorrectAnswers,
            showLeaderboard: settings.showLeaderboard,
          }}
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
