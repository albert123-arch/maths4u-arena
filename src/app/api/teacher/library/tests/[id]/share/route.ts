import { fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const result = await prisma.test.updateMany({
    where: {
      id,
      ownerUserId: teacher.id,
      status: { not: "ARCHIVED" },
    },
    data: {
      visibility: "PUBLIC",
      sharedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return fail(messages.api.contentNotEditable, 403);
  }

  return ok({ id });
}
