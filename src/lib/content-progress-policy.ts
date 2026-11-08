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
}] as const;

export function notationProgressPolicy(p: ContentPackage) {
  const candidates = notationProgressRevisions.filter(r => r.key === p.key && r.toVersion === p.version);
  if (!candidates.length) return [];
  const fingerprint = createHash("sha256").update(JSON.stringify(p)).digest("hex");
  return candidates.filter(r => r.toFingerprint === fingerprint);
}
