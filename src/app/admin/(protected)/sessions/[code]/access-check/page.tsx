import Link from "next/link";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

function valueOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

export default async function SessionAccessCheckPage({ params }: PageProps) {
  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      status: true,
      mode: true,
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
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          displayName: true,
          studentAccountId: true,
          joinedAt: true,
        },
      },
    },
  });

  if (!session) {
    return (
      <div className="grid gap-6">
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.host.notFoundTitle}</h1>
          <p className="text-sm text-slate-600">{messages.host.notFoundDescription}</p>
          <Link href="/admin/sessions" className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.results.back}
          </Link>
        </section>
      </div>
    );
  }

  const settings = parseSessionSettings(session.settingsJson);
  const [series, round] = await Promise.all([
    settings.seriesId
      ? prisma.series.findUnique({
          where: { id: settings.seriesId },
          select: {
            id: true,
            title: true,
            registrations: {
              orderBy: { displayNameSnapshot: "asc" },
              select: {
                id: true,
                studentId: true,
                displayNameSnapshot: true,
                status: true,
                student: {
                  select: {
                    username: true,
                    displayName: true,
                    status: true,
                  },
                },
              },
            },
          },
        })
      : null,
    settings.roundId
      ? prisma.seriesRound.findUnique({
          where: { id: settings.roundId },
          select: {
            id: true,
            title: true,
            roundNumber: true,
            sessionId: true,
          },
        })
      : prisma.seriesRound.findFirst({
          where: { sessionId: session.id },
          select: {
            id: true,
            title: true,
            roundNumber: true,
            sessionId: true,
          },
        }),
  ]);

  const registeredStudents = series?.registrations.filter(
    (registration) => registration.status === "REGISTERED",
  ) ?? [];
  const participantByStudentId = new Map(
    session.participants
      .filter((participant) => participant.studentAccountId)
      .map((participant) => [participant.studentAccountId as string, participant]),
  );
  const participantsWithoutStudent = session.participants.filter(
    (participant) => !participant.studentAccountId,
  );
  const warnings = [
    settings.registeredOnly && !settings.seriesId
      ? "This session is registered-only but has no seriesId in settingsJson."
      : "",
    settings.registeredOnly && registeredStudents.length === 0
      ? "This session is registered-only but no students are registered for the series."
      : "",
    round && !round.sessionId ? "This round has no sessionId." : "",
    ...registeredStudents
      .filter((registration) => !participantByStudentId.has(registration.studentId))
      .map(
        (registration) =>
          `This student is registered but has not joined yet: ${registration.displayNameSnapshot}.`,
      ),
    ...participantsWithoutStudent.map(
      (participant) =>
        `Participant exists but studentAccountId is missing: ${participant.displayName}.`,
    ),
  ].filter(Boolean);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/sessions" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.results.back}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{messages.host.accessCheck}</h1>
          <p className="mt-2 text-slate-600">
            {session.testVersion.test.title} - {messages.game.codeLabel} {session.code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/host/${session.code}`}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {messages.sessions.hostLink}
          </Link>
          <Link
            href={`/admin/sessions/${session.code}/results`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
          >
            {messages.sessions.resultsLink}
          </Link>
        </div>
      </div>

      <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <InfoCard label={messages.game.codeLabel} value={session.code} />
        <InfoCard label={messages.host.status} value={session.status} />
        <InfoCard label={messages.sessions.chooseMode} value={session.mode} />
        <InfoCard label={messages.host.registeredRound} value={settings.registeredOnly ? "Yes" : "No"} />
        <InfoCard label="Series" value={valueOrDash(series?.title)} />
        <InfoCard label="Round" value={round ? `${round.roundNumber}. ${round.title}` : "-"} />
        <InfoCard label={messages.host.registeredStudentsCount} value={registeredStudents.length} />
        <InfoCard label={messages.host.joinedParticipantsCount} value={session.participants.length} />
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-amber-950">Warnings</h2>
          <div className="mt-3 grid gap-2">
            {warnings.map((warning) => (
              <p key={warning} className="rounded-md bg-white/70 p-3 text-sm font-medium text-amber-900">
                {warning}
              </p>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          No access warnings detected.
        </p>
      )}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold">{messages.series.registeredStudents}</h2>
        </div>
        {series ? (
          registeredStudents.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.series.noRegisteredStudentsWarning}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Display Name</th>
                    <th className="px-4 py-3 font-semibold">Username</th>
                    <th className="px-4 py-3 font-semibold">Registration Status</th>
                    <th className="px-4 py-3 font-semibold">Participant Exists</th>
                    <th className="px-4 py-3 font-semibold">Participant ID</th>
                    <th className="px-4 py-3 font-semibold">Joined At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {registeredStudents.map((registration) => {
                    const participant = participantByStudentId.get(registration.studentId);

                    return (
                      <tr key={registration.id}>
                        <td className="px-4 py-3 font-medium">
                          {registration.student.displayName || registration.displayNameSnapshot}
                        </td>
                        <td className="px-4 py-3">{registration.student.username}</td>
                        <td className="px-4 py-3">{registration.status}</td>
                        <td className="px-4 py-3">{participant ? "Yes" : "No"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{participant?.id ?? "-"}</td>
                        <td className="px-4 py-3">
                          {participant ? new Date(participant.joinedAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="p-5 text-sm text-slate-600">
            This session is not linked to a series in settingsJson.
          </p>
        )}
      </section>

      {participantsWithoutStudent.length > 0 ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-bold">Participants Missing Student Account</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Participant</th>
                  <th className="px-4 py-3 font-semibold">Participant ID</th>
                  <th className="px-4 py-3 font-semibold">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {participantsWithoutStudent.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-4 py-3 font-medium">{participant.displayName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{participant.id}</td>
                    <td className="px-4 py-3">{new Date(participant.joinedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-bold">{value}</p>
    </div>
  );
}
