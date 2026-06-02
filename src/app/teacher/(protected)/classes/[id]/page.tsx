import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassJoinCard } from "@/components/class-join-card";
import { RemoveClassStudentButton } from "@/components/teacher-class-actions";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClassDetailPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const classroom = await prisma.classroom.findFirst({
    where: {
      id,
      teacherId: teacher.id,
    },
    include: {
      memberships: {
        where: { status: { in: ["ACTIVE", "PENDING"] } },
        orderBy: { joinedAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              username: true,
              displayName: true,
              groupName: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!classroom) {
    notFound();
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const joinLink = `${appUrl}/join-class/${classroom.joinCode}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/teacher/classes" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.teacherShell.nav.classes}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{classroom.title}</h1>
          {classroom.description ? <p className="mt-2 text-slate-600">{classroom.description}</p> : null}
        </div>
        <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {classroom.status}
        </span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ClassJoinCard joinCode={classroom.joinCode} joinLink={joinLink} />
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard label={messages.teacher.joinCode} value={classroom.joinCode} />
            <InfoCard label={messages.teacher.studentList} value={classroom.memberships.length} />
            <InfoCard label={messages.host.status} value={classroom.status} />
          </div>
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{messages.teacher.studentList}</h2>
            {classroom.memberships.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                {messages.teacher.noClassStudents}
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {classroom.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold">{membership.student.displayName}</p>
                      <p className="text-sm text-slate-600">
                        {membership.student.username}
                        {membership.student.groupName ? ` - ${membership.student.groupName}` : ""} -{" "}
                        {membership.status}
                      </p>
                    </div>
                    <RemoveClassStudentButton classId={classroom.id} studentId={membership.studentId} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{messages.teacherShell.nav.assignments}</h2>
        <p className="text-sm text-slate-600">{messages.teacher.assignHomeworkPlaceholder}</p>
        <p className="text-sm text-slate-600">{messages.teacher.classResultsPlaceholder}</p>
        <p className="text-sm text-slate-600">{messages.teacher.launchLivePlaceholder}</p>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
