import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Platform } from "@/components/platform";
import type { DiscoveryProps } from "@/components/discovery-home";
import { publicDiscovery } from "./discovery";
import { learningDirections, type DiscoveryData } from "./discovery-model";
import { quadraticTopics } from "./square-model";
import { squarePublicLesson } from "./square-content";
import { squareMappings } from "./square-learning";
import { publicLanguages } from "./public-language";
import { hasRussianPage, isPublicLearningPath } from "./public-presentation";
import { publicCourses, publicQuestions, publicTopic } from "./public-page-data";
import type { PublicPageData } from "./public-page-model";
import type { Locale } from "./locale";
export type PageProps = { params: Promise<{ page?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const origin = "https://arena.maths4u.sbs";
function discoveryRoute(parts: string[]): Omit<DiscoveryProps, "data"> | null {
  if (!parts.length) return { view: "home" };
  if (parts.length === 1 && parts[0] === "search") return { view: "search" };
  if (parts.length === 1 && parts[0] === "for-teachers") return { view: "teachers" };
  if (parts[0] === "learn") { const d = parts.length === 2 && learningDirections.find(d => d.key === parts[1]); if (!d) notFound(); return { view: "direction", direction: d.key }; }
  return null;
}
export async function pageMetadata({ params }: PageProps, locale: Locale): Promise<Metadata> {
  const parts = (await params).page ?? [], path = "/" + parts.join("/"), publicPage = isPublicLearningPath(path);
  if (!publicPage) return { robots: { index: false, follow: false } };
  await connection();
  const available = await publicLanguages(), translated = hasRussianPage(path, available);
  if (locale === "ru" && !translated) notFound();
  const canonical = origin + (locale === "ru" ? "/ru" : "") + (path === "/" ? "/" : path);
  const alternates = { canonical, ...(translated ? { languages: { en: origin + path, ru: origin + "/ru" + path } } : {}) };
  const discovery = discoveryRoute(parts), topic = quadraticTopics.find(t => t.path === path);
  const data = await publicDiscovery(locale), item = data.items.find(i => i.href === (locale === "ru" ? "/ru" : "") + path);
  const direction = learningDirections.find(d => d.key === discovery?.direction);
  const title = topic ? topic.title : item ? (locale === "ru" ? item.ru : item.title) : direction ? locale === "ru" ? direction.ru : direction.title : path === "/library" ? "Practice" : path === "/courses" ? "Mathematics courses" : path === "/search" ? "Search courses and topics" : path === "/for-teachers" ? "Maths teaching tools" : "Learn mathematics, practise and prepare for exams";
  const description = topic?.summary ?? (direction ? locale === "ru" ? direction.descriptionRu : direction.description : locale === "ru" ? "Конспекты, задачи и решения по теме «" + title + "» на Maths4U." : "Explore " + title + " and its available practice questions on Maths4U.");
  return { title: title + " | Maths4U", description, alternates, ...(path === "/search" || process.env.MATHS4U_ENV !== "production" ? { robots: { index: false, follow: true } } : {}), openGraph: { title, description, url: canonical, siteName: "Maths4U", type: "website" } };
}
export async function renderPage({ params, searchParams }: PageProps, locale: Locale) {
  const parts = (await params).page ?? [], path = "/" + parts.join("/"), publicPage = isPublicLearningPath(path);
  if (!publicPage) { if (locale === "ru") notFound(); return <Platform />; }
  await connection();
  const available = await publicLanguages(), translated = hasRussianPage(path, available);
  if (locale === "ru" && !translated) notFound();
  const pair = translated ? { en: path, ru: "/ru" + path } : undefined;
  const raw = await searchParams, search = Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  const topic = quadraticTopics.find(t => t.path === path), oldPractice = !!search.reviewTask || ["MC", "SHORT", "WRITTEN", "NOTES"].includes(search.mode);
  if (topic && search.view !== "legacy" && !oldPractice) { await squareMappings(topic.key); return <Platform square={squarePublicLesson(topic)} languagePair={pair} />; }
  const discovery = discoveryRoute(parts);
  if (discovery) {
    let data: DiscoveryData;
    try { data = await publicDiscovery(locale); } catch { data = { courses: [], items: [], unavailable: true }; }
    return <Platform languagePair={pair} discovery={{ ...discovery, data, query: (search.q ?? "").slice(0, 120) }} />;
  }
  const initial: PublicPageData = { filters: search, chapter: search.chapter ?? "" };
  if (parts[0] === "courses" && parts[2] === "topics" && parts[3]) {
    initial.topic = await publicTopic(locale, parts[3]);
    initial.mode = ["MC", "SHORT", "WRITTEN"].includes(search.mode) ? search.mode as "MC" | "SHORT" | "WRITTEN" : "NOTES";
    if (initial.mode !== "NOTES") initial.catalog = await publicQuestions(locale, { ...search, topic: parts[3], mode: initial.mode });
  } else if (parts[0] === "courses") initial.courses = await publicCourses(locale, parts[1]);
  else if (parts[0] === "library") { const [courses, questions] = await Promise.all([publicCourses(locale), publicQuestions(locale, search)]); initial.courses = courses; initial.catalog = questions; }
  return <Platform publicData={initial} languagePair={pair} />;
}
