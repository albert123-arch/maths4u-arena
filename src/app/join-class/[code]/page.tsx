import Link from "next/link";

import { ClassJoinButton } from "@/components/class-join-button";
import { StudentLoginForm } from "@/components/student-login-form";
import { StudentRegisterForm } from "@/components/student-register-form";
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
  const next = `/join-class/${joinCode}`;

  if (!classroom || classroom.status !== "ACTIVE") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
        <section className="grid max-w-md gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.classroomNotFound}</h1>
          <p className="text-sm text-slate-600">Check the class code and ask your teacher for a fresh link.</p>
          <Link href="/student/login" className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.student.loginTitle}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-4xl gap-6">
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">Class invitation</p>
          <h1 className="mt-2 text-3xl font-bold">{classroom.title}</h1>
          <p className="mt-2 text-slate-600">{classroom.teacher.name ?? classroom.teacher.email}</p>
          <p className="mt-3 text-sm font-semibold text-teal-800">Join code: {joinCode}</p>
        </section>

        {student ? (
          <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              You are signed in as <span className="font-semibold">{student.displayName}</span>.
            </p>
            <ClassJoinButton code={joinCode} />
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-bold">I already have an account</h2>
                <p className="mt-1 text-sm text-slate-600">Log in, then join this class automatically.</p>
              </div>
              <StudentLoginForm next={next} />
            </section>
            <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-bold">I am new</h2>
                <p className="mt-1 text-sm text-slate-600">Create a student account with a username and PIN.</p>
              </div>
              <StudentRegisterForm next={next} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
