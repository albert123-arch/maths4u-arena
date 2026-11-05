export const learningDirections = [
  { key: "igcse", code: "0580", title: "IGCSE Mathematics", ru: "Математика IGCSE", description: "Build strong foundations and prepare for IGCSE Extended.", descriptionRu: "Укрепите базовые навыки и подготовьтесь к IGCSE Extended.", legacy: "igcse" },
  { key: "additional", code: "0606", title: "Additional Mathematics", ru: "Дополнительная математика", description: "Go further with algebra, functions, geometry and calculus.", descriptionRu: "Алгебра, функции, геометрия и основы математического анализа.", legacy: "additional" },
  { key: "a-level", code: "9709", title: "AS & A Level Mathematics", ru: "Математика AS и A Level", description: "Pure Mathematics, Probability & Statistics and Mechanics.", descriptionRu: "Чистая математика, вероятность, статистика и механика.", legacy: "a-level" },
  { key: "further", code: "9231", title: "Further Mathematics", ru: "Углублённая математика", description: "Explore Further Pure, Further Statistics and Further Mechanics.", descriptionRu: "Further Pure, углублённая статистика и механика.", legacy: "further" },
  { key: "school", code: "School", title: "School Mathematics", ru: "Школьная математика", description: "Learn step by step through school topics and useful practice.", descriptionRu: "Школьные темы и практика с постепенным усложнением.", legacy: "school" },
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
export type DiscoveryCourse = { slug: string; title: string; ru: string; description: string; direction: DirectionKey | null; chapters: number; topics: number };
export type DiscoveryItem = { title: string; ru: string; course: string; courseRu: string; chapter: string; chapterRu: string; href: string; direction: DirectionKey | null; kind: "course" | "topic" };
export type DiscoveryData = { courses: DiscoveryCourse[]; items: DiscoveryItem[]; unavailable: boolean };
const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function searchDiscovery(items: DiscoveryItem[], query: string): DiscoveryItem[] {
  const terms = fold(query.slice(0, 120)).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return items.filter(i => terms.every(t => fold([i.title, i.ru, i.course, i.courseRu, i.chapter, i.chapterRu, i.href, learningDirections.find(d => d.key === i.direction)?.code ?? ""].join(" ")).includes(t))).sort((a, b) => Number(a.kind === "course") - Number(b.kind === "course") || a.title.localeCompare(b.title));
}
