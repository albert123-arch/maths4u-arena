import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { testUpdateSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const { id } = await params;
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      },
    },
  });

  if (!test) {
    return fail("Test not found.", 404);
  }

  return ok(test);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  try {
    const { id } = await params;
    const input = testUpdateSchema.parse(await request.json());
    const data = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    const test = await prisma.test.update({
      where: { id },
      data,
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    return ok(test);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  try {
    const { id } = await params;
    const test = await prisma.test.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return ok(test);
  } catch (error) {
    return errorResponse(error);
  }
}
