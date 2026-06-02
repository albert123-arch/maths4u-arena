import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { questionCreateData, requireTeacherSet } from "@/lib/quiz-sets";
import { quizSetQuestionUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; linkId: string }>;
};

async function getTeacherDraftLink(id: string, linkId: string, teacherId: string) {
  const link = await prisma.testVersionQuestion.findFirst({
    where: {
      id: linkId,
      testVersion: {
        testId: id,
        status: "DRAFT",
        test: { ownerUserId: teacherId },
      },
    },
    include: {
      question: { include: { options: true } },
      testVersion: { select: { id: true } },
    },
  });

  if (!link) {
    throw new Error(messages.api.contentNotEditable);
  }

  return link;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id, linkId } = await params;
    const input = quizSetQuestionUpdateSchema.parse(await request.json());
    const test = await requireTeacherSet(id, teacher.id);
    const link = await getTeacherDraftLink(id, linkId, teacher.id);

    if (input.action === "DELETE") {
      await prisma.testVersionQuestion.delete({ where: { id: link.id } });
      return ok({ deleted: true });
    }

    if (input.action === "DUPLICATE") {
      const duplicate = await prisma.$transaction(async (tx) => {
        const max = await tx.testVersionQuestion.aggregate({
          where: { testVersionId: link.testVersionId },
          _max: { sortOrder: true },
        });
        const question = await tx.question.create({
          data: {
            subject: link.question.subject,
            type: link.question.type,
            prompt: `${link.question.prompt} Copy`,
            explanation: link.question.explanation,
            difficulty: link.question.difficulty,
            gradingType: link.question.gradingType,
            gradingRulesJson: link.question.gradingRulesJson,
            ownerUserId: teacher.id,
            visibility: "PRIVATE",
            copiedFromId: link.questionId,
            options: {
              create: link.question.options.map((option) => ({
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                sortOrder: option.sortOrder,
              })),
            },
          },
        });

        return tx.testVersionQuestion.create({
          data: {
            testVersionId: link.testVersionId,
            questionId: question.id,
            sortOrder: (max._max.sortOrder ?? 0) + 1,
            points: link.points,
            timeLimitSeconds: link.timeLimitSeconds,
          },
        });
      });

      return ok(duplicate, 201);
    }

    if (input.action === "MOVE_UP" || input.action === "MOVE_DOWN") {
      const items = await prisma.testVersionQuestion.findMany({
        where: { testVersionId: link.testVersionId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      });
      const index = items.findIndex((item) => item.id === link.id);
      const targetIndex = input.action === "MOVE_UP" ? index - 1 : index + 1;
      const target = items[targetIndex];

      if (index >= 0 && target) {
        await prisma.$transaction([
          prisma.testVersionQuestion.update({
            where: { id: link.id },
            data: { sortOrder: target.sortOrder },
          }),
          prisma.testVersionQuestion.update({
            where: { id: target.id },
            data: { sortOrder: link.sortOrder },
          }),
        ]);
      }

      return ok({ moved: true });
    }

    const prompt = input.prompt;
    const type = input.type;

    if (!prompt || !type) {
      return fail("Question text and type are required.", 422);
    }

    await prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({ where: { questionId: link.questionId } });
      const data = questionCreateData(
        {
          prompt,
          type,
          explanation: input.explanation,
          options: input.options,
          correctOptionIndex: input.correctOptionIndex,
          correctBoolean: input.correctBoolean,
          acceptedAnswers: input.acceptedAnswers,
          caseSensitive: input.caseSensitive,
          correctNumber: input.correctNumber,
          tolerance: input.tolerance,
        },
        test.subject,
        teacher.id,
      );
      const options = "options" in data ? data.options : undefined;

      await tx.question.update({
        where: { id: link.questionId },
        data: {
          subject: data.subject,
          type: data.type,
          prompt: data.prompt,
          explanation: data.explanation,
          difficulty: data.difficulty,
          gradingType: data.gradingType,
          gradingRulesJson: data.gradingRulesJson,
          ...(options ? { options } : {}),
        },
      });
      await tx.testVersionQuestion.update({
        where: { id: link.id },
        data: {
          points: input.points,
          timeLimitSeconds: input.timeLimitSeconds,
        },
      });
    });

    return ok({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
