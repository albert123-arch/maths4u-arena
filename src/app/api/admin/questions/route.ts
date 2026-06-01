import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { questionWriteSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const questions = await prisma.question.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return ok(questions);
}

export async function POST(request: Request) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = questionWriteSchema.parse(await request.json());
    const question = await prisma.question.create({
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

    return ok(question, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
