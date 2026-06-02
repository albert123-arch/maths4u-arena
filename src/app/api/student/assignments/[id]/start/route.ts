import { errorResponse, fail, ok } from "@/lib/api-response";
import { assignmentAvailabilityError } from "@/lib/assignments";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const student = await getCurrentStudent();

  if (!student) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        classroom: {
          memberships: {
            some: {
              studentId: student.id,
              status: "ACTIVE",
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        openAt: true,
        dueAt: true,
        allowLateSubmission: true,
      },
    });

    if (!assignment) {
      return fail(messages.api.assignmentNotFound, 404);
    }

    const blocked = assignmentAvailabilityError(assignment);

    if (blocked) {
      return fail(blocked, 409);
    }

    const existing = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: id,
        studentId: student.id,
        attemptNumber: 1,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
      },
    });

    if (existing && ["SUBMITTED", "GRADED", "RETURNED"].includes(existing.status)) {
      return ok(existing);
    }

    const submission = existing
      ? await prisma.assignmentSubmission.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "NOT_STARTED" ? "IN_PROGRESS" : existing.status,
            startedAt: existing.startedAt ?? new Date(),
          },
        })
      : await prisma.assignmentSubmission.create({
          data: {
            assignmentId: id,
            studentId: student.id,
            attemptNumber: 1,
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        });

    return ok(submission);
  } catch (error) {
    return errorResponse(error);
  }
}
