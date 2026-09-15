import { mkdir, readFile, writeFile, statfs } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "./prisma";
import { admin, digest, lockUser, secret, transaction, type Actor } from "./security";
import { ensure } from "./errors";
import { privateStorageRoot } from "./storage-config";
import { verifyFile } from "./files";
import { createTaskVersion, taskSchema } from "./content";
import { pilotId } from "./pilot-schema";
import { bankHash, bankKey, bankManifestSchema, bankAssetsSchema, bankTasksSchema, bankStructureSchema, type BankAsset, type BankTask } from "./bank-schema";
import type { Prisma } from "../generated/prisma/client";
import { verifyBankSvg } from "./bank-svg.mjs";
import { parseDocument } from "htmlparser2";
import { findAll } from "domutils";
import {canonicalJson} from './canonical-json.mjs';

const runSchema=z.object({manifest:bankManifestSchema,publishNew:z.boolean().default(false)});
const requestSchema=z.object({runId:bankHash,key:bankKey});
type Tx=Prisma.TransactionClient;
async function run(id:string) {const r=await db().bankRun.findUnique({where:{id}});ensure(r,404,"BANK_RUN_NOT_FOUND");return runSchema.parse(r.manifest);}
async function batch(runId:string,key:string) {const r=await run(runId),meta=r.manifest.batches.find(b=>b.key===key);ensure(meta,404,"BANK_BATCH_NOT_FOUND");const b=await db().bankBatch.findUnique({where:{runId_key:{runId,key}}});ensure(b&&digest(canonicalJson(b.payload))===meta.sha256,409,"BANK_BATCH_NOT_STAGED");return {meta,payload:b.payload,publishNew:r.publishNew};}
export async function beginBank(actor:Actor,input:unknown) {
  admin(actor);const parsed=runSchema.parse(input),runId=digest(JSON.stringify(parsed));
  await db().bankRun.upsert({where:{id:runId},create:{id:runId,manifest:parsed},update:{}});
  return bankStatus(actor,runId);
}
export async function bankStatus(actor:Actor,id:string) {
  admin(actor);bankHash.parse(id);const r=await run(id),batches=await db().bankBatch.findMany({where:{runId:id},select:{key:true,appliedAt:true}});
  return {runId:id,publishNew:r.publishNew,missingBatches:r.manifest.batches.filter(m=>!batches.some(b=>b.key===m.key)).map(b=>b.key),applied:batches.filter(b=>b.appliedAt).map(b=>b.key),tasks:r.manifest.tasks,files:r.manifest.files,bytes:r.manifest.bytes};
}
export async function stageBankBatch(actor:Actor,input:unknown) {
  admin(actor);const d=requestSchema.extend({payload:z.unknown()}).parse(input),r=await run(d.runId),meta=r.manifest.batches.find(m=>m.key===d.key);
  ensure(meta && Buffer.byteLength(JSON.stringify(d.payload))<=512*1024 && digest(canonicalJson(d.payload))===meta.sha256,400,"BANK_BATCH_HASH");
  const parsed=meta.kind==="assets"?bankAssetsSchema.parse(d.payload):meta.kind==="tasks"?bankTasksSchema.parse(d.payload):bankStructureSchema.parse(d.payload);
  ensure(parsed.length===meta.count,400,"BANK_BATCH_COUNT");
  if(meta.kind==="tasks")for(const row of bankTasksSchema.parse(d.payload)) {
    const fields={statement:"STATEMENT",answer:"ANSWER",hint:"HINT",solution:"SOLUTION",markScheme:"MARK_SCHEME",markSchemeText:"MARK_SCHEME",teacherNote:"TEACHER"} as const;
    for(const text of row.material.texts)for(const [field,role] of Object.entries(fields))for(const img of findAll(n=>n.name==="img",parseDocument(text[field as keyof typeof fields]??"").children))ensure(row.material.assets.some(a=>img.attribs.src==="/api/files/"+a.fileId&&a.role===role&&(!a.locale||a.locale===text.locale)),400,"BANK_INLINE_FILE_ROLE");
    ensure(row.material.visibility==="PRIVATE",400,"BANK_SOURCE_ACCESS_FIELDS");
  }
  await db().bankBatch.upsert({where:{runId_key:{runId:d.runId,key:d.key}},create:{runId:d.runId,key:d.key,payload:d.payload as Prisma.InputJsonValue},update:{}});
  return {staged:true};
}
async function storedAsset(a:BankAsset,checkDisk=true) {
  const f=await db().storedFile.findUnique({where:{id:a.id}});if(!f)return null;
  ensure(!f.deletedAt&&f.sha256===a.sha256&&f.size===a.size&&f.mimeType===a.mimeType&&!await db().answerFile.count({where:{fileId:f.id}}),409,"BANK_FILE_CONFLICT");
  if(checkDisk)ensure(digest(await readFile(path.join(privateStorageRoot(),f.storageKey)))===a.sha256,409,"BANK_FILE_HASH");return f;
}
export async function bankAssetStatus(actor:Actor,input:unknown) {
  admin(actor);const d=requestSchema.parse(input),b=await batch(d.runId,d.key);ensure(b.meta.kind==="assets",400,"BANK_BATCH_KIND");const missing=[];
  for(const a of bankAssetsSchema.parse(b.payload))if(!await storedAsset(a))missing.push(a.id);return {missing};
}
export async function stageBankFile(actor:Actor,input:unknown) {
  admin(actor);const d=requestSchema.extend({id:z.string(),base64:z.string().max(1400000)}).parse(input),b=await batch(d.runId,d.key);ensure(b.meta.kind==="assets",400,"BANK_BATCH_KIND");
  const a=bankAssetsSchema.parse(b.payload).find(a=>a.id===d.id);ensure(a,400,"BANK_FILE_UNLISTED");
  const bytes=Buffer.from(d.base64,"base64");ensure(bytes.length===a.size&&bytes.toString("base64")===d.base64&&digest(bytes)===a.sha256,400,"BANK_FILE_HASH");
  if(a.mimeType==="image/svg+xml") {try{verifyBankSvg(bytes);}catch{ensure(false,415,"BANK_SVG_UNSAFE");}} else verifyFile(bytes,a.mimeType,a.file);
  if(await storedAsset(a))return {created:false};
  const storage=privateStorageRoot();await mkdir(storage,{recursive:true});const space=await statfs(storage);ensure(space.bavail*space.bsize>bytes.length+64*1024*1024,507,"BANK_STORAGE_FULL");
  return transaction(async tx=>{await lockUser(tx,actor.id);const existing=await tx.storedFile.findUnique({where:{id:a.id}});if(existing){ensure(existing.sha256===a.sha256&&!existing.deletedAt,409,"BANK_FILE_CONFLICT");return {created:false};}
    const storageKey=secret();await writeFile(path.join(storage,storageKey),bytes,{flag:"wx"});
    await tx.storedFile.create({data:{id:a.id,ownerId:actor.id,storageKey,originalName:path.basename(a.file),mimeType:a.mimeType,size:a.size,sha256:a.sha256}});return {created:true};
  });
}
const recordKey=(r:BankTask)=>({sourceProject:"maths4u",legacyId:r.table+":"+r.id});
async function existingRecord(tx:Tx,r:BankTask) {
  const canonical=await tx.importRecord.findUnique({where:{sourceProject_legacyId:recordKey(r)}});
  if(canonical)return canonical;
  if(r.table!=="problems")return null;
  const legacy=await tx.importRecord.findUnique({where:{sourceProject_legacyId:{sourceProject:"maths4u",legacyId:r.id}}});
  if(legacy)ensure(r.links.some(l=>l.lessonKey==="subchapter-576")&&await tx.lessonTask.count({where:{taskId:legacy.taskId,lessonId:pilotId("lesson","maths4u","subchapter-576")}}),409,"BANK_LEGACY_ID_CONFLICT");
  return legacy;
}
async function taskPlan(tx:Tx,rows:BankTask[],publishNew:boolean) {
  const result=[];
  for(const row of rows) {
    const existing=await existingRecord(tx,row),task=existing?await tx.task.findUniqueOrThrow({where:{id:existing.taskId},include:{topics:true,versions:{take:1,orderBy:{number:"desc"},select:{id:true,number:true}}}}):null;
    const sourceHash=digest(JSON.stringify(row)),canonical=existing?.legacyId===recordKey(row).legacyId;
    const material=taskSchema.parse({...row.material,visibility:task?.visibility??(publishNew&&row.sourcePublished?"PUBLIC":"PRIVATE"),featureKey:task?.featureKey??null,topicIds:[...new Set([...(task?.topics.map(t=>t.topicId)??[]),...row.links.map(l=>pilotId("topic","maths4u",l.chapterKey))])]});
    ensure(!row.material.featureKey && !row.material.topicIds.length,400,"BANK_SOURCE_ACCESS_FIELDS");
    result.push({row,material,taskId:task?.id,versionId:task?.versions[0]?.id,sourceHash,action:canonical&&existing.contentHash===sourceHash?"unchanged":existing?"new-version":"create"});
  }return result;
}
function planReport(p:Awaited<ReturnType<typeof taskPlan>>) {return {fingerprint:digest(JSON.stringify(p.map(({row,...r})=>({...r,sourceId:row.table+":"+row.id})))),items:p.map(r=>({sourceId:r.row.table+":"+r.row.id,taskId:r.taskId,versionId:r.versionId,action:r.action})),created:p.filter(r=>r.action==="create").length,updated:p.filter(r=>r.action==="new-version").length,skipped:p.filter(r=>r.action==="unchanged").length};}
export async function checkBankTasks(actor:Actor,input:unknown) {
  admin(actor);const d=requestSchema.parse(input),b=await batch(d.runId,d.key);ensure(b.meta.kind==="tasks",400,"BANK_BATCH_KIND");return planReport(await taskPlan(db(),bankTasksSchema.parse(b.payload),b.publishNew));
}
const assetCache=new Map<string,Map<string,BankAsset>>();
async function assetIndex(runId:string) {const cached=assetCache.get(runId);if(cached)return cached;const r=await run(runId),index=new Map<string,BankAsset>(),metas=r.manifest.batches.filter(b=>b.kind==="assets");
  const saved=await db().bankBatch.findMany({where:{runId,key:{in:metas.map(m=>m.key)}}});
  for(const m of metas){const b=saved.find(b=>b.key===m.key);ensure(b&&digest(canonicalJson(b.payload))===m.sha256,409,"BANK_BATCH_NOT_STAGED");for(const a of bankAssetsSchema.parse(b.payload)){const previous=index.get(a.id);ensure(!previous||previous.sha256===a.sha256&&previous.role===a.role,400,"BANK_DUPLICATE_FILE");index.set(a.id,a);}}
  ensure(index.size===r.manifest.files,400,"BANK_FILE_COUNT");if(assetCache.size>=2)assetCache.delete(assetCache.keys().next().value!);assetCache.set(runId,index);return index;}
export async function applyBankTasks(actor:Actor,input:unknown) {
  admin(actor);const d=requestSchema.extend({fingerprint:bankHash}).parse(input),b=await batch(d.runId,d.key);ensure(b.meta.kind==="tasks",400,"BANK_BATCH_KIND");const rows=bankTasksSchema.parse(b.payload),files=await assetIndex(d.runId);
  for(const row of rows)for(const a of row.material.assets){const expected=files.get(a.fileId);ensure(expected&&expected.role===a.role&&await storedAsset(expected),409,"BANK_FILES_REQUIRED");}
  return transaction(async tx=>{await lockUser(tx,actor.id);
    for(const row of [...rows].sort((a,b)=>a.id.localeCompare(b.id))){const r=await existingRecord(tx,row);if(r)await tx.$queryRaw`SELECT id FROM Task WHERE id=${r.taskId} FOR UPDATE`;}
    const p=await taskPlan(tx,rows,b.publishNew),report=planReport(p);ensure(report.fingerprint===d.fingerprint,409,"BANK_STALE_DRY_RUN");
    for(const r of p) {
      for(const link of r.row.links){const lesson=await tx.lesson.findUnique({where:{id:pilotId("lesson","maths4u",link.lessonKey)},include:{topic:{select:{courseId:true}}}});ensure(lesson&&lesson.topicId===pilotId("topic","maths4u",link.chapterKey)&&lesson.topic.courseId===pilotId("course","maths4u",link.courseKey),409,"BANK_STRUCTURE_REQUIRED");}
      let taskId=r.taskId;
      if(r.action!=="unchanged") {const v=await createTaskVersion(tx,actor,r.material,taskId);taskId=v.taskId;const key=recordKey(r.row);await tx.importRecord.upsert({where:{sourceProject_legacyId:key},create:{...key,taskId,contentHash:r.sourceHash},update:{contentHash:r.sourceHash,importedAt:new Date()}});}
      for(const l of r.row.links){const lessonId=pilotId("lesson","maths4u",l.lessonKey);await tx.lessonTask.upsert({where:{lessonId_taskId:{lessonId,taskId:taskId!}},create:{lessonId,taskId:taskId!,position:l.position},update:{position:l.position}});}
    }
    await tx.bankBatch.update({where:{runId_key:{runId:d.runId,key:d.key}},data:{appliedAt:new Date()}});
    if(report.created||report.updated)await tx.auditEvent.create({data:{actorId:actor.id,action:"BANK_TASKS_IMPORTED",targetId:d.runId+":"+d.key}});return report;
  });
}
async function structurePlan(tx:Tx,rows:ReturnType<typeof bankStructureSchema.parse>) {
  const items=[];for(const c of rows){const id=pilotId("course","maths4u",c.key),before=await tx.course.findUnique({where:{id},include:{texts:true}});items.push({sourceId:"course:"+c.key,action:before?"update":"create",before});
    for(const ch of c.chapters){const id=pilotId("topic","maths4u",ch.key),before=await tx.topic.findUnique({where:{id},include:{texts:true}});items.push({sourceId:ch.key,action:before?"update":"create",before});
      for(const l of ch.lessons){const id=pilotId("lesson","maths4u",l.key),before=await tx.lesson.findUnique({where:{id},include:{versions:{take:1,orderBy:{number:"desc"},include:{texts:true}}}});items.push({sourceId:l.key,action:before?"update":"create",before});}}
  }return {fingerprint:digest(JSON.stringify({rows,items})),items:items.map(({sourceId,action})=>({sourceId,action}))};
}
async function structureApplied(tx:Tx,key:string,sha256:string){const rows=await tx.bankBatch.findMany({where:{key,appliedAt:{not:null}},select:{payload:true}});return rows.some(r=>digest(canonicalJson(r.payload))===sha256);}
export async function checkBankStructure(actor:Actor,input:unknown) {admin(actor);const d=requestSchema.parse(input),b=await batch(d.runId,d.key);ensure(b.meta.kind==="structure",400,"BANK_BATCH_KIND");const p=await structurePlan(db(),bankStructureSchema.parse(b.payload));if(await structureApplied(db(),d.key,b.meta.sha256))p.items.forEach(i=>i.action="unchanged");return p;}
export async function applyBankStructure(actor:Actor,input:unknown) {
  admin(actor);const d=requestSchema.parse(input),b=await batch(d.runId,d.key);ensure(b.meta.kind==="structure",400,"BANK_BATCH_KIND");const rows=bankStructureSchema.parse(b.payload);
  return transaction(async tx=>{await lockUser(tx,actor.id);let lessonsCreated=0;
    if(await structureApplied(tx,d.key,b.meta.sha256)){await tx.bankBatch.update({where:{runId_key:{runId:d.runId,key:d.key}},data:{appliedAt:new Date()}});return {lessonsCreated:0};}
    for(const c of rows){const courseId=pilotId("course","maths4u",c.key);await tx.course.upsert({where:{id:courseId},create:{id:courseId,slug:"maths4u-"+c.key,position:c.position,groupLabel:c.groupLabel,published:b.publishNew},update:{position:c.position,groupLabel:c.groupLabel}});
      await tx.courseText.upsert({where:{courseId_locale:{courseId,locale:"en"}},create:{courseId,locale:"en",title:c.title,description:c.description},update:{title:c.title,description:c.description}});
      for(const ch of c.chapters){const topicId=pilotId("topic","maths4u",ch.key);const prior=await tx.topic.findUnique({where:{id:topicId}});ensure(!prior||prior.courseId===courseId,409,"BANK_STRUCTURE_CONFLICT");await tx.topic.upsert({where:{id:topicId},create:{id:topicId,courseId,slug:ch.key,position:ch.position},update:{position:ch.position}});await tx.topicText.upsert({where:{topicId_locale:{topicId,locale:"en"}},create:{topicId,locale:"en",title:ch.title},update:{title:ch.title}});
        for(const l of ch.lessons){const lessonId=pilotId("lesson","maths4u",l.key);const old=await tx.lesson.findUnique({where:{id:lessonId},include:{versions:{take:1,orderBy:{number:"desc"},include:{texts:true}}}});ensure(!old||old.topicId===topicId,409,"BANK_STRUCTURE_CONFLICT");await tx.lesson.upsert({where:{id:lessonId},create:{id:lessonId,topicId,position:l.position},update:{position:l.position}});const texts=l.texts.map(t=>({...t})).sort((a,b)=>a.locale.localeCompare(b.locale)),before=old?.versions[0];const same=before&&JSON.stringify(before.texts.map(({locale,title,body,examples})=>({locale,title,body,examples:examples??""})).sort((a,b)=>a.locale.localeCompare(b.locale)))===JSON.stringify(texts);if(!same){await tx.lessonVersion.create({data:{lessonId,number:(before?.number??0)+1,texts:{create:texts}}});lessonsCreated++;}}
      }
    }await tx.bankBatch.update({where:{runId_key:{runId:d.runId,key:d.key}},data:{appliedAt:new Date()}});return {lessonsCreated};
  });
}
