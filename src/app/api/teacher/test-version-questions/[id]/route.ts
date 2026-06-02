import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { testVersionQuestionUpdateSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function findTeacherDraftLink(id: string, teacherId: string) {
  const link = await prisma.testVersionQuestion.findFirst({
    where: {
      id,
      testVersion: {
        test: { ownerUserId: teacherId },
      },
    },
    include: {
      testVersion: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!link) {
    return { error: fail(messages.api.contentNotEditable, 403) };
  }

  if (link.testVersion.status !== "DRAFT") {
    return { error: fail(messages.api.publishedVersionLocked, 409) };
  }

  return { link };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const draftLink = await findTeacherDraftLink(id, teacher.id);

    if (draftLink.error) {
      return draftLink.error;
    }

    const input = testVersionQuestionUpdateSchema.parse(await request.json());
    const item = await prisma.testVersionQuestion.update({
      where: { id },
      data: {
        ...(input.points !== undefined ? { points: input.points } : {}),
        ...(input.timeLimitSeconds !== undefined
          ? { timeLimitSeconds: input.timeLimitSeconds }
          : {}),
      },
      include: {
        question: {
          select: {
            id: true,
            prompt: true,
            type: true,
            subject: true,
            difficulty: true,
          },
        },
      },
    });

    return ok(item);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const draftLink = await findTeacherDraftLink(id, teacher.id);

    if (draftLink.error) {
      return draftLink.error;
    }

    const removed = await prisma.testVersionQuestion.delete({
      where: { id },
    });

    return ok(removed);
  } catch (error) {
    return errorResponse(error);
  }
}
