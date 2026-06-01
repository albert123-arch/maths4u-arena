import { ZodError } from "zod";

import { errorResponse, fail, ok } from "@/lib/api-response";
import type { GradingTypeValue } from "@/lib/constants";
import { gradeAnswer } from "@/lib/grading";
import { messages } from "@/lib/messages";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { answerSubmitSchema } from "@/lib/validation";

function submittedOptionId(answer: unknown) {
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

export async function POST(request: Request) {
  try {
    const input = answerSubmitSchema.parse(await request.json());
    const participant = await prisma.participant.findUnique({
      where: { id: input.participantId },
      select: {
        id: true,
        sessionId: true,
        tokenHash: true,
        session: {
          select: {
            id: true,
            code: true,
            status: true,
            testVersionId: true,
          },
        },
      },
    });

    if (!participant) {
      return fail(messages.api.participantNotFound, 404);
    }

    const tokenMatches = await verifyPassword(input.participantToken, participant.tokenHash);

    if (!tokenMatches) {
      return fail(messages.api.invalidParticipantToken, 401);
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
        type: true,
        gradingType: true,
        gradingRulesJson: true,
        options: {
          select: {
            id: true,
            isCorrect: true,
          },
        },
      },
    });

    if (!question) {
      return fail(messages.api.questionNotFound, 404);
    }

    const versionQuestion = await prisma.testVersionQuestion.findUnique({
      where: {
        testVersionId_questionId: {
          testVersionId: participant.session.testVersionId,
          questionId: question.id,
        },
      },
      select: {
        points: true,
      },
    });

    if (!versionQuestion) {
      return fail(messages.api.questionNotInSession, 400);
    }

    const existingAnswer = await prisma.answer.findFirst({
      where: {
        sessionId: participant.sessionId,
        participantId: participant.id,
        questionId: question.id,
      },
      select: {
        id: true,
      },
    });

    if (existingAnswer) {
      return fail(messages.api.answerAlreadySubmitted, 409);
    }

    const optionId = submittedOptionId(input.answer);
    const selectedOption =
      optionId && (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE")
        ? question.options.find((option) => option.id === optionId)
        : null;

    if (optionId && !selectedOption) {
      return fail(messages.api.invalidAnswerOption, 400);
    }

    const graded = selectedOption
      ? { isCorrect: selectedOption.isCorrect }
      : gradeAnswer({
          gradingType: question.gradingType as GradingTypeValue,
          gradingRulesJson: question.gradingRulesJson,
          answer: input.answer,
        });
    const points = graded.isCorrect === true ? versionQuestion.points : 0;

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

    await prisma.scoreEvent.create({
      data: {
        sessionId: participant.sessionId,
        participantId: participant.id,
        questionId: question.id,
        eventType: "ANSWER_SUBMITTED",
        pointsDelta: points,
        metaJson: JSON.stringify({ isCorrect: graded.isCorrect }),
      },
    });

    return ok({
      answer,
      grading: graded,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error);
    }

    console.error("Answer submission failed", error instanceof Error ? error.message : "Unknown error");
    return fail(messages.api.answerSubmitFailed, 500);
  }
}
