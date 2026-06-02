import Link from "next/link";

import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

export default async function TeacherLivePage() {
  const teacher = await requireTeacherUser();
  const [sessions, classrooms] = await Promise.all([
    prisma.gameSession.findMany({
      where: {
        status: { in: ["LOBBY", "RUNNING", "FINISHED"] },
        testVersion: { test: { ownerUserId: teacher.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        testVersion: {
          select: {
            test: { select: { title: true } },
          },
        },
        _count: { select: { participants: true, answers: true } },
      },
    }),
    prisma.classroom.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, title: true },
    }),
  ]);
  const classTitleById = new Map(classrooms.map((classroom) => [classroom.id, classroom.title]));
  const enrichedSessions = sessions.map((session) => {
    const settings = parseSessionSettings(session.settingsJson);
    const isClassGame = settings.audience === "CLASS" || Boolean(settings.classId && !settings.seriesId);

    return {
      ...session,
      settings,
      isClassGame,
      classTitle: settings.classId ? classTitleById.get(settings.classId) ?? messages.teacher.classOnly : null,
    };
  });
  const activeClassSessions = enrichedSessions.filter(
    (session) => session.isClassGame && (session.status === "LOBBY" || session.status === "RUNNING"),
  );
  const activeGuestSessions = enrichedSessions.filter(
    (session) => !session.isClassGame && (session.status === "LOBBY" || session.status === "RUNNING"),
  );
  const finishedSessions = enrichedSessions.filter((session) => session.status === "FINISHED").slice(0, 12);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.liveTitle}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.liveDescription}</p>
      </div>
      {enrichedSessions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {messages.sessions.empty}
        </p>
      ) : (
        <div className="grid gap-6">
          <SessionGroup title={messages.teacher.activeClassGames} sessions={activeClassSessions} />
          <SessionGroup title={messages.teacher.recentFinishedGames} sessions={finishedSessions} />
          <SessionGroup title={messages.teacher.guestGames} sessions={activeGuestSessions} />
        </div>
      )}
    </div>
  );
}

type TeacherLiveSession = {
  id: string;
  code: string;
  mode: string;
  status: string;
  createdAt: Date;
  classTitle: string | null;
  isClassGame: boolean;
  testVersion: {
    test: {
      title: string;
    };
  };
  _count: {
    participants: number;
    answers: number;
  };
};

function SessionGroup({
  title,
  sessions,
}: {
  title: string;
  sessions: TeacherLiveSession[];
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {sessions.map((session) => (
          <article key={session.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{session.testVersion.test.title}</h3>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {session.status}
                </span>
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                  {session.mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic}
                </span>
                {session.isClassGame ? (
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                    {session.classTitle ?? messages.teacher.classOnly}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {session.code} - {session._count.participants} {messages.host.participants.toLowerCase()} -{" "}
                {session.createdAt.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {session.status !== "FINISHED" ? (
                <Link
                  href={`/host/${session.code}`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  {messages.sessions.hostLink}
                </Link>
              ) : null}
              <Link
                href={`/teacher/sessions/${session.code}/results`}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                {messages.sessions.resultsLink}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
