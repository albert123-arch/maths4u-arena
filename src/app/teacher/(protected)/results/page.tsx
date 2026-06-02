import Link from "next/link";

import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

function modeLabel(mode: string) {
  return mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic;
}

function statusLabel(status: string) {
  if (status === "LOBBY") {
    return messages.host.waitingStatus;
  }

  if (status === "RUNNING") {
    return messages.host.liveStatus;
  }

  if (status === "FINISHED") {
    return messages.host.finishedStatus;
  }

  return status;
}

export default async function TeacherResultsPage() {
  const teacher = await requireTeacherUser();
  const rawSessions = await prisma.gameSession.findMany({
    where: {
      testVersion: {
        test: {
          ownerUserId: teacher.id,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      testVersion: {
        select: {
          test: { select: { title: true } },
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
  const sessions = rawSessions.filter((session) => !parseSessionSettings(session.settingsJson).archived);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.resultsTitle}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.resultsDescription}</p>
      </div>
      {sessions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {messages.sessions.empty}
        </p>
      ) : (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">{messages.sessions.code}</th>
                <th className="px-4 py-3 font-semibold">{messages.tests.title}</th>
                <th className="px-4 py-3 font-semibold">{messages.host.mode}</th>
                <th className="px-4 py-3 font-semibold">{messages.host.status}</th>
                <th className="px-4 py-3 font-semibold">{messages.host.participants}</th>
                <th className="px-4 py-3 font-semibold">{messages.results.answeredCount}</th>
                <th className="px-4 py-3 font-semibold">{messages.common.open}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessions.map((session) => {
                const settings = parseSessionSettings(session.settingsJson);

                return (
                  <tr key={session.id}>
                    <td className="px-4 py-3 font-semibold">{session.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{session.testVersion.test.title}</div>
                      {settings.label ? (
                        <div className="text-xs text-slate-500">{settings.label}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{modeLabel(session.mode)}</td>
                    <td className="px-4 py-3">{statusLabel(session.status)}</td>
                    <td className="px-4 py-3">{session._count.participants}</td>
                    <td className="px-4 py-3">{session._count.answers}</td>
                    <td className="px-4 py-3">
                      <Link href={`/teacher/sessions/${session.code}/results`} className="font-semibold text-teal-800">
                        {messages.results.title}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
