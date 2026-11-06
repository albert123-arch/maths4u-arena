import { cambridgeTask } from "./cambridge-access";
import { hasH1Provenance } from "./content-origin";
import type { publicVersion } from "./content";
import type { Prisma } from "../generated/prisma/client";
import { type Actor, isAdmin, isTeacher } from "./security";
import { requestView } from "./request-view";
import { db } from "./prisma";
import { ensure } from "./errors";

export const archiveAdmin = (actor: Actor | null) => !!actor && isAdmin(actor) && !requestView()?.lens;
export const approvedWhere: Prisma.TaskWhereInput = { origin: { not: "UNKNOWN" }, NOT: cambridgeTask, AND: [{ OR: [{ origin: "ORIGINAL" }, { originManual: true }] }] };
export const restrictedWhere: Prisma.TaskWhereInput = { OR: [cambridgeTask, { examArchivedAt: { not: null } }, { origin: "UNKNOWN" }, { origin: { not: "ORIGINAL" }, originManual: false }] };
export const restrictedMaterial = (task: { examArchivedAt: Date | null; origin: string; originManual: boolean; versions?: { examBoard: string | null; source?: { name: string } | null }[] }) => !!task.examArchivedAt || task.origin === "UNKNOWN" || task.origin === "CAMBRIDGE_EXAM" || task.versions?.some(v => hasH1Provenance({ examBoard: v.examBoard, source: v.source?.name ?? null })) === true || task.origin !== "ORIGINAL" && !task.originManual;
export const archiveWhere = (actor: Actor | null): Prisma.TaskWhereInput => archiveAdmin(actor) ? {} : { examArchivedAt: null, ...approvedWhere, NOT: cambridgeTask };
export const hiddenMaterial = (actor: Actor | null, task: { examArchivedAt: Date | null; origin: string; originManual: boolean }) => !archiveAdmin(actor) && restrictedMaterial(task);
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
