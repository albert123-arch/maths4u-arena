import { clearAdminSession } from "@/lib/auth";
import { ok } from "@/lib/api-response";

export async function POST() {
  await clearAdminSession();

  return ok({
    signedOut: true,
  });
}
