import Link from "next/link";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminTeacherProfilePage({ params }: PageProps) {
  const { id } = await params;
  const teacher = await prisma.user.findFirst({
    where: { id, role: "TEACHER" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      classrooms: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { memberships: true } },
        },
      },
      ownedTests: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          subject: true,
          status: true,
          visibility: true,
        },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="grid gap-6">
        <Link href="/admin/teachers" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.back}
        </Link>
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.teacherNotFound}</h1>
        </section>
      </div>
    );
  }

  const sessions = await prisma.gameSession.findMany({
    where: {
      testVersion: {
        test: { ownerUserId: teacher.id },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      testVersion: {
        select: {
          test: { select: { title: true } },
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
        <Link href="/admin/teachers" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.back}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{messages.adminTeachers.teacherProfile}</h1>
        <p className="mt-2 text-slate-600">{teacher.name ?? teacher.email}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard label={messages.common.email} value={teacher.email} />
        <InfoCard label={messages.adminTeachers.classes} value={teacher.classrooms.length} />
        <InfoCard label={messages.adminTeachers.tests} value={teacher.ownedTests.length} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.adminTeachers.classes}</h2>
        {teacher.classrooms.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noClasses}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {teacher.classrooms.map((classroom) => (
              <article key={classroom.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">{classroom.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{classroom.status}</p>
                <p className="mt-2 text-sm font-semibold text-teal-800">
                  {messages.teacher.joinCode}: {classroom.joinCode}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {classroom._count.memberships} {messages.host.participants.toLowerCase()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.adminTeachers.tests}</h2>
        {teacher.ownedTests.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.tests.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {teacher.ownedTests.map((test) => (
              <article key={test.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="font-semibold">{test.title}</h3>
                  <p className="text-sm text-slate-600">
                    {test.subject} - {test.status} - {test.visibility}
                  </p>
                </div>
                <Link href={`/admin/tests/${test.id}`} className="font-semibold text-teal-800">
                  {messages.common.open}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.adminTeachers.teacherSessions}</h2>
        {sessions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.adminTeachers.noTeacherSessions}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {sessions.map((session) => {
              const settings = parseSessionSettings(session.settingsJson);

              return (
                <article key={session.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h3 className="font-semibold">{session.testVersion.test.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {session.code} - {session.mode} - {session.status}
                      {settings.label ? ` - ${settings.label}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {session._count.participants} {messages.host.participants.toLowerCase()} -{" "}
                      {session._count.answers} {messages.results.answers.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/host/${session.code}`} className="font-semibold text-teal-800">
                      {messages.sessions.hostLink}
                    </Link>
                    <Link href={`/admin/sessions/${session.code}/results`} className="font-semibold text-teal-800">
                      {messages.sessions.resultsLink}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold">{value}</p>
    </div>
  );
}
