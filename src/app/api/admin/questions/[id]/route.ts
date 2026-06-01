import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { questionWriteSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!question) {
    return fail(messages.api.questionNotFound, 404);
  }

  return ok(question);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = questionWriteSchema.parse(await request.json());

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
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const question = await prisma.question.delete({
      where: { id },
    });

    return ok(question);
  } catch (error) {
    return errorResponse(error, messages.api.questionDeleteFailed);
  }
}
