import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { quizSetUpdateSchema } from "@/lib/validation";

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
    const input = quizSetUpdateSchema.parse(await request.json());
    const result = await prisma.test.updateMany({
      where: {
        id,
        ownerUserId: teacher.id,
        status: { not: "ARCHIVED" },
      },
      data: {
        title: input.title,
        subject: input.subject,
        description: input.description,
        visibility: input.visibility,
        ...(input.visibility === "PUBLIC" ? { sharedAt: new Date() } : {}),
      },
    });

    if (result.count === 0) {
      return fail(messages.api.contentNotEditable, 403);
    }

    return ok({ id });
  } catch (error) {
    return errorResponse(error);
  }
}
