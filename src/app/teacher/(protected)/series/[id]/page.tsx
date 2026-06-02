import Link from "next/link";

import { AdminSeriesDetail } from "@/components/admin-series-detail";
import { MigrationRequiredNotice } from "@/components/migration-required-notice";
import { SeriesForm } from "@/components/series-form";
import { requireTeacherUser } from "@/lib/auth";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getTeacherSeriesDetailData(id: string, teacherId: string) {
  try {
    const [series, students, classrooms, versions] = await Promise.all([
      prisma.series.findFirst({
        where: { id, teacherId },
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
                  _count: {
                    select: {
                      participants: true,
                    },
                  },
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
        where: {
          status: "ACTIVE",
          classMemberships: {
            some: {
              status: "ACTIVE",
              classroom: {
                teacherId,
                status: "ACTIVE",
              },
            },
          },
        },
        orderBy: [{ groupName: "asc" }, { displayName: "asc" }],
        select: {
          id: true,
          username: true,
          displayName: true,
          groupName: true,
        },
      }),
      prisma.classroom.findMany({
        where: { teacherId, status: "ACTIVE" },
        orderBy: { title: "asc" },
        include: {
          memberships: {
            where: {
              status: "ACTIVE",
              student: {
                status: "ACTIVE",
              },
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.testVersion.findMany({
        where: {
          status: "PUBLISHED",
          test: {
            ownerUserId: teacherId,
            status: { not: "ARCHIVED" },
          },
        },
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
      classrooms: classrooms.map((classroom) => ({
        id: classroom.id,
        title: classroom.title,
        studentCount: classroom.memberships.length,
      })),
      versions,
    };
  } catch (error) {
    if (isStudentSeriesMigrationError(error)) {
      return {
        migrationRequired: true,
        series: null,
        students: [],
        classrooms: [],
        versions: [],
      };
    }

    throw error;
  }
}

export default async function TeacherSeriesDetailPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const result = await getTeacherSeriesDetailData(id, teacher.id);

  if (result.migrationRequired) {
    return (
      <div className="grid gap-6">
        <div>
          <Link href="/teacher/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.series.back}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{messages.series.title}</h1>
        </div>
        <MigrationRequiredNotice />
      </div>
    );
  }

  if (!result.series) {
    return (
      <div className="grid gap-6">
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.seriesNotFound}</h1>
          <p className="text-sm text-slate-600">{messages.series.notFoundDescription}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/teacher/series"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.series.back}
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

  const { series, students, classrooms, versions } = result;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/teacher/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
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
          href={`/teacher/series/${series.id}/leaderboard`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
        >
          {messages.series.leaderboard}
        </Link>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.series.editTitle}</h2>
        <SeriesForm
          apiBase="/api/teacher/series"
          basePath="/teacher/series"
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
        apiBase="/api/teacher/series"
        roundApiBase="/api/teacher/series/rounds"
        seriesBasePath="/teacher/series"
        sessionResultsBasePath="/teacher/sessions"
        showAccessCheck={false}
        seriesId={series.id}
        registrations={series.registrations}
        rounds={series.rounds.map((round) => ({
          ...round,
          scheduledAt: round.scheduledAt?.toISOString() ?? null,
        }))}
        students={students}
        classrooms={classrooms}
        versions={versions}
      />
    </div>
  );
}
