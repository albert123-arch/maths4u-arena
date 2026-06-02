import Link from "next/link";

import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacherUser();
  const [classCount, classStudentCount, testCount, questionCount, liveSessions, recentSessions] =
    await Promise.all([
      prisma.classroom.count({
        where: { teacherId: teacher.id, status: "ACTIVE" },
      }),
      prisma.classMembership.count({
        where: {
          status: "ACTIVE",
          classroom: { teacherId: teacher.id },
        },
      }),
      prisma.test.count({
        where: { ownerUserId: teacher.id, status: { not: "ARCHIVED" } },
      }),
      prisma.question.count({
        where: { ownerUserId: teacher.id, visibility: { not: "ARCHIVED" } },
      }),
      prisma.gameSession.count({
        where: {
          status: { in: ["LOBBY", "RUNNING"] },
          testVersion: { test: { ownerUserId: teacher.id } },
        },
      }),
      prisma.gameSession.findMany({
        where: {
          testVersion: { test: { ownerUserId: teacher.id } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          code: true,
          status: true,
          mode: true,
          createdAt: true,
          testVersion: {
            select: {
              test: {
                select: { title: true },
              },
            },
          },
          _count: {
            select: { participants: true, answers: true },
          },
        },
      }),
    ]);

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-teal-800">{messages.teacherShell.subtitle}</p>
        <h1 className="mt-1 text-3xl font-bold">{messages.teacher.dashboardTitle}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.dashboardDescription}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard label={messages.teacher.myClasses} value={classCount} href="/teacher/classes" />
        <MetricCard label={messages.teacher.myStudents} value={classStudentCount} href="/teacher/students" />
        <MetricCard label={messages.teacher.myTests} value={testCount} href="/teacher/tests" />
        <MetricCard label={messages.teacher.myQuestions} value={questionCount} href="/teacher/questions" />
        <MetricCard label={messages.teacher.myLiveSessions} value={liveSessions} href="/teacher/live" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title={messages.teacher.assignmentsTitle}
          description={messages.teacher.assignmentsDescription}
          href="/teacher/assignments"
        />
        <ActionCard
          title={messages.teacher.resultsTitle}
          description={messages.teacher.resultsDescription}
          href="/teacher/results"
        />
        <ActionCard
          title={messages.teacher.libraryTitle}
          description={messages.teacher.libraryDescription}
          href="/teacher/library"
        />
      </section>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{messages.dashboard.nextTitle}</h2>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/teacher/classes">{messages.teacher.createClass}</LinkButton>
          <LinkButton href="/teacher/tests">{messages.teacher.createTest}</LinkButton>
          <LinkButton href="/teacher/library">{messages.teacher.browseLibrary}</LinkButton>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{messages.teacher.recentResults}</h2>
          <Link href="/teacher/results" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.common.view}
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">{messages.sessions.empty}</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {recentSessions.map((session) => (
              <div key={session.code} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{session.testVersion.test.title}</p>
                  <p className="text-sm text-slate-600">
                    {session.code} - {session.mode} - {session.status} -{" "}
                    {session._count.participants} {messages.host.participants.toLowerCase()}
                  </p>
                </div>
                <Link href="/teacher/results" className="text-sm font-semibold text-teal-800">
                  {messages.sessions.resultsLink}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Link>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
      {children}
    </Link>
  );
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
