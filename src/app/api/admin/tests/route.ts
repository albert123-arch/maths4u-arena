import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { testWriteSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const tests = await prisma.test.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          id: true,
          versionNumber: true,
          status: true,
          _count: {
            select: { questions: true },
          },
        },
      },
      _count: {
        select: { versions: true },
      },
    },
  });

  return ok(tests);
}

export async function POST(request: Request) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = testWriteSchema.parse(await request.json());
    const slug = slugify(input.slug || input.title) || `test-${Date.now()}`;

    const test = await prisma.test.create({
      data: {
        title: input.title,
        slug,
        subject: input.subject,
        description: input.description,
        locale: input.locale,
        status: input.status,
        createdById: user.id,
        ownerUserId: user.id,
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
