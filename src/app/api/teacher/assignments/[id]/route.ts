import { errorResponse, fail, ok } from "@/lib/api-response";
import { toDateOrNull } from "@/lib/assignments";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { assignmentUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
    const existing = await prisma.assignment.findFirst({
      where: { id, teacherId: teacher.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return fail(messages.api.assignmentNotFound, 404);
    }

    if (existing.status !== "DRAFT") {
      return fail("Only draft assignments can be edited.", 409);
    }

    const input = assignmentUpdateSchema.parse(await request.json());

    if (input.classId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: input.classId,
          teacherId: teacher.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!classroom) {
        return fail(messages.api.classroomNotFound, 404);
      }
    }

    if (input.testVersionId) {
      const version = await prisma.testVersion.findFirst({
        where: {
          id: input.testVersionId,
          status: "PUBLISHED",
          test: { ownerUserId: teacher.id },
        },
        select: { id: true },
      });

      if (!version) {
        return fail(messages.api.publishedVersionRequired, 409);
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        classId: input.classId,
        testVersionId: input.testVersionId,
        type: input.type,
        openAt: input.openAt === undefined ? undefined : toDateOrNull(input.openAt),
        dueAt: input.dueAt === undefined ? undefined : toDateOrNull(input.dueAt),
        timeLimitMinutes: input.timeLimitMinutes,
        attemptsAllowed: input.attemptsAllowed,
        showResultsToStudents: input.showResultsToStudents,
        showCorrectAnswers: input.showCorrectAnswers,
        allowLateSubmission: input.allowLateSubmission,
        allowPhotoSolutions: input.allowPhotoSolutions,
        settingsJson: input.settingsJson,
      },
    });

    return ok(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}
