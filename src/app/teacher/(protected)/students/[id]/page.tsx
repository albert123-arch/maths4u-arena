import Link from "next/link";

import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherStudentProfilePage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const student = await prisma.studentAccount.findFirst({
    where: {
      id,
      classMemberships: {
        some: {
          status: "ACTIVE",
          classroom: { teacherId: teacher.id },
        },
      },
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      groupName: true,
      status: true,
      classMemberships: {
        where: {
          status: "ACTIVE",
          classroom: { teacherId: teacher.id },
        },
        orderBy: { joinedAt: "desc" },
        include: {
          classroom: {
            select: {
              id: true,
              title: true,
              joinCode: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    return (
      <div className="grid gap-6">
        <Link href="/teacher/students" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.back}
        </Link>
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.studentNotFound}</h1>
          <p className="mt-2 text-sm text-slate-600">{messages.teacher.teacherStudentsDescription}</p>
        </section>
      </div>
    );
  }

  const sessions = await prisma.participant.findMany({
    where: {
      studentAccountId: student.id,
      session: {
        testVersion: {
          test: { ownerUserId: teacher.id },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    take: 20,
    include: {
      session: {
        select: {
          code: true,
          mode: true,
          status: true,
          createdAt: true,
          testVersion: {
            select: {
              test: { select: { title: true } },
            },
          },
          _count: { select: { answers: true } },
        },
      },
      answers: {
        select: {
          points: true,
          isCorrect: true,
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/teacher/students" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.back}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{messages.teacher.studentProfile}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.studentProfileDescription}</p>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{student.displayName}</h2>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {student.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{student.username}</p>
        {student.groupName ? (
          <p className="mt-1 text-sm text-slate-600">
            {messages.students.groupName}: {student.groupName}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.teacher.myClasses}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {student.classMemberships.map((membership) => (
            <article key={membership.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <Link href={`/teacher/classes/${membership.classroom.id}`} className="font-semibold text-teal-800">
                {membership.classroom.title}
              </Link>
              <p className="mt-2 text-sm text-slate-600">
                {messages.teacher.joinCode}: {membership.classroom.joinCode}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.teacher.studentSessions}</h2>
        {sessions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noStudentSessions}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {sessions.map((participant) => {
              const score = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
              const correctCount = participant.answers.filter((answer) => answer.isCorrect === true).length;

              return (
                <article key={participant.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{participant.session.testVersion.test.title}</h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {participant.session.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {participant.session.code} - {participant.session.mode} -{" "}
                      {participant.session._count.answers} {messages.results.answers.toLowerCase()}
                    </p>
                  </div>
                  <div className="text-sm text-slate-700">
                    <p className="font-semibold">
                      {messages.results.score}: {score}
                    </p>
                    <p>
                      {messages.results.correct}: {correctCount}
                    </p>
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
