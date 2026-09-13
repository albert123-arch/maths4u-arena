import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, teacher, isAdmin, transaction, lockUser } from "./security";
import { workSchema, createWork } from "./works";

export async function createOlympiad(actor: Actor, input: unknown) {
  teacher(actor);
  const data = z.object({ title: z.string().min(2).max(191), registrationOpensAt: z.coerce.date(), registrationClosesAt: z.coerce.date(),
    groupTitle: z.string().min(1).max(100), minAge: z.number().int().min(5).max(99), maxAge: z.number().int().min(5).max(99),
    work: workSchema }).parse(input);
  ensure(data.maxAge >= data.minAge && data.registrationClosesAt > data.registrationOpensAt && data.registrationClosesAt <= data.work.dueAt, 400, "INVALID_PERIOD");
  return transaction(async tx => {
    const olympiad = await tx.olympiad.create({ data: { title: data.title, organizerId: actor.id, registrationOpensAt: data.registrationOpensAt,
      registrationClosesAt: data.registrationClosesAt, groups: { create: { title: data.groupTitle, minAge: data.minAge, maxAge: data.maxAge } } }, include: { groups: true } });
    const work = await createWork(tx, actor, { ...data.work, classId: undefined, kind: "OLYMPIAD", attemptsAllowed: 1, resultPolicy: "MANUAL" });
    await tx.olympiadRound.create({ data: { olympiadId: olympiad.id, groupId: olympiad.groups[0].id, workId: work.id, number: 1 } });
    return olympiad;
  });
}
export async function registerOlympiad(actor: Actor, id: string, input: unknown) {
  const data = z.object({ groupId: z.string(), age: z.number().int().min(5).max(99) }).parse(input);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const olympiad = await tx.olympiad.findUnique({ where: { id }, include: { groups: true } });
    ensure(olympiad && !olympiad.archivedAt, 404, "NOT_FOUND");
    const now = new Date(), group = olympiad.groups.find(g => g.id === data.groupId);
    ensure(olympiad.registrationOpensAt <= now && olympiad.registrationClosesAt > now, 409, "REGISTRATION_CLOSED");
    ensure(group && data.age >= group.minAge && data.age <= group.maxAge, 400, "INVALID_AGE_GROUP");
    const existing = await tx.olympiadRegistration.findUnique({ where: { olympiadId_userId: { olympiadId: id, userId: actor.id } } });
    ensure(!existing || existing.groupId === data.groupId, 409, "ALREADY_REGISTERED");
    return tx.olympiadRegistration.upsert({ where: { olympiadId_userId: { olympiadId: id, userId: actor.id } }, create: { olympiadId: id, userId: actor.id, ...data }, update: {} });
  });
}
export async function listOlympiads(actor: Actor) {
  const rows = await db().olympiad.findMany({ where: { archivedAt: null }, take: 100, include: { groups: true, registrations: {
    where: { userId: actor.id }, select: { groupId: true } }, rounds: { include: { work: { include: { versions: true } } } } }, orderBy: { registrationOpensAt: "desc" } });
  return rows.map(o => ({ id: o.id, title: o.title, groups: o.groups, registrationOpensAt: o.registrationOpensAt, registrationClosesAt: o.registrationClosesAt,
    registered: !!o.registrations.length, manager: o.organizerId === actor.id || isAdmin(actor), rounds: o.rounds.filter(r => !o.registrations.length || r.groupId === o.registrations[0].groupId).map(r => ({
      workId: r.workId, title: r.work.title, number: r.number, opensAt: r.work.versions[0].opensAt, dueAt: r.work.versions[0].dueAt, resultsPublished: !!r.work.resultsPublishedAt,
    })) }));
}
export async function olympiadResults(actor: Actor, id: string) {
  const olympiad = await db().olympiad.findUnique({ where: { id }, include: { rounds: { include: { work: { include: { versions: true } } } } } });
  ensure(olympiad, 404, "NOT_FOUND");
  const manager = isAdmin(actor) || olympiad.organizerId === actor.id;
  const reg = await db().olympiadRegistration.findUnique({ where: { olympiadId_userId: { olympiadId: id, userId: actor.id } } });
  ensure(manager || reg, 404, "NOT_FOUND");
  const rounds = olympiad.rounds.filter(r => manager || r.groupId === reg?.groupId);
  ensure(rounds.every(r => r.work.resultsPublishedAt && r.work.versions[0].dueAt <= new Date()), 403, "RESULTS_HIDDEN");
  const attempts = await db().attempt.findMany({ where: { workVersion: { workId: { in: rounds.map(r => r.workId) } }, status: "GRADED" },
    include: { user: { select: { displayName: true } }, answers: { include: { review: true } }, workVersion: { include: { work: { include: { round: true } } } } } });
  return attempts.map(a => ({ participant: a.user.displayName, groupId: a.workVersion.work.round!.groupId, round: a.workVersion.work.round!.number,
    score: a.answers.reduce((sum, r) => sum + (r.review?.points ?? r.autoPoints ?? 0), 0) })).sort((a, b) => b.score - a.score);
}
