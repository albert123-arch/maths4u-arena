import { requireAdminApi } from "@/lib/auth";
import { errorResponse, fail, ok } from "@/lib/api-response";
import { createGameCode } from "@/lib/game-code";
import { prisma } from "@/lib/prisma";
import { sessionCreateSchema } from "@/lib/validation";

async function uniqueGameCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = createGameCode();
    const existing = await prisma.gameSession.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique game code.");
}

export async function GET() {
  const user = await requireAdminApi();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: {
        select: {
          id: true,
          title: true,
          test: {
            select: {
              title: true,
              subject: true,
            },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  return ok(sessions);
}

export async function POST(request: Request) {
  const user = await requireAdminApi();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  try {
    const input = sessionCreateSchema.parse(await request.json());
    const session = await prisma.gameSession.create({
      data: {
        testVersionId: input.testVersionId,
        code: await uniqueGameCode(),
        mode: input.mode,
        settingsJson: input.settingsJson,
        showResults: input.showResults,
      },
    });

    return ok(session, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
