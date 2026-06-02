import { ZodError } from "zod";

import type { GradingTypeValue } from "@/lib/constants";
import { gradeAnswer } from "@/lib/grading";
import {
  gradeHostPacedAnswer,
  validateHostPacedAnswerWindow,
} from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { noStoreJson } from "@/lib/session-live";
import { recalculateSeriesRound } from "@/lib/series-scoring";
import { answerSubmitSchema } from "@/lib/validation";

const FINISH_AUTO_SUBMIT_GRACE_MS = 2 * 60 * 1000;

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

function submitOk(data: unknown, status = 200) {
  return noStoreJson({ ok: true, data }, status);
}

function submitFail(error: string, status = 400) {
  return noStoreJson({ ok: false, error }, status);
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
            mode: true,
            status: true,
            testVersionId: true,
            finishedAt: true,
            settingsJson: true,
            testVersion: {
              select: {
                questions: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    questionId: true,
                    points: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!participant) {
      return submitFail(messages.api.participantNotFound, 404);
    }

    const tokenMatches = await verifyPassword(input.participantToken, participant.tokenHash);

    if (!tokenMatches) {
      return submitFail(messages.api.invalidParticipantToken, 401);
    }

    if (input.sessionId && participant.sessionId !== input.sessionId) {
      return submitFail(messages.api.participantSessionMismatch, 400);
    }

    if (input.code && participant.session.code !== input.code.toUpperCase()) {
      return submitFail(messages.api.participantCodeMismatch, 400);
    }

    const settings = parseSessionSettings(participant.session.settingsJson);
    const isHostPaced = participant.session.mode === "HOST_PACED";

    const canAutoSubmitAfterFinish =
      !isHostPaced &&
      input.source === "AUTO_FINISH" &&
      participant.session.status === "FINISHED" &&
      participant.session.finishedAt !== null &&
      Date.now() - participant.session.finishedAt.getTime() <= FINISH_AUTO_SUBMIT_GRACE_MS;

    if (participant.session.status !== "RUNNING" && !canAutoSubmitAfterFinish) {
      return submitFail(messages.api.answerOutsideRunningSession, 409);
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
      return submitFail(messages.api.questionNotFound, 404);
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
      return submitFail(messages.api.questionNotInSession, 400);
    }

    const orderedVersionQuestions = participant.session.testVersion.questions;
    const currentVersionQuestion =
      orderedVersionQuestions[
        Math.min(Math.max(settings.currentQuestionIndex, 0), Math.max(orderedVersionQuestions.length - 1, 0))
      ] ?? null;
    const hostPacedWindow = isHostPaced
      ? validateHostPacedAnswerWindow({
          settings,
          questionId: question.id,
          expectedQuestionId: currentVersionQuestion?.questionId ?? null,
        })
      : null;

    if (hostPacedWindow && !hostPacedWindow.ok) {
      return submitFail(hostPacedWindow.error, hostPacedWindow.status);
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
      return submitFail(messages.api.answerAlreadySubmitted, 409);
    }

    const optionId = submittedOptionId(input.answer);
    const selectedOption =
      optionId && (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE")
        ? question.options.find((option) => option.id === optionId)
        : null;

    if (optionId && !selectedOption) {
      return submitFail(messages.api.invalidAnswerOption, 400);
    }

    const hostPacedGrading =
      isHostPaced && hostPacedWindow?.ok
        ? gradeHostPacedAnswer({
            question,
            basePoints: versionQuestion.points,
            selectedOptionId: optionId,
            answer: input.answer,
            settings,
            timer: hostPacedWindow.timer,
          })
        : null;
    const graded = hostPacedGrading
      ? hostPacedGrading.graded
      : selectedOption
        ? { isCorrect: selectedOption.isCorrect }
        : gradeAnswer({
            gradingType: question.gradingType as GradingTypeValue,
            gradingRulesJson: question.gradingRulesJson,
            answer: input.answer,
          });
    const points = hostPacedGrading
      ? hostPacedGrading.points
      : graded.isCorrect === true
        ? versionQuestion.points
        : 0;
    const responseMs = hostPacedGrading?.responseMs ?? input.responseMs;

    const answer = await prisma.answer.create({
      data: {
        sessionId: participant.sessionId,
        participantId: participant.id,
        questionId: question.id,
        answerJson: JSON.stringify(input.answer),
        isCorrect: graded.isCorrect,
        points,
        responseMs,
      },
    });

    await prisma.scoreEvent.create({
      data: {
        sessionId: participant.sessionId,
        participantId: participant.id,
        questionId: question.id,
        eventType: "ANSWER_SUBMITTED",
        pointsDelta: points,
        metaJson: JSON.stringify({
          isCorrect: graded.isCorrect,
          mode: participant.session.mode,
          basePoints: versionQuestion.points,
          speedBonusPoints: hostPacedGrading?.speedBonusPoints ?? 0,
          responseMs: responseMs ?? null,
        }),
      },
    });

    if (input.source === "AUTO_FINISH" && settings.roundId) {
      await recalculateSeriesRound(settings.roundId);
    }

    return submitOk({
      answer,
      grading: graded,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return submitFail(
        error.issues.map((issue) => issue.message).join("; "),
        422,
      );
    }

    console.error("Answer submission failed", error instanceof Error ? error.message : "Unknown error");
    return submitFail(messages.api.answerSubmitFailed, 500);
  }
}
