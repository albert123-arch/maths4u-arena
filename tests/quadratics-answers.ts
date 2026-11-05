import type { SourceQuestion } from "../src/lib/square-content";
// Explicit accepted input for factor-format fields; expected is their product.
const factorAnswers: Record<string,string> = {
  "M4U-9709-Q26-E-EQ01": "2x+1 ; x-3",
  "M4U-9709-Q26-E-EQ02": "u-1 ; u-p",
};
export function completeAnswers(q: SourceQuestion): Record<string,string> {
  return Object.fromEntries(q.fields.map(f=>[f.key,f.type==="factors"?factorAnswers[q.id]:Array.isArray(f.expected)?f.expected.join(" ; "):f.expected]));
}
