import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { testWriteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = testWriteSchema.parse(await request.json());
    const baseSlug = slugify(input.slug || input.title) || `teacher-test-${Date.now()}`;
    const slug = `${baseSlug}-${teacher.id.slice(-6)}-${Date.now().toString(36)}`;
    const test = await prisma.test.create({
      data: {
        title: input.title,
        slug,
        subject: input.subject,
        description: input.description,
        locale: input.locale,
        status: input.status,
        createdById: teacher.id,
        ownerUserId: teacher.id,
        visibility: "PRIVATE",
        versions: {
          create: {
            versionNumber: 1,
            title: input.title,
            status: "DRAFT",
          },
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    return ok(test, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
