import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { testVersionQuestionAddSchema, testVersionQuestionReorderSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ versionId: string }>;
};

async function requireDraftVersion(versionId: string) {
  const version = await prisma.testVersion.findUnique({
    where: { id: versionId },
    select: { id: true, status: true },
  });

  if (!version) {
    return { error: fail(messages.api.versionNotFound, 404) };
  }

  if (version.status !== "DRAFT") {
    return { error: fail(messages.api.publishedVersionLocked, 409) };
  }

  return { version };
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { versionId } = await params;
    const draft = await requireDraftVersion(versionId);

    if (draft.error) {
      return draft.error;
    }

    const input = testVersionQuestionAddSchema.parse(await request.json());
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      select: { id: true },
    });

    if (!question) {
      return fail(messages.api.questionNotFound, 404);
    }

    const currentMax = await prisma.testVersionQuestion.aggregate({
      where: { testVersionId: versionId },
      _max: { sortOrder: true },
    });

    const item = await prisma.testVersionQuestion.create({
      data: {
        testVersionId: versionId,
        questionId: input.questionId,
        sortOrder: (currentMax._max.sortOrder ?? 0) + 1,
        points: 1,
      },
      include: {
        question: {
          select: {
            id: true,
            prompt: true,
            type: true,
            subject: true,
            difficulty: true,
          },
        },
      },
    });

    return ok(item, 201);
  } catch (error) {
    return errorResponse(error, messages.api.questionAttachFailed);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { versionId } = await params;
    const draft = await requireDraftVersion(versionId);

    if (draft.error) {
      return draft.error;
    }

    const input = testVersionQuestionReorderSchema.parse(await request.json());
    const existing = await prisma.testVersionQuestion.findMany({
      where: { testVersionId: versionId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));

    if (
      existingIds.size !== input.orderedIds.length ||
      input.orderedIds.some((id) => !existingIds.has(id))
    ) {
      return fail(messages.api.questionReorderMismatch, 400);
    }

    await prisma.$transaction(
      input.orderedIds.map((id, index) =>
        prisma.testVersionQuestion.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return ok({ orderedIds: input.orderedIds });
  } catch (error) {
    return errorResponse(error);
  }
}
