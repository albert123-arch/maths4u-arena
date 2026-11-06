import { z } from "zod";
import { db } from "./prisma";
import { type Actor, admin, transaction } from "./security";
import { archiveAdmin } from "./content-access";
import { ensure } from "./errors";
import { origins } from "./content-origin";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { privateStorageRoot } from "./storage-config";
import { bankTasksSchema } from "./bank-schema";
import { digest } from "./security";
import { databaseConfig } from "./database-url";

export async function changeContentAccess(actor: Actor, id: string, input: unknown) {
  admin(actor); ensure(archiveAdmin(actor));
  const d = z.object({ origin: z.enum(origins).optional(), reason: z.string().trim().min(5).max(1000), archive: z.boolean().optional() }).strict().parse(input);
  ensure(d.origin !== undefined || d.archive !== undefined, 400, "INVALID_INPUT");
  return transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Task WHERE id=${id} FOR UPDATE`;
    const t = await tx.task.findUnique({ where: { id } }); ensure(t, 404, "NOT_FOUND");
    const classifiedArchive=d.origin==="CAMBRIDGE_EXAM"||d.origin==="DEMO";
    ensure(d.archive !== true || ["CAMBRIDGE_EXAM","DEMO"].includes(d.origin ?? t.origin), 400, "ARCHIVE_ORIGIN_REQUIRED");
    ensure(!t.examArchivedAt || d.archive === false || ["CAMBRIDGE_EXAM","DEMO"].includes(d.origin ?? t.origin), 400, "ARCHIVE_ORIGIN_REQUIRED");
    const row = await tx.task.update({ where: { id }, data: {
      ...(d.origin ? { origin: d.origin, originManual: true, originRule: "owner-manual", originReason: d.reason } : {}),
      ...(d.archive === undefined ? classifiedArchive?{examArchivedAt:t.examArchivedAt??new Date()}:{} : { examArchivedAt: d.archive ? t.examArchivedAt ?? new Date() : null }),
    } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: d.origin ? "CONTENT_ORIGIN_MANUAL" : d.archive ? "CAMBRIDGE_ARCHIVED" : "CAMBRIDGE_RESTORED", targetId: id } });
    return { id, origin: row.origin, originManual: row.originManual, examArchivedAt: row.examArchivedAt };
  });
}
export async function archiveOverview(actor: Actor) {
  admin(actor); ensure(archiveAdmin(actor));
  const counts = await db().task.groupBy({ by: ["origin"], _count: true });
  const batches=await db().bankBatch.findMany({where:{appliedAt:{not:null},key:{startsWith:"tasks-"}},select:{runId:true,key:true}});
  return { counts: counts.map(c => ({ origin: c.origin, count: c._count })), archived: await db().task.count({ where: { examArchivedAt: { not: null } } }),batches };
}

const batchSchema=z.object({runId:z.string().regex(/^[a-f0-9]{64}$/),key:z.string().max(100),origin:z.enum(origins),reason:z.string().trim().min(5).max(1000),fingerprint:z.string().optional()}).strict();
export async function classifyImportBatch(actor:Actor,input:unknown,apply=false){
  admin(actor);ensure(archiveAdmin(actor));const d=batchSchema.parse(input);
  const batch=await db().bankBatch.findUnique({where:{runId_key:{runId:d.runId,key:d.key}}});ensure(batch?.appliedAt,404,"NOT_FOUND");
  const rows=bankTasksSchema.parse(batch.payload),records=await db().importRecord.findMany({where:{sourceProject:"maths4u",legacyId:{in:rows.map(r=>r.table+":"+r.id)}},include:{task:true}});
  ensure(records.length===rows.length,409,"BATCH_NOT_COMPLETE");
  const before=records.map(r=>({id:r.taskId,origin:r.task.origin,originManual:r.task.originManual,originReason:r.task.originReason,originRule:r.task.originRule,examArchivedAt:r.task.examArchivedAt?.toISOString()??null})).sort((a,b)=>a.id.localeCompare(b.id));
  const fingerprint=digest(JSON.stringify({before,origin:d.origin,reason:d.reason}));
  if(!apply)return {fingerprint,count:before.length,taskIds:before.map(t=>t.id),origin:d.origin,willArchive:["CAMBRIDGE_EXAM","DEMO"].includes(d.origin)};
  ensure(d.fingerprint===fingerprint,409,"STALE_DRY_RUN");
  const id=randomUUID(),folder=path.join(privateStorageRoot(),"content-policy-journals"),file=path.join(folder,id+".json");
  const at=new Date(),after=before.map(t=>({...t,origin:d.origin,originManual:true,originReason:d.reason,originRule:"owner-manual",examArchivedAt:["CAMBRIDGE_EXAM","DEMO"].includes(d.origin)?t.examArchivedAt??at.toISOString():t.examArchivedAt}));
  const cfg=databaseConfig(),database=digest(cfg.host+":"+cfg.port+"/"+cfg.database);
  const journal={schema:1,kind:"batch-origin",database,id,state:"PREPARED",before,after};await fs.mkdir(folder,{recursive:true});await fs.writeFile(file,JSON.stringify(journal,null,2),{flag:"wx"});
  await transaction(async tx=>{for(const t of before){await tx.$queryRaw`SELECT id FROM Task WHERE id=${t.id} FOR UPDATE`;const current=await tx.task.findUniqueOrThrow({where:{id:t.id}});ensure(current.origin===t.origin&&current.originManual===t.originManual&&current.originReason===t.originReason&&current.originRule===t.originRule&&(current.examArchivedAt?.toISOString()??null)===t.examArchivedAt,409,"STALE_DRY_RUN");const e=after.find(e=>e.id===t.id)!;await tx.task.update({where:{id:e.id},data:{origin:e.origin,originManual:e.originManual,originReason:e.originReason,originRule:e.originRule,examArchivedAt:e.examArchivedAt?new Date(e.examArchivedAt):null}});}await tx.auditEvent.create({data:{actorId:actor.id,action:"CONTENT_BATCH_ORIGIN_MANUAL",targetId:id}});});
  journal.state="APPLIED";await fs.writeFile(file,JSON.stringify(journal,null,2));return {count:before.length,journalId:id};
}
