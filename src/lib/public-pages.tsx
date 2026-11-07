import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { cookies } from 'next/headers';
import { COOKIE } from './security';
import { resolveRequestView } from './view-lens';
import { inRequestView } from './request-view';
import { archiveAdmin } from './content-access';
import { archiveLessonNavigation } from './course-tree';
import { unallocatedChapter } from './course-tree-plan';
import { topicContent } from './catalog';
import { furtherPublic,furtherMetadata,furtherCourseName,learningStructuredData,safeJsonLd } from './further-public';
import { Platform } from "@/components/platform";
import type { DiscoveryProps } from "@/components/discovery-home";
import { publicDiscovery } from "./discovery";
import { learningDirections, type DiscoveryData } from "./discovery-model";
import { quadraticTopics } from "./square-model";
import { packageTopic } from "./content-package-content";
import { squarePublicLesson } from "./square-content";
import { AppError } from "./errors";
import { assertLessonVisible } from "./content-access";
import { visibleSquareMappings } from "./square-learning";
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
export async function pageMetadata({ params,searchParams }: PageProps, locale: Locale): Promise<Metadata> {
  const query=await searchParams;if(query.source||query.taskId||query.legacyLesson)return {robots:{index:false,follow:false}};
  const parts = (await params).page ?? [], path = "/" + parts.join("/"), publicPage = isPublicLearningPath(path);
  if (!publicPage) return { robots: { index: false, follow: false } };
  await connection();
  const available = await publicLanguages(), translated = hasRussianPage(path, available);
  if (locale === "ru" && !translated) notFound();
  const canonical = origin + (locale === "ru" ? "/ru" : "") + (path === "/" ? "/" : path);
  const alternates = { canonical, ...(translated ? { languages: { en: origin + path, ru: origin + "/ru" + path } } : {}) };
  const discovery = discoveryRoute(parts), topic = quadraticTopics.find(t => t.path === path)??(parts[0]==="courses"&&parts[2]==="topics"?packageTopic(parts[3]):undefined);
  const data = await publicDiscovery(locale), item = data.items.find(i => i.href === (locale === "ru" ? "/ru" : "") + path);
  const further=locale==='en'?await furtherPublic():[],chapter=further.find(ch=>ch.chapterPath===path),lessonChapter=further.find(ch=>ch.lessons.some(l=>l.path===path)),specific=chapter?furtherMetadata(chapter):lessonChapter?furtherMetadata(lessonChapter,lessonChapter.lessons.find(l=>l.path===path)):null;
  const direction = learningDirections.find(d => d.key === discovery?.direction);
  const title = topic ? topic.title : item ? (locale === "ru" ? item.ru : item.title) : direction ? locale === "ru" ? direction.ru : direction.title : path === "/library" ? "Practice" : path === "/courses" ? "Mathematics courses" : path === "/search" ? "Search courses and topics" : path === "/for-teachers" ? "Maths teaching tools" : "Learn mathematics, practise and prepare for exams";
  const description = topic?.summary ?? (direction ? locale === "ru" ? direction.descriptionRu : direction.description : locale === "ru" ? "Конспекты, задачи и решения по теме «" + title + "» на Maths4U." : "Explore " + title + " and its available practice questions on Maths4U.");
  const course=further.find(ch=>path==='/courses/'+ch.courseSlug),finalTitle=specific?.title??(course?'9231 '+furtherCourseName(course.courseTitle)+' notes & practice | Maths4U':path==='/'&&further.length?'9231 Further Mathematics: notes, examples & practice | Maths4U':title+' | Maths4U'),finalDescription=specific?.description??(course?'Study 9231 '+furtherCourseName(course.courseTitle)+' with notes, worked examples, quick checks and exam-style questions with solutions.':description);
  return { title: finalTitle, description:finalDescription, alternates, ...(path === "/search" || process.env.MATHS4U_ENV !== "production" ? { robots: { index: false, follow: true } } : {}), openGraph: { title:finalTitle, description:finalDescription, url: canonical, siteName: "Maths4U", type: "website" } };
}
async function privateArchivePage(parts:string[],search:Record<string,string>){
  // Authenticate only private archive routes; public language/theme stay cookie-free.
  const view=await resolveRequestView((await cookies()).get(COOKIE)?.value);
  return inRequestView(view,async()=>{
    if(!archiveAdmin(view.actor))notFound();
    const id=parts[0]==='courses'&&parts[2]==='topics'?parts[3]:null;
    if(id){const next=await archiveLessonNavigation(view.actor,id);if(next)redirect(next);}
    const params=new URLSearchParams({...search,source:search.source||'CAMBRIDGE'});
    if(id)params.set('topic',id);
    if(id){const topic=await topicContent(view.actor,id,'en');if(topic.course.slug!==parts[1])notFound();params.set('course',topic.course.id);params.set('chapter',topic.chapter.id);}
    else if(parts[0]!=='library')notFound();
    redirect('/admin/archive-bank?'+params.toString());
  });
}
async function renderAllowedPage({ params, searchParams }: PageProps, locale: Locale) {
  const parts = (await params).page ?? [], path = "/" + parts.join("/"), publicPage = isPublicLearningPath(path);
  // Versioned source packages contain private keys/provenance and are not an
  // HTTP file tree. Keep this namespace a real 404, never a client login shell.
  if(parts[0]==="content")notFound();
  if (!publicPage) { if (locale === "ru") notFound(); return <Platform />; }
  await connection();
  const available = await publicLanguages(), translated = hasRussianPage(path, available);
  if (locale === "ru" && !translated) notFound();
  const pair = translated ? { en: path, ru: "/ru" + path } : undefined;
  const raw = await searchParams, search = Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  if(search.source||search.taskId||search.legacyLesson||parts[0]==='courses'&&parts[2]==='topics'&&unallocatedChapter(parts[3]??''))return privateArchivePage(parts,search);
  const packaged=parts[0]==="courses"&&parts[2]==="topics"?packageTopic(parts[3]):undefined;
  const further=locale==='en'?await furtherPublic():[],chapterPage=further.find(ch=>ch.chapterPath===path),lessonChapter=further.find(ch=>ch.lessons.some(l=>l.path===path));
  if(parts[0]==='courses'&&parts[2]==='chapters'&&!chapterPage)notFound();
  const structured=chapterPage?learningStructuredData(chapterPage):lessonChapter?learningStructuredData(lessonChapter,lessonChapter.lessons.find(l=>l.path===path)):null;
  const schema=structured?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(structured)}}/>:null;
  const topic = quadraticTopics.find(t => t.path === path)??(packaged?.path===path?packaged:undefined), oldPractice = !!search.reviewTask || ["MC", "SHORT", "WRITTEN", "NOTES"].includes(search.mode);
  if (topic && search.view !== "legacy" && !oldPractice) { await assertLessonVisible(null,topic.lessonId); const visible=await visibleSquareMappings(null,topic); const lesson=squarePublicLesson(topic); lesson.questions=lesson.questions.filter(q=>visible.has(q.uid)); return <>{schema}<Platform square={lesson} languagePair={pair} /></>; }
  const discovery = discoveryRoute(parts);
  if (discovery) {
    let data: DiscoveryData;
    try { data = await publicDiscovery(locale); } catch { data = { courses: [], items: [], unavailable: true }; }
    return <Platform languagePair={pair} discovery={{ ...discovery, data, query: (search.q ?? "").slice(0, 120) }} />;
  }
  const initial: PublicPageData = { filters: search, chapter: search.chapter ?? "" };
  if(chapterPage){initial.chapter=chapterPage.chapterId;initial.chapterTitle=chapterPage.chapterTitle;}
  if (parts[0] === "courses" && parts[2] === "topics" && parts[3]) {
    try{initial.topic = await publicTopic(locale, parts[3]);}
    catch(e){if(e instanceof AppError&&e.status===404)return privateArchivePage(parts,search);throw e;}
    initial.mode = ["MC", "SHORT", "WRITTEN"].includes(search.mode) ? search.mode as "MC" | "SHORT" | "WRITTEN" : "NOTES";
    if (initial.mode !== "NOTES") initial.catalog = await publicQuestions(locale, { ...search, topic: parts[3], mode: initial.mode });
  } else if (parts[0] === "courses") initial.courses = await publicCourses(locale, parts[1]);
  else if (parts[0] === "library") { const [courses, questions] = await Promise.all([publicCourses(locale), publicQuestions(locale, search)]); initial.courses = courses; initial.catalog = questions; }
  return <>{schema}<Platform publicData={initial} languagePair={pair} /></>;
}

export async function renderPage(props: PageProps, locale: Locale) {
  try { return await renderAllowedPage(props,locale); }
  catch(e) { if(e instanceof AppError && e.status === 404) notFound(); throw e; }
}
