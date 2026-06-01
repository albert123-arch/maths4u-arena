import Link from "next/link";

import { HostControls } from "@/components/host-controls";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function HostPage({ params }: PageProps) {
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <section className="grid gap-4">
          <h1 className="text-3xl font-bold">{messages.host.notFoundTitle}</h1>
          <Link href="/admin" className="font-semibold text-teal-300">
            {messages.common.backToAdmin}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-8">
        <header className="grid gap-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">
            {messages.host.title}
          </p>
          <h1 className="text-5xl font-bold sm:text-7xl">{session.code}</h1>
          <p className="text-xl text-slate-300">{session.testVersion.test.title}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{messages.host.status}</p>
            <p className="mt-2 text-2xl font-bold">{session.status}</p>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{messages.host.participants}</p>
            <p className="mt-2 text-2xl font-bold">{session._count.participants}</p>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{messages.host.answers}</p>
            <p className="mt-2 text-2xl font-bold">{session._count.answers}</p>
          </div>
        </div>
        <HostControls code={session.code} status={session.status} />
        <section className="grid gap-3 rounded-md border border-slate-700 bg-slate-900 p-5 text-slate-300">
          <h2 className="text-lg font-semibold text-white">{messages.host.linksTitle}</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/game/${session.code}`} className="font-semibold text-teal-300">
              {messages.sessions.gameLink}
            </Link>
            <Link href="/play" className="font-semibold text-teal-300">
              {messages.sessions.playLink}
            </Link>
            <Link href={`/admin/sessions/${session.code}/results`} className="font-semibold text-teal-300">
              {messages.sessions.resultsLink}
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
