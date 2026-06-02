import Link from "next/link";
import { redirect } from "next/navigation";

import { StudentJoinRoundClient } from "@/components/student-join-round-client";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { getCurrentStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

function messagePage(title: string, description: string, code?: string) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.appName}
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-slate-200 pt-4">
            <Link
              href={code ? `/play?code=${code}` : "/play"}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.common.backToPlay}
            </Link>
            <Link
              href="/student"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {messages.student.backToDashboard}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function StudentJoinRoundPage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const session = await prisma.gameSession.findUnique({
    where: { code: normalizedCode },
    select: {
      code: true,
      status: true,
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
    },
  });

  if (!session) {
    return messagePage(messages.game.notFoundTitle, messages.play.sessionNotFound, normalizedCode);
  }

  if (session.status === "FINISHED") {
    return messagePage(messages.game.finished, messages.play.sessionFinished, normalizedCode);
  }

  const settings = parseSessionSettings(session.settingsJson);

  if (!settings.registeredOnly) {
    redirect(`/play?code=${session.code}`);
  }

  const student = await getCurrentStudent();

  if (!student) {
    redirect(`/student/login?next=${encodeURIComponent(`/student/join/${session.code}`)}`);
  }

  if (!settings.seriesId && !settings.classId) {
    return messagePage(messages.student.joinRoundTitle, messages.api.seriesAccessCheckRequired, session.code);
  }

  if (settings.seriesId) {
    const registration = await prisma.seriesRegistration.findUnique({
      where: {
        seriesId_studentId: {
          seriesId: settings.seriesId,
          studentId: student.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (!registration || registration.status !== "REGISTERED") {
      return messagePage(messages.student.notRegisteredForSeries, messages.play.notRegisteredForSeries, session.code);
    }
  }

  if (settings.classId) {
    const membership = await prisma.classMembership.findUnique({
      where: {
        classId_studentId: {
          classId: settings.classId,
          studentId: student.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return messagePage(messages.api.classMembershipRequired, messages.api.classMembershipRequired, session.code);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.appName}
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-2">
            <p className="w-fit rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {messages.host.registeredRound}
            </p>
            <h1 className="text-3xl font-bold">{messages.student.joinRoundTitle}</h1>
            <p className="text-sm leading-6 text-slate-600">{messages.student.joinRoundDescription}</p>
            <p className="text-sm font-semibold text-teal-800">{session.testVersion.test.title}</p>
            <p className="text-sm text-slate-600">
              {messages.game.codeLabel}: <span className="font-bold">{session.code}</span>
            </p>
            <p className="text-sm text-slate-600">
              {messages.game.joinedAs} <span className="font-semibold">{student.displayName}</span>
            </p>
          </div>
          <StudentJoinRoundClient
            code={session.code}
            displayName={student.displayName}
            teamMode={settings.teamMode}
            teamAssignMode={settings.teamAssignMode}
            teams={settings.teams}
          />
        </div>
      </section>
    </main>
  );
}
