import { courseDirection, learningDirections } from "./discovery-model";

export function displayTitle(value: string) {
  return value.replace(/\s*·\s*Maths4U Original\s*$/i, "").replace(/^Maths4U Original\s*·\s*/i, "").trim();
}
export function displayDescription(value: string) { return /^Maths4U Original pilot:/i.test(value) ? "" : value; }
export function displayMarkup(html: string) {
  return html.replace(/<p\b[^>]*>\s*AI-assisted preparation from independent skill briefs\.\s*Teacher editorial review is pending\.\s*<\/p>/gi, "")
    .replace(/<p\b[^>]*>\s*<strong\b[^>]*>Maths4U Original\s*·\s*M4U-[\w-]+\s*·\s*\d+\s*marks?\s*<\/strong>\s*<\/p>/gi, "")
    .replace(/<strong\b[^>]*>Maths4U Original<\/strong>\s*·\s*/gi, "")
    .replace(/(<strong\b[^>]*>)Maths4U Original\s*·\s*/gi, "$1");
}
// Preserve raw provenance in storage/editor DTOs, not in learner projections.
export function displaySource(source?: string) { return /^Maths4U Original\b/.test(source ?? "") ? undefined : source; }
export function displayTeacherNote(raw: string, internal = false) {
  if (internal) return raw;
  // Original written tasks prepend a teaching objective to the metadata JSON;
  // short-practice records contain just the JSON. Keep the objective in either case.
  for (const match of raw.matchAll(/\{(?=\s*"(?:editorialUid|provenance)"\s*:)/g)) {
    try { if (JSON.parse(raw.slice(match.index))?.provenance) return displayMarkup(raw.slice(0, match.index).trimEnd()); } catch { /* Ordinary teaching notes are not JSON metadata. */ }
  }
  return displayMarkup(raw);
}
export function publicPath(path: string) { return path.replace(/^\/ru(?=\/|$)/, "") || "/"; }
export function isPublicLearningPath(path: string) { return path === "/" || /^\/(?:courses|library|learn|search|for-teachers)(?:\/|$)/.test(path); }
export function programKey(slug: string) { return courseDirection(slug) ?? "other"; }
export function programName(slug: string, ru = false) { const d = learningDirections.find(d => d.key === programKey(slug)); return d ? ru ? d.ru : d.title : ru ? "Другие курсы" : "Other courses"; }
export function programOrder(slug: string) { const i = learningDirections.findIndex(d => d.key === programKey(slug)); return i < 0 ? learningDirections.length : i; }
export const russianTeachingText = (value: string) => /[А-Яа-яЁё]{2,}/u.test(value.replace(/<[^>]*>/g, " "));
export type LanguageLesson = { id: string; slug: string; texts: string[] };
export function russianAvailability(rows: LanguageLesson[]) {
  const lessons = rows.filter(r => r.texts.some(russianTeachingText));
  return { lessons: lessons.map(l => ({ id: l.id, slug: l.slug })), courses: [...new Set(lessons.map(l => l.slug))], directions: [...new Set(lessons.map(l => courseDirection(l.slug)).filter((d): d is NonNullable<typeof d> => !!d))] };
}
export type LanguageAvailability = ReturnType<typeof russianAvailability>;
export function hasRussianPage(path: string, data: LanguageAvailability) {
  const p = publicPath(path).split("/").filter(Boolean);
  return p[0] === "learn" && p.length === 2 ? data.directions.some(d => d === p[1])
    : p[0] === "courses" && p.length === 2 ? data.courses.includes(p[1])
    : p[0] === "courses" && p[2] === "topics" && p.length === 4 ? data.lessons.some(l => l.slug === p[1] && l.id === p[3]) : false;
}
