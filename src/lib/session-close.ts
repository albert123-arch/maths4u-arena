import type { AuthUser } from "./auth";
import { finishHostPacedSession } from "./host-paced";
import { messages } from "./messages";
import { prisma } from "./prisma";
import { getLiveSessionData } from "./session-live";
import { parseSessionSettings, sessionSettingsJson } from "./session-settings";
import { recalculateSeriesRound } from "./series-scoring";

type CloseResult =
  | {
      ok: true;
      data: NonNullable<Awaited<ReturnType<typeof getLiveSessionData>>>;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

function canManageSession(user: AuthUser, ownerUserId: string | null) {
  return user.role === "ADMIN" || ownerUserId === user.id;
}

export async function closeWaitingSession(code: string, user: AuthUser): Promise<CloseResult> {
  const normalizedCode = code.toUpperCase();
  const session = await prisma.gameSession.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      code: true,
      mode: true,
      status: true,
      settingsJson: true,
      testVersion: {
        select: {
          test: {
            select: {
              ownerUserId: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return { ok: false, error: messages.api.sessionNotFound, status: 404 };
  }

  if (!canManageSession(user, session.testVersion.test.ownerUserId)) {
    return { ok: false, error: messages.api.unauthorized, status: 401 };
  }

  if (session.status === "FINISHED") {
    const data = await getLiveSessionData(normalizedCode);

    if (!data) {
      return { ok: false, error: messages.api.sessionNotFound, status: 404 };
    }

    return { ok: true, data };
  }

  if (session.status !== "LOBBY") {
    return { ok: false, error: messages.api.sessionCannotClose, status: 409 };
  }

  if (session.mode === "HOST_PACED") {
    const result = await finishHostPacedSession(normalizedCode);

    if (!result.ok) {
      return { ok: false, error: result.error, status: result.status };
    }

    const updated = await prisma.gameSession.findUnique({
      where: { code: normalizedCode },
      select: { settingsJson: true },
    });
    const closedAt = new Date();

    await prisma.gameSession.update({
      where: { code: normalizedCode },
      data: {
        finishedAt: closedAt,
        settingsJson: sessionSettingsJson({
          ...parseSessionSettings(updated?.settingsJson),
          closedWithoutStart: true,
          closedAt: closedAt.toISOString(),
        }),
      },
    });
  } else {
    const settings = parseSessionSettings(session.settingsJson);
    const closedAt = new Date();

    await prisma.gameSession.update({
      where: { code: normalizedCode },
      data: {
        status: "FINISHED",
        finishedAt: closedAt,
        settingsJson: sessionSettingsJson({
          ...settings,
          closedWithoutStart: true,
          closedAt: closedAt.toISOString(),
        }),
      },
    });
  }

  const finalSession = await prisma.gameSession.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      settingsJson: true,
    },
  });
  const finalSettings = parseSessionSettings(finalSession?.settingsJson);

  if (finalSession && finalSettings.roundId) {
    await prisma.seriesRound.updateMany({
      where: {
        id: finalSettings.roundId,
        sessionId: finalSession.id,
      },
      data: { status: "FINISHED" },
    });
    await recalculateSeriesRound(finalSettings.roundId);
  }

  const data = await getLiveSessionData(normalizedCode);

  if (!data) {
    return { ok: false, error: messages.api.sessionNotFound, status: 404 };
  }

  return { ok: true, data };
}
