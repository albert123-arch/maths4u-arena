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

export default async function PlayPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  const normalizedCode = code?.toUpperCase() ?? "";
  const session = normalizedCode
    ? await prisma.gameSession.findUnique({
        where: { code: normalizedCode },
        select: {
          settingsJson: true,
        },
      })
    : null;
  const settings = parseSessionSettings(session?.settingsJson);
  const student = settings.registeredOnly ? await getCurrentStudent() : null;

  if (settings.registeredOnly && !student) {
    redirect(`/student/login?next=${encodeURIComponent(`/play?code=${normalizedCode}`)}`);
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
          </div>
          <PlayJoinForm initialCode={normalizedCode} registeredStudent={student} />
        </div>
      </section>
    </main>
  );
}
