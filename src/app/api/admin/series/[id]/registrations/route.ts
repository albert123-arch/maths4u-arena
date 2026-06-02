import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { seriesRegistrationWriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const user = await requireAdminApi();

  if (!user) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = seriesRegistrationWriteSchema.parse(await request.json());
    const student = await prisma.studentAccount.findUnique({
      where: { id: input.studentId },
      select: { id: true, displayName: true },
    });

    if (!student) {
      return fail(messages.api.studentNotFound, 404);
    }

    const registration = await prisma.seriesRegistration.upsert({
      where: {
        seriesId_studentId: {
          seriesId: id,
          studentId: input.studentId,
        },
      },
      create: {
        seriesId: id,
        studentId: input.studentId,
        displayNameSnapshot: student.displayName,
        status: "REGISTERED",
      },
      update: {
        displayNameSnapshot: student.displayName,
        status: "REGISTERED",
      },
    });

    return ok(registration, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
