import { prisma } from "./prisma";

export async function teacherOwnsTest(testId: string, teacherId: string) {
  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      ownerUserId: teacherId,
    },
    select: { id: true },
  });

  return Boolean(test);
}

export async function teacherOwnsVersion(versionId: string, teacherId: string) {
  const version = await prisma.testVersion.findFirst({
    where: {
      id: versionId,
      test: {
        ownerUserId: teacherId,
      },
    },
    select: { id: true },
  });

  return Boolean(version);
}

export async function teacherOwnsQuestion(questionId: string, teacherId: string) {
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      ownerUserId: teacherId,
    },
    select: { id: true },
  });

  return Boolean(question);
}

export async function teacherOwnsVersionQuestion(linkId: string, teacherId: string) {
  const link = await prisma.testVersionQuestion.findFirst({
    where: {
      id: linkId,
      testVersion: {
        test: {
          ownerUserId: teacherId,
        },
      },
    },
    select: { id: true },
  });

  return Boolean(link);
}
