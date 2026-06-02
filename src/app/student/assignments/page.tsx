import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function StudentAssignmentsPage({ searchParams }: PageProps) {
  const student = await requireStudent();
  const { filter = "active" } = await searchParams;
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: student.id },
    orderBy: { assignment: { dueAt: "asc" } },
    include: {
      assignment: {
        include: {
          classroom: { select: { title: true } },
          testVersion: { select: { test: { select: { title: true } } } },
        },
      },
    },
  });
  const now = new Date();
  const filtered = submissions.filter((submission) => {
    const completed = ["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status);
    const overdue =
      !completed &&
      submission.assignment.dueAt !== null &&
      submission.assignment.dueAt < now &&
      !submission.assignment.allowLateSubmission;

    if (filter === "completed") {
      return completed;
    }

    if (filter === "overdue") {
      return overdue;
    }

    return !completed && !overdue && submission.assignment.status === "ASSIGNED";
  });

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold">{messages.student.assignmentsTitle}</h1>
          <p className="mt-2 text-slate-600">Homework and controlled tests assigned by your teachers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["active", "Active"],
            ["completed", "Completed"],
            ["overdue", "Overdue"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={`/student/assignments?filter=${key}`}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                filter === key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.student.noAssignments}
          </p>
        ) : (
          <section className="grid gap-3">
            {filtered.map((submission) => (
              <article key={submission.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{submission.assignment.title}</h2>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {submission.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {submission.assignment.classroom.title} -{" "}
                      {submission.assignment.testVersion.test.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Due: {submission.assignment.dueAt ? submission.assignment.dueAt.toLocaleString() : "No due date"}
                    </p>
                  </div>
                  <Link
                    href={`/student/assignments/${submission.assignmentId}`}
                    className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </StudentShell>
  );
}
