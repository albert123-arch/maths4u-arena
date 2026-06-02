import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
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
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { roundId } = await params;
    const input = seriesRoundUpdateSchema.parse(await request.json());
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
