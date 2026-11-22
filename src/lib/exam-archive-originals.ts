import { publicVersion, versionInclude } from "./content";
import { archiveOriginalTaskWhere } from "./exam-archive-counts";
import { db } from "./prisma";

const originalPageSize = 10;
const empty = { items: [], total: 0, page: 1, pages: 1, href: null, hasNotes: false };

export async function examArchiveOriginals(topic: { lessonId: string | null; courseSlug: string | null }, page = 1, cachedTotal?: number) {
  if (!topic.lessonId || !topic.courseSlug) return empty;
  const client = db();
  const lesson = await client.lesson.findFirst({
    where: {
      id: topic.lessonId, archivedAt: null,
      topic: { course: { slug: topic.courseSlug, published: true, archivedAt: null, featureKey: null } },
    },
    select: { versions: { orderBy: { number: "desc" }, take: 1, select: { texts: { where: { locale: "en" }, select: { body: true } } } } },
  });
  if (!lesson) return empty;
  const where = {
    lessonId: topic.lessonId,
    task: archiveOriginalTaskWhere,
  };
  const total = cachedTotal ?? await client.lessonTask.count({ where });
  const pages = Math.max(1, Math.ceil(total / originalPageSize));
  page = Math.min(Math.max(1, page), pages);
  const matches = await client.lessonTask.findMany({
    where,
    orderBy: [{ position: "asc" }, { taskId: "asc" }],
    take: originalPageSize,
    skip: (page - 1) * originalPageSize,
    select: { taskId: true, task: { select: { versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } } },
  });
  return {
    total, page, pages,
    href: total ? "/courses/" + topic.courseSlug + "/topics/" + topic.lessonId : null,
    hasNotes: !!lesson.versions[0]?.texts[0]?.body.trim() && total > 0,
    items: matches.flatMap(({ taskId: id, task }) => {
      const version = task.versions[0];
      if (!version || !version.texts.length) return [];
      const { title, statement, separatePartPrompts, parts, assets } = publicVersion(version, "en");
      return [{
        id, title, marks: parts.reduce((sum, part) => sum + part.maxPoints, 0), html: statement,
        question: { statement, separatePartPrompts, parts, assets },
      }];
    }),
  };
}
