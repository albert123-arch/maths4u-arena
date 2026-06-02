import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { teacherPasswordResetSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = teacherPasswordResetSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: { id, role: "TEACHER" },
      select: { id: true },
    });

    if (!existing) {
      return fail(messages.api.teacherNotFound, 404);
    }

    const teacher = await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(input.password),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return ok(teacher);
  } catch (error) {
    return errorResponse(error, messages.api.teacherNotFound);
  }
}
