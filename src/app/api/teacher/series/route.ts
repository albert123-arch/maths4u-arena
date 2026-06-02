import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { seriesWriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function parseDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function GET() {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const series = await prisma.series.findMany({
    where: { teacherId: teacher.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          registrations: true,
          rounds: true,
        },
      },
    },
  });

  return ok(series);
}

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = seriesWriteSchema.parse(await request.json());
    const series = await prisma.series.create({
      data: {
        teacherId: teacher.id,
        title: input.title,
        description: input.description,
        status: input.status,
        startsAt: parseDate(input.startsAt),
        endsAt: parseDate(input.endsAt),
        settingsJson: input.settingsJson,
      },
    });

    return ok(series, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
