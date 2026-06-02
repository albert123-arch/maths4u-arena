import { fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { authenticateStudent, createStudentSession } from "@/lib/student-auth";
import { studentLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = studentLoginSchema.parse(await request.json());
    const student = await authenticateStudent(input.username, input.password);

    if (!student) {
      return fail(messages.api.studentLoginFailed, 401);
    }

    await createStudentSession(student);

    return ok({
      student,
      next: input.next ?? "/student",
    });
  } catch (error) {
    console.error("Student login failed", error instanceof Error ? error.message : "Unknown error");
    return fail(messages.api.studentLoginFailed, 401);
  }
}
