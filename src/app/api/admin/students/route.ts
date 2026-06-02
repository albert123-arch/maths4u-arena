import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { studentWriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const students = await prisma.studentAccount.findMany({
    orderBy: [{ groupName: "asc" }, { displayName: "asc" }],
    select: {
      id: true,
      username: true,
      displayName: true,
      groupName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          registrations: true,
          participants: true,
        },
      },
    },
  });

  return ok(students);
}

export async function POST(request: Request) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = studentWriteSchema.parse(await request.json());

    if (!input.password) {
      return fail(messages.validation.pinTooShort, 422);
    }

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
        groupName: input.groupName,
        status: input.status,
        passwordHash: await hashPassword(input.password),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        groupName: true,
        status: true,
      },
    });

    return ok(student, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
