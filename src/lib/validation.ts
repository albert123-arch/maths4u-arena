import { z } from "zod";

import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_TYPES,
  GAME_MODES,
  GRADING_TYPES,
  QUESTION_TYPES,
  CONTENT_VISIBILITIES,
  SERIES_ROUND_STATUSES,
  SERIES_STATUSES,
  STUDENT_STATUSES,
  TEST_STATUSES,
} from "./constants";
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

function optionalNullableInt(min = 0) {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null) {
        return null;
      }

      return value;
    },
    z.coerce.number().int().min(min).nullable().optional(),
  );
}

function optionalNullableText(max = 191) {
  return z
    .preprocess((value) => (value === null ? undefined : value), z.string().trim().max(max).optional())
    .transform((value) => (value ? value : null));
}

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const unifiedLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(191),
  password: z.string().min(1),
  next: z.string().trim().max(500).optional(),
});

export const registerSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, messages.validation.passwordTooShort),
  name: z
    .string()
    .trim()
    .max(191)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const teacherWriteSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  name: z
    .string()
    .trim()
    .max(191)
    .optional()
    .transform((value) => (value ? value : null)),
  password: z.string().min(8, messages.validation.passwordTooShort),
});

export const teacherPasswordResetSchema = z.object({
  password: z.string().min(8, messages.validation.passwordTooShort),
});

export const studentLoginSchema = z.object({
  username: z.string().trim().min(1).max(191).transform((value) => value.toLowerCase()),
  password: z.string().min(1),
  next: z.string().trim().max(500).optional(),
});

export const studentWriteSchema = z.object({
  username: z.string().trim().min(2).max(191).transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(191),
  groupName: z
    .string()
    .trim()
    .max(191)
    .optional()
    .transform((value) => (value ? value : null)),
  password: z.string().min(4, messages.validation.pinTooShort).optional(),
  status: z.enum(STUDENT_STATUSES).default("ACTIVE"),
});

export const studentUpdateSchema = studentWriteSchema.partial();

export const studentSelfRegisterSchema = z
  .object({
    username: z.string().trim().min(2).max(191).transform((value) => value.toLowerCase()),
    displayName: z.string().trim().min(2).max(191),
    password: z.string().min(4, messages.validation.pinTooShort),
    confirmPassword: z.string().min(4, messages.validation.pinTooShort),
    next: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmPassword"],
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

export const testVersionUpdateSchema = z.object({
  title: z.string().trim().min(2).max(191).optional(),
  instructions: nullableText(),
  settingsJson: nullableJsonText(),
});

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

export const seriesWriteSchema = z.object({
  title: z.string().trim().min(2).max(191),
  description: nullableText(),
  status: z.enum(SERIES_STATUSES).default("DRAFT"),
  startsAt: nullableText(),
  endsAt: nullableText(),
  settingsJson: nullableJsonText(),
});

export const seriesUpdateSchema = seriesWriteSchema.partial();

export const seriesRegistrationWriteSchema = z.object({
  studentId: z.string().min(1),
});

export const seriesRoundWriteSchema = z.object({
  testVersionId: z.string().min(1),
  title: z.string().trim().min(2).max(191),
  roundNumber: z.coerce.number().int().min(1).max(1000),
  scheduledAt: nullableText(),
  status: z.enum(SERIES_ROUND_STATUSES).default("DRAFT"),
  settingsJson: nullableJsonText(),
});

export const seriesRoundUpdateSchema = seriesRoundWriteSchema.partial();

export const classroomWriteSchema = z.object({
  title: z.string().trim().min(2).max(191),
  description: nullableText(),
});

export const classroomUpdateSchema = classroomWriteSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const contentVisibilityUpdateSchema = z.object({
  visibility: z.enum(CONTENT_VISIBILITIES),
});

export const teacherSessionCreateSchema = sessionCreateSchema.extend({
  classId: z
    .string()
    .trim()
    .max(191)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const sessionStatusUpdateSchema = z.object({
  action: z.enum(["START", "FINISH"]),
});

export const participantJoinSchema = z.object({
  code: z.string().trim().min(4).max(16).transform((value) => value.toUpperCase()),
  displayName: optionalNullableText(),
  teamId: optionalNullableText(),
});

export const testVersionQuestionAddSchema = z.object({
  questionId: z.string().min(1),
});

export const testVersionQuestionUpdateSchema = z.object({
  points: z.coerce.number().int().min(0).max(1000).optional(),
  timeLimitSeconds: optionalNullableInt(1),
});

export const testVersionQuestionReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const answerSubmitSchema = z.object({
  sessionId: z.string().optional(),
  code: z.string().trim().max(16).optional(),
  participantId: z.string().min(1),
  participantToken: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.unknown(),
  responseMs: z.coerce.number().int().min(0).optional(),
  source: z.enum(["MANUAL", "AUTO_FINISH"]).default("MANUAL"),
});

export const assignmentWriteSchema = z.object({
  title: z.string().trim().min(2).max(191),
  description: nullableText(),
  classId: z.string().min(1),
  testVersionId: z.string().min(1),
  type: z.enum(ASSIGNMENT_TYPES).default("HOMEWORK"),
  openAt: nullableText(),
  dueAt: nullableText(),
  timeLimitMinutes: optionalNullableInt(1),
  attemptsAllowed: z.coerce.number().int().min(1).max(20).default(1),
  showResultsToStudents: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(false),
  allowLateSubmission: z.boolean().default(false),
  allowPhotoSolutions: z.boolean().default(false),
  settingsJson: nullableJsonText(),
});

export const assignmentUpdateSchema = assignmentWriteSchema.partial().extend({
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
});

export const assignmentSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.unknown(),
      }),
    )
    .default([]),
});

export const assignmentReviewSchema = z.object({
  teacherFeedback: nullableText(),
  status: z.enum(["GRADED", "RETURNED"]).default("GRADED"),
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        points: z.coerce.number().int().min(0).max(1000),
        feedback: nullableText(),
      }),
    )
    .default([]),
});

export const quizSetWriteSchema = z.object({
  title: z.string().trim().min(2).max(191),
  description: nullableText(),
  subject: z.string().trim().min(2).max(191),
  gradeLevel: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => (value ? value : null)),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
});

export const quizSetUpdateSchema = quizSetWriteSchema.partial();

export const quizSetQuestionSchema = z.object({
  prompt: z.string().trim().min(2),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_TEXT", "NUMERIC"]),
  explanation: nullableText(),
  points: z.coerce.number().int().min(0).max(1000).default(1),
  timeLimitSeconds: optionalNullableInt(1),
  options: z.array(z.string().trim()).default([]),
  correctOptionIndex: z.coerce.number().int().min(0).max(20).default(0),
  correctBoolean: z.boolean().default(true),
  acceptedAnswers: z.array(z.string().trim()).default([]),
  caseSensitive: z.boolean().default(false),
  correctNumber: z.coerce.number().optional(),
  tolerance: z.coerce.number().min(0).default(0),
});

export const quizSetQuestionUpdateSchema = quizSetQuestionSchema.partial().extend({
  action: z.enum(["UPDATE", "DUPLICATE", "DELETE", "MOVE_UP", "MOVE_DOWN"]).default("UPDATE"),
});

export const quizSetImportSchema = z.object({
  questions: z.array(quizSetQuestionSchema).min(1),
});

export const quizSetAssignmentCreateSchema = z.object({
  testVersionId: z.string().min(1),
  classId: z.string().min(1),
  title: z.string().trim().min(2).max(191),
  dueAt: nullableText(),
  type: z.enum(ASSIGNMENT_TYPES).default("HOMEWORK"),
  showResultsToStudents: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(false),
  allowLateSubmission: z.boolean().default(false),
  allowPhotoSolutions: z.boolean().default(false),
});
