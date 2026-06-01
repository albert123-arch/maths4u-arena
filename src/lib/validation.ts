import { z } from "zod";

import { GAME_MODES, GRADING_TYPES, QUESTION_TYPES, TEST_STATUSES } from "./constants";
import { messages } from "./messages";

function nullableText() {
  return z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().nullable().optional(),
    )
    .transform((value) => value ?? null);
}

function nullableJsonText() {
  return nullableText().superRefine((value, context) => {
    if (!value) {
      return;
    }

    try {
      JSON.parse(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: messages.validation.jsonFieldInvalid,
      });
    }
  });
}

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const testWriteSchema = z.object({
  title: z.string().trim().min(2).max(191),
  slug: z.string().trim().max(191).optional().default(""),
  subject: z.string().trim().min(2).max(191),
  description: nullableText(),
  locale: z.string().trim().min(2).max(16).default("ru"),
  status: z.enum(TEST_STATUSES).default("DRAFT"),
});

export const testUpdateSchema = testWriteSchema.partial();

export const questionOptionWriteSchema = z.object({
  id: z.string().optional(),
  optionText: z.string().trim().min(1),
  isCorrect: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const questionWriteSchema = z
  .object({
    subject: z.string().trim().min(2).max(191),
    type: z.enum(QUESTION_TYPES).default("MULTIPLE_CHOICE"),
    prompt: z.string().trim().min(2),
    explanation: nullableText(),
    difficulty: z.coerce.number().int().min(1).max(10).default(1),
    gradingType: z.enum(GRADING_TYPES).default("EXACT"),
    gradingRulesJson: nullableJsonText(),
    options: z.array(questionOptionWriteSchema).default([]),
  })
  .superRefine((value, context) => {
    if (
      (value.type === "MULTIPLE_CHOICE" || value.type === "TRUE_FALSE") &&
      value.options.length > 0 &&
      !value.options.some((option) => option.isCorrect)
    ) {
      context.addIssue({
        code: "custom",
        message: messages.validation.correctOptionRequired,
      });
    }
  });

export const sessionCreateSchema = z.object({
  testVersionId: z.string().min(1),
  mode: z.enum(GAME_MODES).default("CLASSIC"),
  settingsJson: nullableJsonText(),
  showResults: z.boolean().default(true),
});

export const participantJoinSchema = z.object({
  code: z.string().trim().min(4).max(16).transform((value) => value.toUpperCase()),
  displayName: z.string().trim().min(2).max(191),
});

export const answerSubmitSchema = z.object({
  sessionId: z.string().optional(),
  code: z.string().trim().max(16).optional(),
  participantId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.unknown(),
  responseMs: z.coerce.number().int().min(0).optional(),
});
