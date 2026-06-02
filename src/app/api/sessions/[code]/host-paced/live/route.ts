import { getHostPacedHostLiveData } from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { noStoreJson } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const data = await getHostPacedHostLiveData(code);

    if (!data) {
      return noStoreJson({ ok: false, error: messages.api.sessionNotFound }, 404);
    }

    return noStoreJson({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("Host-paced host live failed", error instanceof Error ? error.message : "Unknown error");
    return noStoreJson({ ok: false, error: messages.api.unknownError }, 500);
  }
}
