import type { GradingTypeValue } from "./constants";
import { gradeAnswer } from "./grading";
import { messages } from "./messages";
import { verifyPassword } from "./password";
import { prisma } from "./prisma";
import {
  type HostPacedAutoAction,
  type HostPacedPhase,
  parseSessionSettings,
  sessionSettingsJson,
  type SessionSettings,
} from "./session-settings";
import { recalculateSeriesRound } from "./series-scoring";
import { getRegisteredRoster } from "./session-live";
import { calculateTeamLeaderboard, teamName } from "./team-scoring";

const TIMER_GRACE_MS = 2_000;

type HostPacedQuestionRow = Awaited<ReturnType<typeof getHostPacedSession>> extends infer Session
  ? Session extends { testVersion: { questions: Array<infer QuestionRow> } }
    ? QuestionRow
    : never
  : never;

type HostPacedSession = NonNullable<Awaited<ReturnType<typeof getHostPacedSession>>>;
type HostPacedParticipant = HostPacedSession["participants"][number];
type HostPacedAnswer = HostPacedParticipant["answers"][number];

type ActionResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof getHostPacedHostLiveData>>;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

function nowIso() {
  return new Date().toISOString();
}

function parseDateMs(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function clampIndex(index: number, questionCount: number) {
  if (questionCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), questionCount - 1);
}

function getTimerState(settings: SessionSettings, serverNow = Date.now()) {
  const startedAtMs = parseDateMs(settings.questionStartedAt);
  const endsAtMs = parseDateMs(settings.questionEndsAt);

  if (!endsAtMs) {
    return {
      questionStartedAt: settings.questionStartedAt,
      questionEndsAt: settings.questionEndsAt,
      remainingSeconds: null,
      remainingMs: null,
      totalMs: null,
      expiredWithGrace: false,
    };
  }

  const remainingMs = Math.max(0, endsAtMs - serverNow);
  const totalMs =
    startedAtMs && endsAtMs > startedAtMs ? Math.max(1, endsAtMs - startedAtMs) : null;

  return {
    questionStartedAt: settings.questionStartedAt,
    questionEndsAt: settings.questionEndsAt,
    remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
    remainingMs,
    totalMs,
    expiredWithGrace: serverNow > endsAtMs + TIMER_GRACE_MS,
  };
}

function secondsFromNowIso(seconds: number, now = Date.now()) {
  return new Date(now + Math.max(0, seconds) * 1000).toISOString();
}

function phaseTimestamp(settings: SessionSettings) {
  return settings.phaseChangedAt ?? settings.lastPhaseChangedAt;
}

function autoFlowIsActive(settings: SessionSettings) {
  return settings.autoFlow && !settings.autoFlowPaused;
}

function autoSchedule(
  settings: SessionSettings,
  phase: HostPacedPhase,
  options: {
    nowMs?: number;
    isLastQuestion?: boolean;
  } = {},
): Pick<SessionSettings, "nextAutoActionAt" | "autoAction"> {
  if (!autoFlowIsActive(settings)) {
    return {
      nextAutoActionAt: null,
      autoAction: null,
    };
  }

  const nowMs = options.nowMs ?? Date.now();

  if (phase === "QUESTION_LOCKED") {
    return {
      nextAutoActionAt: secondsFromNowIso(settings.autoRevealAfterLockSeconds, nowMs),
      autoAction: "REVEAL",
    };
  }

  if (phase === "REVEAL") {
    return {
      nextAutoActionAt: secondsFromNowIso(settings.autoLeaderboardAfterRevealSeconds, nowMs),
      autoAction: "LEADERBOARD",
    };
  }

  if (phase === "LEADERBOARD") {
    return {
      nextAutoActionAt: secondsFromNowIso(settings.autoNextAfterLeaderboardSeconds, nowMs),
      autoAction: options.isLastQuestion ? "FINISH" : "NEXT",
    };
  }

  return {
    nextAutoActionAt: null,
    autoAction: null,
  };
}

function autoActionIsDue(settings: SessionSettings, nowMs = Date.now()) {
  const nextAutoActionAtMs = parseDateMs(settings.nextAutoActionAt);

  return nextAutoActionAtMs !== null && nowMs >= nextAutoActionAtMs;
}

function activeAnswerStats(session: HostPacedSession, questionId: string | null) {
  if (!questionId) {
    return {
      expectedAnswerCount: session.participants.length,
      answeredCurrentQuestionCount: 0,
    };
  }

  const answeredParticipantIds = new Set<string>();

  for (const participant of session.participants) {
    if (participant.answers.some((answer) => answer.questionId === questionId)) {
      answeredParticipantIds.add(participant.id);
    }
  }

  return {
    expectedAnswerCount: session.participants.length,
    answeredCurrentQuestionCount: answeredParticipantIds.size,
  };
}

function questionWindow(
  settings: SessionSettings,
  row: HostPacedQuestionRow | null,
  startedAt: Date,
) {
  const timeLimitSeconds = row?.timeLimitSeconds ?? settings.questionTimeLimitSeconds;
  const endsAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000);

  return {
    questionStartedAt: startedAt.toISOString(),
    questionEndsAt: endsAt.toISOString(),
  };
}

async function updateAutoFlowSettings(
  session: HostPacedSession,
  settings: SessionSettings,
  data: {
    status?: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
    finishedAt?: Date;
  } = {},
) {
  const updated = await prisma.gameSession.updateMany({
    where: {
      id: session.id,
      settingsJson: session.settingsJson,
    },
    data: {
      ...data,
      settingsJson: sessionSettingsJson(settings),
    },
  });

  return updated.count > 0;
}

function sortedQuestions(session: HostPacedSession) {
  return [...session.testVersion.questions].sort((left, right) => left.sortOrder - right.sortOrder);
}

function currentQuestion(session: HostPacedSession, settings: SessionSettings) {
  const questions = sortedQuestions(session);
  const index = clampIndex(settings.currentQuestionIndex, questions.length);

  return {
    questions,
    index,
    row: questions[index] ?? null,
  };
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

function correctAnswerForQuestion(question: HostPacedQuestionRow["question"]) {
  const correctOptions = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.optionText);

  if (correctOptions.length > 0) {
    return correctOptions.join(", ");
  }

  return correctAnswerFromRules(question.gradingRulesJson);
}

function parseAnswerValue(answerJson: string) {
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

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "optionId" in parsed &&
      typeof parsed.optionId === "string"
    ) {
      return parsed.optionId;
    }

    if (typeof parsed === "string" || typeof parsed === "number") {
      return String(parsed);
    }
  } catch {
    return "";
  }

  return "";
}

function questionPayload(
  row: HostPacedQuestionRow | null,
  options: {
    includeCorrect: boolean;
    includeExplanation: boolean;
  },
) {
  if (!row) {
    return null;
  }

  return {
    id: row.question.id,
    type: row.question.type,
    prompt: row.question.prompt,
    points: row.points,
    sortOrder: row.sortOrder,
    timeLimitSeconds: row.timeLimitSeconds,
    options: row.question.options.map((option) => ({
      id: option.id,
      optionText: option.optionText,
      ...(options.includeCorrect ? { isCorrect: option.isCorrect } : {}),
    })),
    ...(options.includeCorrect
      ? {
          correctAnswer: correctAnswerForQuestion(row.question),
        }
      : {}),
    ...(options.includeExplanation ? { explanation: row.question.explanation } : {}),
  };
}

function leaderboardForParticipants(participants: HostPacedParticipant[]) {
  return participants
    .map((participant) => {
      const totalScore = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
      const correctCount = participant.answers.filter((answer) => answer.isCorrect === true).length;
      const answeredCount = participant.answers.length;
      const totalResponseMs = participant.answers.reduce(
        (sum, answer) => sum + (answer.responseMs ?? 0),
        0,
      );

      return {
        id: participant.id,
        displayName: participant.displayName,
        teamId: participant.teamId,
        score: totalScore,
        correctCount,
        answeredCount,
        totalResponseMs,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.correctCount !== left.correctCount) {
        return right.correctCount - left.correctCount;
      }

      if (left.totalResponseMs !== right.totalResponseMs) {
        return left.totalResponseMs - right.totalResponseMs;
      }

      return left.displayName.localeCompare(right.displayName);
    })
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
}

function totalPossibleScore(session: HostPacedSession, settings: SessionSettings) {
  return session.testVersion.questions.reduce(
    (sum, item) => sum + item.points + (settings.speedBonus ? Math.round(item.points * 0.5) : 0),
    0,
  );
}

function teamParticipantsForLeaderboard(
  session: HostPacedSession,
  settings: SessionSettings,
  leaderboard: ReturnType<typeof leaderboardForParticipants>,
) {
  const maxScore = totalPossibleScore(session, settings);

  return leaderboard.map((participant) => ({
    id: participant.id,
    displayName: participant.displayName,
    teamId: participant.teamId,
    totalScore: participant.score,
    correct: participant.correctCount,
    answered: participant.answeredCount,
    percentage: maxScore === 0 ? 0 : Math.round((participant.score / maxScore) * 100),
    totalResponseMs: participant.totalResponseMs,
  }));
}

function currentQuestionAnswers(session: HostPacedSession, currentQuestionId: string | null) {
  if (!currentQuestionId) {
    return [];
  }

  return session.participants.flatMap((participant) =>
    participant.answers
      .filter((answer) => answer.questionId === currentQuestionId)
      .map((answer) => ({
        ...answer,
        participantId: participant.id,
      })),
  );
}

function answerDistribution(
  row: HostPacedQuestionRow | null,
  answers: Array<HostPacedAnswer & { participantId: string }>,
  includeCorrect: boolean,
) {
  if (!row) {
    return [];
  }

  if (row.question.options.length > 0) {
    return row.question.options.map((option) => {
      const count = answers.filter((answer) => {
        try {
          const parsed = JSON.parse(answer.answerJson);
          return (
            typeof parsed === "object" &&
            parsed !== null &&
            "optionId" in parsed &&
            parsed.optionId === option.id
          );
        } catch {
          return false;
        }
      }).length;

      return {
        id: option.id,
        label: option.optionText,
        count,
        ...(includeCorrect ? { isCorrect: option.isCorrect } : {}),
      };
    });
  }

  if (!includeCorrect) {
    return [
      {
        id: "submitted",
        label: messages.game.submitted,
        count: answers.length,
      },
    ];
  }

  return [
    {
      id: "correct",
      label: messages.game.correct,
      count: answers.filter((answer) => answer.isCorrect === true).length,
      isCorrect: true,
    },
    {
      id: "incorrect",
      label: messages.game.incorrect,
      count: answers.filter((answer) => answer.isCorrect === false).length,
      isCorrect: false,
    },
  ];
}

async function getHostPacedSession(code: string) {
  return prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      testVersion: {
        include: {
          test: true,
          questions: {
            orderBy: { sortOrder: "asc" },
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
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          answers: {
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });
}

export async function advanceHostPacedAutoFlow(code: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const session = await getHostPacedSession(code);

    if (!session || session.mode !== "HOST_PACED" || session.status !== "RUNNING") {
      return;
    }

    const settings = parseSessionSettings(session.settingsJson);

    if (!autoFlowIsActive(settings)) {
      return;
    }

    const { questions, index, row } = currentQuestion(session, settings);
    const phase = settings.phase;
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const changedAt = now.toISOString();
    const isLastQuestion = index >= questions.length - 1;
    let nextSettings: SessionSettings | null = null;
    let nextData: { status?: "RUNNING" | "FINISHED"; finishedAt?: Date } = {};

    if (phase === "STARTING") {
      const changedAtMs = parseDateMs(phaseTimestamp(settings));

      if (changedAtMs === null || nowMs < changedAtMs + 3000) {
        return;
      }

      nextSettings = {
        ...settings,
        phase: "QUESTION",
        currentQuestionIndex: index,
        ...questionWindow(settings, row, now),
        phaseChangedAt: changedAt,
        lastPhaseChangedAt: changedAt,
        nextAutoActionAt: null,
        autoAction: null,
      };
    } else if (phase === "QUESTION") {
      const timerEndsAtMs = parseDateMs(settings.questionEndsAt);
      const timerExpired = timerEndsAtMs !== null && nowMs >= timerEndsAtMs;
      const { expectedAnswerCount, answeredCurrentQuestionCount } = activeAnswerStats(
        session,
        row?.question.id ?? null,
      );
      const everyoneAnswered =
        settings.autoLockWhenAllAnswered &&
        expectedAnswerCount > 0 &&
        answeredCurrentQuestionCount >= expectedAnswerCount;

      if (!timerExpired && !everyoneAnswered) {
        return;
      }

      nextSettings = {
        ...settings,
        phase: "QUESTION_LOCKED",
        phaseChangedAt: changedAt,
        lastPhaseChangedAt: changedAt,
        ...autoSchedule(settings, "QUESTION_LOCKED", { nowMs, isLastQuestion }),
      };
    } else if (phase === "QUESTION_LOCKED") {
      if (settings.autoAction !== "REVEAL" || !autoActionIsDue(settings, nowMs)) {
        return;
      }

      nextSettings = {
        ...settings,
        phase: "REVEAL",
        phaseChangedAt: changedAt,
        lastPhaseChangedAt: changedAt,
        ...autoSchedule(settings, "REVEAL", { nowMs, isLastQuestion }),
      };
    } else if (phase === "REVEAL") {
      if (settings.autoAction !== "LEADERBOARD" || !autoActionIsDue(settings, nowMs)) {
        return;
      }

      nextSettings = {
        ...settings,
        phase: "LEADERBOARD",
        phaseChangedAt: changedAt,
        lastPhaseChangedAt: changedAt,
        ...autoSchedule(settings, "LEADERBOARD", { nowMs, isLastQuestion }),
      };
    } else if (phase === "LEADERBOARD") {
      if (
        (settings.autoAction !== "NEXT" && settings.autoAction !== "FINISH") ||
        !autoActionIsDue(settings, nowMs)
      ) {
        return;
      }

      if (isLastQuestion) {
        if (!settings.autoFinishAfterLastQuestion) {
          nextSettings = {
            ...settings,
            nextAutoActionAt: null,
            autoAction: null,
          };
        } else {
          nextSettings = {
            ...settings,
            phase: "FINISHED",
            phaseChangedAt: changedAt,
            lastPhaseChangedAt: changedAt,
            nextAutoActionAt: null,
            autoAction: null,
          };
          nextData = {
            status: "FINISHED",
            finishedAt: session.finishedAt ?? now,
          };
        }
      } else {
        const nextIndex = index + 1;
        const nextRow = questions[nextIndex] ?? null;

        nextSettings = {
          ...settings,
          phase: "QUESTION",
          currentQuestionIndex: nextIndex,
          ...questionWindow(settings, nextRow, now),
          phaseChangedAt: changedAt,
          lastPhaseChangedAt: changedAt,
          nextAutoActionAt: null,
          autoAction: null,
        };
      }
    }

    if (!nextSettings) {
      return;
    }

    const updated = await updateAutoFlowSettings(session, nextSettings, nextData);

    if (!updated) {
      continue;
    }

    if (nextData.status === "FINISHED" && settings.roundId) {
      await prisma.seriesRound.updateMany({
        where: {
          id: settings.roundId,
          sessionId: session.id,
        },
        data: { status: "FINISHED" },
      });
      await recalculateSeriesRound(settings.roundId);
    }
  }
}

export async function getHostPacedHostLiveData(code: string) {
  await advanceHostPacedAutoFlow(code);
  const session = await getHostPacedSession(code);

  if (!session || session.mode !== "HOST_PACED") {
    return null;
  }

  const settings = parseSessionSettings(session.settingsJson);
  const { questions, index, row } = currentQuestion(session, settings);
  const phase = session.status === "FINISHED" ? "FINISHED" : settings.phase;
  const includeCorrect =
    phase === "REVEAL" || phase === "LEADERBOARD" || phase === "FINISHED";
  const answers = currentQuestionAnswers(session, row?.question.id ?? null);
  const leaderboard = leaderboardForParticipants(session.participants);
  const teamLeaderboard = calculateTeamLeaderboard(
    settings,
    teamParticipantsForLeaderboard(session, settings, leaderboard),
  );
  const timer = getTimerState(settings);
  const roster = await getRegisteredRoster(settings);

  return {
    code: session.code,
    mode: session.mode,
    status: session.status,
    phase,
    testVersionId: session.testVersionId,
    testTitle: session.testVersion.test.title,
    versionTitle: session.testVersion.title,
    sessionLabel: settings.label,
    currentQuestionIndex: index,
    questionCount: questions.length,
    currentQuestion: settings.showQuestionOnHost
      ? questionPayload(row, {
          includeCorrect,
          includeExplanation: includeCorrect,
        })
      : null,
    questionStartedAt: timer.questionStartedAt,
    questionEndsAt: timer.questionEndsAt,
    remainingSeconds: timer.remainingSeconds,
    participantCount: session.participants.length,
    registeredStudentCount: roster.registeredStudentCount,
    classTitle: roster.classTitle,
    missingStudents: roster.missingStudents,
    answeredCurrentQuestionCount: answers.length,
    answerDistribution: answerDistribution(row, answers, includeCorrect),
    leaderboardTop: leaderboard.slice(0, 10).map((participant) => ({
      ...participant,
      teamName: teamName(settings, participant.teamId),
    })),
    teamLeaderboardTop: teamLeaderboard.slice(0, 10),
    serverTime: new Date().toISOString(),
    settings,
    participants: session.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      teamId: participant.teamId,
      teamName: teamName(settings, participant.teamId),
      joinedAt: participant.joinedAt.toISOString(),
      answeredCurrentQuestion: answers.some((answer) => answer.participantId === participant.id),
      answerCount: participant.answers.length,
    })),
  };
}

export async function getHostPacedStudentLiveData({
  code,
  participantId,
  participantToken,
}: {
  code: string;
  participantId: string;
  participantToken: string;
}) {
  await advanceHostPacedAutoFlow(code);
  const session = await getHostPacedSession(code);

  if (!session || session.mode !== "HOST_PACED") {
    return {
      ok: false as const,
      error: messages.api.sessionNotFound,
      status: 404,
    };
  }

  const participant = session.participants.find((item) => item.id === participantId);

  if (!participant) {
    return {
      ok: false as const,
      error: messages.api.participantNotFound,
      status: 404,
    };
  }

  const tokenMatches = await verifyPassword(participantToken, participant.tokenHash);

  if (!tokenMatches) {
    return {
      ok: false as const,
      error: messages.api.invalidParticipantToken,
      status: 401,
    };
  }

  const settings = parseSessionSettings(session.settingsJson);
  const { questions, index, row } = currentQuestion(session, settings);
  const phase = session.status === "FINISHED" ? "FINISHED" : settings.phase;
  const timer = getTimerState(settings);
  const currentAnswer = row
    ? participant.answers.find((answer) => answer.questionId === row.question.id) ?? null
    : null;
  const leaderboard = leaderboardForParticipants(session.participants);
  const ownLeaderboardRow = leaderboard.find((item) => item.id === participant.id);
  const teamLeaderboard = calculateTeamLeaderboard(
    settings,
    teamParticipantsForLeaderboard(session, settings, leaderboard),
  );
  const ownTeamRow = participant.teamId
    ? teamLeaderboard.find((team) => team.id === participant.teamId) ?? null
    : null;
  const showCorrectAnswer =
    settings.showCorrectAnswers &&
    (phase === "REVEAL" || phase === "LEADERBOARD" || phase === "FINISHED");
  const canShowQuestion =
    settings.showQuestionOnStudent &&
    (phase === "QUESTION" ||
      phase === "QUESTION_LOCKED" ||
      phase === "REVEAL" ||
      phase === "LEADERBOARD" ||
      phase === "FINISHED");

  return {
    ok: true as const,
    data: {
      code: session.code,
      mode: session.mode,
      status: session.status,
      phase,
      testTitle: session.testVersion.test.title,
      sessionLabel: settings.label,
      participantTeamId: participant.teamId,
      participantTeamName: teamName(settings, participant.teamId),
      currentQuestionIndex: index,
      questionCount: questions.length,
      currentQuestionForStudent: canShowQuestion
        ? questionPayload(row, {
            includeCorrect: showCorrectAnswer,
            includeExplanation: showCorrectAnswer,
          })
        : null,
      hasAnsweredCurrentQuestion: Boolean(currentAnswer),
      remainingSeconds: timer.remainingSeconds,
      myLastAnswerResult: currentAnswer
        ? {
            submitted: true,
            ...(phase === "REVEAL" || phase === "LEADERBOARD" || phase === "FINISHED"
              ? {
                  isCorrect: currentAnswer.isCorrect,
                  points: currentAnswer.points,
                  answer: parseAnswerValue(currentAnswer.answerJson),
                  ...(showCorrectAnswer && row
                    ? {
                        correctAnswer: correctAnswerForQuestion(row.question),
                        explanation: row.question.explanation,
                      }
                    : {}),
                }
              : {}),
          }
        : null,
      leaderboardTopIfAllowed:
        settings.showLeaderboard && (phase === "LEADERBOARD" || phase === "FINISHED")
          ? leaderboard.slice(0, 5).map((item) => ({
              ...item,
              teamName: teamName(settings, item.teamId),
            }))
          : [],
      teamLeaderboardTopIfAllowed:
        settings.teamMode && settings.showLeaderboard && (phase === "LEADERBOARD" || phase === "FINISHED")
          ? teamLeaderboard.slice(0, 5)
          : [],
      myRank: settings.showLeaderboard ? ownLeaderboardRow?.rank ?? null : null,
      myScore: ownLeaderboardRow?.score ?? 0,
      myTeamRank: settings.showLeaderboard ? ownTeamRow?.rank ?? null : null,
      myTeamScore: ownTeamRow?.score ?? null,
      participantCount: session.participants.length,
      serverTime: new Date().toISOString(),
    },
  };
}

async function getActionSession(code: string) {
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      mode: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      settingsJson: true,
      testVersion: {
        select: {
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              sortOrder: true,
              timeLimitSeconds: true,
              questionId: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return {
      ok: false as const,
      error: messages.api.sessionNotFound,
      status: 404,
    };
  }

  if (session.mode !== "HOST_PACED") {
    return {
      ok: false as const,
      error: messages.api.hostPacedRequired,
      status: 409,
    };
  }

  return {
    ok: true as const,
    session,
    settings: parseSessionSettings(session.settingsJson),
  };
}

async function updateSettings(
  code: string,
  settings: SessionSettings,
  data: {
    status?: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
    startedAt?: Date;
    finishedAt?: Date;
  } = {},
) {
  await prisma.gameSession.update({
    where: { code: code.toUpperCase() },
    data: {
      ...data,
      settingsJson: sessionSettingsJson(settings),
    },
  });
}

async function actionLive(code: string): Promise<ActionResult> {
  const data = await getHostPacedHostLiveData(code);

  if (!data) {
    return {
      ok: false,
      error: messages.api.sessionNotFound,
      status: 404,
    };
  }

  return {
    ok: true,
    data,
  };
}

export async function startHostPacedSession(code: string): Promise<ActionResult> {
  const loaded = await getActionSession(code);

  if (!loaded.ok) {
    return loaded;
  }

  const { session, settings } = loaded;

  if (session.status === "FINISHED") {
    return {
      ok: false,
      error: messages.api.sessionAlreadyFinished,
      status: 409,
    };
  }

  if (session.status === "LOBBY") {
    const changedAt = nowIso();
    await updateSettings(
      code,
      {
        ...settings,
        phase: "STARTING",
        currentQuestionIndex: clampIndex(settings.currentQuestionIndex, session.testVersion.questions.length),
        questionStartedAt: null,
        questionEndsAt: null,
        phaseChangedAt: changedAt,
        lastPhaseChangedAt: changedAt,
        nextAutoActionAt: null,
        autoAction: null,
      },
      {
        status: "RUNNING",
        startedAt: session.startedAt ?? new Date(),
      },
    );

    if (settings.roundId) {
      await prisma.seriesRound.updateMany({
        where: { id: settings.roundId, sessionId: session.id },
        data: { status: "RUNNING" },
      });
    }
  }

  return actionLive(code);
}

export async function openHostPacedQuestion(
  code: string,
  requestedIndex?: number,
): Promise<ActionResult> {
  const loaded = await getActionSession(code);

  if (!loaded.ok) {
    return loaded;
  }

  const { session, settings } = loaded;

  if (session.status !== "RUNNING") {
    return {
      ok: false,
      error: messages.api.answerOutsideRunningSession,
      status: 409,
    };
  }

  const index = clampIndex(
    typeof requestedIndex === "number" ? requestedIndex : settings.currentQuestionIndex,
    session.testVersion.questions.length,
  );

  if (settings.phase === "QUESTION" && settings.currentQuestionIndex === index) {
    return actionLive(code);
  }

  const question = session.testVersion.questions[index] ?? null;
  const startedAt = new Date();
  const timeLimitSeconds = question?.timeLimitSeconds ?? settings.questionTimeLimitSeconds;
  const endsAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000);
  const changedAt = startedAt.toISOString();

  await updateSettings(code, {
    ...settings,
    phase: "QUESTION",
    currentQuestionIndex: index,
    questionStartedAt: changedAt,
    questionEndsAt: endsAt.toISOString(),
    phaseChangedAt: changedAt,
    lastPhaseChangedAt: changedAt,
    nextAutoActionAt: null,
    autoAction: null,
  });

  return actionLive(code);
}

export async function setHostPacedPhase(
  code: string,
  phase: Extract<HostPacedPhase, "QUESTION_LOCKED" | "REVEAL" | "LEADERBOARD">,
): Promise<ActionResult> {
  const loaded = await getActionSession(code);

  if (!loaded.ok) {
    return loaded;
  }

  const { session, settings } = loaded;

  if (session.status !== "RUNNING") {
    return {
      ok: false,
      error: messages.api.answerOutsideRunningSession,
      status: 409,
    };
  }

  if (settings.phase === phase) {
    return actionLive(code);
  }

  const nowMs = Date.now();
  const changedAt = new Date(nowMs).toISOString();
  const isLastQuestion =
    settings.currentQuestionIndex >= Math.max(0, session.testVersion.questions.length - 1);

  await updateSettings(code, {
    ...settings,
    phase,
    phaseChangedAt: changedAt,
    lastPhaseChangedAt: changedAt,
    ...autoSchedule(settings, phase, { nowMs, isLastQuestion }),
  });

  return actionLive(code);
}

export async function nextHostPacedQuestion(code: string): Promise<ActionResult> {
  const loaded = await getActionSession(code);

  if (!loaded.ok) {
    return loaded;
  }

  const { session, settings } = loaded;
  const nextIndex = settings.currentQuestionIndex + 1;

  if (nextIndex >= session.testVersion.questions.length) {
    return {
      ok: false,
      error: messages.api.noMoreQuestions,
      status: 409,
    };
  }

  return openHostPacedQuestion(code, nextIndex);
}

export async function finishHostPacedSession(code: string): Promise<ActionResult> {
  const loaded = await getActionSession(code);

  if (!loaded.ok) {
    return loaded;
  }

  const { session, settings } = loaded;

  if (session.status !== "FINISHED") {
    const changedAt = nowIso();
    await updateSettings(
      code,
      {
        ...settings,
        phase: "FINISHED",
        phaseChangedAt: changedAt,
        lastPhaseChangedAt: changedAt,
        nextAutoActionAt: null,
        autoAction: null,
      },
      {
        status: "FINISHED",
        finishedAt: session.finishedAt ?? new Date(),
      },
    );
  }

  if (settings.roundId) {
    await prisma.seriesRound.updateMany({
      where: {
        id: settings.roundId,
        sessionId: session.id,
      },
      data: { status: "FINISHED" },
    });
    await recalculateSeriesRound(settings.roundId);
  }

  return actionLive(code);
}

export async function setHostPacedAutoFlowPaused(
  code: string,
  paused: boolean,
): Promise<ActionResult> {
  const loaded = await getActionSession(code);

  if (!loaded.ok) {
    return loaded;
  }

  const { session, settings } = loaded;

  if (session.status === "FINISHED") {
    return actionLive(code);
  }

  const phase = settings.phase;
  const isLastQuestion =
    settings.currentQuestionIndex >= Math.max(0, session.testVersion.questions.length - 1);
  const nextSettings = {
    ...settings,
    autoFlowPaused: paused,
    ...(paused
      ? {
          nextAutoActionAt: null,
          autoAction: null as HostPacedAutoAction | null,
        }
      : autoSchedule(
          {
            ...settings,
            autoFlowPaused: false,
          },
          phase,
          { isLastQuestion },
        )),
  };

  await updateSettings(code, nextSettings);

  return actionLive(code);
}

export function validateHostPacedAnswerWindow({
  settings,
  questionId,
  expectedQuestionId,
}: {
  settings: SessionSettings;
  questionId: string;
  expectedQuestionId: string | null;
}) {
  const timer = getTimerState(settings);

  if (settings.phase !== "QUESTION") {
    return {
      ok: false as const,
      error: messages.api.answerOutsideRunningSession,
      status: 409,
    };
  }

  if (!expectedQuestionId || questionId !== expectedQuestionId) {
    return {
      ok: false as const,
      error: messages.api.questionNotInSession,
      status: 400,
    };
  }

  if (timer.expiredWithGrace) {
    return {
      ok: false as const,
      error: messages.api.timeIsUp,
      status: 409,
    };
  }

  return {
    ok: true as const,
    timer,
  };
}

export function gradeHostPacedAnswer({
  question,
  basePoints,
  selectedOptionId,
  answer,
  settings,
  timer,
}: {
  question: {
    type: string;
    gradingType: string;
    gradingRulesJson: string | null;
    options: Array<{ id: string; isCorrect: boolean }>;
  };
  basePoints: number;
  selectedOptionId: string | null;
  answer: unknown;
  settings: SessionSettings;
  timer: ReturnType<typeof getTimerState>;
}) {
  const selectedOption =
    selectedOptionId && (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE")
      ? question.options.find((option) => option.id === selectedOptionId)
      : null;
  const graded = selectedOption
    ? { isCorrect: selectedOption.isCorrect }
    : gradeAnswer({
        gradingType: question.gradingType as GradingTypeValue,
        gradingRulesJson: question.gradingRulesJson,
        answer,
      });
  const remainingRatio =
    timer.remainingMs !== null && timer.totalMs
      ? Math.max(0, Math.min(1, timer.remainingMs / timer.totalMs))
      : 0;
  const speedBonusPoints =
    graded.isCorrect === true && settings.speedBonus
      ? Math.round(basePoints * 0.5 * remainingRatio)
      : 0;
  const points = graded.isCorrect === true ? basePoints + speedBonusPoints : 0;
  const responseMs =
    timer.questionStartedAt && Date.parse(timer.questionStartedAt)
      ? Math.max(0, Date.now() - Date.parse(timer.questionStartedAt))
      : undefined;

  return {
    graded,
    points,
    speedBonusPoints,
    responseMs,
    selectedOption,
  };
}
