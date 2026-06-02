import { fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { recalculateSeries } from "@/lib/series-scoring";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const series = await prisma.series.findFirst({
    where: { id, teacherId: teacher.id },
    select: { id: true },
  });

  if (!series) {
    return fail(messages.api.seriesNotFound, 404);
  }

  try {
    const results = await recalculateSeries(id);

    return ok({ results });
  } catch (error) {
    console.error(
      "Teacher series leaderboard recalculation failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return fail(messages.api.leaderboardRecalculationFailed, 500);
  }
}
