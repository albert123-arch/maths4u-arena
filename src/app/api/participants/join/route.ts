import { randomUUID } from "node:crypto";

import { errorResponse, fail, ok } from "@/lib/api-response";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
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
      },
    });

    if (!session) {
      return fail("Игра с таким кодом не найдена.", 404);
    }

    if (session.status === "FINISHED") {
      return fail("Эта игра уже завершена.", 409);
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
