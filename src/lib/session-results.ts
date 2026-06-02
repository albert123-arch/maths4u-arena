import type { SessionSettings } from "./session-settings";
import { calculateTeamLeaderboard, teamName } from "./team-scoring";

export type SessionResultParticipantInput = {
  id: string;
  displayName: string;
  teamId: string | null;
  answers: Array<{
    points: number;
    isCorrect: boolean | null;
    responseMs: number | null;
    question?: {
      prompt: string;
    } | null;
  }>;
};

export function totalPossibleSessionScore({
  mode,
  settings,
  questions,
}: {
  mode: string;
  settings: SessionSettings;
  questions: Array<{ points: number }>;
}) {
  return questions.reduce(
    (sum, item) =>
      sum + item.points + (mode === "HOST_PACED" && settings.speedBonus ? Math.round(item.points * 0.5) : 0),
    0,
  );
}

export function buildSessionResults({
  mode,
  settings,
  questions,
  participants,
}: {
  mode: string;
  settings: SessionSettings;
  questions: Array<{ points: number }>;
  participants: SessionResultParticipantInput[];
}) {
  const totalPossible = totalPossibleSessionScore({ mode, settings, questions });
  const questionCount = questions.length;
  const rows = participants.map((participant) => {
    const totalScore = participant.answers.reduce((sum, answer) => sum + answer.points, 0);
    const correct = participant.answers.filter((answer) => answer.isCorrect === true).length;
    const answered = participant.answers.length;
    const lastAnswer = participant.answers.at(-1);
    const totalResponseMs = participant.answers.reduce(
      (sum, answer) => sum + (answer.responseMs ?? 0),
      0,
    );

    return {
      id: participant.id,
      displayName: participant.displayName,
      teamId: participant.teamId,
      teamName: teamName(settings, participant.teamId),
      totalScore,
      answered,
      correct,
      correctness: answered === 0 ? 0 : Math.round((correct / answered) * 100),
      percentage: totalPossible === 0 ? 0 : Math.round((totalScore / totalPossible) * 100),
      totalResponseMs,
      status:
        questionCount > 0 && answered >= questionCount
          ? "Submitted"
          : answered > 0
            ? "In progress"
            : "Joined",
      lastAnswerPrompt: lastAnswer?.question?.prompt ?? null,
    };
  });
  const rankedParticipants = [...rows]
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.correct !== left.correct) {
        return right.correct - left.correct;
      }

      if (mode === "HOST_PACED" && left.totalResponseMs !== right.totalResponseMs) {
        return left.totalResponseMs - right.totalResponseMs;
      }

      return left.displayName.localeCompare(right.displayName);
    })
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
  const teamLeaderboard = calculateTeamLeaderboard(settings, rankedParticipants);
  const participantsWithTeamRank = rankedParticipants.map((participant) => {
    const teamRank = participant.teamId
      ? teamLeaderboard.find((team) => team.id === participant.teamId)?.rank ?? null
      : null;

    return {
      ...participant,
      teamRank,
    };
  });
  const submittedCount = participantsWithTeamRank.filter((participant) => participant.status === "Submitted").length;
  const averageScore =
    participantsWithTeamRank.length === 0
      ? 0
      : Math.round(
          (participantsWithTeamRank.reduce((sum, participant) => sum + participant.totalScore, 0) /
            participantsWithTeamRank.length) *
            10,
        ) / 10;

  return {
    totalPossible,
    questionCount,
    participants: participantsWithTeamRank,
    teamLeaderboard,
    submittedCount,
    averageScore,
  };
}
