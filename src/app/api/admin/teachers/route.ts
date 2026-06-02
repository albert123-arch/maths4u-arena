import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { teacherWriteSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          classrooms: true,
          ownedTests: true,
          questions: true,
        },
      },
    },
  });

  return ok(teachers);
}

export async function POST(request: Request) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = teacherWriteSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      return fail(messages.api.teacherEmailAlreadyExists, 409);
    }

    const teacher = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: "TEACHER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return ok(teacher, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
