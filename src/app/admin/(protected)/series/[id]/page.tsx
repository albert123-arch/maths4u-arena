import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSeriesDetail } from "@/components/admin-series-detail";
import { MigrationRequiredNotice } from "@/components/migration-required-notice";
import { SeriesForm } from "@/components/series-form";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getSeriesDetailData(id: string) {
  try {
    const [series, students, versions] = await Promise.all([
      prisma.series.findUnique({
        where: { id },
        include: {
          registrations: {
            where: { status: "REGISTERED" },
            orderBy: { displayNameSnapshot: "asc" },
            include: {
              student: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  groupName: true,
                },
              },
            },
          },
          rounds: {
            orderBy: { roundNumber: "asc" },
            include: {
              session: {
                select: {
                  code: true,
                  mode: true,
                  status: true,
                },
              },
              testVersion: {
                select: {
                  id: true,
                  title: true,
                  versionNumber: true,
                  test: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.studentAccount.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ groupName: "asc" }, { displayName: "asc" }],
        select: {
          id: true,
          username: true,
          displayName: true,
          groupName: true,
        },
      }),
      prisma.testVersion.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ test: { title: "asc" } }, { versionNumber: "desc" }],
        select: {
          id: true,
          title: true,
          versionNumber: true,
          test: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      migrationRequired: false,
      series,
      students,
      versions,
    };
  } catch (error) {
    if (isStudentSeriesMigrationError(error)) {
      return {
        migrationRequired: true,
        series: null,
        students: [],
        versions: [],
      };
    }

    throw error;
  }
}

export default async function AdminSeriesDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getSeriesDetailData(id);

  if (result.migrationRequired) {
    return (
      <div className="grid gap-6">
        <div>
          <Link href="/admin/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.series.back}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{messages.series.title}</h1>
        </div>
        <MigrationRequiredNotice />
      </div>
    );
  }

  if (!result.series) {
    notFound();
  }

  const { series, students, versions } = result;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.series.back}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{series.title}</h1>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {series.status}
            </span>
          </div>
        </div>
        <Link
          href={`/admin/series/${series.id}/leaderboard`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
        >
          {messages.series.leaderboard}
        </Link>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.series.editTitle}</h2>
        <SeriesForm
          mode="edit"
          initial={{
            id: series.id,
            title: series.title,
            description: series.description,
            status: series.status,
            startsAt: series.startsAt?.toISOString() ?? null,
            endsAt: series.endsAt?.toISOString() ?? null,
            settingsJson: series.settingsJson,
          }}
        />
      </section>
      <AdminSeriesDetail
        seriesId={series.id}
        registrations={series.registrations}
        rounds={series.rounds.map((round) => ({
          ...round,
          scheduledAt: round.scheduledAt?.toISOString() ?? null,
        }))}
        students={students}
        versions={versions}
      />
    </div>
  );
}
