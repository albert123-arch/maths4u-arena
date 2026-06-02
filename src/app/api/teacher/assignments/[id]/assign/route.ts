import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { syncAssignmentRoster } from "@/lib/assignments";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const assignment = await prisma.assignment.findFirst({
      where: { id, teacherId: teacher.id },
      select: { id: true, status: true },
    });

    if (!assignment) {
      return fail(messages.api.assignmentNotFound, 404);
    }

    if (assignment.status === "ARCHIVED") {
      return fail(messages.api.assignmentNotFound, 404);
    }

    await prisma.assignment.update({
      where: { id },
      data: { status: "ASSIGNED" },
    });
    const roster = await syncAssignmentRoster(id, teacher.id);

    return ok({ status: "ASSIGNED", ...roster });
  } catch (error) {
    return errorResponse(error);
  }
}
