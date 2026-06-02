import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { seriesRoundUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ roundId: string }>;
};

function parseDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { roundId } = await params;
    const input = seriesRoundUpdateSchema.parse(await request.json());
    const existing = await prisma.seriesRound.findFirst({
      where: {
        id: roundId,
        series: {
          teacherId: teacher.id,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return fail(messages.api.seriesRoundNotFound, 404);
    }

    if (input.testVersionId) {
      const version = await prisma.testVersion.findFirst({
        where: {
          id: input.testVersionId,
          status: "PUBLISHED",
          test: {
            ownerUserId: teacher.id,
            status: { not: "ARCHIVED" },
          },
        },
        select: { id: true },
      });

      if (!version) {
        return fail(messages.api.publishedVersionRequired, 409);
      }
    }

    const round = await prisma.seriesRound.update({
      where: { id: roundId },
      data: {
        ...(input.testVersionId ? { testVersionId: input.testVersionId } : {}),
        ...(input.title ? { title: input.title } : {}),
        ...(input.roundNumber ? { roundNumber: input.roundNumber } : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: parseDate(input.scheduledAt) } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.settingsJson !== undefined ? { settingsJson: input.settingsJson } : {}),
      },
    });

    return ok(round);
  } catch (error) {
    return errorResponse(error);
  }
}
