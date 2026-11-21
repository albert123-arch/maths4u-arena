import { createHash } from "node:crypto";
import type { ContentPackage } from "./content-package-schema";

// Explicitly reviewed notation-only revisions. Matching both complete package
// fingerprints prevents an unrelated edit with the same answer retaining mastery.
export const notationProgressRevisions = [{
  key: "9231-fp1-roots", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "1d92023eb562cd59b9f69b796fcc5b1399ef5e74dde8807c22ad681bbb20d895",
  toFingerprint: "d4fbdd12e81e9cb8688bd36d30cc0f89b8a1fc4d0794cf8d86d9eda0c9951a09",
}, {
  key: "9709-s1-normal", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "71a47602c62f7d3be8bcd90dc4e3f6bcec6147f0cf21d76ee7f220ce1be1bf6b",
  toFingerprint: "9d31003972968f90340e97d738adc3622d021e7cc7a0a082ec559e7082ed948e",
}, {
  key: "9709-p3-numerical-methods", fromVersion: "1.0.1", toVersion: "1.0.2",
  fromFingerprint: "256c3e723597f73753631fec4c6285d48de91e46c64e92b5185eabf77f96dd61",
  toFingerprint: "16904a23cf3ebf62ae21b27416d094c5b9d58e30c8e9cb682e1f3377af3e0599",
}, {
  key: "9709-p3-vectors", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "9a45b48f00dbb581deefd2fd0e66e39645d628bdbbaef35db65a64ae0223d7dd",
  toFingerprint: "f9388a6c512b6557cded6783483a760c219dc2f967aceff90cc21aa4e23a30a9",
}] as const;

export function notationProgressPolicy(p: ContentPackage) {
  const candidates = notationProgressRevisions.filter(r => r.key === p.key && r.toVersion === p.version);
  if (!candidates.length) return [];
  const fingerprint = createHash("sha256").update(JSON.stringify(p)).digest("hex");
  return candidates.filter(r => r.toFingerprint === fingerprint);
}
