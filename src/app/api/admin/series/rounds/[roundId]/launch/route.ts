import { requireAdminApi } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
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

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const { roundId } = await params;
  const round = await prisma.seriesRound.findUnique({
    where: { id: roundId },
    include: {
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

  if (round.testVersion.status !== "PUBLISHED") {
    return fail(messages.api.publishedVersionRequired, 409);
  }

  const settings = sessionSettingsJson({
    ...parseSessionSettings(round.settingsJson),
    label: round.title,
    seriesId: round.seriesId,
    roundId: round.id,
    registeredOnly: true,
    showStudentResults: true,
    showLeaderboard: true,
  });
  const session = await prisma.gameSession.create({
    data: {
      testVersionId: round.testVersionId,
      code: await uniqueGameCode(),
      mode: "CLASSIC",
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
}
