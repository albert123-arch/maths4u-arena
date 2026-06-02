import { requireAdminApi } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { recalculateSeries } from "@/lib/series-scoring";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!series) {
    return fail(messages.api.seriesNotFound, 404);
  }

  try {
    const results = await recalculateSeries(id);

    return ok({ results });
  } catch (error) {
    console.error("Series leaderboard recalculation failed", error instanceof Error ? error.message : "Unknown error");
    return fail(messages.api.leaderboardRecalculationFailed, 500);
  }
}
