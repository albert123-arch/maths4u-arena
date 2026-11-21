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
}, {
  key: "9709-p3-differential-equations", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "5b393538354dbd1d5f0b686be82d205d3194a270bec0d44fc12965f5f65e09b0",
  toFingerprint: "fff64573bfdf86bf41421bc61742f7597b5e8d620e9c96bfb024be2d8132873d",
}, {
  key: "9709-p3-complex-numbers", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "e5edb108cf32fa60ad83eed351cc944cc00887a502c823d0433c9eb4ba8ef9f8",
  toFingerprint: "c5c3ed98f30b93a82e2a0f8a6c0efe352aa9e50d90e96c0bbf87276542bf853c",
}, {
  key: "9709-m1-forces-and-equilibrium", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "9035dd1bf8dd98be0493171c2ef334176fec9af6eb86acd084f8712bf7e376d4",
  toFingerprint: "62977900677abfeccc6bd2eb2c9d9001cca4f7c6f98f9506c26e1eb3c8c9795f",
}, {
  key: "9709-m1-kinematics", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "a8855e722775cccfd8f3eeb27378abcb9dfbce17e6ed17b0e01daa77f00005b2",
  toFingerprint: "c5a865acdda2aa5e4e2015d889bd5c2ab86e30ce93e9a243dd7b1481ea2ba653",
}, {
  key: "9709-m1-momentum", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "e254cd0eadedeba0aa0bc5b699f6c865af3d139c9ecaa9c4e933c941ef221914",
  toFingerprint: "bcc7c1cdc539d95e06e203bb436979e2bd22e1f2efaf67b95cc7fc5fdcced0cb",
}, {
  key: "9709-m1-newtons-laws", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "7b6e036f3429f5eca7c68d2518fabb377c40c6150644065713df9efe24bd8605",
  toFingerprint: "7f6b425e3c7e26b2668e41e950751f5e822c029e5d9aac0b26237952736bc74e",
}, {
  key: "9709-m1-energy-work-power", fromVersion: "1.0.0", toVersion: "1.0.1",
  fromFingerprint: "021a8bcb9b736af1dc0cbd4aa903b3c258d0c6b8140f74ffaf8e453bab575063",
  toFingerprint: "58f4adbc5cc1981c07b785f3cf9b21e658002fe2adf87fc6deb818470bf0c7e7",
}] as const;

export function notationProgressPolicy(p: ContentPackage) {
  const candidates = notationProgressRevisions.filter(r => r.key === p.key && r.toVersion === p.version);
  if (!candidates.length) return [];
  const fingerprint = createHash("sha256").update(JSON.stringify(p)).digest("hex");
  return candidates.filter(r => r.toFingerprint === fingerprint);
}
