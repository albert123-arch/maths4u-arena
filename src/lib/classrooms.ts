import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin, teacher, secret, transaction } from "./security";
import { ownClass } from "./works";
export async function createClass(actor: Actor, input: unknown) {
  teacher(actor);
  const data = z.object({ title: z.string().trim().min(2).max(191) }).parse(input);
  return db().classroom.create({ data: { ...data, teacherId: actor.id, joinCode: secret().slice(0, 16).toUpperCase() } });
}
export async function listClasses(actor: Actor, manage = false) {
  if (manage) teacher(actor);
  return db().classroom.findMany({ where: manage ? { teacherId: isAdmin(actor) ? undefined : actor.id }
    : { members: { some: { userId: actor.id, removedAt: null } }, archivedAt: null },
    select: { id: true, title: true, archivedAt: true, ...(manage ? { joinCode: true } : {}), _count: { select: { members: { where: { removedAt: null } } } } }, orderBy: { createdAt: "desc" } });
}
export async function classDetail(actor: Actor, id: string) {
  const classroom = await ownClass(actor, id);
  const members = await db().classMembership.findMany({ where: { classId: id, removedAt: null }, select: {
    user: { select: { id: true, username: true, displayName: true } }, joinedAt: true,
  } });
  return { ...classroom, members };
}
export async function joinClass(actor: Actor, input: unknown) {
  const { code } = z.object({ code: z.string().min(8).max(24).transform(s => s.toUpperCase()) }).parse(input);
  return transaction(async tx => {
    const classroom = await tx.classroom.findUnique({ where: { joinCode: code } });
    ensure(classroom && !classroom.archivedAt, 404, "CLASS_NOT_FOUND");
    const previous = await tx.classMembership.findUnique({ where: { classId_userId: { classId: classroom.id, userId: actor.id } } });
    // Removal cannot be bypassed by reusing the invite. Teacher must restore membership.
    ensure(!previous?.removedAt, 403, "MEMBERSHIP_REMOVED");
    return tx.classMembership.upsert({ where: { classId_userId: { classId: classroom.id, userId: actor.id } },
      create: { classId: classroom.id, userId: actor.id }, update: {} });
  });
}
export async function editClass(actor: Actor, id: string, input: unknown) {
  await ownClass(actor, id);
  const data = z.object({ archive: z.boolean().optional(), title: z.string().min(2).max(191).optional(),
    userId: z.string().optional(), remove: z.boolean().optional(), rotateCode: z.boolean().optional() }).strict().parse(input);
  if (data.userId && data.remove !== undefined) return db().classMembership.update({ where: { classId_userId: { classId: id, userId: data.userId } }, data: { removedAt: data.remove ? new Date() : null } });
  return db().classroom.update({ where: { id }, data: { title: data.title, archivedAt: data.archive === undefined ? undefined : data.archive ? new Date() : null,
    joinCode: data.rotateCode ? secret().slice(0, 16).toUpperCase() : undefined } });
}
