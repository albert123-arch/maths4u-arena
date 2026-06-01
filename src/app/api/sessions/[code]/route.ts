import { fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

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
