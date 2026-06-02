import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { questionWriteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
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
        ownerUserId: teacher.id,
        visibility: "PRIVATE",
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
