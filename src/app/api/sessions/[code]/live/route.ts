import { messages } from "@/lib/messages";
import { getLiveSessionData, noStoreJson } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { code } = await params;
  const data = await getLiveSessionData(code);

  if (!data) {
    return noStoreJson({ ok: false, error: messages.api.sessionNotFound }, 404);
  }

  return noStoreJson({
    ok: true,
    data,
  });
}
