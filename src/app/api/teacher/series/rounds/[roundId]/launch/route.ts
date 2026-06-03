import { fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import type { GameModeValue } from "@/lib/constants";
import { createGameCode } from "@/lib/game-code";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings, sessionSettingsJson } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ roundId: string }>;
};

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

async function requestedMode(request: Request): Promise<Extract<GameModeValue, "CLASSIC" | "HOST_PACED">> {
  try {
    const body = (await request.json()) as { mode?: unknown };

    return body.mode === "HOST_PACED" ? "HOST_PACED" : "CLASSIC";
  } catch {
    return "CLASSIC";
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { roundId } = await params;
    const mode = await requestedMode(request);
    const round = await prisma.seriesRound.findFirst({
      where: {
        id: roundId,
        series: {
          teacherId: teacher.id,
        },
      },
      include: {
        session: {
          select: {
            code: true,
          },
        },
        testVersion: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!round) {
      return fail(messages.api.seriesRoundNotFound, 404);
    }

    if (round.session) {
      return ok({
        code: round.session.code,
      });
    }

    if (round.testVersion.status !== "PUBLISHED") {
      return fail(messages.api.publishedVersionRequired, 409);
    }

    const parsedSettings = parseSessionSettings(round.settingsJson);
    const settings = sessionSettingsJson({
      ...parsedSettings,
      audience: "SERIES",
      label: round.title,
      seriesId: round.seriesId,
      roundId: round.id,
      registeredOnly: true,
      archived: false,
      archivedAt: null,
      showStudentResults: true,
      showLeaderboard: true,
      showCorrectAnswers: false,
      ...(mode === "HOST_PACED"
        ? {
            allowLateJoin: parsedSettings.allowLateJoin,
            autoSubmitOnFinish: false,
            questionTimeLimitSeconds: parsedSettings.questionTimeLimitSeconds || 30,
            speedBonus: parsedSettings.speedBonus,
            showQuestionOnStudent: true,
            showQuestionOnHost: true,
            autoAdvance: false,
            autoFlow: true,
            autoFlowPaused: false,
            autoLockWhenAllAnswered: true,
            autoRevealAfterLockSeconds: 2,
            autoLeaderboardAfterRevealSeconds: 5,
            autoNextAfterLeaderboardSeconds: 6,
            autoFinishAfterLastQuestion: true,
            phase: "LOBBY" as const,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            questionEndsAt: null,
            phaseChangedAt: null,
            lastPhaseChangedAt: null,
            nextAutoActionAt: null,
            autoAction: null,
          }
        : {}),
    });
    const session = await prisma.gameSession.create({
      data: {
        testVersionId: round.testVersionId,
        code: await uniqueGameCode(),
        mode,
        status: "LOBBY",
        settingsJson: settings,
        showResults: true,
      },
      select: {
        id: true,
        code: true,
      },
    });

    await prisma.seriesRound.update({
      where: { id: round.id },
      data: {
        sessionId: session.id,
        status: "LOBBY",
      },
    });

    return ok({
      code: session.code,
    });
  } catch (error) {
    console.error("Teacher series round launch failed", error instanceof Error ? error.message : "Unknown error");
    return fail(messages.api.unknownError, 500);
  }
}
