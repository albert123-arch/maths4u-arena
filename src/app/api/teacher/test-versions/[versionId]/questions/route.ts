import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { testVersionQuestionAddSchema, testVersionQuestionReorderSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ versionId: string }>;
};

async function requireTeacherDraftVersion(versionId: string, teacherId: string) {
  const version = await prisma.testVersion.findFirst({
    where: {
      id: versionId,
      test: { ownerUserId: teacherId },
    },
    select: { id: true, status: true },
  });

  if (!version) {
    return { error: fail(messages.api.contentNotEditable, 403) };
  }

  if (version.status !== "DRAFT") {
    return { error: fail(messages.api.publishedVersionLocked, 409) };
  }

  return { version };
}

export async function POST(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { versionId } = await params;
    const draft = await requireTeacherDraftVersion(versionId, teacher.id);

    if (draft.error) {
      return draft.error;
    }

    const input = testVersionQuestionAddSchema.parse(await request.json());
    const question = await prisma.question.findFirst({
      where: {
        id: input.questionId,
        OR: [
          { ownerUserId: teacher.id },
          { visibility: { in: ["PUBLIC", "CURATED"] } },
        ],
      },
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
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { versionId } = await params;
    const draft = await requireTeacherDraftVersion(versionId, teacher.id);

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
