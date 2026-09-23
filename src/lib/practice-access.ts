import type { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { type Actor, isTeacher } from "./security";

// Class membership grants access to completed independent practice, not to
// private assignments or olympiad entries owned by another teacher.
export function mentoredPracticeWhere(actor: Actor): Prisma.AttemptWhereInput {
  return {
    userId: { not: actor.id },
    user: { memberships: { some: { removedAt: null, classroom: { teacherId: actor.id, archivedAt: null } } } },
    workVersion: { work: { kind: "PRACTICE" } },
    OR: [{ status: { not: "IN_PROGRESS" } }, { expiresAt: { lte: new Date() } }],
  };
}

export async function mayReviewPractice(actor: Actor, attemptId: string, tx: Prisma.TransactionClient = db()) {
  if (!isTeacher(actor)) return false;
  return !!await tx.attempt.findFirst({ where: { id: attemptId, ...mentoredPracticeWhere(actor) }, select: { id: true } });
}
