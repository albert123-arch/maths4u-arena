export const cambridgeNames = ["Cambridge", "Cambridge International"];
export const hasH1Provenance = (v: Pick<Provenance,"source"|"examBoard">) => cambridgeNames.some(n => [v.source,v.examBoard].some(s => s?.toLowerCase() === n.toLowerCase()));
export const originRule = "provenance-20261106-v1";
export const origins = ["ORIGINAL", "CAMBRIDGE_EXAM", "OTHER_THIRD_PARTY", "UNKNOWN", "DEMO"] as const;
export type ContentOrigin = typeof origins[number];
export type Provenance = { source: string | null; sourceUrl?: string | null; materialCategory: string; examBoard: string | null; syllabus: string | null; year: number | null; examSession: string | null; paper: string | null; questionNumber: string | null; sourceUid: string | null; sourceReference: string | null; titles: string[] };
function classifyVersion(v: Provenance): { origin: ContentOrigin; reason: string } {
  const source = v.source ?? "", ref = v.sourceReference ?? "", uid = v.sourceUid ?? "";
  const original = /^Maths4U Original\b/i.test(source) && /^M4U-/i.test(uid) && /original (?:exam-style|short practice|package)|owner-supplied original package/i.test(ref);
  const exam = /^(?:Cambridge|Cambridge International)(?:\b|$)/i.test(source)
    && !!v.syllabus && !!v.year && !!v.paper && !!v.questionNumber
    && (/Cambridge/i.test(v.examBoard ?? "") || /^\d{4}_[msw]\d{2}_qp_\d{2}_q\d+/i.test(uid) || v.titles.some(t => /(?:March|June|November)\s+20\d{2}\s+p\d+\s+q\d+/i.test(t)));
  if (original && exam) return { origin: "UNKNOWN", reason: "Conflicting original and examination provenance; owner review required." };
  if (original) return { origin: "ORIGINAL", reason: "Explicit Maths4U Original source, M4U editorial UID and original-authoring reference." };
  if (exam) return { origin: "CAMBRIDGE_EXAM", reason: "Named Cambridge source and full syllabus/year/paper/question coordinates corroborated by board, paper UID or title (including older UNKNOWN category versions)." };
  let host = ""; try { host = new URL(v.sourceUrl ?? "").hostname; } catch { /* No positive external reference. */ }
  if (source && host && !/(^|\.)maths4u\.sbs$/.test(host) && !/Cambridge|Unknown|preview|demo/i.test(source)) return { origin: "OTHER_THIRD_PARTY", reason: "Named external source and external source URL; ownership and licence are not inferred." };
  return { origin: "UNKNOWN", reason: /Olymp|Book 2/i.test(source) ? "Olympiad/book import has no explicit authorship, external author reference or examination coordinates; import project alone does not establish ownership." : /preview|demo/i.test(source) ? "Local demo material has no explicit authoring provenance; left unchanged for owner review." : "Insufficient or contradictory provenance. A syllabus, EXAM category or the word Cambridge alone is not proof of an examination question." };
}
export function classifyTask(versions: Provenance[]) {
  if (versions.some(hasH1Provenance)) return { origin: "CAMBRIDGE_EXAM" as const, reason: "H1: exact Cambridge source/board in a preserved version." };
  const evidence = versions.map(classifyVersion), known = [...new Set(evidence.filter(e => e.origin !== "UNKNOWN").map(e => e.origin))];
  if (known.length > 1 || evidence.some(e => e.origin === "UNKNOWN") && known.length) return { origin: "UNKNOWN" as const, reason: "Task versions have conflicting or incomplete provenance; review every preserved version before changing access." };
  return evidence[0] ?? { origin: "UNKNOWN" as const, reason: "Task has no versions." };
}
