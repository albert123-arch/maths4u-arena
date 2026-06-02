import Link from "next/link";

import { MigrationRequiredNotice } from "@/components/migration-required-notice";
import { requireTeacherUser } from "@/lib/auth";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getTeacherSeriesList(teacherId: string) {
  try {
    const series = await prisma.series.findMany({
      where: { teacherId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            registrations: true,
            rounds: true,
          },
        },
      },
    });

    return {
      migrationRequired: false,
      series,
    };
  } catch (error) {
    if (isStudentSeriesMigrationError(error)) {
      return {
        migrationRequired: true,
        series: [],
      };
    }

    throw error;
  }
}

export default async function TeacherSeriesPage() {
  const teacher = await requireTeacherUser();
  const result = await getTeacherSeriesList(teacher.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.series.title}</h1>
          <p className="mt-2 text-slate-600">
            Build class leagues from your published quiz sets and run registered rounds.
          </p>
        </div>
        <Link
          href="/teacher/series/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          {messages.series.createButton}
        </Link>
      </div>
      {result.migrationRequired ? (
        <MigrationRequiredNotice />
      ) : (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-xl font-semibold">{messages.series.listTitle}</h2>
          </div>
          {result.series.length === 0 ? (
            <div className="grid gap-3 p-5 text-sm text-slate-600">
              <p>{messages.series.empty}</p>
              <Link
                href="/teacher/series/new"
                className="w-fit rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                {messages.series.createFirst}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {result.series.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item._count.registrations} {messages.series.registrations.toLowerCase()} -{" "}
                      {item._count.rounds} {messages.series.rounds.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/teacher/series/${item.id}`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      {messages.common.open}
                    </Link>
                    <Link
                      href={`/teacher/series/${item.id}/leaderboard`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      {messages.series.leaderboard}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
