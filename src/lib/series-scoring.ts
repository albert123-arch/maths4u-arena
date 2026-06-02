import { prisma } from "./prisma";
import { parseSessionSettings } from "./session-settings";

export async function recalculateSeriesRound(roundId: string) {
  const round = await prisma.seriesRound.findUnique({
    where: { id: roundId },
    include: {
      series: {
        include: {
          registrations: {
            where: { status: "REGISTERED" },
            include: { student: true },
          },
        },
      },
      testVersion: {
        include: {
          questions: {
            select: {
              points: true,
            },
          },
        },
      },
      session: {
        include: {
          participants: {
            where: {
              studentAccountId: {
                not: null,
              },
            },
            include: {
              answers: true,
            },
          },
        },
      },
    },
  });

  if (!round || !round.session) {
    return null;
  }

  const settings = parseSessionSettings(round.session.settingsJson);
  const totalPossible = round.testVersion.questions.reduce(
    (sum, item) =>
      sum +
      item.points +
      (round.session?.mode === "HOST_PACED" && settings.speedBonus
        ? Math.round(item.points * 0.5)
        : 0),
    0,
  );
  const participantByStudentId = new Map(
    round.session.participants
      .filter((participant) => participant.studentAccountId)
      .map((participant) => [participant.studentAccountId as string, participant]),
  );

  const scoreRows = [];

  for (const registration of round.series.registrations) {
    const participant = participantByStudentId.get(registration.studentId);
    const answers = participant?.answers ?? [];
    const points = answers.reduce((sum, answer) => sum + answer.points, 0);
    const correctCount = answers.filter((answer) => answer.isCorrect === true).length;
    const answeredCount = answers.length;
    const percentage = totalPossible === 0 ? 0 : Math.round((points / totalPossible) * 100);
    const existing = await prisma.seriesScore.findFirst({
      where: {
        seriesId: round.seriesId,
        studentId: registration.studentId,
        roundId: round.id,
      },
      select: { id: true },
    });

    const data = {
      seriesId: round.seriesId,
      studentId: registration.studentId,
      roundId: round.id,
      sessionId: round.session.id,
      points,
      correctCount,
      answeredCount,
      percentage,
      metaJson: JSON.stringify({
        totalPossible,
        participantId: participant?.id ?? null,
      }),
    };
    const score = existing
      ? await prisma.seriesScore.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.seriesScore.create({
          data,
        });

    scoreRows.push(score);
  }

  const ranked = [...scoreRows].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.correctCount !== left.correctCount) {
      return right.correctCount - left.correctCount;
    }

    return right.percentage - left.percentage;
  });

  await Promise.all(
    ranked.map((score, index) =>
      prisma.seriesScore.update({
        where: { id: score.id },
        data: { rank: index + 1 },
      }),
    ),
  );

  if (round.session.status === "FINISHED" && round.status !== "FINISHED") {
    await prisma.seriesRound.update({
      where: { id: round.id },
      data: { status: "FINISHED" },
    });
  }

  return {
    roundId: round.id,
    scoreCount: ranked.length,
  };
}

export async function recalculateSeries(seriesId: string) {
  const rounds = await prisma.seriesRound.findMany({
    where: {
      seriesId,
      sessionId: {
        not: null,
      },
    },
    select: { id: true },
    orderBy: { roundNumber: "asc" },
  });

  const results = [];

  for (const round of rounds) {
    results.push(await recalculateSeriesRound(round.id));
  }

  return results;
}

export async function getSeriesLeaderboard(seriesId: string) {
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    include: {
      rounds: {
        orderBy: { roundNumber: "asc" },
        select: {
          id: true,
          title: true,
          roundNumber: true,
          status: true,
          scheduledAt: true,
          session: {
            select: {
              code: true,
              status: true,
            },
          },
        },
      },
      registrations: {
        where: { status: "REGISTERED" },
        include: {
          student: {
            select: {
              id: true,
              displayName: true,
              groupName: true,
            },
          },
        },
      },
      scores: true,
    },
  });

  if (!series) {
    return null;
  }

  const scoresByStudentRound = new Map(
    series.scores
      .filter((score) => score.roundId)
      .map((score) => [`${score.studentId}:${score.roundId}`, score]),
  );
  const rows = series.registrations.map((registration) => {
    const roundScores = series.rounds.map((round) => {
      const score = scoresByStudentRound.get(`${registration.studentId}:${round.id}`);

      return {
        roundId: round.id,
        points: score?.points ?? 0,
        correctCount: score?.correctCount ?? 0,
        answeredCount: score?.answeredCount ?? 0,
        percentage: score?.percentage ?? 0,
        rank: score?.rank ?? null,
      };
    });
    const totalScore = roundScores.reduce((sum, score) => sum + score.points, 0);
    const correctCount = roundScores.reduce((sum, score) => sum + score.correctCount, 0);
    const answeredCount = roundScores.reduce((sum, score) => sum + score.answeredCount, 0);
    const playedRounds = roundScores.filter((score) => score.answeredCount > 0).length;
    const averagePercentage =
      playedRounds === 0
        ? 0
        : Math.round(
            roundScores.reduce((sum, score) => sum + score.percentage, 0) / playedRounds,
          );

    return {
      studentId: registration.studentId,
      displayName: registration.student.displayName,
      groupName: registration.student.groupName,
      totalScore,
      correctCount,
      answeredCount,
      averagePercentage,
      roundScores,
    };
  });
  const rankedRows = rows
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.correctCount !== left.correctCount) {
        return right.correctCount - left.correctCount;
      }

      return left.displayName.localeCompare(right.displayName);
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return {
    series,
    rounds: series.rounds,
    rows: rankedRows,
  };
}
