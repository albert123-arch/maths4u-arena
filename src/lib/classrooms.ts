import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin, teacher, secret, transaction, lockUser } from "./security";
import { ownClass } from "./works";
import { userViewTeacher } from "./request-view";
import { limitsForTeacher, requireClassCapacity, requireStudentCapacity } from "./teacher-account";
export async function createClass(actor: Actor, input: unknown) {
  teacher(actor);
  const data = z.object({ title: z.string().trim().min(2).max(191) }).parse(input);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    await requireClassCapacity(tx, actor.id, await limitsForTeacher(tx, actor.id));
    return tx.classroom.create({ data: { ...data, teacherId: actor.id, joinCode: secret().slice(0, 16).toUpperCase() } });
  });
}
export async function listClasses(actor: Actor, manage = false) {
  if (manage) teacher(actor);
  return db().classroom.findMany({ where: manage ? { teacherId: isAdmin(actor) ? undefined : actor.id }
    : { members: { some: { userId: actor.id, removedAt: null } }, archivedAt: null, ...(userViewTeacher() ? { teacherId: userViewTeacher()!.id } : {}) },
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
    const found = await tx.classroom.findUnique({ where: { joinCode: code } });
    ensure(found, 404, "CLASS_NOT_FOUND");
    await lockUser(tx, found.teacherId);
    const classroom = await tx.classroom.findUnique({ where: { id: found.id } });
    ensure(classroom && !classroom.archivedAt && classroom.joinCode === code, 404, "CLASS_NOT_FOUND");
    const previous = await tx.classMembership.findUnique({ where: { classId_userId: { classId: classroom.id, userId: actor.id } } });
    // Removal cannot be bypassed by reusing the invite. Teacher must restore membership.
    ensure(!previous?.removedAt, 403, "MEMBERSHIP_REMOVED");
    await requireStudentCapacity(tx, classroom.teacherId, await limitsForTeacher(tx, classroom.teacherId), [actor.id]);
    return tx.classMembership.upsert({ where: { classId_userId: { classId: classroom.id, userId: actor.id } },
      create: { classId: classroom.id, userId: actor.id }, update: {} });
  });
}
export async function editClass(actor: Actor, id: string, input: unknown) {
  const owned = await ownClass(actor, id);
  const data = z.object({ archive: z.boolean().optional(), title: z.string().min(2).max(191).optional(),
    userId: z.string().optional(), remove: z.boolean().optional(), rotateCode: z.boolean().optional() }).strict().parse(input);
  return transaction(async tx => {
    await lockUser(tx, owned.teacherId);
    const classroom = await ownClass(actor, id, tx);
    const limits = await limitsForTeacher(tx, classroom.teacherId);
    if (data.userId && data.remove !== undefined) {
      if (!data.remove && !classroom.archivedAt) await requireStudentCapacity(tx, classroom.teacherId, limits, [data.userId]);
      return tx.classMembership.update({ where: { classId_userId: { classId: id, userId: data.userId } }, data: { removedAt: data.remove ? new Date() : null } });
    }
    if (data.archive === false && classroom.archivedAt) {
      await requireClassCapacity(tx, classroom.teacherId, limits);
      const members = await tx.classMembership.findMany({ where: { classId: id, removedAt: null }, select: { userId: true } });
      await requireStudentCapacity(tx, classroom.teacherId, limits, members.map(m => m.userId));
    }
    return tx.classroom.update({ where: { id }, data: { title: data.title, archivedAt: data.archive === undefined ? undefined : data.archive ? new Date() : null,
      joinCode: data.rotateCode ? secret().slice(0, 16).toUpperCase() : undefined } });
  });
}
