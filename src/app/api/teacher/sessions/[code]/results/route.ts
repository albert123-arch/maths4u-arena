import { NextResponse } from "next/server";

import { fail } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { buildSessionResults } from "@/lib/session-results";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { code } = await params;
  const session = await prisma.gameSession.findFirst({
    where: {
      code: code.toUpperCase(),
      testVersion: {
        test: {
          ownerUserId: teacher.id,
        },
      },
    },
    include: {
      testVersion: {
        include: {
          test: true,
          questions: {
            select: {
              points: true,
            },
          },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  prompt: true,
                },
              },
            },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) {
    return fail(messages.api.sessionNotFound, 404);
  }

  const settings = parseSessionSettings(session.settingsJson);
  const results = buildSessionResults({
    mode: session.mode,
    settings,
    questions: session.testVersion.questions,
    participants: session.participants,
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        code: session.code,
        status: session.status,
        mode: session.mode,
        testTitle: session.testVersion.test.title,
        sessionLabel: settings.label,
        teamMode: settings.teamMode,
        totalPossible: results.totalPossible,
        participantCount: results.participants.length,
        submittedCount: results.submittedCount,
        averageScore: results.averageScore,
        lastUpdated: new Date().toISOString(),
        participants: results.participants,
        teamLeaderboard: results.teamLeaderboard,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
