/** Public navigation only: no task answers, files, accounts or learning records. */
import { cache } from "react";
import { db } from "./prisma";
import { courseDirection, type DiscoveryCourse, type DiscoveryItem, type DiscoveryData } from "./discovery-model";
import { publicLanguages } from "./public-language";
import { displayTitle, displayDescription } from "./public-presentation";

function title(texts: { locale: string; title: string }[], lang: string): string {
  return displayTitle((texts.find(t => t.locale === lang) ?? texts.find(t => t.locale === "en") ?? texts[0])?.title ?? "");
}
export const publicDiscovery = cache(async (lang: "en" | "ru" = "en"): Promise<DiscoveryData> => {
  // Do not use actor-dependent catalogues or serialise an ORM record to the client.
  // Entitled/private courses continue through their existing account-only routes.
  const rows = await db().course.findMany({ where: { published: true, archivedAt: null, featureKey: null }, orderBy: [{ position: "asc" }, { id: "asc" }], select: {
    slug: true, texts: { select: { locale: true, title: true, description: true } },
    topics: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { texts: { select: { locale: true, title: true } }, lessons: { where: { archivedAt: null }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, versions: { take: 1, orderBy: { number: "desc" }, select: { texts: { select: { locale: true, title: true } } } } } } } },
  } });
  const courses: DiscoveryCourse[] = [], items: DiscoveryItem[] = [];
  const russian = lang === "ru" ? await publicLanguages() : null, prefix = lang === "ru" ? "/ru" : "";
  for (const row of rows) {
    if (russian && !russian.courses.includes(row.slug)) continue;
    const direction = courseDirection(row.slug), en = title(row.texts, "en"), ru = title(row.texts, "ru");
    const chapters = row.topics.filter(ch => ch.lessons.some(l => l.versions[0]?.texts.length && (!russian || russian.lessons.some(r => r.id === l.id))));
    const topics = chapters.flatMap(ch => ch.lessons.filter(l => l.versions[0]?.texts.length));
    courses.push({ slug: row.slug, title: en, ru, description: displayDescription((row.texts.find(t => t.locale === lang))?.description ?? ""), direction, chapters: chapters.length, topics: topics.length });
    items.push({ title: en, ru, course: en, courseRu: ru, chapter: "", chapterRu: "", href: prefix + "/courses/" + encodeURIComponent(row.slug), direction, kind: "course" });
    for (const ch of chapters) for (const lesson of ch.lessons) {
      if (!lesson.versions[0]?.texts.length || russian && !russian.lessons.some(r => r.id === lesson.id)) continue;
      items.push({ title: title(lesson.versions[0].texts, "en"), ru: title(lesson.versions[0].texts, "ru"), course: en, courseRu: ru, chapter: title(ch.texts, "en"), chapterRu: title(ch.texts, "ru"), href: prefix + "/courses/" + encodeURIComponent(row.slug) + "/topics/" + encodeURIComponent(lesson.id), direction, kind: "topic" });
    }
  }
  return { courses, items, unavailable: false };
});

