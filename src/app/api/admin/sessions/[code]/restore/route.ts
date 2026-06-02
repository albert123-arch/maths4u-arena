import { fail, ok } from "@/lib/api-response";
import { requireAdminApi } from "@/lib/auth";
import { setSessionArchived } from "@/lib/session-archive";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const { code } = await params;
  const result = await setSessionArchived(code, user, false);

  if (!result.ok) {
    return fail(result.error, result.status);
  }

  return ok(result);
}
