// A self-declared teacher role grants a workspace, not paid library access.
// Profiles are created only for new self-service accounts; legacy access stays intact.
type TeacherActor = {
  roles: { role: string }[];
  teacherAccount?: { selfRegistered: boolean } | null;
};

export function canUseTeacherLibrary(actor: TeacherActor | null) {
  return !!actor && (actor.roles.some(r => r.role === "ADMIN") ||
    actor.roles.some(r => r.role === "TEACHER") && !actor.teacherAccount?.selfRegistered);
}

export const BASIC_TEACHER_LIMITS = { maxActiveClasses: 3, maxDistinctStudents: 100 } as const;
export type TeacherLimits = { maxActiveClasses: number; maxDistinctStudents: number };

export function teacherLimits(account: ({ selfRegistered: boolean } & TeacherLimits) | null): TeacherLimits | null {
  return account?.selfRegistered ? { maxActiveClasses: account.maxActiveClasses, maxDistinctStudents: account.maxDistinctStudents } : null;
}

export function canAddActiveClass(limits: TeacherLimits | null, activeCount: number) {
  return !limits || activeCount < limits.maxActiveClasses;
}

export function canAddActiveStudents(limits: TeacherLimits | null, activeIds: readonly string[], candidateIds: readonly string[]) {
  if (!limits) return true;
  const current = new Set(activeIds), combined = new Set([...activeIds, ...candidateIds]);
  // Never make an existing membership unusable because a limit was lowered.
  return combined.size === current.size || combined.size <= limits.maxDistinctStudents;
}
