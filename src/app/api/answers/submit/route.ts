import { errorResponse, fail, ok } from "@/lib/api-response";
import type { GradingTypeValue } from "@/lib/constants";
import { gradeAnswer } from "@/lib/grading";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { answerSubmitSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = answerSubmitSchema.parse(await request.json());
    const participant = await prisma.participant.findUnique({
      where: { id: input.participantId },
      select: {
        id: true,
        sessionId: true,
        session: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!participant) {
      return fail(messages.api.participantNotFound, 404);
    }

    if (input.sessionId && participant.sessionId !== input.sessionId) {
      return fail(messages.api.participantSessionMismatch, 400);
    }

    if (input.code && participant.session.code !== input.code.toUpperCase()) {
      return fail(messages.api.participantCodeMismatch, 400);
    }

    if (participant.session.status !== "RUNNING") {
      return fail(messages.api.answerOutsideRunningSession, 409);
    }

    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      select: {
        id: true,
        gradingType: true,
        gradingRulesJson: true,
      },
    });

    if (!question) {
      return fail(messages.api.questionNotFound, 404);
    }

    const graded = gradeAnswer({
      gradingType: question.gradingType as GradingTypeValue,
      gradingRulesJson: question.gradingRulesJson,
      answer: input.answer,
    });
    const points = graded.isCorrect === true ? 1 : 0;

    const answer = await prisma.answer.create({
      data: {
        sessionId: participant.sessionId,
        participantId: participant.id,
        questionId: question.id,
        answerJson: JSON.stringify(input.answer),
        isCorrect: graded.isCorrect,
        points,
        responseMs: input.responseMs,
      },
    });

    if (points !== 0) {
      await prisma.scoreEvent.create({
        data: {
          sessionId: participant.sessionId,
          participantId: participant.id,
          questionId: question.id,
          eventType: "ANSWER_GRADED",
          pointsDelta: points,
        },
      });
    }

    return ok({
      answer,
      grading: graded,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
