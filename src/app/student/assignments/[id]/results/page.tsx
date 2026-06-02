import Link from "next/link";

import { answerDisplayValue } from "@/lib/assignments";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-auth";
import { StudentShell } from "@/components/student-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function correctAnswerText(question: {
  options: Array<{ optionText: string; isCorrect: boolean }>;
  gradingRulesJson: string | null;
}) {
  const correctOptions = question.options.filter((option) => option.isCorrect).map((option) => option.optionText);

  if (correctOptions.length > 0) {
    return correctOptions.join(", ");
  }

  if (question.gradingRulesJson) {
    try {
      const rules = JSON.parse(question.gradingRulesJson) as Record<string, unknown>;
      const answer = rules.answer ?? rules.answers;

      return Array.isArray(answer) ? answer.join(", ") : String(answer ?? "");
    } catch {
      return "";
    }
  }

  return "";
}

export default async function StudentAssignmentResultsPage({ params }: PageProps) {
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
      testVersion: {
        include: {
          questions: {
            orderBy: { sortOrder: "asc" },
            include: {
              question: {
                include: {
                  options: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      optionText: true,
                      isCorrect: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      submissions: {
        where: { studentId: student.id, attemptNumber: 1 },
        take: 1,
        include: {
          answers: true,
        },
      },
    },
  });

  const submission = assignment?.submissions[0];

  if (!assignment || !submission || !assignment.showResultsToStudents) {
    return (
      <StudentShell student={student}>
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{messages.results.unavailable}</h1>
          <p className="mt-2 text-slate-600">Results are not available yet.</p>
          <Link href="/student/assignments" className="mt-4 inline-flex font-semibold text-teal-800">
            {messages.student.backToAssignments}
          </Link>
        </section>
      </StudentShell>
    );
  }

  const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));

  return (
    <StudentShell student={student}>
      <div className="grid gap-6">
        <div>
          <Link href={`/student/assignments/${assignment.id}`} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.common.back}
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{assignment.title}</h1>
          <p className="mt-2 text-slate-600">{messages.student.assignmentSubmitted}</p>
        </div>
        <section className="grid gap-4 md:grid-cols-4">
          <InfoCard label="Score" value={`${submission.score} / ${submission.maxScore}`} />
          <InfoCard label="Percentage" value={`${submission.percentage}%`} />
          <InfoCard label="Correct" value={submission.correctCount} />
          <InfoCard label="Answered" value={submission.answeredCount} />
        </section>
        {submission.teacherFeedback ? (
          <section className="rounded-md border border-teal-200 bg-teal-50 p-5 text-teal-950 shadow-sm">
            <h2 className="text-xl font-semibold">{messages.student.recentFeedback}</h2>
            <p className="mt-2 text-sm leading-6">{submission.teacherFeedback}</p>
          </section>
        ) : null}
        {assignment.showCorrectAnswers ? (
          <section className="grid gap-3">
            <h2 className="text-xl font-semibold">{messages.results.reviewTitle}</h2>
            {assignment.testVersion.questions.map((versionQuestion, index) => {
              const answer = answerMap.get(versionQuestion.questionId);

              return (
                <article key={versionQuestion.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-500">Question {index + 1}</p>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {answer?.isCorrect === true
                        ? messages.game.correct
                        : answer?.isCorrect === false
                          ? messages.game.incorrect
                          : messages.game.submitted}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold">{versionQuestion.question.prompt}</h3>
                  <p className="mt-3 text-sm text-slate-700">
                    {messages.results.yourAnswer}: {answerDisplayValue(answer?.answerJson) || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {messages.results.correctAnswer}: {correctAnswerText(versionQuestion.question) || "-"}
                  </p>
                  {versionQuestion.question.explanation ? (
                    <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                      {versionQuestion.question.explanation}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </StudentShell>
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
