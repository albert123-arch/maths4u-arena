import Link from "next/link";
import { redirect } from "next/navigation";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinClassPage({ params }: PageProps) {
  const { code } = await params;
  const joinCode = code.toUpperCase();
  const student = await getCurrentStudent();

  if (!student) {
    redirect(`/student/login?next=${encodeURIComponent(`/join-class/${joinCode}`)}`);
  }

  const classroom = await prisma.classroom.findUnique({
    where: { joinCode },
    select: {
      id: true,
      title: true,
      status: true,
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!classroom || classroom.status !== "ACTIVE") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
        <section className="grid max-w-md gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.classroomNotFound}</h1>
          <p className="text-sm text-slate-600">{messages.teacher.classesDescription}</p>
          <Link href="/student" className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.student.backToDashboard}
          </Link>
        </section>
      </main>
    );
  }

  await prisma.classMembership.upsert({
    where: {
      classId_studentId: {
        classId: classroom.id,
        studentId: student.id,
      },
    },
    create: {
      classId: classroom.id,
      studentId: student.id,
      status: "ACTIVE",
    },
    update: {
      status: "ACTIVE",
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
      <section className="grid max-w-md gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-teal-800">{messages.student.classJoined}</p>
        <h1 className="text-2xl font-bold">{classroom.title}</h1>
        <p className="text-sm text-slate-600">
          {classroom.teacher.name ?? classroom.teacher.email}
        </p>
        <p className="text-sm text-slate-600">{messages.student.classJoinDescription}</p>
        <Link
          href="/student"
          className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
        >
          {messages.student.backToDashboard}
        </Link>
      </section>
    </main>
  );
}
