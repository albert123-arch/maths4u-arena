export const courseLevels = [
  { key: "school", code: "0862", title: "Lower Secondary · Stages 7–9", ru: "Lower Secondary · ступени 7–9", age: "11–14", popular: false, description: "Explore Cambridge Lower Secondary Mathematics by stage, from number and algebra to geometry, statistics and probability.", descriptionRu: "Выберите ступень Cambridge Lower Secondary Mathematics: числа, алгебра, геометрия, статистика и вероятность.", legacy: "school" },
  { key: "igcse", code: "0580", title: "IGCSE Mathematics", age: "14–16", popular: true, ru: "Математика IGCSE", description: "Build strong foundations and prepare for IGCSE Extended.", descriptionRu: "Укрепите базовые навыки и подготовьтесь к IGCSE Extended.", legacy: "igcse" },
  { key: "additional", code: "0606", title: "Additional Mathematics", age: "14–16", popular: false, ru: "Дополнительная математика", description: "Go further with algebra, functions, geometry and calculus.", descriptionRu: "Алгебра, функции, геометрия и основы математического анализа.", legacy: "additional" },
  { key: "a-level", code: "9709", title: "AS & A Level Mathematics", age: "16–18", popular: true, ru: "Математика AS и A Level", description: "Pure Mathematics, Probability & Statistics and Mechanics.", descriptionRu: "Чистая математика, вероятность, статистика и механика.", legacy: "a-level" },
  { key: "further", code: "9231", title: "Further Mathematics", age: "16–18", popular: false, ru: "Углублённая математика", description: "Explore Further Pure, Further Statistics and Further Mechanics.", descriptionRu: "Further Pure, углублённая статистика и механика.", legacy: "further" },
] as const;
export const learningDirections = [
  ...courseLevels,
  { key: "olympiad", code: "Problem solving", title: "Olympiad Mathematics", ru: "Олимпиадная математика", description: "Develop mathematical reasoning and learn to solve unfamiliar problems.", descriptionRu: "Развивайте математическое мышление и решайте нестандартные задачи.", legacy: "olympiad" },
] as const;
export type DirectionKey = typeof learningDirections[number]["key"];
export function courseDirection(slug: string): DirectionKey | null {
  if (/9231|further/i.test(slug)) return "further";
  if (/9709/i.test(slug)) return "a-level";
  if (/0606|additional/i.test(slug)) return "additional";
  if (/0580|igcse/i.test(slug)) return "igcse";
  if (/olymp/i.test(slug)) return "olympiad";
  if (/school|year-?\d|stage-?\d/i.test(slug)) return "school";
  return null;
}
export function levelHref(key: DirectionKey, courses: readonly { slug: string }[]) {
  if (key === "igcse" || key === "additional") {
    const matches = courses.filter(c => courseDirection(c.slug) === key);
    if (matches.length === 1) return "/courses/" + encodeURIComponent(matches[0].slug);
  }
  return "/learn/" + key;
}
const courseSequence = ["maths4u-9709-p1", "maths4u-9709-p3", "maths4u-9709-m1", "maths4u-9709-s1",
  "maths4u-9231-fp1", "maths4u-9231-fp2", "maths4u-9231-mechanics", "maths4u-9231-statistics"];
function courseOrder(slug: string) {
  const index = courseSequence.indexOf(slug);
  return index < 0 ? courseSequence.length : index;
}
export function compareLearningCourses(a: { slug: string }, b: { slug: string }) {
  return courseOrder(a.slug) - courseOrder(b.slug) || a.slug.localeCompare(b.slug, "en", { numeric: true });
}
export function courseLabel(slug: string, title: string) {
  const code = courseLevels.find(level => level.key === courseDirection(slug))?.code;
  return code && !title.includes(code) ? code + " · " + title : title;
}

// Use lesson IDs, so a new title does not silently switch the demo.
const sampleLessons: Record<DirectionKey, string> = {
  school: "lower-0862-s7-explain-with-models", igcse: "igcse-0580-graphs-functions-straight-lines",
  additional: "addmaths-0606-equations-inequalities-graphs-linear-modulus-equations",
  "a-level": "orig_quadratics_completing_square", further: "fp1_roots_coefficients", olympiad: "",
};
export function sampleLessonId(key: DirectionKey) { return sampleLessons[key]; }
export function discoverySample(items: readonly DiscoveryItem[], key: DirectionKey) {
  const topics = items.filter(item => item.kind === "topic" && item.direction === key);
  return topics.find(item => item.href.endsWith("/" + sampleLessonId(key))) ?? topics[0];
}
export type DiscoveryCourse = { slug: string; title: string; ru: string; description: string; direction: DirectionKey | null; chapters: number; topics: number };
export type DiscoveryItem = { title: string; ru: string; courseSlug: string; course: string; courseRu: string; chapter: string; chapterRu: string; href: string; direction: DirectionKey | null; kind: "course" | "topic" };
export type DiscoveryData = { courses: DiscoveryCourse[]; items: DiscoveryItem[]; unavailable: boolean };
const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function searchDiscovery(items: DiscoveryItem[], query: string): DiscoveryItem[] {
  const phrase = fold(query.slice(0, 120));
  if (!phrase) return [];
  const terms = phrase.split(" ");
  const matches = items.flatMap(item => {
    const code = learningDirections.find(direction => direction.key === item.direction)?.code ?? "";
    const paper = item.courseSlug.replace(/^maths4u-/, "");
    const context = fold([item.title, item.ru, item.course, item.courseRu, item.chapter, item.chapterRu, item.href, code].join(" "));
    if (!terms.every(term => context.includes(term))) return [];
    const titles = [fold(item.title), fold(item.ru)];
    const codeMatch = item.kind === "course" && [fold(code), fold(paper)].includes(phrase);
    let rank = 4;
    if (codeMatch || titles.includes(phrase)) rank = 0;
    else if (titles.some(title => title.startsWith(phrase + " "))) rank = 1;
    else if (titles.some(title => title.includes(phrase))) rank = 2;
    else if (titles.some(title => terms.every(term => title.includes(term)))) rank = 3;
    return [{ item, rank }];
  });
  matches.sort((a, b) => a.rank - b.rank
    || (a.item.kind === "course" && b.item.kind === "course" ? compareLearningCourses({ slug: a.item.courseSlug }, { slug: b.item.courseSlug }) : 0)
    || a.item.title.localeCompare(b.item.title));
  return matches.map(match => match.item);
}
