import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { sessionStatusUpdateSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      testVersion: {
        select: {
          id: true,
          title: true,
          status: true,
          test: {
            select: {
              title: true,
              subject: true,
              locale: true,
            },
          },
          _count: {
            select: { questions: true },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!session) {
    return fail(messages.api.sessionNotFound, 404);
  }

  return ok(session);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { code } = await params;
    const input = sessionStatusUpdateSchema.parse(await request.json());
    const session = await prisma.gameSession.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        status: true,
      },
    });

    if (!session) {
      return fail(messages.api.sessionNotFound, 404);
    }

    const nextStatus = input.action === "START" ? "RUNNING" : "FINISHED";
    const updated = await prisma.gameSession.update({
      where: { code: code.toUpperCase() },
      data: {
        status: nextStatus,
        ...(input.action === "START" ? { startedAt: new Date() } : {}),
        ...(input.action === "FINISH" ? { finishedAt: new Date() } : {}),
      },
    });

    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
