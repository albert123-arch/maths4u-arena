import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { ensure } from "./errors";
import { isAdmin, teacher, transaction, type Actor } from "./security";
import { localized } from "./content";
import { presentationLink } from "./presentation-url";

async function availableLesson(client: Prisma.TransactionClient, actor: Actor, lessonId: string) {
  teacher(actor);
  const lesson = await client.lesson.findUnique({ where: { id: lessonId }, include: {
    topic: { include: { course: true } },
    versions: { orderBy: { number: "desc" }, take: 1, include: { texts: true } },
  } });
  ensure(lesson && !lesson.archivedAt && !lesson.topic.course.archivedAt &&
    (lesson.topic.course.published || isAdmin(actor)) && lesson.versions.length, 404, "NOT_FOUND");
  return lesson;
}

export async function lessonPresentations(actor: Actor, lessonId: string, lang: string) {
  const lesson = await availableLesson(db(), actor, lessonId);
  const rows = await db().lessonPresentation.findMany({ where: { lessonId, archivedAt: null },
    orderBy: [{ position: "asc" }, { id: "asc" }], include: { owner: { select: { displayName: true } } } });
  return { lessonId, title: localized(lesson.versions[0].texts, lang).title, courseSlug: lesson.topic.course.slug,
    items: rows.map(row => {
      const link = presentationLink(row.url);
      ensure(link, 500, "INVALID_PRESENTATION_URL");
      return { id: row.id, title: row.title, revision: row.revision, ...link, ownerName: row.owner.displayName,
        editable: row.ownerId === actor.id || isAdmin(actor) };
    }) };
}
export type PresentationsDto = Awaited<ReturnType<typeof lessonPresentations>>;

const editSchema = z.object({
  action: z.literal("save"), id: z.string().min(1).max(191).optional(), revision: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(1).max(191), url: z.string().trim().min(1).max(2048),
});
const commandSchema = z.discriminatedUnion("action", [editSchema,
  z.object({ action: z.enum(["remove", "up", "down"]), id: z.string().min(1).max(191), revision: z.number().int().nonnegative() }),
]);

export async function changePresentation(actor: Actor, lessonId: string, input: unknown) {
  teacher(actor);
  const data = commandSchema.parse(input);
  const link = data.action === "save" ? presentationLink(data.url) : null;
  if (data.action === "save") ensure(link, 400, "INVALID_PRESENTATION_URL");
  return transaction(async tx => {
    // A parent-row lock serializes duplicate detection, appends and reordering.
    await tx.$queryRawUnsafe("SELECT id FROM Lesson WHERE id = ? FOR UPDATE", lessonId);
    await availableLesson(tx, actor, lessonId);
    const rows = await tx.lessonPresentation.findMany({ where: { lessonId, archivedAt: null }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    const current = data.id ? rows.find(row => row.id === data.id) : null;
    if (data.id) {
      ensure(current, 404, "NOT_FOUND");
      ensure(current.ownerId === actor.id || isAdmin(actor));
      ensure(current.revision === data.revision, 409, "STALE_PRESENTATION");
    }
    if (data.action === "save") {
      ensure(!rows.some(row => row.id !== data.id && row.sourceKey === link!.sourceKey), 409, "DUPLICATE_PRESENTATION");
      if (current) return tx.lessonPresentation.update({ where: { id: current.id }, data: {
        title: data.title, url: link!.url, sourceKey: link!.sourceKey, revision: { increment: 1 },
      }, select: { id: true } });
      ensure(rows.length < 50, 400, "PRESENTATION_LIMIT");
      return tx.lessonPresentation.create({ data: { lessonId, ownerId: actor.id, title: data.title,
        url: link!.url, sourceKey: link!.sourceKey, position: (rows.at(-1)?.position ?? -1) + 1 }, select: { id: true } });
    }
    ensure(current, 404, "NOT_FOUND");
    if (data.action === "remove") {
      await tx.lessonPresentation.update({ where: { id: current.id }, data: { archivedAt: new Date(), revision: { increment: 1 } } });
    } else {
      const i = rows.findIndex(row => row.id === current.id), j = i + (data.action === "up" ? -1 : 1);
      if (rows[j]) {
        // Only move the author's resource; the relative order of others is preserved.
        await tx.lessonPresentation.update({ where: { id: current.id }, data: { position: rows[j].position, revision: { increment: 1 } } });
        await tx.lessonPresentation.update({ where: { id: rows[j].id }, data: { position: current.position, revision: { increment: 1 } } });
      }
    }
    return { id: current.id };
  });
}
