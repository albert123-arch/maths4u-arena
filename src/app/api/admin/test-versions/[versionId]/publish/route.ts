import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ versionId: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { versionId } = await params;
    const draft = await prisma.testVersion.findUnique({
      where: { id: versionId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!draft) {
      return fail(messages.api.versionNotFound, 404);
    }

    if (draft.status !== "DRAFT") {
      return fail(messages.api.publishedVersionLocked, 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      const maxVersion = await tx.testVersion.aggregate({
        where: { testId: draft.testId },
        _max: { versionNumber: true },
      });

      const publishedVersion = await tx.testVersion.update({
        where: { id: draft.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await tx.test.update({
        where: { id: draft.testId },
        data: { status: "PUBLISHED" },
      });

      const nextDraft = await tx.testVersion.create({
        data: {
          testId: draft.testId,
          versionNumber: (maxVersion._max.versionNumber ?? draft.versionNumber) + 1,
          title: draft.title,
          instructions: draft.instructions,
          settingsJson: draft.settingsJson,
          status: "DRAFT",
          questions: {
            create: draft.questions.map((item) => ({
              questionId: item.questionId,
              sortOrder: item.sortOrder,
              points: item.points,
              timeLimitSeconds: item.timeLimitSeconds,
              settingsJson: item.settingsJson,
            })),
          },
        },
      });

      return {
        publishedVersion,
        nextDraft,
      };
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
