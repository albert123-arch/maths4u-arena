import type { Evidence } from "./square-model";
// A successful first check of a different variant, not a retry of a memorised
// answer. Only the latest evidence for that family can establish this status.
export function freshIndependent(evidence: Evidence[]) {
  return evidence.some((e, i) => e.correct && !e.helpUsed && !e.imported
    && !evidence.slice(i + 1).some(p => p.family === e.family)
    && !evidence.slice(0, i).some(p => p.uid === e.uid)
    && evidence.slice(0, i).some(p => p.family === e.family && p.uid !== e.uid));
}
