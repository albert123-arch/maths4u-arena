import { errorResponse, fail, ok } from "@/lib/api-response";
import { requireTeacherApi } from "@/lib/auth";
import { createGameCode } from "@/lib/game-code";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings, sessionSettingsJson } from "@/lib/session-settings";
import { teacherSessionCreateSchema } from "@/lib/validation";

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

  throw new Error(messages.api.uniqueGameCodeFailed);
}

export async function POST(request: Request) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const input = teacherSessionCreateSchema.parse(await request.json());
    const version = await prisma.testVersion.findFirst({
      where: {
        id: input.testVersionId,
        status: "PUBLISHED",
        test: { ownerUserId: teacher.id },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!version) {
      return fail(messages.api.publishedVersionRequired, 409);
    }

    const classId = input.classId;

    if (classId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classId,
          teacherId: teacher.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!classroom) {
        return fail(messages.api.classroomNotFound, 404);
      }
    }

    const parsedSettings = parseSessionSettings(input.settingsJson);
    const settings =
      input.mode === "HOST_PACED"
        ? {
            ...parsedSettings,
            registeredOnly: Boolean(classId),
            classId,
            autoSubmitOnFinish: false,
            phase: "LOBBY" as const,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            questionEndsAt: null,
            lastPhaseChangedAt: null,
          }
        : {
            ...parsedSettings,
            registeredOnly: Boolean(classId),
            classId,
          };

    const session = await prisma.gameSession.create({
      data: {
        testVersionId: input.testVersionId,
        code: await uniqueGameCode(),
        mode: input.mode,
        settingsJson: sessionSettingsJson(settings),
        showResults: input.showResults,
      },
    });

    return ok(session, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
