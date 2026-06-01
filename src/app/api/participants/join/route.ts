import { randomUUID } from "node:crypto";

import { errorResponse, fail, ok } from "@/lib/api-response";
import { messages } from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
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

    if (session.status === "RUNNING" && !parseSessionSettings(session.settingsJson).allowLateJoin) {
      return fail(messages.api.lateJoinClosed, 409);
    }

    const participantToken = randomUUID();
    const participant = await prisma.participant.create({
      data: {
        sessionId: session.id,
        displayName: input.displayName,
        tokenHash: await hashPassword(participantToken),
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
