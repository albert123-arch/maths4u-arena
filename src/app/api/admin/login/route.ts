import { authenticateAdmin, createAdminSession } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await authenticateAdmin(input.email, input.password);

    if (!user) {
      return fail(messages.api.invalidCredentials, 401);
    }

    await createAdminSession(user);

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Admin login failed",
      error instanceof Error ? error.name : "UnknownError",
    );

    return fail(messages.api.loginFailed, 500);
  }
}
