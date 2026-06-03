import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { createGameCode } from "@/lib/game-code";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings, sessionSettingsJson } from "@/lib/session-settings";
import { sessionCreateSchema } from "@/lib/validation";

async function uniqueGameCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = createGameCode();
    const existing = await prisma.gameSession.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error(messages.api.uniqueGameCodeFailed);
}

export async function GET() {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: {
        select: {
          id: true,
          title: true,
          questions: {
            select: {
              questionId: true,
            },
          },
          test: {
            select: {
              title: true,
              subject: true,
            },
          },
        },
      },
      _count: {
        select: {
          participants: true,
          answers: true,
        },
      },
      participants: {
        select: {
          id: true,
          answers: {
            select: {
              questionId: true,
            },
          },
        },
      },
    },
  });

  return ok(
    sessions.map((session) => {
      const questionCount = session.testVersion.questions.length;
      const submittedCount = session.participants.filter((participant) => {
        const answered = new Set(participant.answers.map((answer) => answer.questionId)).size;
        return questionCount > 0 && answered >= questionCount;
      }).length;

      return {
        id: session.id,
        code: session.code,
        status: session.status,
        mode: session.mode,
        createdAt: session.createdAt.toISOString(),
        settingsJson: session.settingsJson,
        testVersion: {
          id: session.testVersion.id,
          title: session.testVersion.title,
          test: session.testVersion.test,
        },
        _count: session._count,
        submittedCount,
        questionCount,
        settings: parseSessionSettings(session.settingsJson),
      };
    }),
  );
}

export async function POST(request: Request) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = sessionCreateSchema.parse(await request.json());
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

    const parsedSettings = parseSessionSettings(input.settingsJson);
    const settings =
      input.mode === "HOST_PACED"
        ? {
            ...parsedSettings,
            autoSubmitOnFinish: false,
            autoFlowPaused: false,
            phase: "LOBBY" as const,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            questionEndsAt: null,
            phaseChangedAt: null,
            lastPhaseChangedAt: null,
            nextAutoActionAt: null,
            autoAction: null,
          }
        : parsedSettings;
    const session = await prisma.gameSession.create({
      data: {
        testVersionId: input.testVersionId,
        code: await uniqueGameCode(),
        mode: input.mode,
        settingsJson: sessionSettingsJson(settings),
        showResults: input.showResults,
      },
      include: {
        testVersion: {
          select: {
            title: true,
            test: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (settings.seriesId && settings.roundId) {
      await prisma.seriesRound.updateMany({
        where: {
          id: settings.roundId,
          seriesId: settings.seriesId,
        },
        data: {
          sessionId: session.id,
          status: "LOBBY",
        },
      });
    }

    return ok(session, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
