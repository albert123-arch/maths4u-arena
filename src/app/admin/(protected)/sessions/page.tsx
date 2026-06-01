import { AdminSessionsList } from "@/components/admin-sessions-list";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: {
        select: {
          id: true,
          title: true,
          questions: {
            select: {
              questionId: true,
            },
          },
          test: {
            select: {
              title: true,
              subject: true,
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
      participants: {
        select: {
          id: true,
          answers: {
            select: {
              questionId: true,
            },
          },
        },
      },
    },
  });
  const sessionRows = sessions.map((session) => {
    const questionCount = session.testVersion.questions.length;
    const submittedCount = session.participants.filter((participant) => {
      const answered = new Set(participant.answers.map((answer) => answer.questionId)).size;
      return questionCount > 0 && answered >= questionCount;
    }).length;

    return {
      id: session.id,
      code: session.code,
      status: session.status,
      mode: session.mode,
      createdAt: session.createdAt.toISOString(),
      settingsJson: session.settingsJson,
      testVersion: {
        id: session.testVersion.id,
        title: session.testVersion.title,
        test: session.testVersion.test,
      },
      _count: session._count,
      submittedCount,
      questionCount,
      settings: parseSessionSettings(session.settingsJson),
    };
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.sessions.title}</h1>
        <p className="mt-2 text-slate-600">{messages.sessions.description}</p>
      </div>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <AdminSessionsList initialSessions={sessionRows} />
      </section>
    </div>
  );
}
