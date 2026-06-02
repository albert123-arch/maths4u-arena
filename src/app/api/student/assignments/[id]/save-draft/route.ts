import { fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { getCurrentStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const student = await getCurrentStudent();

  if (!student) {
    return fail(messages.api.unauthorized, 401);
  }

  return ok({
    saved: false,
    note: "Draft answers are stored locally in the browser for this MVP.",
  });
}
