import { unstable_cache } from "next/cache";
import { catalog, courseCatalog, topicContent } from "./catalog";
import type { Locale } from "./locale";
export const publicCourses = unstable_cache((lang: Locale, slug?: string) => courseCatalog(null, lang, slug, true), ["anonymous-courses-v1"], { revalidate: 60, tags: ["public-content"] });
export const publicQuestions = unstable_cache((lang: Locale, filters: Record<string, string>) => catalog(null, lang, { ...filters, progress: "", bookmarks: "", ...(lang === "ru" ? { language: "ru" } : {}) }, true), ["anonymous-practice-v2"], { revalidate: 60, tags: ["public-content"] });
export const publicTopic = unstable_cache((lang: Locale, id: string) => topicContent(null, id, lang, true), ["anonymous-topic-v2"], { revalidate: 60, tags: ["public-content"] });
