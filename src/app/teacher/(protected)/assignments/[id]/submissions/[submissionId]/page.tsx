import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentSubmissionReviewForm } from "@/components/assignment-submission-review-form";
import { answerDisplayValue } from "@/lib/assignments";
import { requireTeacherUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string; submissionId: string }>;
};

export default async function TeacherAssignmentSubmissionPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id, submissionId } = await params;
  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      assignmentId: id,
      assignment: { teacherId: teacher.id },
    },
    include: {
      student: { select: { displayName: true, username: true } },
      assignment: {
        include: {
          testVersion: {
            include: {
              questions: {
                orderBy: { sortOrder: "asc" },
                include: {
                  question: { select: { id: true, prompt: true } },
                },
              },
            },
          },
        },
      },
      answers: {
        include: {
          question: { select: { id: true, prompt: true } },
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));
  const reviewAnswers = submission.assignment.testVersion.questions.map((versionQuestion) => {
    const answer = answerMap.get(versionQuestion.questionId);

    return {
      id: answer?.id ?? "",
      questionPrompt: versionQuestion.question.prompt,
      answerText: answerDisplayValue(answer?.answerJson),
      points: answer?.points ?? 0,
      feedback: answer?.feedback ?? "",
    };
  }).filter((answer) => answer.id);

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/teacher/assignments/${id}/results`} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          Back to results
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{submission.student.displayName}</h1>
        <p className="mt-2 text-slate-600">
          {submission.student.username} - {submission.status} - {submission.score} / {submission.maxScore}
        </p>
      </div>
      {reviewAnswers.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No answers have been submitted yet.
        </p>
      ) : (
        <AssignmentSubmissionReviewForm
          assignmentId={id}
          submissionId={submission.id}
          initialFeedback={submission.teacherFeedback ?? ""}
          answers={reviewAnswers}
        />
      )}
    </div>
  );
}
