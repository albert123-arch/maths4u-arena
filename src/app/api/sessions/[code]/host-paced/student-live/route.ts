import { getHostPacedStudentLiveData } from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { noStoreJson } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const url = new URL(request.url);
    const participantId = url.searchParams.get("participantId");
    const participantToken = url.searchParams.get("participantToken");

    if (!participantId || !participantToken) {
      return noStoreJson({ ok: false, error: messages.api.invalidParticipantToken }, 401);
    }

    const result = await getHostPacedStudentLiveData({
      code,
      participantId,
      participantToken,
    });

    if (!result.ok) {
      return noStoreJson({ ok: false, error: result.error }, result.status);
    }

    return noStoreJson({
      ok: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Host-paced student live failed", error instanceof Error ? error.message : "Unknown error");
    return noStoreJson({ ok: false, error: messages.api.unknownError }, 500);
  }
}
