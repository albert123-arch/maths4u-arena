import { errorResponse, fail, ok } from "@/lib/api-response";
import {
  assignmentAvailabilityError,
  gradeAssignmentAnswers,
  submittedOptionId,
} from "@/lib/assignments";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-auth";
import { assignmentSubmitSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const student = await getCurrentStudent();

  if (!student) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = assignmentSubmitSchema.parse(await request.json());
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
          where: {
            studentId: student.id,
            attemptNumber: 1,
          },
          take: 1,
        },
        testVersion: {
          include: {
            questions: {
              orderBy: { sortOrder: "asc" },
              include: {
                question: {
                  include: {
                    options: {
                      select: {
                        id: true,
                        isCorrect: true,
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

    if (!assignment) {
      return fail(messages.api.assignmentNotFound, 404);
    }

    const blocked = assignmentAvailabilityError(assignment);

    if (blocked) {
      return fail(blocked, 409);
    }

    const submission =
      assignment.submissions[0] ??
      (await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          attemptNumber: 1,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      }));

    if (["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status)) {
      return fail(messages.api.assignmentAlreadySubmitted, 409);
    }

    const questionMap = new Map(
      assignment.testVersion.questions.map((versionQuestion) => [
        versionQuestion.questionId,
        versionQuestion.question,
      ]),
    );

    for (const answer of input.answers) {
      const question = questionMap.get(answer.questionId);
      const optionId = submittedOptionId(answer.answer);

      if (
        optionId &&
        question &&
        (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") &&
        !question.options.some((option) => option.id === optionId)
      ) {
        return fail(messages.api.invalidAnswerOption, 400);
      }
    }

    const graded = gradeAssignmentAnswers({
      versionQuestions: assignment.testVersion.questions,
      answers: input.answers,
    });
    const submittedAt = new Date();

    await prisma.$transaction([
      prisma.assignmentAnswer.deleteMany({
        where: { submissionId: submission.id },
      }),
      ...graded.rows.map((row) =>
        prisma.assignmentAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: row.questionId,
            answerJson: row.answerJson,
            isCorrect: row.isCorrect,
            points: row.points,
            submittedAt,
          },
        }),
      ),
      prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          submittedAt,
          score: graded.score,
          maxScore: graded.maxScore,
          correctCount: graded.correctCount,
          answeredCount: graded.answeredCount,
          percentage: graded.percentage,
        },
      }),
    ]);

    return ok({
      status: "SUBMITTED",
      score: graded.score,
      maxScore: graded.maxScore,
      correctCount: graded.correctCount,
      answeredCount: graded.answeredCount,
      percentage: graded.percentage,
    });
  } catch (error) {
    return errorResponse(error, messages.api.assignmentSubmitFailed);
  }
}
