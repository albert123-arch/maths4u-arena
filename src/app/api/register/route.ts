import { fail, ok } from "@/lib/api-response";
import { hashPassword } from "@/lib/password";
import { messages } from "@/lib/messages";
import { registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const { prisma } = await import("@/lib/prisma");
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      return fail(messages.api.emailAlreadyRegistered, 409);
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        name: input.name,
        role: "TEACHER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return ok({ user }, 201);
  } catch (error) {
    console.error(
      "Registration failed",
      error instanceof Error ? error.name : "UnknownError",
    );

    return fail(messages.api.registrationFailed, 500);
  }
}
