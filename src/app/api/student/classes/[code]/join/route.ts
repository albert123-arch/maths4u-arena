import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const student = await getCurrentStudent();

  if (!student) {
    return fail(messages.student.loginRequired, 401);
  }

  try {
    const { code } = await params;
    const classroom = await prisma.classroom.findUnique({
      where: { joinCode: code.toUpperCase() },
      select: { id: true, status: true },
    });

    if (!classroom || classroom.status !== "ACTIVE") {
      return fail(messages.api.classroomNotFound, 404);
    }

    const membership = await prisma.classMembership.upsert({
      where: {
        classId_studentId: {
          classId: classroom.id,
          studentId: student.id,
        },
      },
      create: {
        classId: classroom.id,
        studentId: student.id,
        status: "ACTIVE",
      },
      update: {
        status: "ACTIVE",
      },
    });

    return ok(membership);
  } catch (error) {
    return errorResponse(error);
  }
}
