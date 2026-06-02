import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const source = await prisma.test.findFirst({
      where: {
        id,
        visibility: { in: ["PUBLIC", "CURATED"] },
        status: { not: "ARCHIVED" },
      },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            questions: {
              orderBy: { sortOrder: "asc" },
              include: {
                question: {
                  include: {
                    options: {
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!source || source.versions.length === 0) {
      return fail(messages.api.contentNotFound, 404);
    }

    const version = source.versions[0];
    const copied = await prisma.$transaction(async (tx) => {
      const test = await tx.test.create({
        data: {
          title: `${source.title} Copy`,
          slug: `${slugify(source.slug || source.title)}-${teacher.id.slice(-6)}-${Date.now().toString(36)}`,
          subject: source.subject,
          description: source.description,
          locale: source.locale,
          status: "PUBLISHED",
          createdById: teacher.id,
          ownerUserId: teacher.id,
          visibility: "PRIVATE",
          sourceId: source.sourceId ?? source.id,
          copiedFromId: source.id,
        },
      });

      const copiedVersion = await tx.testVersion.create({
        data: {
          testId: test.id,
          versionNumber: 1,
          title: version.title,
          instructions: version.instructions,
          settingsJson: version.settingsJson,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      for (const item of version.questions) {
        const question = await tx.question.create({
          data: {
            subject: item.question.subject,
            type: item.question.type,
            prompt: item.question.prompt,
            explanation: item.question.explanation,
            difficulty: item.question.difficulty,
            tagsJson: item.question.tagsJson,
            mediaJson: item.question.mediaJson,
            gradingType: item.question.gradingType,
            gradingRulesJson: item.question.gradingRulesJson,
            ownerUserId: teacher.id,
            visibility: "PRIVATE",
            sourceId: item.question.sourceId ?? item.question.id,
            copiedFromId: item.question.id,
            options: {
              create: item.question.options.map((option) => ({
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                sortOrder: option.sortOrder,
              })),
            },
          },
        });

        await tx.testVersionQuestion.create({
          data: {
            testVersionId: copiedVersion.id,
            questionId: question.id,
            sortOrder: item.sortOrder,
            points: item.points,
            timeLimitSeconds: item.timeLimitSeconds,
            settingsJson: item.settingsJson,
          },
        });
      }

      return test;
    });

    return ok(copied, 201);
  } catch (error) {
    return errorResponse(error, messages.api.contentCopyFailed);
  }
}
