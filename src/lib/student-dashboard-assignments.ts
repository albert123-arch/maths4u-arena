import type { Prisma } from "../generated/prisma/client";
import { restrictedWhere } from "./content-access";

// Course following controls study analytics, not access to teacher assignments.
// assignedWorkIds must come from the actor-scoped listWorks + safe-history query.
export function dashboardAttemptWhere(userId: string, publicTaskIds: string[], assignedWorkIds: string[], lensScope: Prisma.AttemptWhereInput): Prisma.AttemptWhereInput {
  return { userId, AND: [lensScope], workVersion: {
    OR: [{ workId: { in: assignedWorkIds } }, { items: { some: { taskVersion: { taskId: { in: publicTaskIds } } } } }],
    items: { none: { taskVersion: { task: restrictedWhere } } },
    // A clean latest version cannot expose a work with held historical material.
    work: { versions: { none: { items: { some: { taskVersion: { task: restrictedWhere } } } } } },
  } };
}

export function dashboardVisibleItems<T extends { taskVersion: { taskId: string } }>(items: T[], workId: string, assignedWorkIds: ReadonlySet<string>, courseByTask: ReadonlyMap<string, string>): T[] {
  return assignedWorkIds.has(workId) ? items : items.filter(item => courseByTask.has(item.taskVersion.taskId));
}
