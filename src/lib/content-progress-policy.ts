import { createHash } from "node:crypto";
import type { ContentPackage } from "./content-package-schema";

// Explicitly reviewed notation-only revisions. Matching both complete package
// fingerprints prevents an unrelated edit with the same answer retaining mastery.
export const notationProgressRevisions = [{
  key: "9231-fp1-roots", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "1d92023eb562cd59b9f69b796fcc5b1399ef5e74dde8807c22ad681bbb20d895",
  toFingerprint: "d4fbdd12e81e9cb8688bd36d30cc0f89b8a1fc4d0794cf8d86d9eda0c9951a09",
}] as const;

export function notationProgressPolicy(p: ContentPackage) {
  const candidates = notationProgressRevisions.filter(r => r.key === p.key && r.toVersion === p.version);
  if (!candidates.length) return [];
  const fingerprint = createHash("sha256").update(JSON.stringify(p)).digest("hex");
  return candidates.filter(r => r.toFingerprint === fingerprint);
}
