import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { RunAgainButton } from "@/components/run-again-button";
import { SessionArchiveButton } from "@/components/session-archive-button";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

type LiveTab = "active" | "finished" | "archived";

function selectedTab(value?: string): LiveTab {
  if (value === "finished" || value === "archived" || value === "active") {
    return value;
  }

  return "active";
}

function tabHref(tab: LiveTab) {
  return `/teacher/live?tab=${tab}`;
}

function audienceLabel(settings: ReturnType<typeof parseSessionSettings>) {
  if (settings.seriesId) {
    return messages.sessions.audienceSeries;
  }

  if (settings.audience === "CLASS" || settings.classId) {
    return messages.sessions.audienceClass;
  }

  return messages.sessions.audienceGuest;
}

function statusLabel(status: string) {
  if (status === "LOBBY") {
    return messages.host.waitingStatus;
  }

  if (status === "RUNNING") {
    return messages.host.liveStatus;
  }

  return messages.host.finishedStatus;
}

export default async function TeacherLivePage({ searchParams }: PageProps) {
  const teacher = await requireTeacherUser();
  const { tab } = await searchParams;
  const currentTab = selectedTab(tab);
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const [sessions, classrooms] = await Promise.all([
    prisma.gameSession.findMany({
      where: {
        status: { in: ["LOBBY", "RUNNING", "FINISHED"] },
        testVersion: { test: { ownerUserId: teacher.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        testVersion: {
          select: {
            id: true,
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

    return {
      ...session,
      settings,
      archived: settings.archived,
      classTitle: settings.classId ? classTitleById.get(settings.classId) ?? messages.teacher.classOnly : null,
    };
  });
  const activeSessions = enrichedSessions.filter(
    (session) => !session.archived && (session.status === "LOBBY" || session.status === "RUNNING"),
  );
  const finishedSessions = enrichedSessions.filter(
    (session) => !session.archived && session.status === "FINISHED",
  );
  const archivedSessions = enrichedSessions.filter((session) => session.archived);
  const visibleSessions =
    currentTab === "archived"
      ? archivedSessions
      : currentTab === "finished"
        ? finishedSessions
        : activeSessions;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.teacher.liveTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.teacher.liveDescription}</p>
        </div>
        <Link
          href="/teacher/sets"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          {messages.teacher.startLiveGame}
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label={messages.teacher.liveActiveTab} value={activeSessions.length} />
        <MetricCard label={messages.teacher.liveFinishedTab} value={finishedSessions.length} />
        <MetricCard label={messages.teacher.liveArchivedTab} value={archivedSessions.length} />
      </section>

      <section className="flex flex-wrap gap-2">
        {([
          ["active", messages.teacher.liveActiveTab, activeSessions.length],
          ["finished", messages.teacher.liveFinishedTab, finishedSessions.length],
          ["archived", messages.teacher.liveArchivedTab, archivedSessions.length],
        ] as const).map(([value, label, count]) => (
          <Link
            key={value}
            href={tabHref(value)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              currentTab === value
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {label} ({count})
          </Link>
        ))}
        <button
          type="button"
          disabled
          title={messages.teacher.archiveOldSessionsTodo}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
        >
          {messages.teacher.archiveOldSessions}
        </button>
      </section>

      {visibleSessions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {messages.sessions.empty}
        </p>
      ) : (
        <section className="grid gap-3">
          {visibleSessions.map((session) => {
            const isClassGame = session.settings.audience === "CLASS" || Boolean(session.settings.classId);
            const joinPath =
              session.settings.seriesId
                ? `/student/join/${session.code}`
                : isClassGame
                  ? `/play?code=${session.code}`
                  : `/play?code=${session.code}`;
            const joinLink = `${appUrl}${joinPath}`;

            return (
              <article
                key={session.id}
                className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{session.testVersion.test.title}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {statusLabel(session.status)}
                    </span>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {session.mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {audienceLabel(session.settings)}
                    </span>
                    {session.archived ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                        {messages.sessions.archived}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {messages.game.codeLabel}: <span className="font-semibold">{session.code}</span> -{" "}
                    {session._count.participants} students -{" "}
                    {session.createdAt.toLocaleString()}
                  </p>
                  {session.settings.label || session.classTitle ? (
                    <p className="mt-1 text-sm font-semibold text-teal-800">
                      {[session.settings.label, session.classTitle].filter(Boolean).join(" - ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {session.status !== "FINISHED" && !session.archived ? (
                    <Link
                      href={`/host/${session.code}`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      {messages.sessions.hostLink}
                    </Link>
                  ) : null}
                  <CopyButton value={joinLink} label={messages.host.copyJoinLink} />
                  <Link
                    href={`/teacher/sessions/${session.code}/results`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    {messages.sessions.resultsLink}
                  </Link>
                  {session.status === "FINISHED" && !session.archived ? (
                    <>
                      <RunAgainButton
                        testVersionId={session.testVersion.id}
                        mode={session.mode}
                        settingsJson={session.settingsJson}
                        apiPath="/api/teacher/sessions"
                        compact
                      />
                      <SessionArchiveButton code={session.code} action="archive" compact />
                    </>
                  ) : null}
                  {session.archived ? (
                    <SessionArchiveButton code={session.code} action="restore" compact />
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );
}
