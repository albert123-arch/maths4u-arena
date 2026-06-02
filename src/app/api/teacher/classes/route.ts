import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { createGameCode } from "@/lib/game-code";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { classroomWriteSchema } from "@/lib/validation";

async function uniqueJoinCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const joinCode = createGameCode();
    const existing = await prisma.classroom.findUnique({
      where: { joinCode },
      select: { id: true },
    });

    if (!existing) {
      return joinCode;
    }
  }

  throw new Error(messages.api.uniqueGameCodeFailed);
}

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = classroomWriteSchema.parse(await request.json());
    const classroom = await prisma.classroom.create({
      data: {
        teacherId: teacher.id,
        title: input.title,
        description: input.description,
        joinCode: await uniqueJoinCode(),
      },
    });

    return ok(classroom, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
