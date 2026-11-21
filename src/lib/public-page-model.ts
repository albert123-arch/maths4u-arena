import type { CatalogDto, courseCatalog, topicContent } from "./catalog";
import type { studyLayout } from "./authored-study";
export type PublicPageData = {
  courses?: Awaited<ReturnType<typeof courseCatalog>>;
  catalog?: CatalogDto;
  topic?: Awaited<ReturnType<typeof topicContent>>;
  filters?: Record<string, string>;
  chapter?: string;
  chapterTitle?:string;
  chapterSummary?: string;
  lessonObjectives?: Record<string, string>;
  authoredStudy?: ReturnType<typeof studyLayout>;
  mode?: "NOTES" | "MC" | "SHORT" | "WRITTEN";
};
export type LanguagePair = { en: string; ru: string };
