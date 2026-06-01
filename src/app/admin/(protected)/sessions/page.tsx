import Link from "next/link";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: {
        select: {
          title: true,
          test: {
            select: {
              title: true,
              subject: true,
            },
          },
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

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.sessions.title}</h1>
        <p className="mt-2 text-slate-600">{messages.sessions.description}</p>
      </div>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {sessions.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.sessions.empty}</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{session.code}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {session.testVersion.test.title} - {session.testVersion.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {session._count.participants} {messages.host.participants.toLowerCase()} -{" "}
                    {session._count.answers} {messages.host.answers.toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/host/${session.code}`}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    {messages.sessions.hostLink}
                  </Link>
                  <Link
                    href={`/game/${session.code}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    {messages.sessions.gameLink}
                  </Link>
                  <Link
                    href={`/admin/sessions/${session.code}/results`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    {messages.sessions.resultsLink}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
