import Link from "next/link";
import { notFound } from "next/navigation";

import { MigrationRequiredNotice } from "@/components/migration-required-notice";
import { SeriesLeaderboardTable } from "@/components/series-leaderboard-table";
import { requireTeacherUser } from "@/lib/auth";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getSeriesLeaderboard } from "@/lib/series-scoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getTeacherLeaderboardData(id: string, teacherId: string) {
  try {
    const owned = await prisma.series.findFirst({
      where: { id, teacherId },
      select: { id: true },
    });

    if (!owned) {
      return {
        migrationRequired: false,
        leaderboard: null,
      };
    }

    const leaderboard = await getSeriesLeaderboard(id);

    return {
      migrationRequired: false,
      leaderboard,
    };
  } catch (error) {
    if (isStudentSeriesMigrationError(error)) {
      return {
        migrationRequired: true,
        leaderboard: null,
      };
    }

    throw error;
  }
}

export default async function TeacherSeriesLeaderboardPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const result = await getTeacherLeaderboardData(id, teacher.id);

  if (result.migrationRequired) {
    return (
      <div className="grid gap-6">
        <div>
          <Link href="/teacher/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.series.back}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{messages.series.leaderboard}</h1>
        </div>
        <MigrationRequiredNotice />
      </div>
    );
  }

  if (!result.leaderboard) {
    notFound();
  }

  const { leaderboard } = result;

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/teacher/series/${id}`} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.series.back}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{leaderboard.series.title}</h1>
        <p className="mt-2 text-slate-600">{messages.series.leaderboard}</p>
      </div>
      <SeriesLeaderboardTable
        seriesTitle={leaderboard.series.title}
        rounds={leaderboard.rounds}
        rows={leaderboard.rows}
      />
    </div>
  );
}
