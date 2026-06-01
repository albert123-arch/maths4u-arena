import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { testVersionUpdateSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ versionId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { versionId } = await params;
    const input = testVersionUpdateSchema.parse(await request.json());
    const version = await prisma.testVersion.findUnique({
      where: { id: versionId },
      select: { id: true, status: true },
    });

    if (!version) {
      return fail(messages.api.versionNotFound, 404);
    }

    if (version.status !== "DRAFT") {
      return fail(messages.api.publishedVersionLocked, 409);
    }

    const updated = await prisma.testVersion.update({
      where: { id: versionId },
      data: {
        title: input.title,
        instructions: input.instructions,
        settingsJson: input.settingsJson,
      },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
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
        },
      },
    });

    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
