import Link from "next/link";

import { PersonalResultsClient } from "@/components/personal-results-client";
import { StudentLiveGameWatcher } from "@/components/student-live-game-watcher";
import { messages } from "@/lib/messages";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function GameResultsPage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-4xl gap-6">
        <StudentLiveGameWatcher initialSessions={[]} />
        <Link href={`/game/${normalizedCode}`} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.game.backToGame}
        </Link>
        <PersonalResultsClient code={normalizedCode} />
      </section>
    </main>
  );
}
