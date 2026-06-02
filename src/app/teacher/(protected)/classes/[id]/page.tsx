import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassJoinCard } from "@/components/class-join-card";
import { CopyButton } from "@/components/copy-button";
import { RemoveClassStudentButton } from "@/components/teacher-class-actions";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClassDetailPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const classroom = await prisma.classroom.findFirst({
    where: {
      id,
      teacherId: teacher.id,
    },
    include: {
      memberships: {
        where: { status: { in: ["ACTIVE", "PENDING"] } },
        orderBy: { joinedAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              username: true,
              displayName: true,
              groupName: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!classroom) {
    notFound();
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const joinLink = `${appUrl}/join-class/${classroom.joinCode}`;
  const inviteInstructions = `Open ${joinLink}, create or log in to your student account, then join ${classroom.title}.`;
  const classSessions = (
    await prisma.gameSession.findMany({
      where: {
        testVersion: {
          test: {
            ownerUserId: teacher.id,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        mode: true,
        status: true,
        createdAt: true,
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
        _count: {
          select: {
            participants: true,
            answers: true,
          },
        },
      },
    })
  )
    .map((session) => ({
      ...session,
      settings: parseSessionSettings(session.settingsJson),
    }))
    .filter((session) => session.settings.classId === classroom.id);
  const activeSessions = classSessions.filter((session) => session.status === "LOBBY" || session.status === "RUNNING");
  const recentFinishedSessions = classSessions.filter((session) => session.status === "FINISHED").slice(0, 6);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/teacher/classes" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.teacherShell.nav.classes}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{classroom.title}</h1>
          {classroom.description ? <p className="mt-2 text-slate-600">{classroom.description}</p> : null}
        </div>
        <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {classroom.status}
        </span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ClassJoinCard joinCode={classroom.joinCode} joinLink={joinLink} />
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard label={messages.teacher.joinCode} value={classroom.joinCode} />
            <InfoCard label={messages.teacher.studentList} value={classroom.memberships.length} />
            <InfoCard label={messages.host.status} value={classroom.status} />
          </div>
          <section className="grid gap-3 rounded-md border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-teal-950">Invite Students</h2>
              <p className="mt-1 text-sm text-teal-900">
                Students can scan the QR code, create their own account, and join this class.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/classes/${classroom.id}/invite`}
                className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Open invite screen
              </Link>
              <CopyButton value={joinLink} label={messages.host.copyJoinLink} className="bg-white" />
              <CopyButton value={inviteInstructions} label="Copy instructions" className="bg-white" />
            </div>
          </section>
          <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{messages.teacher.classLiveGames}</h2>
                <p className="mt-1 text-sm text-slate-600">{messages.teacher.classLiveGamesHelp}</p>
              </div>
              <Link
                href={`/teacher/sets?classId=${classroom.id}`}
                className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                {messages.teacher.hostLiveForClass}
              </Link>
            </div>
            {activeSessions.length === 0 && recentFinishedSessions.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                {messages.teacher.noClassLiveGames}
              </p>
            ) : (
              <div className="grid gap-3">
                {activeSessions.length > 0 ? (
                  <div className="grid gap-2">
                    <h3 className="text-sm font-semibold uppercase text-slate-500">
                      {messages.teacher.activeClassGames}
                    </h3>
                    {activeSessions.map((session) => (
                      <ClassSessionRow key={session.id} session={session} />
                    ))}
                  </div>
                ) : null}
                {recentFinishedSessions.length > 0 ? (
                  <div className="grid gap-2">
                    <h3 className="text-sm font-semibold uppercase text-slate-500">
                      {messages.teacher.recentFinishedGames}
                    </h3>
                    {recentFinishedSessions.map((session) => (
                      <ClassSessionRow key={session.id} session={session} />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </section>
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{messages.teacher.studentList}</h2>
            {classroom.memberships.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                {messages.teacher.noClassStudents}
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {classroom.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold">{membership.student.displayName}</p>
                      <p className="text-sm text-slate-600">
                        {membership.student.username}
                        {membership.student.groupName ? ` - ${membership.student.groupName}` : ""} -{" "}
                        {membership.status}
                      </p>
                    </div>
                    <RemoveClassStudentButton classId={classroom.id} studentId={membership.studentId} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{messages.teacherShell.nav.assignments}</h2>
        <p className="text-sm text-slate-600">
          Create homework or controlled tests for this class from the assignments page.
        </p>
        <Link
          href="/teacher/assignments/new"
          className="w-fit rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Create Assignment
        </Link>
        <p className="text-sm text-slate-600">{messages.teacher.classResultsPlaceholder}</p>
        <p className="text-sm text-slate-600">{messages.teacher.launchLivePlaceholder}</p>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ClassSessionRow({
  session,
}: {
  session: {
    code: string;
    mode: string;
    status: string;
    createdAt: Date;
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
}) {
  return (
    <article className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{session.testVersion.test.title}</p>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {session.status}
          </span>
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
            {session.mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {messages.game.codeLabel}: <span className="font-semibold">{session.code}</span> -{" "}
          {session._count.participants} {messages.host.participants.toLowerCase()} -{" "}
          {session.createdAt.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
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
  );
}
