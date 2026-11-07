import type { Prisma } from "../generated/prisma/client";
import { ensure } from "./errors";
import { canAddActiveClass, canAddActiveStudents, teacherLimits, type TeacherLimits } from "./teacher-account-model";

export { canUseTeacherLibrary, BASIC_TEACHER_LIMITS } from "./teacher-account-model";

// Callers lock the teacher's User row before reading limits or changing capacity.
export async function limitsForTeacher(tx: Prisma.TransactionClient, teacherId: string): Promise<TeacherLimits | null> {
  const owner = await tx.user.findUniqueOrThrow({ where: { id: teacherId }, select: { roles: true, teacherAccount: true } });
  return owner.roles.some(r => r.role === "ADMIN") ? null : teacherLimits(owner.teacherAccount);
}

export async function requireClassCapacity(tx: Prisma.TransactionClient, teacherId: string, limits: TeacherLimits | null) {
  if (!limits) return;
  const count = await tx.classroom.count({ where: { teacherId, archivedAt: null } });
  ensure(canAddActiveClass(limits, count), 403, "TEACHER_CLASS_LIMIT");
}

export async function requireStudentCapacity(tx: Prisma.TransactionClient, teacherId: string, limits: TeacherLimits | null, candidateIds: string[]) {
  if (!limits || !candidateIds.length) return;
  const active = await tx.classMembership.findMany({ where: { removedAt: null, classroom: { teacherId, archivedAt: null } },
    distinct: ["userId"], select: { userId: true } });
  ensure(canAddActiveStudents(limits, active.map(m => m.userId), candidateIds), 403, "TEACHER_STUDENT_LIMIT");
}
