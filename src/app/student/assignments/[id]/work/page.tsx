import Link from "next/link";

import { AssignmentWorkClient } from "@/components/assignment-work-client";
import { StudentShell } from "@/components/student-shell";
import { assignmentAvailabilityError } from "@/lib/assignments";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentAssignmentWorkPage({ params }: PageProps) {
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
      submissions: {
        where: { studentId: student.id, attemptNumber: 1 },
        take: 1,
      },
      testVersion: {
        include: {
          questions: {
            orderBy: { sortOrder: "asc" },
            include: {
              question: {
                select: {
                  id: true,
                  type: true,
                  prompt: true,
                  options: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true,
                      optionText: true,
                    },
                  },
                },
              },
            },
          },
        },
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

  if (submission && ["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status)) {
    return (
      <StudentShell student={student}>
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.api.assignmentAlreadySubmitted}</h1>
          <Link
            href={`/student/assignments/${assignment.id}/results`}
            className="mt-4 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {messages.student.viewAssignmentResult}
          </Link>
        </section>
      </StudentShell>
    );
  }

  const blocked = assignmentAvailabilityError(assignment);

  if (blocked) {
    return (
      <StudentShell student={student}>
        <section className="rounded-md border border-amber-200 bg-amber-50 p-6 text-center text-amber-950 shadow-sm">
          <h1 className="text-2xl font-bold">{blocked}</h1>
          <Link href={`/student/assignments/${assignment.id}`} className="mt-4 inline-flex font-semibold text-teal-900">
            {messages.common.back}
          </Link>
        </section>
      </StudentShell>
    );
  }

  const questions = assignment.testVersion.questions.map((versionQuestion) => ({
    id: versionQuestion.questionId,
    type: versionQuestion.question.type,
    prompt: versionQuestion.question.prompt,
    points: versionQuestion.points,
    options: versionQuestion.question.options,
  }));

  return (
    <StudentShell student={student}>
      <AssignmentWorkClient
        assignmentId={assignment.id}
        studentId={student.id}
        title={assignment.title}
        type={assignment.type}
        dueAt={assignment.dueAt?.toISOString() ?? null}
        timeLimitMinutes={assignment.timeLimitMinutes}
        initialStartedAt={submission?.startedAt?.toISOString() ?? null}
        questions={questions}
      />
    </StudentShell>
  );
}
