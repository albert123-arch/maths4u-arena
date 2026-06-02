import type { PrismaClient } from "@/generated/prisma/client";

import { messages } from "./messages";
import { prisma } from "./prisma";

type QuizSetQuestionInput = {
  prompt: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_TEXT" | "NUMERIC";
  explanation?: string | null;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  correctNumber?: number;
  tolerance?: number;
};

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function requireTeacherSet(testId: string, teacherId: string) {
  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      ownerUserId: teacherId,
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      title: true,
      subject: true,
      description: true,
      locale: true,
      visibility: true,
      status: true,
    },
  });

  if (!test) {
    throw new Error(messages.api.contentNotEditable);
  }

  return test;
}

export async function ensureDraftVersion(testId: string, teacherId: string, tx: Tx = prisma) {
  await requireTeacherSet(testId, teacherId);

  const draft = await tx.testVersion.findFirst({
    where: {
      testId,
      status: "DRAFT",
      test: { ownerUserId: teacherId },
    },
    orderBy: { versionNumber: "desc" },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (draft) {
    return draft;
  }

  const latest = await tx.testVersion.findFirst({
    where: {
      testId,
      test: { ownerUserId: teacherId },
    },
    orderBy: { versionNumber: "desc" },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  const test = await tx.test.findUnique({
    where: { id: testId },
    select: { title: true },
  });

  return tx.testVersion.create({
    data: {
      testId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      title: latest?.title ?? test?.title ?? "Quiz Set",
      instructions: latest?.instructions ?? null,
      settingsJson: latest?.settingsJson ?? null,
      status: "DRAFT",
      questions: latest
        ? {
            create: latest.questions.map((item) => ({
              questionId: item.questionId,
              sortOrder: item.sortOrder,
              points: item.points,
              timeLimitSeconds: item.timeLimitSeconds,
              settingsJson: item.settingsJson,
            })),
          }
        : undefined,
    },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function questionCreateData(input: QuizSetQuestionInput, subject: string, teacherId: string) {
  if (input.type === "MULTIPLE_CHOICE") {
    const optionTexts = (input.options ?? []).filter((option) => option.trim()).slice(0, 12);
    const fallbackOptions = optionTexts.length > 0 ? optionTexts : ["Option A", "Option B"];
    const correctIndex = Math.min(
      Math.max(input.correctOptionIndex ?? 0, 0),
      Math.max(fallbackOptions.length - 1, 0),
    );

    return {
      subject,
      type: "MULTIPLE_CHOICE" as const,
      prompt: input.prompt,
      explanation: input.explanation ?? null,
      difficulty: 1,
      gradingType: "EXACT" as const,
      gradingRulesJson: JSON.stringify({ option: "selected" }),
      ownerUserId: teacherId,
      visibility: "PRIVATE" as const,
      options: {
        create: fallbackOptions.map((optionText, index) => ({
          optionText,
          isCorrect: index === correctIndex,
          sortOrder: index,
        })),
      },
    };
  }

  if (input.type === "TRUE_FALSE") {
    return {
      subject,
      type: "TRUE_FALSE" as const,
      prompt: input.prompt,
      explanation: input.explanation ?? null,
      difficulty: 1,
      gradingType: "EXACT" as const,
      gradingRulesJson: JSON.stringify({ answer: input.correctBoolean === false ? "False" : "True" }),
      ownerUserId: teacherId,
      visibility: "PRIVATE" as const,
      options: {
        create: [
          { optionText: "True", isCorrect: input.correctBoolean !== false, sortOrder: 0 },
          { optionText: "False", isCorrect: input.correctBoolean === false, sortOrder: 1 },
        ],
      },
    };
  }

  if (input.type === "NUMERIC") {
    return {
      subject,
      type: "NUMERIC" as const,
      prompt: input.prompt,
      explanation: input.explanation ?? null,
      difficulty: 1,
      gradingType: "NUMERIC_TOLERANCE" as const,
      gradingRulesJson: JSON.stringify({
        answer: input.correctNumber ?? 0,
        tolerance: input.tolerance ?? 0,
      }),
      ownerUserId: teacherId,
      visibility: "PRIVATE" as const,
    };
  }

  const answers = (input.acceptedAnswers ?? []).filter((answer) => answer.trim());

  return {
    subject,
    type: "SHORT_TEXT" as const,
    prompt: input.prompt,
    explanation: input.explanation ?? null,
    difficulty: 1,
    gradingType: "ACCEPTED_ANSWERS" as const,
    gradingRulesJson: JSON.stringify({
      answers: answers.length > 0 ? answers : [""],
      caseSensitive: input.caseSensitive === true,
    }),
    ownerUserId: teacherId,
    visibility: "PRIVATE" as const,
  };
}
