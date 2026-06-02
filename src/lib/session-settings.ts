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
};

function booleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
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
