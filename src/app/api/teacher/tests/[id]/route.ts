import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { testUpdateSchema } from "@/lib/validation";

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
    const input = testUpdateSchema.parse(await request.json());
    const existing = await prisma.test.findFirst({
      where: { id, ownerUserId: teacher.id },
      select: { id: true },
    });

    if (!existing) {
      return fail(messages.api.contentNotEditable, 403);
    }

    const test = await prisma.test.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return ok(test);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const test = await prisma.test.updateMany({
    where: { id, ownerUserId: teacher.id },
    data: { status: "ARCHIVED", visibility: "ARCHIVED" },
  });

  if (test.count === 0) {
    return fail(messages.api.contentNotEditable, 403);
  }

  return ok({ id });
}
