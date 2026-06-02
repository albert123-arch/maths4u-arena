export const HOST_PACED_PHASES = [
  "LOBBY",
  "STARTING",
  "QUESTION",
  "QUESTION_LOCKED",
  "REVEAL",
  "LEADERBOARD",
  "FINISHED",
] as const;

export type HostPacedPhase = (typeof HOST_PACED_PHASES)[number];
export type TeamAssignMode = "manual" | "auto";
export type TeamScoringMode = "sum" | "average" | "top3";

export type SessionTeam = {
  id: string;
  name: string;
};

export type SessionSettings = {
  label: string;
  allowLateJoin: boolean;
  showStudentResults: boolean;
  showCorrectAnswers: boolean;
  showLeaderboard: boolean;
  autoSubmitOnFinish: boolean;
  registeredOnly: boolean;
  seriesId: string | null;
  roundId: string | null;
  classId: string | null;
  questionTimeLimitSeconds: number;
  speedBonus: boolean;
  showQuestionOnStudent: boolean;
  showQuestionOnHost: boolean;
  autoAdvance: boolean;
  phase: HostPacedPhase;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  lastPhaseChangedAt: string | null;
  teamMode: boolean;
  teamAssignMode: TeamAssignMode;
  teams: SessionTeam[];
  teamScoring: TeamScoringMode;
};

export const DEFAULT_SESSION_TEAMS: SessionTeam[] = [
  { id: "team_red", name: "Red Team" },
  { id: "team_blue", name: "Blue Team" },
];

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  label: "",
  allowLateJoin: true,
  showStudentResults: true,
  showCorrectAnswers: false,
  showLeaderboard: true,
  autoSubmitOnFinish: true,
  registeredOnly: false,
  seriesId: null,
  roundId: null,
  classId: null,
  questionTimeLimitSeconds: 30,
  speedBonus: true,
  showQuestionOnStudent: true,
  showQuestionOnHost: true,
  autoAdvance: false,
  phase: "LOBBY",
  currentQuestionIndex: 0,
  questionStartedAt: null,
  questionEndsAt: null,
  lastPhaseChangedAt: null,
  teamMode: false,
  teamAssignMode: "manual",
  teams: DEFAULT_SESSION_TEAMS,
  teamScoring: "sum",
};

function booleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberSetting(value: unknown, fallback: number, min = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= min
    ? Math.floor(value)
    : fallback;
}

function nullableDateText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function phaseSetting(value: unknown) {
  return typeof value === "string" && HOST_PACED_PHASES.includes(value as HostPacedPhase)
    ? (value as HostPacedPhase)
    : DEFAULT_SESSION_SETTINGS.phase;
}

function textId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function teamAssignModeSetting(value: unknown): TeamAssignMode {
  return value === "auto" || value === "manual"
    ? value
    : DEFAULT_SESSION_SETTINGS.teamAssignMode;
}

function teamScoringSetting(value: unknown): TeamScoringMode {
  return value === "average" || value === "top3" || value === "sum"
    ? value
    : DEFAULT_SESSION_SETTINGS.teamScoring;
}

function teamsSetting(value: unknown): SessionTeam[] {
  if (!Array.isArray(value)) {
    return DEFAULT_SESSION_TEAMS;
  }

  const seen = new Set<string>();
  const teams = value
    .map((item, index) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const raw = item as { id?: unknown; name?: unknown };
      const fallbackId = `team_${index + 1}`;
      const id = textId(typeof raw.id === "string" ? raw.id : fallbackId) || fallbackId;
      const name =
        typeof raw.name === "string" && raw.name.trim()
          ? raw.name.trim().slice(0, 80)
          : `Team ${index + 1}`;

      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      return { id, name };
    })
    .filter((team): team is SessionTeam => Boolean(team));

  return teams.length > 0 ? teams : DEFAULT_SESSION_TEAMS;
}

export function parseSessionSettings(settingsJson?: string | null): SessionSettings {
  if (!settingsJson) {
    return DEFAULT_SESSION_SETTINGS;
  }

  try {
    const parsed = JSON.parse(settingsJson) as Partial<SessionSettings>;

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_SESSION_SETTINGS;
    }

    return {
      label: typeof parsed.label === "string" ? parsed.label : DEFAULT_SESSION_SETTINGS.label,
      allowLateJoin: booleanSetting(parsed.allowLateJoin, DEFAULT_SESSION_SETTINGS.allowLateJoin),
      showStudentResults: booleanSetting(
        parsed.showStudentResults,
        DEFAULT_SESSION_SETTINGS.showStudentResults,
      ),
      showCorrectAnswers: booleanSetting(
        parsed.showCorrectAnswers,
        DEFAULT_SESSION_SETTINGS.showCorrectAnswers,
      ),
      showLeaderboard: booleanSetting(
        parsed.showLeaderboard,
        DEFAULT_SESSION_SETTINGS.showLeaderboard,
      ),
      autoSubmitOnFinish: booleanSetting(
        parsed.autoSubmitOnFinish,
        DEFAULT_SESSION_SETTINGS.autoSubmitOnFinish,
      ),
      registeredOnly: booleanSetting(parsed.registeredOnly, DEFAULT_SESSION_SETTINGS.registeredOnly),
      seriesId: typeof parsed.seriesId === "string" ? parsed.seriesId : DEFAULT_SESSION_SETTINGS.seriesId,
      roundId: typeof parsed.roundId === "string" ? parsed.roundId : DEFAULT_SESSION_SETTINGS.roundId,
      classId: typeof parsed.classId === "string" ? parsed.classId : DEFAULT_SESSION_SETTINGS.classId,
      questionTimeLimitSeconds: numberSetting(
        parsed.questionTimeLimitSeconds,
        DEFAULT_SESSION_SETTINGS.questionTimeLimitSeconds,
        1,
      ),
      speedBonus: booleanSetting(parsed.speedBonus, DEFAULT_SESSION_SETTINGS.speedBonus),
      showQuestionOnStudent: booleanSetting(
        parsed.showQuestionOnStudent,
        DEFAULT_SESSION_SETTINGS.showQuestionOnStudent,
      ),
      showQuestionOnHost: booleanSetting(
        parsed.showQuestionOnHost,
        DEFAULT_SESSION_SETTINGS.showQuestionOnHost,
      ),
      autoAdvance: booleanSetting(parsed.autoAdvance, DEFAULT_SESSION_SETTINGS.autoAdvance),
      phase: phaseSetting(parsed.phase),
      currentQuestionIndex: numberSetting(
        parsed.currentQuestionIndex,
        DEFAULT_SESSION_SETTINGS.currentQuestionIndex,
        0,
      ),
      questionStartedAt: nullableDateText(parsed.questionStartedAt),
      questionEndsAt: nullableDateText(parsed.questionEndsAt),
      lastPhaseChangedAt: nullableDateText(parsed.lastPhaseChangedAt),
      teamMode: booleanSetting(parsed.teamMode, DEFAULT_SESSION_SETTINGS.teamMode),
      teamAssignMode: teamAssignModeSetting(parsed.teamAssignMode),
      teams: teamsSetting(parsed.teams),
      teamScoring: teamScoringSetting(parsed.teamScoring),
    };
  } catch {
    return DEFAULT_SESSION_SETTINGS;
  }
}

export function sessionSettingsJson(settings?: Partial<SessionSettings> | null) {
  return JSON.stringify({
    ...DEFAULT_SESSION_SETTINGS,
    ...(settings ?? {}),
  });
}
