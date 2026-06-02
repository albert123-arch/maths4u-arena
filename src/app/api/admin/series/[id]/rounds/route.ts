import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { seriesRoundWriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = seriesRoundWriteSchema.parse(await request.json());
    const version = await prisma.testVersion.findUnique({
      where: { id: input.testVersionId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!version) {
      return fail(messages.api.versionNotFound, 404);
    }

    if (version.status !== "PUBLISHED") {
      return fail(messages.api.publishedVersionRequired, 409);
    }

    const round = await prisma.seriesRound.create({
      data: {
        seriesId: id,
        testVersionId: input.testVersionId,
        title: input.title,
        roundNumber: input.roundNumber,
        scheduledAt: parseDate(input.scheduledAt),
        status: input.status,
        settingsJson: input.settingsJson,
      },
    });

    return ok(round, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
