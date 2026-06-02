import Link from "next/link";

import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

export default async function TeacherLivePage() {
  const teacher = await requireTeacherUser();
  const sessions = await prisma.gameSession.findMany({
    where: {
      status: { in: ["LOBBY", "RUNNING"] },
      testVersion: { test: { ownerUserId: teacher.id } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: {
        select: {
          test: { select: { title: true } },
        },
      },
      _count: { select: { participants: true, answers: true } },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.liveTitle}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.liveDescription}</p>
      </div>
      {sessions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {messages.sessions.empty}
        </p>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {sessions.map((session) => {
            const settings = parseSessionSettings(session.settingsJson);

            return (
              <article key={session.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{session.testVersion.test.title}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {session.status}
                    </span>
                    {settings.classId ? (
                      <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                        {messages.teacher.classOnly}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {session.code} - {session.mode} - {session._count.participants}{" "}
                    {messages.host.participants.toLowerCase()}
                  </p>
                </div>
                <Link
                  href={`/host/${session.code}`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  {messages.sessions.hostLink}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
