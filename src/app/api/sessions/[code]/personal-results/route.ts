import { z } from "zod";

import { errorResponse, fail } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { noStoreJson } from "@/lib/session-live";
import { getSeriesLeaderboard } from "@/lib/series-scoring";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

const personalResultsSchema = z.object({
  participantId: z.string().min(1),
  participantToken: z.string().min(1),
});

function parseAnswerJson(answerJson: string) {
  try {
    const parsed = JSON.parse(answerJson);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "value" in parsed &&
      (typeof parsed.value === "string" || typeof parsed.value === "number")
    ) {
      return String(parsed.value);
    }

    if (typeof parsed === "string" || typeof parsed === "number") {
      return String(parsed);
    }
  } catch {
    return "";
  }

  return "";
}

function correctAnswerFromRules(gradingRulesJson: string | null) {
  if (!gradingRulesJson) {
    return "";
  }

  try {
    const rules = JSON.parse(gradingRulesJson) as {
      answer?: unknown;
      answers?: unknown;
    };

    if (typeof rules.answer === "string" || typeof rules.answer === "number") {
      return String(rules.answer);
    }

    if (Array.isArray(rules.answers)) {
      return rules.answers.map(String).join(", ");
    }
  } catch {
    return "";
  }

  return "";
}

function messageForPercentage(percentage: number) {
  if (percentage >= 85) {
    return messages.results.personalExcellent;
  }

  if (percentage >= 60) {
    return messages.results.personalGood;
  }

  return messages.results.personalPractice;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const input = personalResultsSchema.parse(await request.json());
    const session = await prisma.gameSession.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        testVersion: {
          include: {
            test: true,
            questions: {
              select: {
                questionId: true,
                points: true,
              },
            },
          },
        },
        participants: {
          include: {
            answers: {
              select: {
                points: true,
                questionId: true,
                isCorrect: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return fail(messages.api.sessionNotFound, 404);
    }

    const settings = parseSessionSettings(session.settingsJson);

    if (!settings.showStudentResults) {
      return fail(messages.api.studentResultsDisabled, 403);
    }

    const participant = await prisma.participant.findUnique({
      where: { id: input.participantId },
      include: {
        answers: {
          orderBy: { submittedAt: "asc" },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!participant || participant.sessionId !== session.id) {
      return fail(messages.api.participantNotFound, 404);
    }

    const tokenMatches = await verifyPassword(input.participantToken, participant.tokenHash);

    if (!tokenMatches) {
      return fail(messages.api.invalidParticipantToken, 401);
    }

    const seriesLeaderboard =
      settings.seriesId && participant.studentAccountId
        ? await getSeriesLeaderboard(settings.seriesId)
        : null;
    const seriesRow = seriesLeaderboard?.rows.find(
      (row) => row.studentId === participant.studentAccountId,
    );
    const currentRoundScore = seriesRow?.roundScores.find(
      (roundScore) => roundScore.roundId === settings.roundId,
    );
    const nextRound = seriesLeaderboard?.rounds.find(
      (round) =>
        round.id !== settings.roundId &&
        (round.status === "SCHEDULED" || round.status === "LOBBY" || round.status === "RUNNING"),
    );

    const totalPossible = session.testVersion.questions.reduce((sum, item) => sum + item.points, 0);
    const score = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
    const correctCount = participant.answers.filter((answer) => answer.isCorrect === true).length;
    const answeredCount = participant.answers.length;
    const percentage = totalPossible === 0 ? 0 : Math.round((score / totalPossible) * 100);
    const leaderboard = session.participants
      .map((item) => ({
        id: item.id,
        score: item.answers.reduce((sum, answer) => sum + answer.points, 0),
      }))
      .sort((left, right) => right.score - left.score);
    const rank = settings.showLeaderboard
      ? leaderboard.findIndex((item) => item.id === participant.id) + 1
      : null;

    return noStoreJson({
      ok: true,
      data: {
        code: session.code,
        testTitle: session.testVersion.test.title,
        sessionLabel: settings.label,
        displayName: participant.displayName,
        score,
        maxScore: totalPossible,
        percentage,
        correctCount,
        answeredCount,
        rank: rank && rank > 0 ? rank : null,
        participantCount: session.participants.length,
        message: messageForPercentage(percentage),
        series:
          seriesLeaderboard && seriesRow
            ? {
                id: seriesLeaderboard.series.id,
                title: seriesLeaderboard.series.title,
                roundScore: currentRoundScore?.points ?? score,
                roundRank: currentRoundScore?.rank ?? null,
                totalScore: seriesRow.totalScore,
                seriesRank: seriesRow.rank,
                nextRound: nextRound
                  ? {
                      title: nextRound.title,
                      scheduledAt: nextRound.scheduledAt?.toISOString() ?? null,
                      status: nextRound.status,
                    }
                  : null,
              }
            : null,
        showCorrectAnswers: settings.showCorrectAnswers,
        answers: settings.showCorrectAnswers
          ? participant.answers.map((answer) => {
              const correctOptions = answer.question.options
                .filter((option) => option.isCorrect)
                .map((option) => option.optionText);

              return {
                id: answer.id,
                question: answer.question.prompt,
                studentAnswer: parseAnswerJson(answer.answerJson),
                correctAnswer:
                  correctOptions.length > 0
                    ? correctOptions.join(", ")
                    : correctAnswerFromRules(answer.question.gradingRulesJson),
                explanation: answer.question.explanation,
                isCorrect: answer.isCorrect,
                points: answer.points,
              };
            })
          : [],
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
