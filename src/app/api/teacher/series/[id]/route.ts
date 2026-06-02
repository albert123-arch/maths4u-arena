import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { seriesUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
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
    const { id } = await params;
    const input = seriesUpdateSchema.parse(await request.json());
    const existing = await prisma.series.findFirst({
      where: { id, teacherId: teacher.id },
      select: { id: true },
    });

    if (!existing) {
      return fail(messages.api.seriesNotFound, 404);
    }

    const series = await prisma.series.update({
      where: { id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.startsAt !== undefined ? { startsAt: parseDate(input.startsAt) } : {}),
        ...(input.endsAt !== undefined ? { endsAt: parseDate(input.endsAt) } : {}),
        ...(input.settingsJson !== undefined ? { settingsJson: input.settingsJson } : {}),
      },
    });

    return ok(series);
  } catch (error) {
    return errorResponse(error);
  }
}
