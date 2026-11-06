import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, digest, isAdmin, isTeacher, secret, userSelect } from "./security";
import { requestView, userViewTeacher, type RequestView, type ViewLens } from "./request-view";

const idleMs = 30 * 60 * 1000;
const cleared = { lensMode: null, lensRole: null, lensTargetId: null, lensTouchedAt: null, lensNonce: null };
function targetKey(lens: Pick<ViewLens, "mode" | "role" | "targetId">) { return lens.mode + ":" + lens.role + ":" + (lens.targetId ?? "self"); }
async function allowed(real: Actor, mode: string, role: string, targetId: string | null) {
  if (!isTeacher(real) || !["STUDENT", "TEACHER"].includes(role) || (!isAdmin(real) && role !== "STUDENT")) return null;
  if (mode === "ROLE") return real;
  if (mode !== "USER" || !targetId || targetId === real.id) return null;
  const target = await db().user.findFirst({ where: { id: targetId, status: "ACTIVE", roles: { some: { role: role as "STUDENT" | "TEACHER" } } }, select: userSelect });
  // Never turn an administrator into a target, including mixed-role accounts.
  if (!target || isAdmin(target) || (!isAdmin(real) && isTeacher(target))) return null;
  if (!isAdmin(real) && !await db().classMembership.count({ where: { userId: target.id, removedAt: null, classroom: { teacherId: real.id, archivedAt: null } } })) return null;
  return target;
}
export async function resolveRequestView(token?: string): Promise<RequestView> {
  const empty = { real: null, actor: null, sessionId: null, lens: null };
  if (!token || token.length > 200) return empty;
  const s = await db().session.findUnique({ where: { tokenHash: digest(token) }, include: { user: { select: userSelect } } });
  if (!s || s.revokedAt || s.expiresAt <= new Date() || s.user.status !== "ACTIVE") return empty;
  const real = s.user;
  if (!s.lensMode) return { real, actor: real, sessionId: s.id, lens: null };
  const target = s.lensTouchedAt && s.lensTouchedAt.getTime() + idleMs > Date.now() ? await allowed(real, s.lensMode, s.lensRole ?? "", s.lensTargetId) : null;
  if (!target) {
    await db().$transaction(async tx => {
      const result = await tx.session.updateMany({ where: { id: s.id, lensNonce: s.lensNonce }, data: cleared });
      if (result.count) await tx.auditEvent.create({ data: { actorId: real.id, action: "VIEW_EXIT_EXPIRED_OR_REVOKED", targetId: s.lensMode + ":" + s.lensRole + ":" + (s.lensTargetId ?? "self") } });
    });
    return { real, actor: real, sessionId: s.id, lens: null };
  }
  const lens: ViewLens = { mode: s.lensMode as ViewLens["mode"], role: s.lensRole as ViewLens["role"], targetId: s.lensTargetId, label: s.lensMode === "ROLE" ? (s.lensRole === "TEACHER" ? "teacher · role preview" : "student · role preview") : target.displayName + " · read only", nonce: s.lensNonce!, expiresAt: new Date(s.lensTouchedAt!.getTime() + idleMs).toISOString() };
  // Same session, never a target user's token. Narrow the effective roles.
  const actor: Actor = { ...target, roles: [{ userId: target.id, role: lens.role }] };
  return { real, actor, sessionId: s.id, lens };
}
export async function enterView(input: unknown) {
  const v = requestView(); ensure(v?.real && v.sessionId, 401, "LOGIN_REQUIRED");
  ensure(!v.lens, 409, "EXIT_VIEW_FIRST");
  const data = z.object({ mode: z.enum(["ROLE", "USER"]), role: z.enum(["STUDENT", "TEACHER"]), targetId: z.string().max(100).optional() }).strict().parse(input);
  ensure(data.mode === "USER" ? !!data.targetId : !data.targetId, 400, "INVALID_INPUT");
  ensure(await allowed(v.real, data.mode, data.role, data.targetId ?? null), 403, "VIEW_NOT_ALLOWED");
  const nonce = secret();
  await db().$transaction(async tx => {
    const result = await tx.session.updateMany({ where: { id: v.sessionId!, revokedAt: null, lensMode: null }, data: { lensMode: data.mode, lensRole: data.role, lensTargetId: data.targetId ?? null, lensTouchedAt: new Date(), lensNonce: nonce } });
    ensure(result.count, 409, "VIEW_CHANGED");
    await tx.auditEvent.create({ data: { actorId: v.real!.id, action: "VIEW_ENTER", targetId: targetKey({ ...data, targetId: data.targetId ?? null }) } });
  });
  return { ok: true, href: data.role === "TEACHER" ? "/teacher" : "/student" };
}
export async function exitView(reason = "EXIT") {
  const v = requestView(); ensure(v?.real && v.sessionId, 401, "LOGIN_REQUIRED");
  if (v.lens) await db().$transaction(async tx => {
    const result = await tx.session.updateMany({ where: { id: v.sessionId!, lensNonce: v.lens!.nonce }, data: cleared });
    if (result.count) await tx.auditEvent.create({ data: { actorId: v.real!.id, action: "VIEW_" + reason, targetId: targetKey(v.lens!) } });
  });
  return { ok: true, href: isAdmin(v.real) ? "/admin" : isTeacher(v.real) ? "/teacher" : "/student" };
}
export async function touchView() {
  const v = requestView(); ensure(v?.sessionId && v.lens, 409, "VIEW_CHANGED");
  const now = new Date();
  const result = await db().session.updateMany({ where: { id: v.sessionId, lensNonce: v.lens.nonce, revokedAt: null }, data: { lensTouchedAt: now } });
  ensure(result.count, 409, "VIEW_CHANGED");
  return { expiresAt: new Date(now.getTime() + idleMs).toISOString() };
}
export function guardViewRequest(request: Request, route: string) {
  const v = requestView(), control = ["auth/me", "auth/logout", "view/exit"].includes(route);
  // Browser requests made before a lens switch/timeout may never fall through
  // as writes on the real account. A client nonce is a freshness check only;
  // the server Session remains the sole authority for mode and target.
  if (!control && !(request.method === "GET" && (route.startsWith("files/") || route === "health"))) ensure((request.headers.get("x-arena-view") ?? "") === (v?.lens?.nonce ?? ""), 409, "VIEW_CHANGED");
  if (!v?.lens || control || route === "view/touch") return;
  if (v.lens.mode === "USER") { ensure(request.method === "GET", 403, "VIEW_READ_ONLY"); if (userViewTeacher()) ensure(route !== "subscriptions", 403, "VIEW_NOT_ALLOWED"); return; }
  if (request.method === "GET") return;
  const safe = /^learning\/(?:square|quadratics\/[\w-]+)\/(check|help|open)$/.test(route)
    || /^catalog\/tasks\/[\w-]+\/support$/.test(route)
    || /^view\/preview\/(tasks|works)\/[\w-]+\/check$/.test(route);
  ensure(safe, 403, "PREVIEW_NO_WRITES");
}
