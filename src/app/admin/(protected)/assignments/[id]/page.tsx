import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAssignmentDetailPage({ params }: PageProps) {
  await requireAdminUser();
  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      teacher: { select: { email: true, name: true } },
      classroom: { select: { title: true } },
      testVersion: { select: { test: { select: { title: true } }, versionNumber: true } },
      submissions: {
        orderBy: { updatedAt: "desc" },
        include: {
          student: { select: { displayName: true, username: true } },
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/assignments" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          Back to assignments
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{assignment.title}</h1>
        <p className="mt-2 text-slate-600">Read-only admin assignment view.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard label="Teacher" value={assignment.teacher.name ?? assignment.teacher.email} />
        <InfoCard label="Class" value={assignment.classroom.title} />
        <InfoCard label="Status" value={assignment.status} />
        <InfoCard label="Submissions" value={assignment.submissions.length} />
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Assignment</h2>
        <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>Test: {assignment.testVersion.test.title}</p>
          <p>Version: {assignment.testVersion.versionNumber}</p>
          <p>Type: {assignment.type.replace("_", " ")}</p>
          <p>Due: {assignment.dueAt ? assignment.dueAt.toLocaleString() : "No due date"}</p>
        </div>
      </section>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold">Submissions</h2>
        </div>
        {assignment.submissions.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignment.submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-4 py-3">
                      {submission.student.displayName}
                      <span className="ml-2 text-xs text-slate-500">{submission.student.username}</span>
                    </td>
                    <td className="px-4 py-3">{submission.status}</td>
                    <td className="px-4 py-3">
                      {submission.score} / {submission.maxScore}
                    </td>
                    <td className="px-4 py-3">
                      {submission.submittedAt ? submission.submittedAt.toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
