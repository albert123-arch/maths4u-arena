import { z } from "zod";
import { db } from "./prisma";
import { type Actor, admin, transaction } from "./security";
import { archiveAdmin } from "./content-access";
import { ensure } from "./errors";
import { origins } from "./content-origin";

export async function changeContentAccess(actor: Actor, id: string, input: unknown) {
  admin(actor); ensure(archiveAdmin(actor));
  const d = z.object({ origin: z.enum(origins).optional(), reason: z.string().trim().min(5).max(1000), archive: z.boolean().optional() }).strict().parse(input);
  ensure(d.origin !== undefined || d.archive !== undefined, 400, "INVALID_INPUT");
  return transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Task WHERE id=${id} FOR UPDATE`;
    const t = await tx.task.findUnique({ where: { id } }); ensure(t, 404, "NOT_FOUND");
    ensure(d.archive !== true || (d.origin ?? t.origin) === "CAMBRIDGE_EXAM", 400, "CAMBRIDGE_ONLY");
    ensure(!t.examArchivedAt || d.archive === false || (d.origin ?? t.origin) === "CAMBRIDGE_EXAM", 400, "CAMBRIDGE_ONLY");
    const row = await tx.task.update({ where: { id }, data: {
      ...(d.origin ? { origin: d.origin, originManual: true, originRule: "owner-manual", originReason: d.reason } : {}),
      ...(d.archive === undefined ? {} : { examArchivedAt: d.archive ? t.examArchivedAt ?? new Date() : null }),
    } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: d.origin ? "CONTENT_ORIGIN_MANUAL" : d.archive ? "CAMBRIDGE_ARCHIVED" : "CAMBRIDGE_RESTORED", targetId: id } });
    return { id, origin: row.origin, originManual: row.originManual, examArchivedAt: row.examArchivedAt };
  });
}
export async function archiveOverview(actor: Actor) {
  admin(actor); ensure(archiveAdmin(actor));
  const counts = await db().task.groupBy({ by: ["origin"], _count: true });
  return { counts: counts.map(c => ({ origin: c.origin, count: c._count })), archived: await db().task.count({ where: { examArchivedAt: { not: null } } }) };
}
