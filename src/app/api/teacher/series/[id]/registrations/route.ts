import { z } from "zod";

import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const registrationInputSchema = z
  .object({
    studentId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
  })
  .refine((input) => Boolean(input.studentId || input.classId), {
    message: "Choose a student or class.",
  });

async function registerStudent(seriesId: string, studentId: string, displayName: string) {
  return prisma.seriesRegistration.upsert({
    where: {
      seriesId_studentId: {
        seriesId,
        studentId,
      },
    },
    create: {
      seriesId,
      studentId,
      displayNameSnapshot: displayName,
      status: "REGISTERED",
    },
    update: {
      displayNameSnapshot: displayName,
      status: "REGISTERED",
    },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const input = registrationInputSchema.parse(await request.json());
    const series = await prisma.series.findFirst({
      where: { id, teacherId: teacher.id },
      select: { id: true },
    });

    if (!series) {
      return fail(messages.api.seriesNotFound, 404);
    }

    if (input.studentId) {
      const student = await prisma.studentAccount.findFirst({
        where: {
          id: input.studentId,
          status: "ACTIVE",
          classMemberships: {
            some: {
              status: "ACTIVE",
              classroom: {
                teacherId: teacher.id,
                status: "ACTIVE",
              },
            },
          },
        },
        select: { id: true, displayName: true },
      });

      if (!student) {
        return fail(messages.api.studentNotFound, 404);
      }

      const registration = await registerStudent(series.id, student.id, student.displayName);

      return ok(registration, 201);
    }

    const classroom = await prisma.classroom.findFirst({
      where: {
        id: input.classId,
        teacherId: teacher.id,
        status: "ACTIVE",
      },
      include: {
        memberships: {
          where: {
            status: "ACTIVE",
            student: {
              status: "ACTIVE",
            },
          },
          include: {
            student: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      return fail(messages.api.classroomNotFound, 404);
    }

    for (const membership of classroom.memberships) {
      await registerStudent(series.id, membership.student.id, membership.student.displayName);
    }

    return ok(
      {
        classId: classroom.id,
        registeredCount: classroom.memberships.length,
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
