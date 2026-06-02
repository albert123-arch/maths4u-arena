import Link from "next/link";
import { redirect } from "next/navigation";

import { PlayJoinForm } from "@/components/play-join-form";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { getCurrentStudent } from "@/lib/student-auth";

type PageProps = {
  searchParams: Promise<{ code?: string }>;
};

async function getPlaySession(code: string) {
  if (!code) {
    return null;
  }

  try {
    const session = await prisma.gameSession.findUnique({
      where: { code },
      select: {
        id: true,
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

    return session;
  } catch (error) {
    console.error("Play page session lookup failed", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

function messagePage(title: string, description: string) {
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
              href="/play"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.common.backToPlay}
            </Link>
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {messages.common.home}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function PlayPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  const normalizedCode = code?.toUpperCase() ?? "";
  const session = await getPlaySession(normalizedCode);

  if (normalizedCode && !session) {
    return messagePage(messages.game.notFoundTitle, messages.play.sessionNotFound);
  }

  if (session?.status === "FINISHED") {
    return messagePage(messages.game.finished, messages.play.sessionFinished);
  }

  const settings = parseSessionSettings(session?.settingsJson ?? null);
  const student = settings.registeredOnly ? await getCurrentStudent() : null;

  if (settings.registeredOnly && !student) {
    redirect(`/login?next=${encodeURIComponent(`/play?code=${normalizedCode}`)}`);
  }

  if (settings.registeredOnly && !settings.seriesId && !settings.classId) {
    return messagePage(messages.student.joinRoundTitle, messages.api.seriesAccessCheckRequired);
  }

  if (settings.registeredOnly && settings.seriesId && student) {
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
      return messagePage(messages.student.notRegisteredForSeries, messages.play.notRegisteredForSeries);
    }
  }

  if (settings.registeredOnly && settings.classId && student) {
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
      return messagePage(messages.api.classMembershipRequired, messages.api.classMembershipRequired);
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
            <h1 className="text-3xl font-bold">{messages.play.title}</h1>
            <p className="text-sm leading-6 text-slate-600">{messages.play.description}</p>
            {session ? (
              <p className="text-sm font-semibold text-teal-800">{session.testVersion.test.title}</p>
            ) : null}
          </div>
          <PlayJoinForm initialCode={normalizedCode} initialSettings={settings} registeredStudent={student} />
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {messages.common.home}
            </Link>
            <Link
              href="/login?next=/student"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {messages.login.submit}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
