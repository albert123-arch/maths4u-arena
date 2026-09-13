import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./prisma";
import { hashPassword, verifyPassword } from "./password";
import { ensure } from "./errors";
import type { Prisma } from "../generated/prisma/client";

export const COOKIE = "maths4u_session";
export const userSelect = { id: true, username: true, displayName: true, status: true, roles: true, profile: true } satisfies Prisma.UserSelect;
export type Actor = Prisma.UserGetPayload<{ select: typeof userSelect }>;
export const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
export const isAdmin = (actor: Actor) => actor.roles.some(r => r.role === "ADMIN");
export const isTeacher = (actor: Actor) => isAdmin(actor) || actor.roles.some(r => r.role === "TEACHER");
export function teacher(actor: Actor) { ensure(isTeacher(actor)); }
export function admin(actor: Actor) { ensure(isAdmin(actor)); }
export const passwordSchema = z.string().min(10).max(72).refine(v => Buffer.byteLength(v, "utf8") <= 72);
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,64}$/);
export const registrationSchema = z.object({
  username: usernameSchema, password: passwordSchema, displayName: z.string().trim().min(2).max(160),
  email: z.email().max(191).optional(), locale: z.enum(["ru", "en"]).default("ru"),
});
// Roles supplied by clients are discarded; only STUDENT is inserted.
export async function register(input: unknown) {
  const data = registrationSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  return db().user.create({ data: { username: data.username, passwordHash, displayName: data.displayName,
    email: data.email?.toLowerCase(), roles: { create: { role: "STUDENT" } }, profile: { create: { locale: data.locale } } }, select: userSelect });
}
export async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await db().$transaction(fn, { maxWait: 10000, timeout: 20000, isolationLevel: "ReadCommitted" }); }
    catch (e) {
      const code = (e as { code?: string }).code;
      if (i < 2 && (code === "P2034" || code === "P2002")) continue;
      throw e;
    }
  }
}
// All raw SQL uses static statements with bound values, including lock acquisition.
export async function lockUser(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRawUnsafe("SELECT id FROM User WHERE id = ? FOR UPDATE", id);
}
export async function rateLimit(scope: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const key = digest(scope + ":" + Math.floor(now / (windowSeconds * 1000)));
  const expiresAt = new Date(now + windowSeconds * 2000);
  const count = await transaction(async tx => {
    await tx.$executeRawUnsafe("INSERT INTO RateLimit (`key`, count, expiresAt) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE count = count + 1", key, expiresAt);
    return (await tx.rateLimit.findUniqueOrThrow({ where: { key } })).count;
  });
  ensure(count <= limit, 429, "TOO_MANY_REQUESTS");
}
export async function login(input: unknown) {
  const data = z.object({ username: usernameSchema, password: z.string().min(1).max(72) }).parse(input);
  await rateLimit("login:" + data.username, 8, 900);
  const user = await db().user.findUnique({ where: { username: data.username } });
  const fallback = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5l2ZVwTqS7f4pDM8Z9sPu/rvDTHHq6W";
  const valid = await verifyPassword(data.password, user?.passwordHash ?? fallback);
  ensure(user && valid && user.status === "ACTIVE", 401, "INVALID_CREDENTIALS");
  const token = secret();
  await transaction(async tx => {
    await lockUser(tx, user.id);
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    ensure(current.status === "ACTIVE" && current.passwordHash === user.passwordHash, 401, "INVALID_CREDENTIALS");
    await tx.session.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  });
  return { token, user: await db().user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect }) };
}
export function tokenFrom(request: Request) {
  return (request.headers.get("cookie") ?? "").split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
}
export async function actorForToken(token?: string): Promise<Actor | null> {
  if (!token || token.length > 200) return null;
  const session = await db().session.findUnique({ where: { tokenHash: digest(token) }, include: { user: { select: userSelect } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
}
export async function requireActor(request: Request) {
  const actor = await actorForToken(tokenFrom(request));
  ensure(actor, 401, "LOGIN_REQUIRED");
  return actor;
}
export async function logout(token?: string) {
  if (token) await db().session.updateMany({ where: { tokenHash: digest(token), revokedAt: null }, data: { revokedAt: new Date() } });
}
export function sessionCookie(token: string, clear = false) {
  const secure = process.env.MATHS4U_ENV === "production" ? "; Secure" : "";
  return COOKIE + "=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + (clear ? 0 : 604800) + secure;
}
export async function changeUser(actor: Actor, userId: string, input: unknown) {
  admin(actor);
  const data = z.object({ roles: z.array(z.enum(["STUDENT", "TEACHER", "ADMIN"])).min(1).optional(),
    status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]).optional() }).strict().parse(input);
  ensure(actor.id !== userId, 400, "CANNOT_CHANGE_OWN_ACCESS");
  return transaction(async tx => {
    await lockUser(tx, userId);
    if (data.roles) {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({ data: [...new Set(data.roles)].map(role => ({ userId, role })) });
    }
    if (data.status) await tx.user.update({ where: { id: userId }, data: { status: data.status } });
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "USER_ACCESS_CHANGED", targetId: userId } });
    return tx.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
  });
}
export async function issueRecovery(actor: Actor, userId: string) {
  admin(actor);
  const token = secret();
  await transaction(async tx => {
    await lockUser(tx, userId);
    await tx.recoveryToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.recoveryToken.create({ data: { userId, issuedById: actor.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600000) } });
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "RECOVERY_ISSUED", targetId: userId } });
  });
  return { token, expiresInMinutes: 60 };
}
export async function recover(input: unknown) {
  const data = z.object({ token: z.string().min(30).max(100), password: passwordSchema }).parse(input);
  const passwordHash = await hashPassword(data.password);
  await transaction(async tx => {
    const found = await tx.recoveryToken.findUnique({ where: { tokenHash: digest(data.token) } });
    ensure(found, 400, "INVALID_RECOVERY");
    await lockUser(tx, found.userId);
    const row = await tx.recoveryToken.findUniqueOrThrow({ where: { id: found.id }, include: { user: true } });
    ensure(!row.usedAt && row.expiresAt > new Date() && row.user.status === "ACTIVE", 400, "INVALID_RECOVERY");
    await tx.recoveryToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
}

