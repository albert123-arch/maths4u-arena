import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { contentVisibilityUpdateSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = contentVisibilityUpdateSchema.parse(await request.json());
    const test = await prisma.test.update({
      where: { id },
      data: {
        visibility: input.visibility,
        ...(input.visibility === "ARCHIVED" ? { status: "ARCHIVED" as const } : {}),
        ...(input.visibility === "PUBLIC" || input.visibility === "CURATED"
          ? { sharedAt: new Date() }
          : {}),
      },
    });

    return ok(test);
  } catch (error) {
    return errorResponse(error, messages.api.contentNotFound);
  }
}
