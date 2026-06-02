import Link from "next/link";

import { isAssignmentsMigrationError } from "@/lib/assignments";
import { requireTeacherUser } from "@/lib/auth";
import { ASSIGNMENT_STATUSES } from "@/lib/constants";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

async function loadAssignments(teacherId: string, status: string) {
  try {
    return await prisma.assignment.findMany({
      where: {
        teacherId,
        ...(status && status !== "ALL" ? { status: status as never } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        classroom: { select: { title: true } },
        testVersion: {
          select: {
            versionNumber: true,
            test: { select: { title: true } },
          },
        },
        submissions: {
          select: { status: true },
        },
      },
    });
  } catch (error) {
    if (isAssignmentsMigrationError(error)) {
      return null;
    }

    throw error;
  }
}

export default async function TeacherAssignmentsPage({ searchParams }: PageProps) {
  const teacher = await requireTeacherUser();
  const { status = "ALL" } = await searchParams;
  const assignments = await loadAssignments(teacher.id, status);

  if (!assignments) {
    return (
      <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <h1 className="text-2xl font-bold">Assignments need a database migration</h1>
        <p className="mt-2 text-sm">{messages.api.assignmentMigrationRequired}</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.teacher.assignmentsTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.teacher.assignmentsDescription}</p>
        </div>
        <Link
          href="/teacher/assignments/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Create Assignment
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {["ALL", ...ASSIGNMENT_STATUSES.filter((item) => item !== "ARCHIVED")].map((item) => (
          <Link
            key={item}
            href={item === "ALL" ? "/teacher/assignments" : `/teacher/assignments?status=${item}`}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              status === item || (!status && item === "ALL")
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item === "ALL" ? "All" : item}
          </Link>
        ))}
      </div>
      {assignments.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No assignments yet. Create one from a published test version.
        </p>
      ) : (
        <section className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {assignments.map((assignment) => {
            const submittedCount = assignment.submissions.filter((item) =>
              ["SUBMITTED", "GRADED", "RETURNED"].includes(item.status),
            ).length;

            return (
              <article key={assignment.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{assignment.title}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {assignment.status}
                    </span>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {assignment.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {assignment.classroom.title} - {assignment.testVersion.test.title} - Version{" "}
                    {assignment.testVersion.versionNumber}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {submittedCount} / {assignment.submissions.length} submitted
                    {assignment.dueAt ? ` - Due ${assignment.dueAt.toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/assignments/${assignment.id}`}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    View
                  </Link>
                  <Link
                    href={`/teacher/assignments/${assignment.id}/results`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Results
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
