import { z } from "zod";
import { db } from "./prisma";
import { admin, lockUser, transaction, type Actor } from "./security";
import { ensure } from "./errors";
import { renderContent } from "./content";
export async function structure(actor: Actor) {
  admin(actor);
  return db().course.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }], include: { texts: true, topics: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { texts: true, lessons: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { tasks: { orderBy: { position: "asc" }, select: { taskId: true } }, versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } } } } } } } });
}
export async function saveStructure(actor: Actor, input: unknown) {
  admin(actor);
  const data = z.object({ kind: z.enum(["course", "chapter", "topic"]), id: z.string().optional(), parentId: z.string().optional(), slug: z.string().regex(/^[a-z0-9-]{2,120}$/).optional(), position: z.number().int().min(0).max(10000), published: z.boolean().optional(),
    texts: z.array(z.object({ locale: z.enum(["ru", "en"]), title: z.string().min(1).max(191), description: z.string().max(10000).default(""), body: z.string().max(100000).default(""), examples: z.string().max(100000).default("") })).min(1).max(2), taskIds: z.array(z.string()).max(1000).optional() }).parse(input);
  ensure(new Set(data.texts.map(t => t.locale)).size === data.texts.length, 400, "DUPLICATE_LOCALE");
  for (const text of data.texts) ensure(!renderContent(text.body + text.examples).includes('class="katex-error"'), 400, "INVALID_FORMULA");
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    if (data.kind === "course") {
      ensure(data.id || data.slug, 400, "SLUG_REQUIRED");
      const course = data.id ? await tx.course.update({ where: { id: data.id }, data: { position: data.position, published: data.published } }) : await tx.course.create({ data: { slug: data.slug!, position: data.position, published: data.published ?? false } });
      for (const { locale, title, description } of data.texts) await tx.courseText.upsert({ where: { courseId_locale: { courseId: course.id, locale } }, create: { courseId: course.id, locale, title, description }, update: { title, description } });
      return { id: course.id };
    }
    if (data.kind === "chapter") {
      ensure(data.id || (data.parentId && data.slug), 400, "PARENT_REQUIRED");
      const chapter = data.id ? await tx.topic.update({ where: { id: data.id }, data: { position: data.position } }) : await tx.topic.create({ data: { courseId: data.parentId!, slug: data.slug!, position: data.position } });
      for (const { locale, title } of data.texts) await tx.topicText.upsert({ where: { topicId_locale: { topicId: chapter.id, locale } }, create: { topicId: chapter.id, locale, title }, update: { title } });
      return { id: chapter.id };
    }
    ensure(data.id || data.parentId, 400, "PARENT_REQUIRED");
    const lesson = data.id ? await tx.lesson.update({ where: { id: data.id }, data: { position: data.position } }) : await tx.lesson.create({ data: { topicId: data.parentId!, position: data.position } });
    const previous = await tx.lessonVersion.findFirst({ where: { lessonId: lesson.id }, orderBy: { number: "desc" }, include: { texts: true } });
    const texts = data.texts.map(({ locale, title, body, examples }) => ({ locale, title, body, examples })).sort((a,b) => a.locale.localeCompare(b.locale));
    const old = previous?.texts.map(({ locale, title, body, examples }) => ({ locale, title, body, examples: examples ?? "" })).sort((a,b) => a.locale.localeCompare(b.locale));
    if (JSON.stringify(old) !== JSON.stringify(texts)) await tx.lessonVersion.create({ data: { lessonId: lesson.id, number: (previous?.number ?? 0) + 1, texts: { create: texts } } });
    if (data.taskIds) {
      ensure(new Set(data.taskIds).size === data.taskIds.length, 400, "DUPLICATE_TASK");
      ensure(await tx.task.count({ where: { id: { in: data.taskIds }, archivedAt: null } }) === data.taskIds.length, 400, "TASK_UNAVAILABLE");
      await tx.lessonTask.deleteMany({ where: { lessonId: lesson.id, taskId: { notIn: data.taskIds } } });
      for (const [position, taskId] of data.taskIds.entries()) await tx.lessonTask.upsert({ where: { lessonId_taskId: { lessonId: lesson.id, taskId } }, create: { lessonId: lesson.id, taskId, position }, update: { position } });
    }
    return { id: lesson.id };
  });
}
