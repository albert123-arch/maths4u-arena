import { NextResponse } from "next/server";

import { prisma } from "./prisma";
import { parseSessionSettings } from "./session-settings";
import { teamName } from "./team-scoring";

export type LiveSessionData = Awaited<ReturnType<typeof getLiveSessionData>>;

export async function getLiveSessionData(code: string) {
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      status: true,
      mode: true,
      settingsJson: true,
      testVersion: {
        select: {
          id: true,
          title: true,
          test: {
            select: {
              title: true,
            },
          },
          questions: {
            select: {
              questionId: true,
            },
          },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          displayName: true,
          teamId: true,
          joinedAt: true,
          answers: {
            select: {
              questionId: true,
            },
          },
        },
      },
      _count: {
        select: {
          participants: true,
          answers: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const questionCount = session.testVersion.questions.length;
  const settings = parseSessionSettings(session.settingsJson);
  let registeredStudentCount = 0;

  if (settings.registeredOnly && settings.seriesId) {
    registeredStudentCount = await prisma.seriesRegistration.count({
      where: {
        seriesId: settings.seriesId,
        status: "REGISTERED",
      },
    });
  } else if (settings.registeredOnly && settings.classId) {
    registeredStudentCount = await prisma.classMembership.count({
      where: {
        classId: settings.classId,
        status: "ACTIVE",
      },
    });
  }
  const participants = session.participants.map((participant) => {
    const answeredQuestionCount = new Set(
      participant.answers.map((answer) => answer.questionId),
    ).size;

    return {
      id: participant.id,
      displayName: participant.displayName,
      teamId: participant.teamId,
      teamName: teamName(settings, participant.teamId),
      joinedAt: participant.joinedAt.toISOString(),
      answerCount: answeredQuestionCount,
      status:
        questionCount > 0 && answeredQuestionCount >= questionCount
          ? "Submitted"
          : answeredQuestionCount > 0
            ? "In progress"
            : "Joined",
    };
  });
  const submittedCount = participants.filter(
    (participant) => participant.status === "Submitted",
  ).length;

  return {
    code: session.code,
    status: session.status,
    mode: session.mode,
    testVersionId: session.testVersion.id,
    testTitle: session.testVersion.test.title,
    versionTitle: session.testVersion.title,
    sessionLabel: settings.label,
    participantCount: session._count.participants,
    answerCount: session._count.answers,
    submittedCount,
    registeredStudentCount,
    questionCount,
    serverTime: new Date().toISOString(),
    settings,
    participants,
  };
}

export function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
