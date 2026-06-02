import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { classroomUpdateSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = classroomUpdateSchema.parse(await request.json());
    const classroom = await prisma.classroom.updateMany({
      where: {
        id,
        teacherId: teacher.id,
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    if (classroom.count === 0) {
      return fail(messages.api.classroomNotFound, 404);
    }

    return ok({ id });
  } catch (error) {
    return errorResponse(error);
  }
}
