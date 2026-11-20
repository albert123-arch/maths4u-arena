import { cache } from "react";
import { db } from "./prisma";
import { contentPackages, publicChapterPath } from "./content-package-content";
import { visibleLessonWhere } from "./content-access";
import { matchesPublishedPackage } from "./public-learning-topic";
import { quadraticsStudyMetadata } from "./quadratics-study";

export const arenaOrigin = "https://arena.maths4u.sbs";

export const publicChapters = cache(async () => {
  const installed = await db().contentPackage.findMany({
    where: { state: "PUBLISHED" },
    select: { key: true, state: true, publishedAt: true, version: true, fingerprint: true },
  });
  const byKey = new Map(installed.map(row => [row.key, row]));
  const packages = contentPackages.flatMap(p => {
    const chapterPath = publicChapterPath(p), state = byKey.get(p.key);
    if (!chapterPath || !state) return [];
    if (p.key === "9709-p1-quadratics" && !matchesPublishedPackage(p, state)) return [];
    return [{ p, chapterPath, publishedAt: state.publishedAt?.getTime() ?? 0 }];
  });
  const visible = await db().lesson.findMany({
    where: {
      id: { in: packages.flatMap(({ p }) => p.lessons.map(l => l.id)) }, archivedAt: null,
      ...visibleLessonWhere(null), topic: { course: { published: true, archivedAt: null, featureKey: null } },
    },
    select: { id: true, versions: { take: 1, orderBy: { number: "desc" }, select: { createdAt: true } } },
  });
  const versionDates = new Map(visible.map(row => [row.id, row.versions[0]?.createdAt.getTime() ?? 0]));
  return packages.flatMap(({ p, chapterPath, publishedAt }) => {
    const coursePath = "/courses/" + p.course.slug;
    const lessons = p.lessons.flatMap(lesson => {
      const versionDate = versionDates.get(lesson.id);
      if (versionDate === undefined) return [];
      const study = p.key === "9709-p1-quadratics" ? quadraticsStudyMetadata(lesson.id) : undefined;
      const modified = Math.max(publishedAt, versionDate, study ? Date.parse(study.updatedOn) : 0);
      return [{
        id: lesson.id, title: lesson.title, objective: lesson.objective, path: coursePath + "/topics/" + lesson.id,
        modified: new Date(modified).toISOString(), ...(study && { description: study.description }),
      }];
    });
    if (!lessons.length) return [];
    return [{
      key: p.key, courseCode: p.course.code, courseSlug: p.course.slug, courseTitle: p.course.title,
      chapterId: p.chapter.id, chapterTitle: p.chapter.title, chapterPath, lessons,
      modified: lessons.reduce((latest, l) => l.modified > latest ? l.modified : latest, lessons[0].modified),
    }];
  });
});

export type PublicChapter = Awaited<ReturnType<typeof publicChapters>>[number];
type PublicLesson = PublicChapter["lessons"][number];
export const furtherCourseName = (title: string) => title.replace(/\s*\(9231\)/, "").replace("Pure Mathematics", "Pure").replace("Probability & Statistics", "Statistics");

export function matchPublicChapter(chapters: PublicChapter[], path: string, chapterId?: string | string[]) {
  return chapters.find(ch => ch.chapterPath === path || (
    ch.key === "9709-p1-quadratics" && ch.chapterId === chapterId && path === "/courses/" + ch.courseSlug
  ));
}

export function chapterMetadata(ch: PublicChapter, lesson?: PublicLesson) {
  if (ch.courseCode === "9709") {
    return {
      title: (lesson?.title ?? ch.chapterTitle) + " | 9709 Pure 1 | Maths4U",
      description: lesson?.description ?? lesson?.objective ?? "Study quadratics for Cambridge 9709 Pure Mathematics 1. Work through factorisation, completing the square, the discriminant, inequalities and simultaneous equations.",
    };
  }
  const course = furtherCourseName(ch.courseTitle), focus = lesson?.title.split(/,| and /)[0].trimEnd();
  return {
    title: (lesson ? ch.chapterTitle + ": " + focus + " — " : ch.chapterTitle + " — ") + "9231 " + course + " notes & practice | Maths4U",
    description: lesson ? lesson.objective + " Worked examples, quick checks and exam-style practice with solutions."
      : "Study " + ch.chapterTitle + " for 9231 " + course + ". Explore " + ch.lessons.length + " lessons with notes, worked examples, quick checks and exam-style questions.",
  };
}

export function learningStructuredData(ch: PublicChapter, lesson?: PublicLesson) {
  const path = lesson?.path ?? ch.chapterPath, isPure1 = ch.courseCode === "9709";
  const crumbs = [
    isPure1 ? { name: "AS & A Level", path: "/learn/a-level" } : { name: "Maths4U", path: "/" },
    { name: isPure1 ? ch.courseTitle : "9231 " + furtherCourseName(ch.courseTitle), path: "/courses/" + ch.courseSlug },
    { name: ch.chapterTitle, path: ch.chapterPath },
    ...(lesson ? [{ name: lesson.title, path: lesson.path }] : []),
  ];
  return [
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: arenaOrigin + c.path })),
    },
    {
      "@context": "https://schema.org", "@type": ["WebPage", "LearningResource"], name: lesson?.title ?? ch.chapterTitle,
      url: arenaOrigin + path, description: chapterMetadata(ch, lesson).description, inLanguage: "en", isAccessibleForFree: true,
      educationalLevel: isPure1 ? "Cambridge International AS Level" : "A Level Further Mathematics",
      learningResourceType: ["Notes", "Worked examples", "Practice questions"], about: "Cambridge International " + ch.courseCode + " " + ch.chapterTitle,
      ...(lesson ? { teaches: lesson.objective } : {}), dateModified: lesson?.modified ?? ch.modified,
      publisher: { "@type": "Organization", name: "Maths4U", url: arenaOrigin },
    },
  ] as const;
}

export const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
