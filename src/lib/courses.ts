import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, admin, isAdmin, transaction, lockUser } from "./security";
import { localized, renderContent } from "./content";
import { hasFeature } from "./subscriptions";

export async function saveCourse(actor: Actor, input: unknown) {
  admin(actor);
  const text = z.object({ locale: z.enum(["ru", "en"]), title: z.string().min(1).max(191), description: z.string().max(10000).default("") });
  const data = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,120}$/), published: z.boolean().default(true), featureKey: z.string().nullable().default(null),
    texts: z.array(text).min(1).max(2), topicSlug: z.string().regex(/^[a-z0-9-]{2,120}$/),
    topicRu: z.string().min(1).max(191), topicEn: z.string().min(1).max(191),
    lessonRu: z.string().min(1).max(100000), lessonEn: z.string().min(1).max(100000),
  }).parse(input);
  ensure(new Set(data.texts.map(t => t.locale)).size === data.texts.length, 400, "DUPLICATE_LOCALE");
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    const course = await tx.course.upsert({ where: { slug: data.slug }, create: { slug: data.slug, published: data.published, featureKey: data.featureKey },
      update: { published: data.published, featureKey: data.featureKey } });
    for (const t of data.texts) await tx.courseText.upsert({ where: { courseId_locale: { courseId: course.id, locale: t.locale } },
      create: { courseId: course.id, ...t }, update: t });
    const topic = await tx.topic.upsert({ where: { courseId_slug: { courseId: course.id, slug: data.topicSlug } },
      create: { courseId: course.id, slug: data.topicSlug }, update: {} });
    for (const locale of ["ru", "en"] as const) {
      const title = locale === "ru" ? data.topicRu : data.topicEn;
      await tx.topicText.upsert({ where: { topicId_locale: { topicId: topic.id, locale } }, create: { topicId: topic.id, locale, title }, update: { title } });
    }
    const lesson = await tx.lesson.findFirst({ where: { topicId: topic.id } }) ?? await tx.lesson.create({ data: { topicId: topic.id } });
    const count = await tx.lessonVersion.count({ where: { lessonId: lesson.id } });
    await tx.lessonVersion.create({ data: { lessonId: lesson.id, number: count + 1, texts: { create: [
      { locale: "ru", title: data.topicRu, body: data.lessonRu }, { locale: "en", title: data.topicEn, body: data.lessonEn },
    ] } } });
    return course;
  });
}
export async function courses(actor: Actor | null, lang: string, slug?: string) {
  const rows = await db().course.findMany({ where: { archivedAt: null, ...(slug ? { slug } : {}), ...(actor && isAdmin(actor) ? {} : { published: true }) },
    include: { texts: true, topics: { orderBy: { position: "asc" }, include: { texts: true, lessons: { where: { archivedAt: null }, include: {
      versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } },
      tasks: { where: { task: { archivedAt: null, ...(actor && isAdmin(actor) ? {} : { visibility: "PUBLIC" }) } }, orderBy: { position: "asc" },
        include: { task: { include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } } } } } },
      progress: actor ? { where: { userId: actor.id } } : false,
    } } } } } });
  return Promise.all(rows.map(async c => {
    const allowed = !!(actor && isAdmin(actor)) || !c.featureKey || (actor && await hasFeature(actor, c.featureKey));
    const t = localized(c.texts, lang);
    return { id: c.id, slug: c.slug, title: t.title, description: t.description, locked: !allowed, featureKey: c.featureKey,
      topics: c.topics.map(topic => ({ id: topic.id, title: localized(topic.texts, lang).title,
        lessons: topic.lessons.map(lesson => { const l = localized(lesson.versions[0].texts, lang); return {
          id: lesson.id, title: l.title, completed: lesson.progress?.[0]?.completed ?? false,
          openedAt: lesson.progress?.[0]?.openedAt ?? null, ...(allowed ? { body: renderContent(l.body),
            tasks: lesson.tasks.map(({ task, position }) => ({ id: task.id, position, title: localized(task.versions[0].texts, lang).title })) } : {}),
        }; }) })) };
  }));
}
export async function progress(actor: Actor, lessonId: string, input: unknown) {
  const { completed } = z.object({ completed: z.boolean() }).parse(input);
  const lesson = await db().lesson.findUnique({ where: { id: lessonId }, include: { topic: { include: { course: true } } } });
  ensure(lesson && !lesson.archivedAt && lesson.topic.course.published && !lesson.topic.course.archivedAt, 404, "NOT_FOUND");
  const key = lesson.topic.course.featureKey;
  ensure(!key || await hasFeature(actor, key), 403, "SUBSCRIPTION_REQUIRED");
  return db().learningProgress.upsert({ where: { userId_lessonId: { userId: actor.id, lessonId } }, create: { userId: actor.id, lessonId, completed },
    update: { completed, openedAt: new Date() } });
}
