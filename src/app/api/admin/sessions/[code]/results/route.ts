import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
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

  const totalPossible = session.testVersion.questions.reduce(
    (sum, item) => sum + item.points,
    0,
  );

  return NextResponse.json(
    {
      ok: true,
      data: {
        code: session.code,
        status: session.status,
        testTitle: session.testVersion.test.title,
        totalPossible,
        participants: session.participants.map((participant) => {
          const totalScore = participant.answers.reduce(
            (sum, answer) => sum + answer.points,
            0,
          );
          const correct = participant.answers.filter((answer) => answer.isCorrect === true).length;
          const answered = participant.answers.length;
          const lastAnswer = participant.answers.at(-1);

          return {
            id: participant.id,
            displayName: participant.displayName,
            totalScore,
            answered,
            correctness: answered === 0 ? 0 : Math.round((correct / answered) * 100),
            lastAnswerPrompt: lastAnswer?.question.prompt ?? null,
          };
        }),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
