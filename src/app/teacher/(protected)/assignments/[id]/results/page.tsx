import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentResultsTable } from "@/components/assignment-results-table";
import { requireTeacherUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherAssignmentResultsPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const assignment = await prisma.assignment.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      classroom: { select: { title: true } },
      testVersion: {
        select: {
          test: { select: { title: true } },
        },
      },
      submissions: {
        orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
        include: {
          student: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const submittedCount = assignment.submissions.filter((submission) =>
    ["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status),
  ).length;
  const averageScore =
    assignment.submissions.length > 0
      ? Math.round(
          (assignment.submissions.reduce((sum, submission) => sum + submission.score, 0) /
            assignment.submissions.length) *
            10,
        ) / 10
      : 0;
  const rows = assignment.submissions.map((submission) => ({
    id: submission.id,
    studentName: submission.student.displayName,
    username: submission.student.username,
    classTitle: assignment.classroom.title,
    status: submission.status,
    score: submission.score,
    maxScore: submission.maxScore,
    percentage: submission.percentage,
    correctCount: submission.correctCount,
    answeredCount: submission.answeredCount,
    startedAt: submission.startedAt?.toISOString() ?? null,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    gradedAt: submission.gradedAt?.toISOString() ?? null,
  }));

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/teacher/assignments/${assignment.id}`} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          Back to assignment
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Assignment Results</h1>
        <p className="mt-2 text-slate-600">{assignment.title}</p>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard label="Class" value={assignment.classroom.title} />
        <InfoCard label="Submitted" value={`${submittedCount} / ${assignment.submissions.length}`} />
        <InfoCard label="Average score" value={averageScore} />
        <InfoCard label="Status" value={assignment.status} />
      </section>
      <AssignmentResultsTable assignmentId={assignment.id} assignmentTitle={assignment.title} rows={rows} />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
