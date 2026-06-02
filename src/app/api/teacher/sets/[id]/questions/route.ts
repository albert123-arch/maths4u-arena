import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { ensureDraftVersion, questionCreateData, requireTeacherSet } from "@/lib/quiz-sets";
import { quizSetImportSchema, quizSetQuestionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const test = await requireTeacherSet(id, teacher.id);
    const isImport = Array.isArray((body as { questions?: unknown }).questions);
    const inputs = isImport
      ? quizSetImportSchema.parse(body).questions
      : [quizSetQuestionSchema.parse(body)];

    const created = await prisma.$transaction(async (tx) => {
      const draft = await ensureDraftVersion(id, teacher.id, tx);
      const currentMax = await tx.testVersionQuestion.aggregate({
        where: { testVersionId: draft.id },
        _max: { sortOrder: true },
      });
      const rows = [];

      for (const [index, input] of inputs.entries()) {
        const question = await tx.question.create({
          data: questionCreateData(input, test.subject, teacher.id),
        });
        const link = await tx.testVersionQuestion.create({
          data: {
            testVersionId: draft.id,
            questionId: question.id,
            sortOrder: (currentMax._max.sortOrder ?? 0) + index + 1,
            points: input.points,
            timeLimitSeconds: input.timeLimitSeconds,
          },
        });

        rows.push({ question, link });
      }

      return rows;
    });

    return ok(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
