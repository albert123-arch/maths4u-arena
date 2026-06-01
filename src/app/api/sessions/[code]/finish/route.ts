import { requireAdminApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getLiveSessionData, noStoreJson } from "@/lib/session-live";

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
    select: { id: true, status: true },
  });

  if (!session) {
    return noStoreJson({ ok: false, error: messages.api.sessionNotFound }, 404);
  }

  if (session.status !== "FINISHED") {
    await prisma.gameSession.update({
      where: { code: normalizedCode },
      data: {
        status: "FINISHED",
        finishedAt: new Date(),
      },
    });
  }

  const data = await getLiveSessionData(normalizedCode);

  return noStoreJson({
    ok: true,
    data,
  });
}
