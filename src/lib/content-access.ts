import type { publicVersion } from "./content";
import type { Prisma } from "../generated/prisma/client";
import { type Actor, isAdmin, isTeacher } from "./security";
import { requestView } from "./request-view";
import { db } from "./prisma";
import { ensure } from "./errors";

export const archiveAdmin = (actor: Actor | null) => !!actor && isAdmin(actor) && !requestView()?.lens;
export const archiveWhere = (actor: Actor | null): Prisma.TaskWhereInput => archiveAdmin(actor) ? {} : { examArchivedAt: null };
export const hiddenMaterial = (actor: Actor | null, task: { examArchivedAt: Date | null }) => !!task.examArchivedAt && !archiveAdmin(actor);
export const unavailableMessage = (lang: string) => lang === "ru" ? "Этот материал больше недоступен" : "This material is no longer available";
export function hierarchyTaskWhere(actor: Actor | null): Prisma.TaskWhereInput {
  return { archivedAt: null, ...archiveWhere(actor), OR: [{ visibility: "PUBLIC" }, ...(actor && isTeacher(actor) ? [{ ownerId: actor.id }] : [])] };
}
export const visibleLessonWhere = (actor: Actor | null): Prisma.LessonWhereInput => archiveAdmin(actor) ? {} : { tasks: { some: { task: hierarchyTaskWhere(actor) } } };
export const visibleCourseWhere = (actor: Actor | null): Prisma.CourseWhereInput => archiveAdmin(actor) ? {} : { topics: { some: { lessons: { some: { archivedAt: null, ...visibleLessonWhere(actor) } } } } };
export async function assertLessonVisible(actor: Actor | null, id: string) {
  ensure(await db().lesson.count({ where: { id, archivedAt: null, ...visibleLessonWhere(actor) } }), 404, "NOT_FOUND");
}
export function unavailableVersion(v: { id: string; taskId: string; parts: { id: string; kind: string; maxPoints: number }[] }, lang: string): ReturnType<typeof publicVersion> & { unavailable: true } {
  return { id: v.id, taskId: v.taskId, title: unavailableMessage(lang), locale: lang, statement: "<p>" + unavailableMessage(lang) + "</p>", unavailable: true as const, separatePartPrompts: false,
    assets: [], parts: v.parts.map(p => ({ id: p.id, kind: p.kind as "SHORT" | "NUMERIC" | "CHOICE" | "MANUAL", maxPoints: p.maxPoints, prompt: "", options: [] })) } as ReturnType<typeof publicVersion> & { unavailable: true };
}
