import { requireAdminApi } from "@/lib/auth";
import { openHostPacedQuestion } from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { noStoreJson } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return noStoreJson({ ok: false, error: messages.api.unauthorized }, 401);
  }

  try {
    const { code } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      currentQuestionIndex?: unknown;
    };
    const requestedIndex =
      typeof body.currentQuestionIndex === "number" ? body.currentQuestionIndex : undefined;
    const result = await openHostPacedQuestion(code, requestedIndex);

    if (!result.ok) {
      return noStoreJson({ ok: false, error: result.error }, result.status);
    }

    return noStoreJson({ ok: true, data: result.data });
  } catch (error) {
    console.error("Host-paced open question failed", error instanceof Error ? error.message : "Unknown error");
    return noStoreJson({ ok: false, error: messages.api.unknownError }, 500);
  }
}
