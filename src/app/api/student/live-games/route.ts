import { NextResponse } from "next/server";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { parseSessionSettings } from "@/lib/session-settings";
import { getCurrentStudent } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET() {
  const student = await getCurrentStudent();

  if (!student) {
    return noStore({ ok: false, error: messages.api.unauthorized }, 401);
  }

  const memberships = await prisma.classMembership.findMany({
    where: {
      studentId: student.id,
      status: "ACTIVE",
    },
    select: {
      classId: true,
      classroom: {
        select: {
          title: true,
        },
      },
    },
  });
  const classTitleById = new Map(
    memberships.map((membership) => [membership.classId, membership.classroom.title]),
  );
  const classIds = new Set(classTitleById.keys());

  if (classIds.size === 0) {
    return noStore({ ok: true, data: { sessions: [] } });
  }

  const sessions = await prisma.gameSession.findMany({
    where: {
      status: { in: ["LOBBY", "RUNNING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      code: true,
      mode: true,
      status: true,
      settingsJson: true,
      createdAt: true,
      testVersion: {
        select: {
          test: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });
  const classSessions = sessions.flatMap((session) => {
    const settings = parseSessionSettings(session.settingsJson);
    const isClassGame = settings.audience === "CLASS" || Boolean(settings.classId && !settings.seriesId);

    if (!isClassGame || !settings.classId || !classIds.has(settings.classId)) {
      return [];
    }

    return [
      {
        code: session.code,
        status: session.status,
        mode: session.mode,
        testTitle: session.testVersion.test.title,
        sessionLabel: settings.label,
        classTitle: classTitleById.get(settings.classId) ?? messages.teacher.classOnly,
        createdAt: session.createdAt.toISOString(),
      },
    ];
  });

  return noStore({
    ok: true,
    data: {
      sessions: classSessions,
    },
  });
}
