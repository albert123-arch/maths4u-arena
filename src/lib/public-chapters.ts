import { cache } from "react";
import { db } from "./prisma";
import { contentPackages, publicChapterPath } from "./content-package-content";
import { visibleLessonWhere } from "./content-access";
import { matchesPublishedPackage } from "./public-learning-topic";
import { studyMetadata } from "./authored-study";

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
    if (p.course.code === "9709" && !matchesPublishedPackage(p, state)) return [];
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
      const study = studyMetadata(lesson.id);
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
    ch.courseCode === "9709" && ch.chapterId === chapterId && path === "/courses/" + ch.courseSlug
  ));
}

const chapterDescriptions: Record<string, string> = {
  "9709-p3-complex-numbers": "Work with complex arithmetic, roots, modulus and argument, exponential form and Argand loci for Cambridge 9709 Pure 3.",
  "9709-p3-differential-equations": "Model rates, separate variables, apply initial conditions and interpret first-order differential equations for Cambridge 9709 Pure 3.",
  "9709-p3-vectors": "Use vector components, lines, scalar products, angles and perpendicular feet with step-by-step practice for Cambridge 9709 Pure 3.",
  "9709-p3-numerical-methods": "Locate roots by sign changes and iteration. Learn rounding bounds, fixed-point equations and convergence diagrams for Cambridge 9709 Pure 3.",
  "9709-p1-quadratics": "Study quadratics for Cambridge 9709 Pure Mathematics 1. Work through factorisation, completing the square, the discriminant, inequalities and simultaneous equations.",
  "9709-p1-functions": "Study functions for Cambridge 9709 Pure Mathematics 1. Work through domain and range, inverse and composite functions, and graph transformations.",
  "9709-p1-coordinate-geometry": "Study coordinate geometry for Cambridge 9709 Pure Mathematics 1. Find exact distances, gradients, line and circle equations, intersections and tangents.",
  "9709-p1-circular-measure": "Study circular measure for Cambridge 9709 Pure Mathematics 1. Convert angles, find arc lengths and sector areas, and solve problems on segments and composite regions.",
  "9709-p3-algebra": "Study algebra for Cambridge 9709 Pure Mathematics 3. Sketch linear modulus graphs, solve modulus equations and inequalities, and use polynomial division and the factor and remainder theorems.",
  "9709-p3-algebra-extensions": "Practise partial fractions and fractional binomial expansion for Cambridge 9709 Pure Mathematics 3. Check the algebra and the interval of validity.",
  "9709-p3-logarithms": "Study logarithms and exponentials for Cambridge 9709 Pure Mathematics 3. Solve equations and inequalities, check logarithm domains and use straight-line graphs to recover model constants.",
  "9709-p3-trigonometry": "Study reciprocal graphs, compound and double angles, the R form and trigonometric equations for Cambridge 9709 Pure Mathematics 3.",
  "9709-p3-differentiation": "Study the chain, product and quotient rules, implicit and parametric differentiation, and tangent and normal problems for Cambridge 9709 Pure Mathematics 3.",
  "9709-p3-integration": "Choose and use integration methods for 9709 Pure Mathematics 3, including trig identities, partial fractions, substitution and integration by parts.",
};

export function chapterMetadata(ch: PublicChapter, lesson?: PublicLesson) {
  if (ch.courseCode === "9709") {
    const course = ch.courseTitle.replace(/\s*\(9709\)/, "")
      .replace("Pure Mathematics", "Pure").replace("Probability & Statistics", "Statistics");
    return {
      title: (lesson?.title ?? ch.chapterTitle) + " | 9709 " + course + " | Maths4U",
      description: lesson?.description ?? lesson?.objective ?? chapterDescriptions[ch.key]
        ?? "Study " + ch.chapterTitle + " for Cambridge 9709 " + course + ". Practise with worked examples and exam-style questions.",
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
  const path = lesson?.path ?? ch.chapterPath, is9709 = ch.courseCode === "9709";
  const educationalLevel = ch.courseSlug === "maths4u-9709-p3" ? "Cambridge International A Level"
    : is9709 ? "Cambridge International AS Level" : "A Level Further Mathematics";
  const crumbs = [
    is9709 ? { name: "AS & A Level", path: "/learn/a-level" } : { name: "Maths4U", path: "/" },
    { name: is9709 ? ch.courseTitle : "9231 " + furtherCourseName(ch.courseTitle), path: "/courses/" + ch.courseSlug },
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
      educationalLevel,
      learningResourceType: ["Notes", "Worked examples", "Practice questions"], about: "Cambridge International " + ch.courseCode + " " + ch.chapterTitle,
      ...(lesson ? { teaches: lesson.objective } : {}), dateModified: lesson?.modified ?? ch.modified,
      publisher: { "@type": "Organization", name: "Maths4U", url: arenaOrigin },
    },
  ] as const;
}

export const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
