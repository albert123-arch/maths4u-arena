import { AsyncLocalStorage } from "node:async_hooks";
import type { Actor } from "./security";
import type { Prisma } from "../generated/prisma/client";

export type ViewLens = { mode: "ROLE" | "USER"; role: "STUDENT" | "TEACHER"; targetId: string | null; label: string; nonce: string; expiresAt: string };
export type RequestView = { real: Actor | null; actor: Actor | null; sessionId: string | null; lens: ViewLens | null };
const storage = new AsyncLocalStorage<RequestView>();
export const inRequestView = <T>(view: RequestView, fn: () => T) => storage.run(view, fn);
export const requestView = () => storage.getStore();
export const rolePreview = () => requestView()?.lens?.mode === "ROLE";
export const userViewTeacher = () => {
  const v = requestView();
  return v?.lens?.mode === "USER" && v.real && !v.real.roles.some(r => r.role === "ADMIN") ? v.real : null;
};
// A teacher's user lens includes their assignments and the same completed
// independent practice they can already inspect as a mentor, never another
// teacher's private work (or the student's unfinished independent attempts).
export function lensAttemptScope(): Prisma.AttemptWhereInput {
  const real = userViewTeacher();
  return real ? { OR: [
    { workVersion: { work: { ownerId: real.id, kind: { not: "PRACTICE" } } } },
    { workVersion: { work: { kind: "PRACTICE" } }, NOT: { study: { selfDirected: true } }, OR: [{ status: { not: "IN_PROGRESS" } }, { expiresAt: { lte: new Date() } }] },
  ] } : {};
}
