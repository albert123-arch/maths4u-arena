import Link from "next/link";

import { requireAdminUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage() {
  await requireAdminUser();
  const assignments = await prisma.assignment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      teacher: { select: { email: true, name: true } },
      classroom: { select: { title: true } },
      submissions: { select: { status: true } },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="mt-2 text-slate-600">Platform-wide assignment visibility for admins.</p>
      </div>
      {assignments.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No assignments have been created yet.
        </p>
      ) : (
        <section className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {assignments.map((assignment) => {
            const submittedCount = assignment.submissions.filter((submission) =>
              ["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status),
            ).length;

            return (
              <article key={assignment.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{assignment.title}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {assignment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Teacher: {assignment.teacher.name ?? assignment.teacher.email} - Class:{" "}
                    {assignment.classroom.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {submittedCount} / {assignment.submissions.length} submitted - Created{" "}
                    {assignment.createdAt.toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/admin/assignments/${assignment.id}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  View
                </Link>
              </article>
            );
          })}
        </section>
      )}
      <Link href="/admin" className="font-semibold text-teal-800 hover:text-teal-950">
        {messages.common.backToAdmin}
      </Link>
    </div>
  );
}
