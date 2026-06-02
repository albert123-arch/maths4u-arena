import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { questionWriteSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = questionWriteSchema.parse(await request.json());
    const existing = await prisma.question.findFirst({
      where: { id, ownerUserId: teacher.id },
      select: { id: true },
    });

    if (!existing) {
      return fail(messages.api.contentNotEditable, 403);
    }

    const question = await prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({
        where: { questionId: id },
      });

      return tx.question.update({
        where: { id },
        data: {
          subject: input.subject,
          type: input.type,
          prompt: input.prompt,
          explanation: input.explanation,
          difficulty: input.difficulty,
          gradingType: input.gradingType,
          gradingRulesJson: input.gradingRulesJson,
          options: {
            create: input.options.map((option, index) => ({
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              sortOrder: option.sortOrder || index,
            })),
          },
        },
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    return ok(question);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const question = await prisma.question.updateMany({
    where: { id, ownerUserId: teacher.id },
    data: { visibility: "ARCHIVED" },
  });

  if (question.count === 0) {
    return fail(messages.api.contentNotEditable, 403);
  }

  return ok({ id });
}
