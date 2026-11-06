import type { Prisma } from "../generated/prisma/client";
import { classifyTask, originRule } from "./content-origin";
// Import metadata is evidence, never owner approval. All non-Cambridge imports
// wait in UNKNOWN; a manual owner decision is retained across re-imports.
export async function quarantineImportedTask(tx: Prisma.TransactionClient, id: string, unchanged = false) {
  await tx.$queryRaw`SELECT id FROM Task WHERE id=${id} FOR UPDATE`;
  const task=await tx.task.findUniqueOrThrow({where:{id},include:{versions:{orderBy:{number:"desc"},include:{source:true,texts:{select:{title:true}}}}}});
  const evidence=classifyTask(task.versions.map(v=>({...v,source:v.source?.name??null,sourceUrl:v.source?.url??null,titles:v.texts.map(t=>t.title)})));
  const cambridge=evidence.origin==="CAMBRIDGE_EXAM";
  const keepApprovedOriginal=unchanged&&task.origin==="ORIGINAL"&&evidence.origin==="ORIGINAL";
  return tx.task.update({where:{id},data:{...(!task.originManual&&!keepApprovedOriginal?{origin:cambridge?"CAMBRIDGE_EXAM":"UNKNOWN",originReason:cambridge?evidence.reason:"Awaiting owner review. Import evidence: "+evidence.reason,originRule}:{}),...(cambridge?{examArchivedAt:task.examArchivedAt??new Date()}:{})}});
}
