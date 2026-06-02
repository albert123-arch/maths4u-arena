import { requireAdminApi } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; studentId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  const { id, studentId } = await params;
  const registration = await prisma.seriesRegistration.findUnique({
    where: {
      seriesId_studentId: {
        seriesId: id,
        studentId,
      },
    },
    select: { id: true },
  });

  if (!registration) {
    return fail(messages.api.seriesRegistrationNotFound, 404);
  }

  await prisma.seriesRegistration.update({
    where: { id: registration.id },
    data: { status: "REMOVED" },
  });

  return ok({ removed: true });
}
