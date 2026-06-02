import Link from "next/link";

import { ArchiveClassButton } from "@/components/teacher-class-actions";
import { TeacherClassForm } from "@/components/teacher-class-form";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  const teacher = await requireTeacherUser();
  const classes = await prisma.classroom.findMany({
    where: { teacherId: teacher.id },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          memberships: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.classesTitle}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.classesDescription}</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.teacher.createClass}</h2>
        <TeacherClassForm />
      </section>
      <section className="grid gap-3">
        {classes.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noClasses}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {classes.map((classroom) => (
              <article
                key={classroom.id}
                className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{classroom.title}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {classroom.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {messages.teacher.joinCode}: {classroom.joinCode} -{" "}
                    {classroom._count.memberships} {messages.host.participants.toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/classes/${classroom.id}`}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {messages.common.open}
                  </Link>
                  {classroom.status === "ACTIVE" ? <ArchiveClassButton id={classroom.id} /> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
