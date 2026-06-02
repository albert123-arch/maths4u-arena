import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
    const input = studentUpdateSchema.parse(await request.json());
    const existing = await prisma.studentAccount.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return fail(messages.api.studentNotFound, 404);
    }

    const student = await prisma.studentAccount.update({
      where: { id },
      data: {
        ...(input.username ? { username: input.username } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.groupName !== undefined ? { groupName: input.groupName } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        groupName: true,
        status: true,
      },
    });

    return ok(student);
  } catch (error) {
    return errorResponse(error);
  }
}
