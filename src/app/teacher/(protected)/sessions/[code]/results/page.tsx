import Link from "next/link";

import { SessionResultsTable } from "@/components/session-results-table";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { buildSessionResults } from "@/lib/session-results";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TeacherSessionResultsPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { code } = await params;
  const session = await prisma.gameSession.findFirst({
    where: {
      code: code.toUpperCase(),
      testVersion: {
        test: {
          ownerUserId: teacher.id,
        },
      },
    },
    include: {
      testVersion: {
        include: {
          test: true,
          questions: {
            select: {
              points: true,
            },
          },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  prompt: true,
                },
              },
            },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) {
    return (
      <div className="grid gap-6">
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.host.notFoundTitle}</h1>
          <p className="text-sm text-slate-600">{messages.results.unavailableDescription}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/teacher/results"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.results.back}
            </Link>
            <Link
              href="/teacher"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Back to Teacher Dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const settings = parseSessionSettings(session.settingsJson);
  const results = buildSessionResults({
    mode: session.mode,
    settings,
    questions: session.testVersion.questions,
    participants: session.participants,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.results.title}</h1>
          <p className="mt-2 text-slate-600">
            {session.testVersion.test.title} - {messages.game.codeLabel} {session.code}
          </p>
        </div>
        <Link href="/teacher/results" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.results.back}
        </Link>
      </div>
      <SessionResultsTable
        apiPath={`/api/teacher/sessions/${session.code}/results`}
        accessCheckPath={null}
        initialData={{
          code: session.code,
          status: session.status,
          mode: session.mode,
          testTitle: session.testVersion.test.title,
          sessionLabel: settings.label,
          testVersionId: session.testVersionId,
          settingsJson: session.settingsJson,
          teamMode: settings.teamMode,
          totalPossible: results.totalPossible,
          participantCount: results.participants.length,
          submittedCount: results.submittedCount,
          averageScore: results.averageScore,
          lastUpdated: new Date().toISOString(),
          participants: results.participants,
          teamLeaderboard: results.teamLeaderboard,
        }}
      />
    </div>
  );
}
