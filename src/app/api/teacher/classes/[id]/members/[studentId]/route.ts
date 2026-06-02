import { fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; studentId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id, studentId } = await params;
  const classroom = await prisma.classroom.findFirst({
    where: {
      id,
      teacherId: teacher.id,
    },
    select: { id: true },
  });

  if (!classroom) {
    return fail(messages.api.classroomNotFound, 404);
  }

  await prisma.classMembership.updateMany({
    where: {
      classId: id,
      studentId,
    },
    data: {
      status: "REMOVED",
    },
  });

  return ok({ classId: id, studentId });
}
