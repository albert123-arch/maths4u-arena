import type { Metadata } from "next";
import { cache } from "react";
import { connection } from "next/server";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cookies } from 'next/headers';
import { COOKIE } from './security';
import { resolveRequestView } from './view-lens';
import { inRequestView } from './request-view';
import { archiveAdmin } from './content-access';
import { archiveLessonNavigation } from './course-tree';
import { unallocatedChapter } from './course-tree-plan';
import { topicContent } from './catalog';
import { arenaOrigin, publicChapters, chapterMetadata, matchPublicChapter, furtherCourseName, learningStructuredData, safeJsonLd } from './public-chapters';
import { Platform } from "@/components/platform";
import { StudyRevision } from "@/components/study-revision";
import { hasOriginalRevisionStudy, studyLayout, studyMetadata, studyRevision } from "./authored-study";
import type { DiscoveryProps } from "@/components/discovery-home";
import { publicDiscovery } from "./discovery";
import { redirectSignedInFromHome, studentSearchCourses } from "./home-role-routing";
import { courseLabel, courseLevels, discoverySample, levelHref, learningDirections, type DiscoveryData } from "./discovery-model";
import { quadraticTopics } from "./square-model";
import { publicLearningTopic } from "./public-learning-topic";
import { squarePublicLesson, questionsForTopic } from "./square-content";
import { AppError } from "./errors";
import { assertLessonVisible } from "./content-access";
import { visibleSquareMappings } from "./square-learning";
import { publicLanguages } from "./public-language";
import { hasRussianPage, isPublicLearningPath, isPublicLearningRoute, mayHaveRussianPage } from "./public-presentation";
import { publicCourses, publicQuestions, publicTopic } from "./public-page-data";
import type { PublicPageData } from "./public-page-model";
import type { Locale } from "./locale";
export type PageProps = { params: Promise<{ page?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const shareImage = { url: arenaOrigin + "/share/maths4u-arena.png", width: 1200, height: 630, alt: "Maths4U Arena" };
const directoryMetadata: Record<string, { title: string; description: string }> = {
  "/courses": { title: "Cambridge maths courses", description: "Find Cambridge maths lessons by syllabus, from Lower Secondary Stages 7–9 through IGCSE, Additional Mathematics, A Level and Further Mathematics." },
  "/library": { title: "Maths practice question bank", description: "Choose a course and topic, then practise with multiple-choice, short-answer or written questions. Use hints and solutions to review your methods." },
  "/search": { title: "Search courses and topics", description: "Find maths lessons and courses by topic, syllabus code or paper." },
  "/for-teachers": { title: "Maths teaching tools", description: "Prepare maths lessons, set questions for your classes and review student work in Maths4U Arena." },
};
const topicAtPath = cache(async (lessonId: string, path: string) => {
  const topic = await publicLearningTopic(lessonId);
  if (topic?.packageKey && topic.path !== path && studyMetadata(topic.lessonId)) notFound();
  return topic;
});
function discoveryRoute(parts: string[]): Omit<DiscoveryProps, "data"> | null {
  if (!parts.length) return { view: "home" };
  if (parts.length === 1 && parts[0] === "search") return { view: "search" };
  if (parts.length === 1 && parts[0] === "for-teachers") return { view: "teachers" };
  if (parts[0] === "learn") { const d = parts.length === 2 && learningDirections.find(d => d.key === parts[1]); if (!d) notFound(); return { view: "direction", direction: d.key }; }
  return null;
}
export async function pageMetadata({ params,searchParams }: PageProps, locale: Locale): Promise<Metadata> {
  const parts = (await params).page ?? [], path = "/" + parts.join("/"), publicPage = isPublicLearningPath(path);
  if (!publicPage) return { robots: { index: false, follow: false } };
  if (!isPublicLearningRoute(parts)) notFound();
  const query=await searchParams;if(query.source||query.taskId||query.legacyLesson)return {robots:{index:false,follow:false}};
  await connection();
  const translated = mayHaveRussianPage(parts) && hasRussianPage(path, await publicLanguages());
  if (locale === "ru" && !translated) notFound();
  const chapters = locale === "en" && parts[0] === "courses" && parts[1] ? await publicChapters(parts[1],
    parts[0] === "courses" && parts[2] === "topics" ? parts[3] : undefined) : [];
  const chapter = matchPublicChapter(chapters, path, query.chapter);
  const canonical = arenaOrigin + (locale === "ru" ? "/ru" : "") + (chapter?.chapterPath ?? path);
  const alternates = { canonical, ...(translated && (!chapter || chapter.chapterPath === path) ? { languages: { en: arenaOrigin + path, ru: arenaOrigin + "/ru" + path } } : {}) };
  const discovery = discoveryRoute(parts), topic = parts[0]==="courses"&&parts[2]==="topics"&&parts[3]?await topicAtPath(parts[3],path):undefined;
  const lessonChapter = chapters.find(ch => ch.lessons.some(l => l.path === path));
  const specific = chapter ? chapterMetadata(chapter) : lessonChapter ? chapterMetadata(lessonChapter, lessonChapter.lessons.find(l => l.path === path)) : null;
  const directory = directoryMetadata[path];
  const index = topic || specific || discovery || directory ? undefined : await publicDiscovery(locale);
  const item = index?.items.find(i => i.href === (locale === "ru" ? "/ru" : "") + path);
  const courseDescription = item?.kind === "course" ? index?.courses.find(c => c.slug === item.courseSlug)?.description : undefined;
  const further = chapters.filter(ch => ch.courseCode === "9231");
  const direction = learningDirections.find(d => d.key === discovery?.direction);
  const itemTitle = item && (locale === "ru" ? item.ru : item.title);
  const title = topic?.title || (item?.kind === "course" && itemTitle ? courseLabel(item.courseSlug, itemTitle) : itemTitle)
    || (direction && (locale === "ru" ? direction.ru : direction.title)) || directory?.title || "Maths4U";
  const description = topic?.summary || courseDescription || (direction && (locale === "ru" ? direction.descriptionRu : direction.description)) || directory?.description
    || (locale === "ru" ? "Конспекты, задачи и решения по теме «" + title + "» на Maths4U." : "Explore " + title + " and its available practice questions on Maths4U.");
  const course = further.find(ch => path === '/courses/' + ch.courseSlug);
  const finalTitle = specific?.title ?? (course ? '9231 ' + furtherCourseName(course.courseTitle) + ' notes & practice | Maths4U'
    : path === '/' ? 'Cambridge Mathematics 0862, 0580, 0606, 9709 & 9231 | Maths4U'
    : direction?.key === 'further' && locale === "en" ? '9231 Further Mathematics: notes, examples & practice | Maths4U'
    : (direction && direction.key !== "olympiad" ? direction.code + " " : "") + title + ' | Maths4U');
  const finalDescription = specific?.description ?? (course ? 'Study 9231 ' + furtherCourseName(course.courseTitle) + ' with notes, worked examples, quick checks and exam-style questions with solutions.'
    : path === '/' ? 'Study Cambridge Maths from Stage 7 to A Level: 0862, 0580, 0606, 9709 and 9231. Choose a course for notes, worked examples and practice with feedback.' : description);
  return {
    title: finalTitle, description: finalDescription, alternates,
    ...(path === "/search" || query.view === "revision" || process.env.MATHS4U_ENV !== "production" ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: finalTitle, description: finalDescription, url: canonical, siteName: "Maths4U", type: "website", images: [shareImage] },
    twitter: { card: "summary_large_image", title: finalTitle, description: finalDescription, images: [shareImage] },
  };
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
  if (!parts.length && locale === "en") await redirectSignedInFromHome();
  if (!publicPage) { if (locale === "ru") notFound(); return <Platform />; }
  if (!isPublicLearningRoute(parts)) notFound();
  await connection();
  const translated = mayHaveRussianPage(parts) && hasRussianPage(path, await publicLanguages());
  if (locale === "ru" && !translated) notFound();
  const pair = translated ? { en: path, ru: "/ru" + path } : undefined;
  const raw = await searchParams, search = Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  if(search.source||search.taskId||search.legacyLesson||parts[0]==='courses'&&parts[2]==='topics'&&unallocatedChapter(parts[3]??''))return privateArchivePage(parts,search);
  const packaged=parts[0]==="courses"&&parts[2]==="topics"&&parts[3]?await topicAtPath(parts[3],path):undefined;
  const chapters = locale === "en" && parts[0] === "courses" && parts[1] ? await publicChapters(parts[1],
    parts[0] === "courses" && parts[2] === "topics" ? parts[3] : undefined) : [];
  const chapterPage = matchPublicChapter(chapters, path, raw.chapter);
  if (chapterPage && path !== chapterPage.chapterPath && Object.keys(raw).length === 1) permanentRedirect(chapterPage.chapterPath);
  const lessonChapter = chapters.find(ch => ch.lessons.some(l => l.path === path));
  if(parts[0]==='courses'&&parts[2]==='chapters'&&!chapterPage)notFound();
  const structured=chapterPage?learningStructuredData(chapterPage):lessonChapter?learningStructuredData(lessonChapter,lessonChapter.lessons.find(l=>l.path===path)):null;
  const schema=structured?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(structured)}}/>:null;
  const previous = quadraticTopics.find(t => t.path === path);
  const previousRequested=previous&&(search.practice==="previous"||!!search.item&&questionsForTopic(previous.key).some(q=>q.id===search.item));
  if (search.view === "revision" && locale === "en" && packaged?.path === path && lessonChapter) {
    const revision = studyRevision(packaged.lessonId);
    if (revision) {
      await assertLessonVisible(null, packaged.lessonId);
      return <StudyRevision title={packaged.title} revision={revision} path={path}
        courseTitle={lessonChapter.courseTitle} chapterTitle={lessonChapter.chapterTitle} />;
    }
  }
  const topic = previousRequested?previous:(packaged?.path===path?packaged:previous), oldPractice = !!search.reviewTask || ["MC", "SHORT", "WRITTEN", "NOTES"].includes(search.mode);
  if (topic && search.view !== "legacy" && !oldPractice) { await assertLessonVisible(null,topic.lessonId); const visible=await visibleSquareMappings(null,topic); const lesson=squarePublicLesson(topic); lesson.questions=lesson.questions.filter(q=>visible.has(q.uid)); return <>{schema}<Platform square={lesson} languagePair={pair} /></>; }
  const discovery = discoveryRoute(parts);
  if (discovery) {
    let data: DiscoveryData;
    try { data = await publicDiscovery(locale); } catch { data = { courses: [], items: [], unavailable: true }; }
    const selectedCourses = discovery.view === "search" ? await studentSearchCourses(data.courses.map(course => course.slug)) : undefined;
    if (selectedCourses && search.scope !== "all") {
      const selected = new Set(selectedCourses);
      data = { ...data, courses: data.courses.filter(course => selected.has(course.slug)), items: data.items.filter(item => selected.has(item.courseSlug)) };
    }
    // A short per-course list lets a returning guest recognise a still-public lesson.
    // Only the search route needs to hydrate the full search index.
    let resumeLessons: Record<string, string[]> | undefined;
    if (discovery.view === "home") {
      resumeLessons = {};
      for (const item of data.items) {
        if (item.kind === "topic") (resumeLessons[item.courseSlug] ??= []).push(item.href.split("/").at(-1)!);
      }
    }
    if (discovery.view !== "search") {
      const demos = discovery.view === "home" ? ["igcse", "a-level"] as const : discovery.direction ? [discovery.direction] : [];
      data = { ...data, items: demos.flatMap(key => discoverySample(data.items, key) ?? []) };
    }
    const level = learningDirections.find(item => item.key === discovery.direction);
    const levelUrl = arenaOrigin + (locale === "ru" ? "/ru" : "") + path;
    const directory = data.unavailable ? null : discovery.view === "home" ? {
      "@context": "https://schema.org",
      "@type": "WebSite", name: "Maths4U Arena", url: arenaOrigin + "/", inLanguage: "en",
      hasPart: courseLevels.filter(item => data.courses.some(course => course.direction === item.key)).map(item => ({
        "@type": "WebPage", name: item.code + " · " + item.title, url: arenaOrigin + levelHref(item.key, data.courses),
      })),
    } : level ? {
      "@context": "https://schema.org", "@type": "CollectionPage", inLanguage: locale, url: levelUrl,
      name: (level.key === "olympiad" ? "" : level.code + " · ") + (locale === "ru" ? level.ru : level.title),
      description: locale === "ru" ? level.descriptionRu : level.description,
      hasPart: data.courses.filter(course => course.direction === level.key).map(course => ({
        "@type": "WebPage", name: locale === "ru" ? course.ru : course.title,
        url: arenaOrigin + (locale === "ru" ? "/ru" : "") + "/courses/" + encodeURIComponent(course.slug),
      })),
    } : null;
    return <>{directory && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(directory) }} />}
      <Platform languagePair={pair} discovery={{ ...discovery, data, resumeLessons, query: (search.q ?? "").slice(0, 120), selectedCourses, searchAll: search.scope === "all" }} /></>;
  }
  const initial: PublicPageData = { filters: search, chapter: search.chapter ?? "" };
  if(chapterPage){
    initial.chapter=chapterPage.chapterId;initial.chapterTitle=chapterPage.chapterTitle;
    if (["9709", "0580", "0606", "0862"].includes(chapterPage.courseCode)) {
      initial.chapterSummary = chapterMetadata(chapterPage).description;
      initial.lessonObjectives = Object.fromEntries(chapterPage.lessons.map(l => [l.id, l.objective]));
    }
  }
  if (parts[0] === "courses" && parts[2] === "topics" && parts[3]) {
    try{initial.topic = await publicTopic(locale, parts[3]);}
    catch(e){if(e instanceof AppError&&e.status===404)return privateArchivePage(parts,search);throw e;}
    if (parts[1] !== initial.topic.course.slug) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(raw)) {
        for (const entry of [value].flat()) if (entry !== undefined) params.append(key, entry);
      }
      const target = `/courses/${encodeURIComponent(initial.topic.course.slug)}/topics/${encodeURIComponent(parts[3])}`;
      permanentRedirect(params.size ? `${target}?${params}` : target);
    }
    if (locale === "en" && hasOriginalRevisionStudy(parts[3])) {
      if (search.view === "revision") {
        const revision = studyRevision(parts[3]);
        if (revision) return <StudyRevision title={initial.topic.title} revision={revision} path={path}
          courseTitle={initial.topic.course.title} chapterTitle={initial.topic.chapter.title} returnSection="notes" />;
      }
      if (search.view !== "legacy") initial.authoredStudy = studyLayout(parts[3]);
    }
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
