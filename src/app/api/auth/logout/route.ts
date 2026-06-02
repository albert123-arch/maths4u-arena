import { ok } from "@/lib/api-response";
import { clearAdminSession } from "@/lib/auth";
import { clearStudentSession } from "@/lib/student-auth";

export async function POST() {
  await clearAdminSession();
  await clearStudentSession();

  return ok({ signedOut: true });
}
