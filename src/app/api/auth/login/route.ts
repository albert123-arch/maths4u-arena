import { fail, ok } from "@/lib/api-response";
import {
  authenticateUser,
  clearAdminSession,
  createAdminSession,
} from "@/lib/auth";
import { messages } from "@/lib/messages";
import {
  authenticateStudent,
  clearStudentSession,
  createStudentSession,
} from "@/lib/student-auth";
import { unifiedLoginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function safeNext(value?: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function defaultRedirect(role: "ADMIN" | "TEACHER" | "STUDENT") {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "TEACHER") {
    return "/teacher";
  }

  return "/student";
}

export async function POST(request: Request) {
  try {
    const input = unifiedLoginSchema.parse(await request.json());
    const identifier = input.identifier.trim();
    const next = safeNext(input.next);

    if (identifier.includes("@")) {
      const user = await authenticateUser(identifier, input.password);

      if (user) {
        await clearStudentSession();
        await createAdminSession(user);

        return ok({
          role: user.role,
          redirectTo: next ?? defaultRedirect(user.role),
        });
      }
    }

    const student = await authenticateStudent(identifier, input.password);

    if (student) {
      await clearAdminSession();
      await createStudentSession(student);

      return ok({
        role: "STUDENT" as const,
        redirectTo: next ?? defaultRedirect("STUDENT"),
      });
    }

    return fail(messages.api.unifiedLoginFailed, 401);
  } catch (error) {
    console.error("Unified login failed", error instanceof Error ? error.name : "UnknownError");
    return fail(messages.api.unifiedLoginFailed, 401);
  }
}
