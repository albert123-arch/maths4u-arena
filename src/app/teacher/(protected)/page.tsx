import Link from "next/link";

import { SessionArchiveButton } from "@/components/session-archive-button";
import { SessionLifecycleButton } from "@/components/session-lifecycle-button";
import { TeacherQuickLaunchForm } from "@/components/teacher-quick-launch-form";
import { requireTeacherUser } from "@/lib/auth";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { buildSessionResults } from "@/lib/session-results";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

async function countTeacherSeries(teacherId: string) {
  try {
    return await prisma.series.count({
      where: { teacherId, status: { not: "ARCHIVED" } },
    });
  } catch (error) {
    if (isStudentSeriesMigrationError(error)) {
      return 0;
    }

    throw error;
  }
}

function classAccent(index: number) {
  return ["bg-blue-600", "bg-teal-600", "bg-orange-600", "bg-violet-600"][index % 4];
}

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacherUser();
  const [classrooms, quizSets, activeGames, recentFinishedGames, assignmentCount, seriesCount] =
    await Promise.all([
      prisma.classroom.findMany({
        where: { teacherId: teacher.id, status: "ACTIVE" },
        orderBy: { title: "asc" },
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        },
      }),
      prisma.test.findMany({
        where: {
          ownerUserId: teacher.id,
          status: { not: "ARCHIVED" },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: {
              id: true,
              questions: { select: { id: true } },
            },
          },
        },
      }),
      prisma.gameSession.findMany({
        where: {
          status: { in: ["LOBBY", "RUNNING"] },
          testVersion: { test: { ownerUserId: teacher.id } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          testVersion: {
            select: {
              questions: { select: { questionId: true } },
              test: { select: { title: true } },
            },
          },
          participants: {
            select: {
              id: true,
              answers: { select: { questionId: true } },
            },
          },
          _count: { select: { participants: true } },
        },
      }),
      prisma.gameSession.findMany({
        where: {
          status: "FINISHED",
          testVersion: { test: { ownerUserId: teacher.id } },
        },
        orderBy: { finishedAt: "desc" },
        take: 5,
        include: {
          testVersion: {
            select: {
              questions: { select: { points: true } },
              test: { select: { title: true } },
            },
          },
          participants: {
            select: {
              id: true,
              displayName: true,
              teamId: true,
              answers: {
                select: {
                  points: true,
                  isCorrect: true,
                  responseMs: true,
                },
              },
            },
          },
          _count: { select: { participants: true, answers: true } },
        },
      }),
      prisma.assignment.count({
        where: { teacherId: teacher.id, status: "ASSIGNED" },
      }).catch(() => 0),
      countTeacherSeries(teacher.id),
    ]);
  const classTitleById = new Map(classrooms.map((classroom) => [classroom.id, classroom.title]));
  const liveGames = activeGames.flatMap((session) => {
    const settings = parseSessionSettings(session.settingsJson);

    if (settings.archived) {
      return [];
    }

    const questionCount = session.testVersion.questions.length;
    const submittedCount = session.participants.filter((participant) => {
      const answered = new Set(participant.answers.map((answer) => answer.questionId)).size;

      return questionCount > 0 && answered >= questionCount;
    }).length;

    return [
      {
        ...session,
        settings,
        submittedCount,
        classTitle: settings.classId ? classTitleById.get(settings.classId) ?? messages.teacher.classOnly : null,
      },
    ];
  });
  const finishedGames = recentFinishedGames.flatMap((session) => {
    const settings = parseSessionSettings(session.settingsJson);

    if (settings.archived) {
      return [];
    }

    const results = buildSessionResults({
      mode: session.mode,
      settings,
      questions: session.testVersion.questions,
      participants: session.participants,
    });

    return [
      {
        ...session,
        settings,
        averageScore: results.averageScore,
        classTitle: settings.classId ? classTitleById.get(settings.classId) ?? messages.teacher.classOnly : null,
      },
    ];
  });
  const launchableQuizSets = quizSets.flatMap((test) => {
    const version = test.versions[0];

    if (!version) {
      return [];
    }

    return [
      {
        testVersionId: version.id,
        title: test.title,
        questionCount: version.questions.length,
      },
    ];
  });

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-teal-800">{messages.teacherShell.subtitle}</p>
        <h1 className="mt-1 text-3xl font-bold">
          Welcome, {teacher.name ?? teacher.email}
        </h1>
        <p className="mt-2 text-slate-600">
          Choose a quiz set, choose a class, and launch a live game.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <LinkButton href="/teacher/classes">{messages.teacher.createClass}</LinkButton>
          <LinkButton href="/teacher/sets/new">Create Quiz Set</LinkButton>
          <LinkButton href="/teacher/assignments/new">Create Assignment</LinkButton>
          <LinkButton href="/teacher/classes">Invite Students</LinkButton>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label={messages.teacher.myClasses} value={classrooms.length} href="/teacher/classes" />
        <MetricCard label="Active Games" value={liveGames.length} href="/teacher/live" />
        <MetricCard label="Quiz Sets" value={quizSets.length} href="/teacher/sets" />
        <MetricCard label={messages.teacher.assignmentsTitle} value={assignmentCount} href="/teacher/assignments" />
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-slate-500">{messages.teacher.myClasses}</h2>
          <Link href="/teacher/classes" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.common.view}
          </Link>
        </div>
        {classrooms.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noClasses} {messages.teacher.createClassFirst}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {classrooms.slice(0, 6).map((classroom, index) => {
              const activeCount = liveGames.filter((game) => game.settings.classId === classroom.id).length;

              return (
                <Link
                  key={classroom.id}
                  href={`/teacher/classes/${classroom.id}`}
                  className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${classAccent(index)}`} />
                      <h3 className="text-lg font-bold">{classroom.title}</h3>
                    </div>
                    <span className="text-sm text-slate-600">{classroom.memberships.length} students</span>
                  </div>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${classAccent(index)}`}
                      style={{ width: `${Math.min(100, 20 + classroom.memberships.length * 3)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {activeCount > 0 ? `${activeCount} active` : "No active games"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <TeacherQuickLaunchForm
        quizSets={launchableQuizSets}
        classrooms={classrooms.map((classroom) => ({ id: classroom.id, title: classroom.title }))}
      />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Live Now</h2>
          <Link href="/teacher/live" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.teacher.backToLiveGames}
          </Link>
        </div>
        {liveGames.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noLiveGamesNow}
          </p>
        ) : (
          <div className="grid gap-3">
            {liveGames.map((game) => (
              <article
                key={game.id}
                className="grid gap-3 rounded-md border border-teal-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{game.testVersion.test.title}</h3>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {game.status === "LOBBY" ? messages.host.waitingStatus : messages.host.liveStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {game.classTitle ?? messages.sessions.audienceGuest} - {game._count.participants} students joined
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link
                    href={`/host/${game.code}`}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {messages.sessions.hostLink}
                  </Link>
                  {game.status === "LOBBY" ? (
                    <>
                      <SessionLifecycleButton code={game.code} action="close" compact />
                      <SessionArchiveButton code={game.code} action="archive" compact />
                    </>
                  ) : (
                    <>
                      <SessionLifecycleButton code={game.code} action="finish" compact />
                      <Link
                        href={`/teacher/sessions/${game.code}/results`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        {messages.sessions.resultsLink}
                      </Link>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Recent Tests</h2>
          <Link href="/teacher/results" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.common.view}
          </Link>
        </div>
        {finishedGames.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.sessions.empty}
          </p>
        ) : (
          <div className="grid gap-3">
            {finishedGames.map((game) => (
              <article
                key={`finished-${game.id}`}
                className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">
                      {game.settings.closedWithoutStart ? messages.teacher.closedTestStatus : messages.teacher.finishedTestStatus}
                    </span>
                    <h3 className="font-semibold">{game.testVersion.test.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {game.classTitle ?? messages.sessions.audienceGuest} - {messages.teacher.averageScoreShort}{" "}
                    {game.averageScore} -{" "}
                    {game.finishedAt ? game.finishedAt.toLocaleString() : game.createdAt.toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/teacher/sessions/${game.code}/results`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  {messages.sessions.resultsLink}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ActionCard title={messages.series.title} description="Create class leagues and launch rounds." href="/teacher/series" value={seriesCount} />
        <ActionCard title={messages.teacher.libraryTitle} description={messages.teacher.libraryDescription} href="/teacher/library" />
        <ActionCard title="Question Bank" description="Advanced direct question management." href="/teacher/questions" />
      </section>
    </div>
  );
}

function MetricCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </Link>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
      {children}
    </Link>
  );
}

function ActionCard({
  title,
  description,
  href,
  value,
}: {
  title: string;
  description: string;
  href: string;
  value?: number;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {typeof value === "number" ? <span className="text-xl font-bold text-teal-800">{value}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
