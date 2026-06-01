import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const test = await prisma.test.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!test) {
      return fail(messages.api.testNotFound, 404);
    }

    const existingDraft = await prisma.testVersion.findFirst({
      where: { testId: id, status: "DRAFT" },
      orderBy: { versionNumber: "desc" },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (existingDraft) {
      return ok(existingDraft);
    }

    const sourceVersion = await prisma.testVersion.findFirst({
      where: { testId: id },
      orderBy: { versionNumber: "desc" },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const draft = await prisma.testVersion.create({
      data: {
        testId: id,
        versionNumber: (sourceVersion?.versionNumber ?? 0) + 1,
        title: sourceVersion?.title ?? test.title,
        instructions: sourceVersion?.instructions ?? null,
        settingsJson: sourceVersion?.settingsJson ?? null,
        status: "DRAFT",
        questions: sourceVersion
          ? {
              create: sourceVersion.questions.map((item) => ({
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

    return ok(draft, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
