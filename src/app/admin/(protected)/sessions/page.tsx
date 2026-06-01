import { AdminSessionsList } from "@/components/admin-sessions-list";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: {
        select: {
          title: true,
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
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.sessions.title}</h1>
        <p className="mt-2 text-slate-600">{messages.sessions.description}</p>
      </div>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <AdminSessionsList initialSessions={sessions} />
      </section>
    </div>
  );
}
