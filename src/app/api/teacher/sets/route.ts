import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { quizSetWriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = quizSetWriteSchema.parse(await request.json());
    const test = await prisma.test.create({
      data: {
        title: input.title,
        slug: `${slugify(input.title) || "quiz-set"}-${teacher.id.slice(-6)}-${Date.now().toString(36)}`,
        subject: input.subject,
        description: input.description,
        locale: "en",
        status: "DRAFT",
        createdById: teacher.id,
        ownerUserId: teacher.id,
        visibility: input.visibility,
        versions: {
          create: {
            versionNumber: 1,
            title: input.title,
            status: "DRAFT",
            settingsJson: input.gradeLevel ? JSON.stringify({ gradeLevel: input.gradeLevel }) : null,
          },
        },
      },
    });

    return ok(test, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
