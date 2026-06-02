import type { AssignmentStatusValue, GradingTypeValue } from "./constants";
import { gradeAnswer } from "./grading";
import { messages } from "./messages";
import { prisma } from "./prisma";

export function isAssignmentsMigrationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Assignment|AssignmentSubmission|AssignmentAnswer|doesn't exist|does not exist|Unknown table/i.test(
    error.message,
  );
}

export function toDateOrNull(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDatetimeLocalValue(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function assignmentCsvFilename(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `maths4u-assignment-${slug || "assignment"}-results.csv`;
}

export async function syncAssignmentRoster(assignmentId: string, teacherId?: string) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      ...(teacherId ? { teacherId } : {}),
    },
    select: {
      id: true,
      classroom: {
        select: {
          memberships: {
            where: { status: "ACTIVE" },
            select: { studentId: true },
          },
        },
      },
      submissions: {
        where: { attemptNumber: 1 },
        select: { studentId: true },
      },
    },
  });

  if (!assignment) {
    throw new Error(messages.api.assignmentNotFound);
  }

  const existingStudentIds = new Set(assignment.submissions.map((submission) => submission.studentId));
  const missingStudents = assignment.classroom.memberships.filter(
    (membership) => !existingStudentIds.has(membership.studentId),
  );

  if (missingStudents.length === 0) {
    return { created: 0 };
  }

  await prisma.assignmentSubmission.createMany({
    data: missingStudents.map((membership) => ({
      assignmentId,
      studentId: membership.studentId,
      attemptNumber: 1,
      status: "NOT_STARTED",
    })),
    skipDuplicates: true,
  });

  return { created: missingStudents.length };
}

export function assignmentAvailabilityError(assignment: {
  status: AssignmentStatusValue;
  openAt: Date | null;
  dueAt: Date | null;
  allowLateSubmission: boolean;
}) {
  const now = new Date();

  if (assignment.status === "DRAFT" || assignment.status === "ARCHIVED") {
    return messages.api.assignmentNotFound;
  }

  if (assignment.openAt && assignment.openAt > now) {
    return messages.api.assignmentNotOpenYet;
  }

  if (assignment.status === "CLOSED" && !assignment.allowLateSubmission) {
    return messages.api.assignmentClosed;
  }

  if (assignment.dueAt && assignment.dueAt < now && !assignment.allowLateSubmission) {
    return messages.api.assignmentClosed;
  }

  return null;
}

export function submittedOptionId(answer: unknown) {
  if (
    typeof answer === "object" &&
    answer !== null &&
    "optionId" in answer &&
    typeof answer.optionId === "string"
  ) {
    return answer.optionId;
  }

  return null;
}

export function answerDisplayValue(answerJson: string | null | undefined) {
  if (!answerJson) {
    return "";
  }

  try {
    const parsed = JSON.parse(answerJson) as unknown;

    if (typeof parsed === "object" && parsed !== null && "value" in parsed) {
      const value = parsed.value;
      return typeof value === "string" || typeof value === "number" ? String(value) : "";
    }

    if (typeof parsed === "string" || typeof parsed === "number") {
      return String(parsed);
    }
  } catch {
    return answerJson;
  }

  return "";
}

export function gradeAssignmentAnswers({
  versionQuestions,
  answers,
}: {
  versionQuestions: Array<{
    questionId: string;
    points: number;
    question: {
      id: string;
      type: string;
      gradingType: string;
      gradingRulesJson: string | null;
      options: Array<{
        id: string;
        isCorrect: boolean;
      }>;
    };
  }>;
  answers: Array<{
    questionId: string;
    answer: unknown;
  }>;
}) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
  const rows = versionQuestions.map((versionQuestion) => {
    const answer = answerMap.get(versionQuestion.questionId);
    const hasAnswer = answer !== undefined && JSON.stringify(answer) !== JSON.stringify({ value: "" });
    const optionId = submittedOptionId(answer);
    const selectedOption =
      optionId &&
      (versionQuestion.question.type === "MULTIPLE_CHOICE" ||
        versionQuestion.question.type === "TRUE_FALSE")
        ? versionQuestion.question.options.find((option) => option.id === optionId)
        : null;
    const graded = !hasAnswer
      ? { isCorrect: false as boolean | null }
      : selectedOption
        ? { isCorrect: selectedOption.isCorrect }
        : gradeAnswer({
            gradingType: versionQuestion.question.gradingType as GradingTypeValue,
            gradingRulesJson: versionQuestion.question.gradingRulesJson,
            answer,
          });
    const points = graded.isCorrect === true ? versionQuestion.points : 0;

    return {
      questionId: versionQuestion.questionId,
      answer,
      answerJson: JSON.stringify(answer ?? { value: "" }),
      isCorrect: graded.isCorrect,
      points,
      maxPoints: versionQuestion.points,
      answered: hasAnswer,
    };
  });
  const score = rows.reduce((sum, row) => sum + row.points, 0);
  const maxScore = versionQuestions.reduce((sum, question) => sum + question.points, 0);
  const correctCount = rows.filter((row) => row.isCorrect === true).length;
  const answeredCount = rows.filter((row) => row.answered).length;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

  return {
    rows,
    score,
    maxScore,
    correctCount,
    answeredCount,
    percentage,
  };
}
