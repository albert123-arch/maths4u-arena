import { z } from "zod";
import { studyCheckRequest } from "./authored-study";
import { assertLessonVisible } from "./content-access";
import { ensure } from "./errors";
import { db } from "./prisma";
import { lockUser, transaction, type Actor } from "./security";
import type { StudyCheckpoint } from "./study-lesson-model";

export const studyCheckpointLesson = z.string().min(1).max(80);
export const studyCheckpointRequest = studyCheckRequest.safeExtend({
  event: z.object({ key: z.uuid(), helpUsed: z.boolean() }).strict().optional(),
});

type Row = { checkId: string; eventKey: string; correct: boolean; helpUsed: boolean; checkedAt: Date };
function project(row: Row): StudyCheckpoint {
  const { checkId, eventKey, correct, helpUsed, checkedAt } = row;
  return { id: checkId, eventKey, correct, helpUsed, checkedAt: checkedAt.getTime() };
}

export async function readStudyCheckpoints(actor: Actor, lessonId: string) {
  await assertLessonVisible(actor, lessonId);
  const rows = await db().studyCheckEvidence.findMany({
    where: { userId: actor.id, lessonId }, orderBy: [{ checkedAt: "asc" }, { id: "asc" }],
  });
  return [...new Map(rows.map(row => [row.checkId, project(row)])).values()];
}

export async function recordStudyCheckpoint(actor: Actor | null, lessonId: string, checkId: string, event: { key: string; helpUsed: boolean }, correct: boolean) {
  const { key: eventKey, helpUsed } = event;
  if (!actor) return { id: checkId, eventKey, correct, helpUsed, checkedAt: Date.now() } satisfies StudyCheckpoint;
  await assertLessonVisible(actor, lessonId);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const prior = await tx.studyCheckEvidence.findUnique({ where: { userId_eventKey: { userId: actor.id, eventKey } } });
    if (prior) {
      ensure(prior.lessonId === lessonId && prior.checkId === checkId && prior.correct === correct && prior.helpUsed === helpUsed, 409, "EVENT_CONFLICT");
      return project(prior);
    }
    const row = await tx.studyCheckEvidence.create({ data: { userId: actor.id, lessonId, checkId, eventKey, correct, helpUsed } });
    return project(row);
  });
}
