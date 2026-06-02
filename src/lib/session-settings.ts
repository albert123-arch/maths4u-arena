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
};

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
