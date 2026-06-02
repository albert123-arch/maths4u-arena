import Link from "next/link";
import { notFound } from "next/navigation";

import { SeriesLeaderboardTable } from "@/components/series-leaderboard-table";
import { messages } from "@/lib/messages";
import { getSeriesLeaderboard } from "@/lib/series-scoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicSeriesLeaderboardPage({ params }: PageProps) {
  const { id } = await params;
  const leaderboard = await getSeriesLeaderboard(id);

  if (!leaderboard) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-6xl gap-6">
        <div>
          <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.common.appName}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{leaderboard.series.title}</h1>
          <p className="mt-2 text-slate-600">{messages.series.publicLeaderboard}</p>
        </div>
        <SeriesLeaderboardTable
          seriesTitle={leaderboard.series.title}
          rounds={leaderboard.rounds}
          rows={leaderboard.rows}
        />
      </section>
    </main>
  );
}
