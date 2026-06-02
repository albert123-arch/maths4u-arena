import { errorResponse, fail, ok } from "@/lib/api-response";
import { toDateOrNull } from "@/lib/assignments";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { assignmentWriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = assignmentWriteSchema.parse(await request.json());
    const [classroom, version] = await Promise.all([
      prisma.classroom.findFirst({
        where: {
          id: input.classId,
          teacherId: teacher.id,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
      prisma.testVersion.findFirst({
        where: {
          id: input.testVersionId,
          status: "PUBLISHED",
          test: { ownerUserId: teacher.id },
        },
        select: { id: true },
      }),
    ]);

    if (!classroom) {
      return fail(messages.api.classroomNotFound, 404);
    }

    if (!version) {
      return fail(messages.api.publishedVersionRequired, 409);
    }

    const assignment = await prisma.assignment.create({
      data: {
        teacherId: teacher.id,
        classId: input.classId,
        testVersionId: input.testVersionId,
        title: input.title,
        description: input.description,
        type: input.type,
        openAt: toDateOrNull(input.openAt),
        dueAt: toDateOrNull(input.dueAt),
        timeLimitMinutes: input.timeLimitMinutes,
        attemptsAllowed: input.attemptsAllowed,
        showResultsToStudents: input.showResultsToStudents,
        showCorrectAnswers: input.showCorrectAnswers,
        allowLateSubmission: input.allowLateSubmission,
        allowPhotoSolutions: input.allowPhotoSolutions,
        settingsJson: input.settingsJson,
      },
    });

    return ok(assignment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
