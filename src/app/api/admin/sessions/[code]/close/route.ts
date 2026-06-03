import { fail, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { closeWaitingSession } from "@/lib/session-close";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const { code } = await params;
  const result = await closeWaitingSession(code, user);

  if (!result.ok) {
    return fail(result.error, result.status);
  }

  return ok(result.data);
}
