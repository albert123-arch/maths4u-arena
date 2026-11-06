// Request-scoped only: archive/restore must take effect on the next request,
// including previously issued material grants. No cross-request content cache.
import { cache } from "react";
import { catalog, courseCatalog, topicContent } from "./catalog";
import type { Locale } from "./locale";
export const publicCourses = cache((lang: Locale, slug?: string) => courseCatalog(null, lang, slug, true));
export const publicQuestions = cache((lang: Locale, filters: Record<string, string>) => catalog(null, lang, { ...filters, origin:"", archive:"", progress: "", bookmarks: "", ...(lang === "ru" ? { language: "ru" } : {}) }, true));
export const publicTopic = cache((lang: Locale, id: string) => topicContent(null, id, lang, true));
