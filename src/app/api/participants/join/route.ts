import { randomUUID } from "node:crypto";

import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { getCurrentStudent } from "@/lib/student-auth";
import { participantJoinSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = participantJoinSchema.parse(await request.json());
    const session = await prisma.gameSession.findUnique({
      where: { code: input.code },
      select: {
        id: true,
        code: true,
        status: true,
        settingsJson: true,
      },
    });

    if (!session) {
      return fail(messages.api.gameCodeNotFound, 404);
    }

    if (session.status === "FINISHED") {
      return fail(messages.api.gameFinished, 409);
    }

    const settings = parseSessionSettings(session.settingsJson);

    if (session.status === "RUNNING" && !settings.allowLateJoin) {
      return fail(messages.api.lateJoinClosed, 409);
    }

    const currentStudent = settings.registeredOnly ? await getCurrentStudent() : null;

    if (settings.registeredOnly && !currentStudent) {
      return fail(messages.api.registeredStudentRequired, 401);
    }

    if (settings.registeredOnly && settings.seriesId && currentStudent) {
      const registration = await prisma.seriesRegistration.findUnique({
        where: {
          seriesId_studentId: {
            seriesId: settings.seriesId,
            studentId: currentStudent.id,
          },
        },
        select: {
          status: true,
        },
      });

      if (!registration || registration.status !== "REGISTERED") {
        return fail(messages.api.studentRegistrationRequired, 403);
      }
    }

    const participantToken = randomUUID();
    const tokenHash = await hashPassword(participantToken);
    const existingParticipant = currentStudent
      ? await prisma.participant.findFirst({
          where: {
            sessionId: session.id,
            studentAccountId: currentStudent.id,
          },
          select: {
            id: true,
          },
        })
      : null;
    const participant = existingParticipant
      ? await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: {
            displayName: currentStudent?.displayName ?? input.displayName,
            tokenHash,
          },
          select: {
            id: true,
            displayName: true,
            joinedAt: true,
          },
        })
      : await prisma.participant.create({
          data: {
            sessionId: session.id,
            studentAccountId: currentStudent?.id ?? null,
            displayName: currentStudent?.displayName ?? input.displayName,
            tokenHash,
          },
          select: {
            id: true,
            displayName: true,
            joinedAt: true,
          },
        });

    const response = ok({
      participant,
      participantToken,
      session,
    });

    response.cookies.set({
      name: `maths4u_participant_${session.code}`,
      value: participantToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
