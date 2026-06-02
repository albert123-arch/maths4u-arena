import { requireAdminApi } from "@/lib/auth";
import { startHostPacedSession } from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getLiveSessionData, noStoreJson } from "@/lib/session-live";
import { parseSessionSettings } from "@/lib/session-settings";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return noStoreJson({ ok: false, error: messages.api.unauthorized }, 401);
  }

  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const session = await prisma.gameSession.findUnique({
    where: { code: normalizedCode },
    select: { id: true, mode: true, status: true, settingsJson: true },
  });

  if (!session) {
    return noStoreJson({ ok: false, error: messages.api.sessionNotFound }, 404);
  }

  if (session.mode === "HOST_PACED") {
    const result = await startHostPacedSession(normalizedCode);

    if (!result.ok) {
      return noStoreJson({ ok: false, error: result.error }, result.status);
    }

    return noStoreJson({
      ok: true,
      data: result.data,
    });
  }

  if (session.status === "FINISHED") {
    return noStoreJson({ ok: false, error: messages.api.sessionAlreadyFinished }, 409);
  }

  if (session.status !== "LOBBY" && session.status !== "RUNNING") {
    return noStoreJson({ ok: false, error: messages.api.sessionCannotStart }, 409);
  }

  if (session.status === "LOBBY") {
    await prisma.gameSession.update({
      where: { code: normalizedCode },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    const settings = parseSessionSettings(session.settingsJson);

    if (settings.roundId) {
      await prisma.seriesRound.updateMany({
        where: {
          id: settings.roundId,
          sessionId: session.id,
        },
        data: { status: "RUNNING" },
      });
    }
  }

  const data = await getLiveSessionData(normalizedCode);

  return noStoreJson({
    ok: true,
    data,
  });
}
