import type { SessionSettings, SessionTeam } from "./session-settings";

export type TeamScoringParticipant = {
  id: string;
  displayName: string;
  teamId: string | null;
  totalScore: number;
  correct: number;
  answered: number;
  percentage: number;
  totalResponseMs?: number;
};

export type TeamLeaderboardRow = {
  id: string;
  rank: number;
  name: string;
  score: number;
  memberCount: number;
  correctCount: number;
  answeredCount: number;
  averagePercentage: number;
};

export function teamForId(settings: SessionSettings, teamId: string | null | undefined) {
  if (!teamId) {
    return null;
  }

  return settings.teams.find((team) => team.id === teamId) ?? null;
}

export function teamName(settings: SessionSettings, teamId: string | null | undefined) {
  return teamForId(settings, teamId)?.name ?? "";
}

export function validateTeamId(settings: SessionSettings, teamId: string | null | undefined) {
  if (!settings.teamMode) {
    return null;
  }

  if (!teamId) {
    return null;
  }

  return teamForId(settings, teamId)?.id ?? null;
}

export function smallestTeamId(
  settings: SessionSettings,
  participants: Array<{ teamId: string | null }>,
) {
  if (!settings.teamMode || settings.teams.length === 0) {
    return null;
  }

  const counts = new Map(settings.teams.map((team) => [team.id, 0]));

  for (const participant of participants) {
    if (participant.teamId && counts.has(participant.teamId)) {
      counts.set(participant.teamId, (counts.get(participant.teamId) ?? 0) + 1);
    }
  }

  return [...settings.teams].sort((left, right) => {
    const byCount = (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0);

    return byCount !== 0 ? byCount : left.name.localeCompare(right.name);
  })[0]?.id ?? null;
}

function scoreForTeam(members: TeamScoringParticipant[], scoring: SessionSettings["teamScoring"]) {
  if (members.length === 0) {
    return 0;
  }

  if (scoring === "average") {
    return Math.round((members.reduce((sum, member) => sum + member.totalScore, 0) / members.length) * 10) / 10;
  }

  if (scoring === "top3") {
    return [...members]
      .sort((left, right) => right.totalScore - left.totalScore)
      .slice(0, 3)
      .reduce((sum, member) => sum + member.totalScore, 0);
  }

  return members.reduce((sum, member) => sum + member.totalScore, 0);
}

function teamRow(
  team: SessionTeam,
  members: TeamScoringParticipant[],
  scoring: SessionSettings["teamScoring"],
) {
  const correctCount = members.reduce((sum, member) => sum + member.correct, 0);
  const answeredCount = members.reduce((sum, member) => sum + member.answered, 0);
  const averagePercentage =
    members.length === 0
      ? 0
      : Math.round((members.reduce((sum, member) => sum + member.percentage, 0) / members.length) * 10) / 10;

  return {
    id: team.id,
    rank: 0,
    name: team.name,
    score: scoreForTeam(members, scoring),
    memberCount: members.length,
    correctCount,
    answeredCount,
    averagePercentage,
  };
}

export function calculateTeamLeaderboard(
  settings: SessionSettings,
  participants: TeamScoringParticipant[],
) {
  if (!settings.teamMode) {
    return [];
  }

  return settings.teams
    .map((team) =>
      teamRow(
        team,
        participants.filter((participant) => participant.teamId === team.id),
        settings.teamScoring,
      ),
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.correctCount !== left.correctCount) {
        return right.correctCount - left.correctCount;
      }

      if (right.averagePercentage !== left.averagePercentage) {
        return right.averagePercentage - left.averagePercentage;
      }

      return left.name.localeCompare(right.name);
    })
    .map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
}
