import Link from "next/link";

import { AssignmentForm } from "@/components/assignment-form";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewTeacherAssignmentPage() {
  const teacher = await requireTeacherUser();
  const [classes, tests] = await Promise.all([
    prisma.classroom.findMany({
      where: { teacherId: teacher.id, status: "ACTIVE" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.test.findMany({
      where: { ownerUserId: teacher.id, status: { not: "ARCHIVED" } },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          select: {
            id: true,
            title: true,
            versionNumber: true,
            _count: { select: { questions: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/teacher/assignments" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          Back to assignments
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Create Assignment</h1>
        <p className="mt-2 text-slate-600">Choose a class and a published test version.</p>
      </div>
      {classes.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Create a class before assigning homework.
        </p>
      ) : null}
      {tests.every((test) => test.versions.length === 0) ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {messages.api.publishedVersionRequired}
        </p>
      ) : null}
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <AssignmentForm classes={classes} tests={tests} />
      </section>
    </div>
  );
}
