import { z } from "zod";

import { fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
});

export async function POST(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id } = await params;
  const input = schema.parse(await request.json());
  const result = await prisma.test.updateMany({
    where: {
      id,
      ownerUserId: teacher.id,
      status: { not: "ARCHIVED" },
    },
    data: {
      visibility: input.visibility,
      sharedAt: input.visibility === "PUBLIC" ? new Date() : null,
    },
  });

  if (result.count === 0) {
    return fail(messages.api.contentNotEditable, 403);
  }

  return ok({ id, visibility: input.visibility });
}
