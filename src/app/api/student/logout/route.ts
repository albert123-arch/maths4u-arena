import { ok } from "@/lib/api-response";
import { clearStudentSession } from "@/lib/student-auth";

export async function POST() {
  await clearStudentSession();

  return ok({ signedOut: true });
}
