import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { type Actor, isAdmin, isTeacher, teacher, transaction, lockUser } from "./security";
import { ensure } from "./errors";
import { hasFeature } from "./subscriptions";
import { localized, publicVersion, renderContent, versionInclude } from "./content";

const filterSchema = z.object({ q: z.string().max(100).default(""), course: z.string().max(191).default(""), chapter: z.string().max(191).default(""), topic: z.string().max(191).default(""),
  category: z.enum(["", "UNKNOWN", "EXAM", "TRAINING", "OLYMPIAD"]).default(""), year: z.string().regex(/^$|^\d{4}$/).default(""), session: z.string().max(50).default(""), paper: z.string().max(50).default(""),
  language: z.enum(["", "ru", "en"]).default(""), difficulty: z.string().regex(/^$|^[1-5]$/).default(""), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(25) });
export async function taskPermission(actor: Actor | null): Promise<Prisma.TaskWhereInput> {
  const visible: Prisma.TaskWhereInput = { archivedAt: null, versions: { some: {} }, OR: [{ visibility: "PUBLIC" }, ...(actor && isTeacher(actor) ? [{ ownerId: actor.id }, ...(isAdmin(actor) ? [{}] : [])] : [])] };
  if (actor && isTeacher(actor)) return visible;
  const features = await db().task.groupBy({ by: ["featureKey"], where: { ...visible, featureKey: { not: null } } });
  const granted: string[] = [];
  for (const { featureKey } of features) if (featureKey && actor && await hasFeature(actor, featureKey)) granted.push(featureKey);
  return { AND: [visible, { OR: [{ featureKey: null }, { featureKey: { in: granted } }] }] };
}
async function sqlPermission(actor: Actor | null) {
  const clauses = [Prisma.sql`t.archivedAt IS NULL`];
  if (!actor || !isAdmin(actor)) clauses.push(actor && isTeacher(actor) ? Prisma.sql`(t.visibility = 'PUBLIC' OR t.ownerId = ${actor.id})` : Prisma.sql`t.visibility = 'PUBLIC'`);
  if (!actor || !isTeacher(actor)) {
    const features = await db().task.groupBy({ by: ["featureKey"], where: { visibility: "PUBLIC", archivedAt: null, featureKey: { not: null } } });
    const granted: string[] = [];
    for (const { featureKey } of features) if (featureKey && actor && await hasFeature(actor, featureKey)) granted.push(featureKey);
    clauses.push(granted.length ? Prisma.sql`(t.featureKey IS NULL OR t.featureKey IN (${Prisma.join(granted)}))` : Prisma.sql`t.featureKey IS NULL`);
  }
  return clauses;
}
const categorySql = Prisma.sql`CASE WHEN v.materialCategory <> 'UNKNOWN' THEN v.materialCategory
  WHEN v.syllabus IS NOT NULL AND v.year IS NOT NULL AND v.paper IS NOT NULL AND EXISTS(SELECT 1 FROM ImportRecord ir WHERE ir.taskId=t.id AND ir.sourceProject='maths4u') THEN 'EXAM'
  WHEN EXISTS(SELECT 1 FROM ImportRecord ir WHERE ir.taskId=t.id AND ir.sourceProject='olymp') THEN 'OLYMPIAD' ELSE 'UNKNOWN' END`;
const difficultySql = Prisma.sql`CASE WHEN v.difficultyKnown OR EXISTS(SELECT 1 FROM ImportRecord ir WHERE ir.taskId=t.id AND ir.sourceProject='olymp') THEN v.difficulty ELSE NULL END`;
const fromSql = Prisma.sql`FROM Task t JOIN TaskVersion v ON v.taskId=t.id AND v.number=(SELECT MAX(v2.number) FROM TaskVersion v2 WHERE v2.taskId=t.id)`;

export async function catalog(actor: Actor | null, lang: string, input: unknown) {
  const f = filterSchema.parse(input), base = await sqlPermission(actor);
  if (f.q) base.push(Prisma.sql`EXISTS(SELECT 1 FROM TaskText tt WHERE tt.versionId=v.id AND tt.title LIKE ${"%" + f.q + "%"})`);
  if (f.course || f.chapter || f.topic) {
    const hierarchy = [Prisma.sql`lt.taskId=t.id`, Prisma.sql`l.archivedAt IS NULL`, Prisma.sql`c.archivedAt IS NULL`];
    if (!actor || !isAdmin(actor)) hierarchy.push(Prisma.sql`c.published=true`);
    if (f.course) hierarchy.push(Prisma.sql`c.id=${f.course}`); if (f.chapter) hierarchy.push(Prisma.sql`ch.id=${f.chapter}`); if (f.topic) hierarchy.push(Prisma.sql`l.id=${f.topic}`);
    base.push(Prisma.sql`EXISTS(SELECT 1 FROM LessonTask lt JOIN Lesson l ON l.id=lt.lessonId JOIN Topic ch ON ch.id=l.topicId JOIN Course c ON c.id=ch.courseId WHERE ${Prisma.join(hierarchy, " AND ")})`);
    // Access to a restricted course also gates the topic-filtered list.
    const selected = await db().course.findMany({ where: { ...(f.course ? { id: f.course } : {}), topics: { some: { ...(f.chapter ? { id: f.chapter } : {}), ...(f.topic ? { lessons: { some: { id: f.topic } } } : {}) } } }, select: { featureKey: true } });
    for (const c of selected) ensure(!c.featureKey || !!(actor && isTeacher(actor)) || !!(actor && await hasFeature(actor, c.featureKey)), 403, "SUBSCRIPTION_REQUIRED");
  }
  const where = [...base];
  if (f.category) where.push(Prisma.sql`${categorySql}=${f.category}`);
  if (f.year) where.push(Prisma.sql`v.year=${Number(f.year)}`); if (f.session) where.push(Prisma.sql`v.examSession=${f.session}`); if (f.paper) where.push(Prisma.sql`v.paper=${f.paper}`);
  if (f.difficulty) where.push(Prisma.sql`${difficultySql}=${Number(f.difficulty)}`);
  if (f.language) where.push(Prisma.sql`EXISTS(SELECT 1 FROM TaskText tt WHERE tt.versionId=v.id AND tt.locale=${f.language})`);
  const facetRows = await db().$queryRaw<{ category: string; year: number | null; session: string | null; paper: string | null; difficulty: number | null; language: string }[]>(Prisma.sql`SELECT DISTINCT ${categorySql} AS category, v.year, v.examSession AS session, v.paper, ${difficultySql} AS difficulty, tt.locale AS language ${fromSql} JOIN TaskText tt ON tt.versionId=v.id WHERE ${Prisma.join(base, " AND ")}`);
  const [count] = await db().$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total ${fromSql} WHERE ${Prisma.join(where, " AND ")}`);
  const total = Number(count.total), pages = Math.max(1, Math.ceil(total / f.pageSize)), page = Math.min(f.page, pages);
  const order = f.topic ? Prisma.sql`(SELECT lt.position FROM LessonTask lt WHERE lt.lessonId=${f.topic} AND lt.taskId=t.id)` : Prisma.sql`t.createdAt DESC`;
  const ids = await db().$queryRaw<{ id: string; category: string; difficulty: number | null }[]>(Prisma.sql`SELECT t.id, ${categorySql} AS category, ${difficultySql} AS difficulty ${fromSql} WHERE ${Prisma.join(where, " AND ")} ORDER BY ${order}, t.id LIMIT ${f.pageSize} OFFSET ${(page - 1) * f.pageSize}`);
  const tasks = await db().task.findMany({ where: { id: { in: ids.map(r => r.id) } }, include: { versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } });
  const facet = <K extends keyof (typeof facetRows)[number]>(key: K) => [...new Set(facetRows.map(r => r[key]).filter(v => v !== null && v !== ""))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  return { total, page, pages, pageSize: f.pageSize, facets: { categories: facet("category"), years: facet("year"), sessions: facet("session"), papers: facet("paper"), difficulties: facet("difficulty"), languages: facet("language") },
    items: ids.map((meta, i) => { const task = tasks.find(t => t.id === meta.id)!, v = task.versions[0]; return { id: task.id, number: (page - 1) * f.pageSize + i + 1, category: meta.category, difficulty: meta.difficulty,
      editable: !!actor && (isAdmin(actor) || task.ownerId === actor.id), points: v.parts.reduce((n, p) => n + p.maxPoints, 0), languages: v.texts.map(t => t.locale), version: publicVersion(v, lang) }; }) };
}
export type CatalogDto = Awaited<ReturnType<typeof catalog>>;

export async function courseCatalog(actor: Actor | null, lang: string, slug?: string) {
  const permission = await taskPermission(actor);
  const rows = await db().course.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }], where: { archivedAt: null, ...(slug ? { slug } : {}), ...(actor && isAdmin(actor) ? {} : { published: true }) }, include: { texts: true, topics: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { texts: true, lessons: { where: { archivedAt: null }, orderBy: [{ position: "asc" }, { id: "asc" }], include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: { select: { locale: true, title: true } } } }, _count: { select: { tasks: { where: { task: permission } } } } } } } } } });
  return Promise.all(rows.map(async c => {
    const allowed = !c.featureKey || !!(actor && isTeacher(actor)) || !!(actor && await hasFeature(actor, c.featureKey));
    const chapters = await Promise.all(c.topics.map(async ch => ({ id: ch.id, title: localized(ch.texts, lang).title, position: ch.position,
      count: allowed ? await db().task.count({ where: { AND: [permission, { lessons: { some: { lesson: { archivedAt: null, topicId: ch.id } } } }] } }) : 0,
      topics: ch.lessons.filter(l => l.versions.length).map(l => ({ id: l.id, title: localized(l.versions[0].texts, lang).title, count: allowed ? l._count.tasks : 0 })) })));
    return { id: c.id, slug: c.slug, groupLabel:c.groupLabel, title: localized(c.texts, lang).title, description: localized(c.texts, lang).description, locked: !allowed,
      count: allowed ? await db().task.count({ where: { AND: [permission, { lessons: { some: { lesson: { archivedAt: null, topic: { courseId: c.id } } } } }] } }) : 0, chapters };
  }));
}
export async function topicContent(actor: Actor | null, id: string, lang: string) {
  const l = await db().lesson.findUnique({ where: { id }, include: { topic: { include: { texts: true, course: { include: { texts: true } } } }, versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } } } });
  ensure(l && !l.archivedAt && !l.topic.course.archivedAt && (l.topic.course.published || !!(actor && isAdmin(actor))) && l.versions.length, 404, "NOT_FOUND");
  const c = l.topic.course;
  ensure(!c.featureKey || !!(actor && isTeacher(actor)) || !!(actor && await hasFeature(actor, c.featureKey)), 403, "SUBSCRIPTION_REQUIRED");
  const text = localized(l.versions[0].texts, lang), hierarchy = (await courseCatalog(actor, lang, c.slug))[0];
  const topics = hierarchy.chapters.flatMap(ch => ch.topics), i = topics.findIndex(t => t.id === id);
  return { id, title: text.title, locale: text.locale, body: renderContent(text.body), examples: renderContent(text.examples ?? ""),
    course: { id: c.id, slug: c.slug, title: localized(c.texts, lang).title }, chapter: { id: l.topicId, title: localized(l.topic.texts, lang).title }, previous: topics[i - 1] ?? null, next: topics[i + 1] ?? null };
}

export async function basket(actor: Actor, lang: string) {
  teacher(actor);
  const saved = await db().taskBasket.findUnique({ where: { userId: actor.id } });
  const ids = z.array(z.string()).max(50).parse(saved?.taskIds ?? []);
  const tasks = await db().task.findMany({ where: { AND: [await taskPermission(actor), { id: { in: ids } }] }, include: { versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } });
  return { revision: saved?.revision ?? 0, taskIds: ids, items: ids.map(id => {
    const task = tasks.find(t => t.id === id), v = task?.versions[0];
    return v ? { id, available: true, public: task!.visibility === "PUBLIC", title: localized(v.texts, lang).title, points: v.parts.reduce((n, p) => n + p.maxPoints, 0), version: publicVersion(v, lang) }
      : { id, available: false, public: false, title: "", points: 0, version: null };
  }) };
}
export async function saveBasket(actor: Actor, input: unknown, lang: string) {
  teacher(actor);
  const data = z.object({ taskIds: z.array(z.string().min(1).max(191)).max(50).refine(ids => new Set(ids).size === ids.length), revision: z.number().int().nonnegative() }).parse(input);
  await transaction(async tx => { await lockUser(tx, actor.id); const current = await tx.taskBasket.findUnique({ where: { userId: actor.id } });
    ensure(data.revision === (current?.revision ?? 0), 409, "STALE_BASKET");
    await tx.taskBasket.upsert({ where: { userId: actor.id }, create: { userId: actor.id, taskIds: data.taskIds, revision: 1 }, update: { taskIds: data.taskIds, revision: { increment: 1 }, updatedAt: new Date() } });
  });
  return basket(actor, lang);
}
export type BasketDto = Awaited<ReturnType<typeof basket>>;
