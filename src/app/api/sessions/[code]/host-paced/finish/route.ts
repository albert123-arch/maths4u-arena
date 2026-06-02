import { requireSessionHostApi } from "@/lib/auth";
import { finishHostPacedSession } from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { noStoreJson } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { code } = await params;
  const user = await requireSessionHostApi(code);

  if (!user) {
    return noStoreJson({ ok: false, error: messages.api.unauthorized }, 401);
  }

  try {
    const result = await finishHostPacedSession(code);

    if (!result.ok) {
      return noStoreJson({ ok: false, error: result.error }, result.status);
    }

    return noStoreJson({ ok: true, data: result.data });
  } catch (error) {
    console.error("Host-paced finish failed", error instanceof Error ? error.message : "Unknown error");
    return noStoreJson({ ok: false, error: messages.api.unknownError }, 500);
  }
}
