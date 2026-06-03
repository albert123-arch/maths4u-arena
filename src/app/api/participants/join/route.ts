import { randomUUID } from "node:crypto";

import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { getCurrentStudentAccount } from "@/lib/student-auth";
import { smallestTeamId, validateTeamId } from "@/lib/team-scoring";
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
        participants: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!session) {
      return fail(messages.api.gameCodeNotFound, 404);
    }

    if (session.status === "FINISHED") {
      return fail(messages.api.gameFinished, 409);
    }

    const settings = parseSessionSettings(session.settingsJson);
    const isClassGame = settings.audience === "CLASS" || Boolean(settings.classId && !settings.seriesId);
    const requiresStudent = settings.registeredOnly || isClassGame;

    if (session.status === "RUNNING" && !settings.allowLateJoin) {
      return fail(messages.api.lateJoinClosed, 409);
    }

    const currentStudent = requiresStudent ? await getCurrentStudentAccount() : null;

    if (requiresStudent && !currentStudent) {
      return fail(messages.api.registeredStudentRequired, 401);
    }

    if (requiresStudent && currentStudent?.status !== "ACTIVE") {
      return fail(messages.api.studentDisabled, 403);
    }

    if (settings.registeredOnly && !settings.seriesId && !settings.classId && !isClassGame) {
      return fail(messages.api.seriesAccessCheckRequired, 409);
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

    if (isClassGame && !settings.classId) {
      return fail(messages.api.classMembershipRequired, 403);
    }

    if ((settings.registeredOnly || isClassGame) && settings.classId && currentStudent) {
      const membership = await prisma.classMembership.findUnique({
        where: {
          classId_studentId: {
            classId: settings.classId,
            studentId: currentStudent.id,
          },
        },
        select: {
          status: true,
        },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return fail(messages.api.classMembershipRequired, 403);
      }
    }

    if (!requiresStudent && !input.displayName) {
      return fail(messages.api.displayNameRequired, 422);
    }

    const displayName = currentStudent?.displayName ?? input.displayName ?? messages.play.player;

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
            teamId: true,
          },
        })
      : null;
    const requestedTeamId = validateTeamId(settings, input.teamId);
    const existingTeamId = existingParticipant?.teamId ?? null;
    const teamId =
      settings.teamMode && existingTeamId
        ? existingTeamId
        : settings.teamMode && settings.teamAssignMode === "auto"
          ? smallestTeamId(settings, session.participants)
          : requestedTeamId;

    if (settings.teamMode && !teamId) {
      return fail(messages.api.teamRequired, 422);
    }

    if (settings.teamMode && input.teamId && !requestedTeamId) {
      return fail(messages.api.invalidTeam, 422);
    }

    const participant = existingParticipant
      ? await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: {
            displayName,
            tokenHash,
            teamId,
          },
          select: {
            id: true,
            displayName: true,
            studentAccountId: true,
            teamId: true,
            joinedAt: true,
          },
        })
      : await prisma.participant.create({
          data: {
            sessionId: session.id,
            studentAccountId: currentStudent?.id ?? null,
            displayName,
            tokenHash,
            teamId,
          },
          select: {
            id: true,
            displayName: true,
            studentAccountId: true,
            teamId: true,
            joinedAt: true,
          },
        });

    const response = ok({
      participantId: participant.id,
      participantToken,
      displayName: participant.displayName,
      code: session.code,
      sessionStatus: session.status,
      registeredOnly: requiresStudent,
      participant,
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
