import { nextReview, type ReviewState } from "./pure1-review-policy.mjs";
export const squarePath = "/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square";
export const squareLessonId = "orig_quadratics_completing_square";
export const squareVersion = "2026-11-05.1";
export type QuadraticTopic = { key: string; code: string; lessonId: string; path: string; title: string; summary: string; version: string; sourceProject: string; storage: string; api: string };
export const quadraticTopics: QuadraticTopic[] = [
  { key: "equations", code: "EQ", lessonId: "orig_quadratics_factorisation", title: "Equations, factorisation and valid roots", summary: "Choose a method, keep every valid root and check the original equation." },
  { key: "completing-square", code: "CS", lessonId: squareLessonId, title: "Completing the square", summary: "Turn a quadratic into a form that tells you its vertex, roots and range." },
  { key: "discriminant", code: "DR", lessonId: "orig_quadratics_roots", title: "Discriminant, parameters and tangency", summary: "Count real roots, handle exceptional parameter values and locate tangents." },
  { key: "inequalities", code: "IN", lessonId: "orig_quadratics_inequalities", title: "Quadratic inequalities and constraints", summary: "Find the whole solution set, including the right boundaries and restrictions." },
  { key: "simultaneous", code: "SY", lessonId: "orig_quadratics_simultaneous", title: "Linear and quadratic simultaneous equations", summary: "Find every matched pair and connect algebra with intersections and tangency." },
].map(t => ({ ...t, path: "/courses/maths4u-9709-p1/topics/" + t.lessonId, version: t.code === "CS" ? squareVersion : "2026-11-05.quadratics.1", sourceProject: t.code === "CS" ? "arena-original-square" : "arena-original-quadratics-20261105", storage: t.code === "CS" ? "maths4u.square" : "maths4u.quadratics." + t.key, api: t.code === "CS" ? "learning/square" : "learning/quadratics/" + t.key }));
export function quadraticTopic(key = "completing-square") { const t = quadraticTopics.find(t => t.key === key); if (!t) throw Error("UNKNOWN_QUADRATICS_TOPIC"); return t; }
export type SquareField = { key: string; label: string; type: string; variables?: string[]; options?: Record<string, string>; dimension?: number; factor_variable?: string };
export type SquareQuestion = { uid: string; family: string; title: string; collection: string; prompt: string; fields: SquareField[]; marks: number; manual: boolean };
export type SquareLesson = { version: string; topic: QuadraticTopic; title: string; notes: string; examples: { title: string; question: string; solution: string }[]; questions: SquareQuestion[] };
export type CheckEvent = { eventKey: string; uid: string; answers: Record<string, string>; helpUsed: boolean; at: number };
export type CheckResult = { valid: boolean; correct: boolean; fields: Record<string, { correct: boolean; message: string; formatError?: true }>; error?: string };
export type Evidence = { eventKey: string; uid: string; family: string; correct: boolean; helpUsed: boolean; at: number; imported?: boolean };
export type SquareSnapshot = { states: Record<string, ReviewState>; seen: Record<string, number>; evidence: Evidence[]; notesRead?: boolean };
export function squareSnapshot(evidence: Evidence[]): SquareSnapshot {
  const states: Record<string, ReviewState> = {}, seen: Record<string, number> = {};
  for (const e of [...evidence].sort((a,b) => a.at - b.at || a.eventKey.localeCompare(b.eventKey))) {
    states[e.family] = nextReview(states[e.family], { at: e.at, correct: e.correct, helpUsed: e.helpUsed });
    // Device history helps choose practice, but cannot certify spaced mastery.
    if (e.imported && states[e.family].streak > 1) states[e.family] = { ...states[e.family], streak: 1, dueAt: e.at + 86400000 };
    seen[e.uid] = Math.max(seen[e.uid] ?? 0, e.at);
  }
  return { states, seen, evidence };
}
export function nextSquareReview(questions: SquareQuestion[], snapshot: SquareSnapshot, now = Date.now()) {
  const families = [...new Set(questions.filter(q => q.collection === "short").map(q => q.family))];
  return families.filter(f => snapshot.states[f]?.dueAt <= now).sort((a,b) => Number(snapshot.states[a].correct) - Number(snapshot.states[b].correct) || snapshot.states[a].dueAt - snapshot.states[b].dueAt).map(f =>
    questions.filter(q => q.family === f).sort((a,b) => (snapshot.seen[a.uid] ?? 0) - (snapshot.seen[b.uid] ?? 0) || a.uid.localeCompare(b.uid))[0]);
}
