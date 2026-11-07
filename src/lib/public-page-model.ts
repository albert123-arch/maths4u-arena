import type { CatalogDto, courseCatalog, topicContent } from "./catalog";
export type PublicPageData = {
  courses?: Awaited<ReturnType<typeof courseCatalog>>;
  catalog?: CatalogDto;
  topic?: Awaited<ReturnType<typeof topicContent>>;
  filters?: Record<string, string>;
  chapter?: string;
  chapterTitle?:string;
  mode?: "NOTES" | "MC" | "SHORT" | "WRITTEN";
};
export type LanguagePair = { en: string; ru: string };
