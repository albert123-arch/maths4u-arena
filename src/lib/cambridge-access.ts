// H1: read-only guard for the existing schema. No category-based exclusions.
import type { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { type Actor, isAdmin, isTeacher } from "./security";
import { ensure } from "./errors";
export const cambridgeNames = ["Cambridge", "Cambridge International"];
export const cambridgeVersion: Prisma.TaskVersionWhereInput = { OR: [{ examBoard: { in: cambridgeNames } }, { source: { name: { in: cambridgeNames } } }] };
export const cambridgeTask: Prisma.TaskWhereInput = { versions: { some: cambridgeVersion } };
export const cambridgeScope = (actor: Actor | null): Prisma.TaskWhereInput => actor && isAdmin(actor) ? {} : { NOT: cambridgeTask };
export function visibleLesson(actor: Actor | null): Prisma.LessonWhereInput {
  return actor && isAdmin(actor) ? {} : { tasks: { some: { task: { archivedAt: null, ...cambridgeScope(actor), OR: [{ visibility: "PUBLIC" }, ...(actor && isTeacher(actor) ? [{ ownerId: actor.id }] : [])] } } } };
}
export const visibleCourse = (actor: Actor | null): Prisma.CourseWhereInput => actor && isAdmin(actor) ? {} : { topics: { some: { lessons: { some: { archivedAt: null, ...visibleLesson(actor) } } } } };
export const visibleWorkVersion = (actor: Actor | null): Prisma.WorkVersionWhereInput => actor && isAdmin(actor) ? {} : { items: { none: { taskVersion: { task: cambridgeTask } } } };
export async function requireVisibleTasks(actor: Actor | null, ids: string[], tx: Prisma.TransactionClient = db()) {
  if (actor && isAdmin(actor) || !ids.length) return;
  ensure(!await tx.task.count({ where: { id: { in: ids }, ...cambridgeTask } }), 404, "NOT_FOUND");
}
export async function requireVisibleLesson(actor: Actor | null, id: string) {
  ensure(await db().lesson.count({ where: { id, archivedAt: null, ...visibleLesson(actor) } }), 404, "NOT_FOUND");
}
export async function requireVisibleWork(actor: Actor | null, id: string, tx: Prisma.TransactionClient = db()) {
  if (actor && isAdmin(actor)) return;
  ensure(!await tx.workItem.count({ where: { workVersion: { workId: id }, taskVersion: { task: cambridgeTask } } }), 404, "NOT_FOUND");
}
