import { errorResponse, fail, ok } from "@/lib/api-response";
import { syncAssignmentRoster, toDateOrNull } from "@/lib/assignments";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { quizSetAssignmentCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = quizSetAssignmentCreateSchema.parse(await request.json());
    const [test, classroom, version] = await Promise.all([
      prisma.test.findFirst({
        where: { id, ownerUserId: teacher.id, status: { not: "ARCHIVED" } },
        select: { id: true },
      }),
      prisma.classroom.findFirst({
        where: { id: input.classId, teacherId: teacher.id, status: "ACTIVE" },
        select: { id: true },
      }),
      prisma.testVersion.findFirst({
        where: {
          id: input.testVersionId,
          status: "PUBLISHED",
          testId: id,
          test: { ownerUserId: teacher.id },
        },
        select: { id: true },
      }),
    ]);

    if (!test) {
      return fail(messages.api.contentNotEditable, 403);
    }

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
        type: input.type,
        status: "ASSIGNED",
        dueAt: toDateOrNull(input.dueAt),
        showResultsToStudents: input.showResultsToStudents,
        showCorrectAnswers: input.showCorrectAnswers,
        allowLateSubmission: input.allowLateSubmission,
        allowPhotoSolutions: input.allowPhotoSolutions,
      },
    });

    await syncAssignmentRoster(assignment.id, teacher.id);

    return ok(assignment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
