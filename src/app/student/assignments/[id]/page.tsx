import Link from "next/link";

import { StudentShell } from "@/components/student-shell";
import { assignmentAvailabilityError } from "@/lib/assignments";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentAssignmentDetailPage({ params }: PageProps) {
  const student = await requireStudent();
  const { id } = await params;
  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      classroom: {
        memberships: {
          some: {
            studentId: student.id,
            status: "ACTIVE",
          },
        },
      },
    },
    include: {
      classroom: { select: { title: true } },
      testVersion: {
        select: {
          test: { select: { title: true } },
          _count: { select: { questions: true } },
        },
      },
      submissions: {
        where: { studentId: student.id, attemptNumber: 1 },
        take: 1,
      },
    },
  });

  if (!assignment || assignment.status === "DRAFT" || assignment.status === "ARCHIVED") {
    return (
      <StudentShell student={student}>
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.assignmentNotFound}</h1>
          <Link href="/student/assignments" className="mt-4 inline-flex font-semibold text-teal-800">
            {messages.student.backToAssignments}
          </Link>
        </section>
      </StudentShell>
    );
  }

  const submission = assignment.submissions[0];
  const completed = submission && ["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status);
  const blocked = assignmentAvailabilityError(assignment);

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <Link href="/student/assignments" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.student.backToAssignments}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {assignment.type.replace("_", " ")}
            </span>
          </div>
          {assignment.description ? <p className="mt-2 text-slate-600">{assignment.description}</p> : null}
        </div>
        <section className="grid gap-4 md:grid-cols-4">
          <InfoCard label="Class" value={assignment.classroom.title} />
          <InfoCard label="Questions" value={assignment.testVersion._count.questions} />
          <InfoCard label="Due" value={assignment.dueAt ? assignment.dueAt.toLocaleString() : "No due date"} />
          <InfoCard label="Status" value={submission?.status ?? "NOT_STARTED"} />
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{messages.student.assignmentDetails}</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <p>Test: {assignment.testVersion.test.title}</p>
            <p>Opens at: {assignment.openAt ? assignment.openAt.toLocaleString() : "Any time"}</p>
            <p>Time limit: {assignment.timeLimitMinutes ? `${assignment.timeLimitMinutes} minutes` : "None"}</p>
            <p>Attempts allowed: {assignment.attemptsAllowed}</p>
          </div>
          {assignment.allowPhotoSolutions ? (
            <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Photo uploads will be enabled in the next update.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {completed ? (
              assignment.showResultsToStudents ? (
                <Link
                  href={`/student/assignments/${assignment.id}/results`}
                  className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  {messages.student.viewAssignmentResult}
                </Link>
              ) : (
                <p className="text-sm font-medium text-slate-600">Results are not available yet.</p>
              )
            ) : blocked ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                {blocked}
              </p>
            ) : (
              <Link
                href={`/student/assignments/${assignment.id}/work`}
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                {submission?.status === "IN_PROGRESS"
                  ? messages.student.resumeAssignment
                  : messages.student.startAssignment}
              </Link>
            )}
          </div>
        </section>
      </div>
    </StudentShell>
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
