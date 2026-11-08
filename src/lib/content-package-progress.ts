import { db } from "./prisma";
import { contentPackage } from "./content-package-content";
import { packageVersionMappings } from "./content-packages";
import { notationProgressPolicy } from "./content-progress-policy";

export type CompatibleCheckVersion = { versionId: string; contentVersion: string };
type Member = { uid: string; taskId: string; versionId: string };
function members(value: unknown): Member[] {
  const list = (value as { members?: unknown } | null)?.members;
  return Array.isArray(list) ? list.filter((m): m is Member => !!m && typeof m.uid === "string" && typeof m.taskId === "string" && typeof m.versionId === "string") : [];
}

/** Read aliases only: immutable checks/answers/work items are never rewritten. */
export async function packageCheckVersionAliases(key: string, allowed: ReadonlySet<string>) {
  const policy = notationProgressPolicy(contentPackage(key));
  const aliases = new Map<string, CompatibleCheckVersion>();
  if (!policy.length || !allowed.size) return aliases;
  // Retain the current receipt, fingerprint and identity guards for grading.
  const current = await packageVersionMappings(key);
  const currentVersions = await db().taskVersion.findMany({ where: { id: { in: [...current.values()].filter(id => allowed.has(id)) } }, select: { id: true, taskId: true, sourceUid: true } });
  for (const revision of policy) {
    const receipt = await db().contentRelease.findUnique({ where: { key: `pkg:${key}:${revision.fromVersion}` } });
    if (receipt?.state !== "APPLIED" || receipt.fingerprint !== revision.fromFingerprint) continue;
    const approved = members(receipt.details);
    const oldVersions = await db().taskVersion.findMany({ where: { id: { in: approved.map(m => m.versionId) } }, select: { id: true, taskId: true, sourceUid: true } });
    for (const old of oldVersions) {
      const member = approved.find(m => m.versionId === old.id && m.taskId === old.taskId && m.uid === old.sourceUid);
      const latest = member && currentVersions.find(v => v.id === current.get(member.uid) && v.taskId === old.taskId && v.sourceUid === old.sourceUid);
      if (latest && latest.id !== old.id) aliases.set(old.id, { versionId: latest.id, contentVersion: revision.fromVersion });
    }
  }
  return aliases;
}
