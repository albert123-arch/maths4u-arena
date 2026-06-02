import { errorResponse, fail, ok } from "@/lib/api-response";
import { createStudentSession } from "@/lib/student-auth";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { studentSelfRegisterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function safeNext(value?: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/student";
}

export async function POST(request: Request) {
  try {
    const input = studentSelfRegisterSchema.parse(await request.json());
    const existing = await prisma.studentAccount.findUnique({
      where: { username: input.username },
      select: { id: true },
    });

    if (existing) {
      return fail(messages.api.usernameAlreadyExists, 409);
    }

    const student = await prisma.studentAccount.create({
      data: {
        username: input.username,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        status: "ACTIVE",
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        groupName: true,
        status: true,
      },
    });

    await createStudentSession(student);

    return ok({ student, next: safeNext(input.next) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
