import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { assignmentReviewSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; submissionId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id, submissionId } = await params;
    const input = assignmentReviewSchema.parse(await request.json());
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId: id,
        assignment: { teacherId: teacher.id },
      },
      include: {
        assignment: {
          include: {
            testVersion: {
              include: {
                questions: {
                  select: { points: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return fail(messages.api.assignmentSubmissionNotFound, 404);
    }

    await prisma.$transaction(
      input.answers.map((answer) =>
        prisma.assignmentAnswer.updateMany({
          where: {
            id: answer.id,
            submissionId,
          },
          data: {
            points: answer.points,
            feedback: answer.feedback,
          },
        }),
      ),
    );

    const answers = await prisma.assignmentAnswer.findMany({
      where: { submissionId },
      select: { points: true, isCorrect: true },
    });
    const score = answers.reduce((sum, answer) => sum + answer.points, 0);
    const maxScore = submission.assignment.testVersion.questions.reduce(
      (sum, question) => sum + question.points,
      0,
    );
    const correctCount = answers.filter((answer) => answer.isCorrect === true).length;
    const answeredCount = answers.length;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        status: input.status,
        teacherFeedback: input.teacherFeedback,
        gradedAt: new Date(),
        score,
        maxScore,
        correctCount,
        answeredCount,
        percentage,
      },
    });

    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
