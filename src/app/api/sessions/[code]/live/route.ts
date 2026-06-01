import { NextResponse } from "next/server";

import { fail } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      status: true,
      _count: {
        select: {
          participants: true,
          answers: true,
        },
      },
    },
  });

  if (!session) {
    return fail(messages.api.sessionNotFound, 404);
  }

  return NextResponse.json(
    {
      status: session.status,
      participantCount: session._count.participants,
      answerCount: session._count.answers,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
