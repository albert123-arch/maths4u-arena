import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, admin, isAdmin, transaction, lockUser } from "./security";

export async function featureAllowance(actor: Actor, key: string, now = new Date()) {
  if (isAdmin(actor)) return { allowed: true, remaining: null };
  const subscriptions = await db().subscription.findMany({ where: { userId: actor.id, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now },
    plan: { features: { some: { featureKey: key } } } }, include: { plan: { include: { features: { where: { featureKey: key } } } } } });
  for (const sub of subscriptions) {
    const limit = sub.plan.features[0].usageLimit;
    if (limit === null) return { allowed: true, remaining: null };
    const used = await db().usageEvent.aggregate({ where: { userId: actor.id, featureKey: key, createdAt: { gte: sub.startsAt, lt: sub.endsAt } }, _sum: { units: true } });
    const remaining = Math.max(0, limit - (used._sum.units ?? 0));
    if (remaining > 0) return { allowed: true, remaining };
  }
  return { allowed: false, remaining: 0 };
}
export async function hasFeature(actor: Actor, key: string) { return (await featureAllowance(actor, key)).allowed; }
export async function savePlan(actor: Actor, input: unknown) {
  admin(actor);
  const data = z.object({ name: z.string().min(1).max(100), active: z.boolean().default(true), features: z.array(z.object({
    key: z.string().regex(/^[a-z][a-z0-9_.]{1,99}$/), title: z.string().min(1).max(191), usageLimit: z.number().int().min(1).nullable().default(null),
  })).min(1).max(30) }).parse(input);
  ensure(new Set(data.features.map(f => f.key)).size === data.features.length, 400, "DUPLICATE_FEATURE");
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    for (const f of data.features) await tx.feature.upsert({ where: { key: f.key }, create: { key: f.key, title: f.title }, update: { title: f.title } });
    const plan = await tx.plan.upsert({ where: { name: data.name }, create: { name: data.name, active: data.active }, update: { active: data.active } });
    await tx.planFeature.deleteMany({ where: { planId: plan.id } });
    await tx.planFeature.createMany({ data: data.features.map(f => ({ planId: plan.id, featureKey: f.key, usageLimit: f.usageLimit })) });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "PLAN_UPDATED", targetId: plan.id } });
    return plan;
  });
}
export async function grantSubscription(actor: Actor, input: unknown) {
  admin(actor);
  const data = z.object({ userId: z.string(), planId: z.string(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), reason: z.string().min(3).max(500) }).parse(input);
  ensure(data.endsAt > data.startsAt && data.endsAt > new Date(), 400, "INVALID_PERIOD");
  ensure(await db().plan.findFirst({ where: { id: data.planId, active: true } }), 400, "PLAN_UNAVAILABLE");
  return transaction(async tx => {
    const sub = await tx.subscription.create({ data: { ...data, grantedById: actor.id } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "ACCESS_GRANTED", targetId: sub.id } });
    return sub;
  });
}
export async function revokeSubscription(actor: Actor, id: string) {
  admin(actor);
  return transaction(async tx => {
    const sub = await tx.subscription.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "ACCESS_REVOKED", targetId: id } });
    return sub;
  });
}

