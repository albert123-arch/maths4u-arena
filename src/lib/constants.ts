export const TEST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTI_SELECT",
  "SHORT_TEXT",
  "NUMERIC",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING",
  "ORDERING",
  "MANUAL_REVIEW",
] as const;

export const GRADING_TYPES = [
  "EXACT",
  "ACCEPTED_ANSWERS",
  "KEYWORDS",
  "REGEX",
  "NUMERIC_TOLERANCE",
  "MANUAL",
  "FORMULA",
] as const;

export const GAME_MODES = [
  "CLASSIC",
  "ACCURACY",
  "HOST_PACED",
  "TEAM",
  "PRACTICE",
  "CAROUSEL",
] as const;

export type TestStatusValue = (typeof TEST_STATUSES)[number];
export type QuestionTypeValue = (typeof QUESTION_TYPES)[number];
export type GradingTypeValue = (typeof GRADING_TYPES)[number];
export type GameModeValue = (typeof GAME_MODES)[number];
