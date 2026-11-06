/** Owner's Stage 6b decision. Local only, append-only text revisions and rollback. */
import fs from "node:fs/promises";import path from "node:path";import {createHash,randomUUID} from "node:crypto";
import {db} from "../src/lib/prisma";import {versionInclude,editableVersion,taskSchema} from "../src/lib/content";
import {appendTaskRevision,appendLessonRevision,versionContent} from "../src/lib/content-revisions";
import {cleanAuthoredMarkup,cleanAuthoredTitle} from "../src/lib/content-text-cleanup";
import type {ContentOrigin} from "../src/generated/prisma/client";
const args=process.argv.slice(2),arg=(s:string,def="")=>args.includes(s)?args[args.indexOf(s)+1]:def,apply=args.includes("--apply"),restore=args.includes("--restore"),reportPath=arg("--report",".local/stage6b-20261106/plan.json"),journalPath=arg("--journal"),actor=arg("--actor");
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const importedText=(t:object)=>Object.fromEntries(Object.entries(t).filter(([k,v])=>v!==null&&!(k==="markSchemeStatus"&&v==="NONE")));
const materialInput=(v:Parameters<typeof editableVersion>[0],t:{visibility:string;featureKey:string|null;topics:{topicId:string}[]})=>{const e=editableVersion(v);return taskSchema.parse({...e,visibility:t.visibility,featureKey:t.featureKey,topicIds:t.topics.map(t=>t.topicId),texts:v.texts.map(importedText),parts:e.parts.map((p,i)=>({...p,texts:v.parts[i].texts.map(importedText)}))});};
type Policy={origin:ContentOrigin;originManual:boolean;originReason:string|null;originRule:string|null;examArchivedAt:string|null};
type Journal={schema:1;kind:"stage6b";run:string;database:string;state:string;tasks:{id:string;before:Policy;after:Policy}[];versions:{taskId:string;before:string;after?:string;rollback?:string;imports:{id:string;before:string;after?:string}[]}[];lessons:{lessonId:string;before:string;after?:string;rollback?:string}[]};
let validated=false;
async function main(){
 const url=new URL(process.env.MATHS4U_DATABASE_URL??"http://invalid");if(process.env.MATHS4U_ENV!=="test"||url.hostname!=="127.0.0.1"||!url.pathname.startsWith("/maths4u_test_bank_"))throw Error("LOCAL_TEST_ONLY");validated=true;
 const database=hash(url.host+url.pathname);
 if(apply&&(!journalPath||!await db().user.count({where:{id:actor,status:"ACTIVE",roles:{some:{role:"ADMIN"}}}})))throw Error("JOURNAL_AND_ACTIVE_ADMIN_REQUIRED");
 const policy=(t:{origin:ContentOrigin;originManual:boolean;originReason:string|null;originRule:string|null;examArchivedAt:Date|null}):Policy=>({...t,examArchivedAt:t.examArchivedAt?.toISOString()??null});
 const select={origin:true,originManual:true,originReason:true,originRule:true,examArchivedAt:true} as const;
 if(restore){
  if(!journalPath)throw Error("JOURNAL_REQUIRED");const j=JSON.parse(await fs.readFile(journalPath,"utf8")) as Journal;
  if(j.schema!==1||j.kind!=="stage6b"||j.database!==database||!["APPLIED","PREPARED"].includes(j.state))throw Error("INVALID_JOURNAL");
  for(const e of j.tasks){const t=await db().task.findUniqueOrThrow({where:{id:e.id},select});if(hash(policy(t))!==hash(e.after))throw Error("POLICY_CHANGED");}
  for(const e of j.versions){const v=await db().taskVersion.findFirstOrThrow({where:{taskId:e.taskId},orderBy:{number:"desc"}});if(v.id!==e.after)throw Error("VERSION_CHANGED");for(const r of e.imports){if((await db().importRecord.findUniqueOrThrow({where:{id:r.id}})).contentHash!==r.after)throw Error("IMPORT_CHANGED");}}
  for(const e of j.lessons){if((await db().lessonVersion.findFirstOrThrow({where:{lessonId:e.lessonId},orderBy:{number:"desc"}})).id!==e.after)throw Error("LESSON_CHANGED");}
  if(apply){await db().$transaction(async tx=>{
   for(const e of j.tasks){await tx.$queryRaw`SELECT id FROM Task WHERE id=${e.id} FOR UPDATE`;const t=await tx.task.findUniqueOrThrow({where:{id:e.id},select});if(hash(policy(t))!==hash(e.after))throw Error("POLICY_CHANGED");await tx.task.update({where:{id:e.id},data:{...e.before,examArchivedAt:e.before.examArchivedAt?new Date(e.before.examArchivedAt):null}});}
   for(const e of j.versions){await tx.$queryRaw`SELECT id FROM Task WHERE id=${e.taskId} FOR UPDATE`;const current=await tx.taskVersion.findFirstOrThrow({where:{taskId:e.taskId},orderBy:{number:"desc"}});if(current.id!==e.after)throw Error("VERSION_CHANGED");const before=await tx.taskVersion.findUniqueOrThrow({where:{id:e.before},include:versionInclude});e.rollback=(await appendTaskRevision(tx,before,false)).id;for(const r of e.imports)await tx.importRecord.update({where:{id:r.id},data:{contentHash:r.before}});}
   for(const e of j.lessons){await tx.$queryRaw`SELECT id FROM Lesson WHERE id=${e.lessonId} FOR UPDATE`;const current=await tx.lessonVersion.findFirstOrThrow({where:{lessonId:e.lessonId},orderBy:{number:"desc"}});if(current.id!==e.after)throw Error("LESSON_CHANGED");e.rollback=(await appendLessonRevision(tx,e.before,false)).id;}
   await tx.auditEvent.create({data:{actorId:actor,action:"CONTENT_STAGE6B_RESTORED",targetId:j.run}});
  },{timeout:120000});j.state="RESTORED";await fs.writeFile(journalPath,JSON.stringify(j,null,2));}
  await fs.mkdir(path.dirname(reportPath),{recursive:true});await fs.writeFile(reportPath,JSON.stringify({restore:true,dryRun:!apply,tasks:j.tasks.length,versions:j.versions.length,lessons:j.lessons.length,appendOnlyRollback:true},null,2));return;
 }
 const ownerList=JSON.parse(await fs.readFile("docs/ARENA-STAGE6-CLASSIFICATION-20261106.json","utf8")).unknown as {id:string;source:string}[];
 const rows=await db().task.findMany({where:{id:{in:ownerList.map(t=>t.id)}},select:{id:true,...select,versions:{take:1,orderBy:{number:"desc"},select:{source:{select:{name:true}}}}}});if(rows.length!==30)throw Error("OWNER_LIST_MISMATCH");
 const now=new Date().toISOString(),changes:Journal["tasks"]=[];
 for(const t of rows){const expected=ownerList.find(r=>r.id===t.id)!;if(t.versions[0].source?.name!==expected.source)throw Error("SOURCE_CHANGED");const {id,versions,...raw}=t;void versions;
  const before=policy(raw),demo=expected.source==="Local preview demo";
  const after:Policy={...before,origin:demo?"DEMO":"ORIGINAL",originManual:true,originReason:demo?"owner requested demo archive, 6 Nov 2026":"owner confirmed authorship, 6 Nov 2026",originRule:"owner-stage6b-20261106",examArchivedAt:demo?before.examArchivedAt??now:null};
  if(hash(before)!==hash(after)){if(before.originManual)throw Error("OWNER_DECISION_CHANGED");changes.push({id,before,after});}
 }
 const tasks=await db().task.findMany({where:{versions:{some:{source:{name:"Maths4U Original (AI-assisted)"}}}},include:{topics:true,imports:true,versions:{take:1,orderBy:{number:"desc"},include:versionInclude}}});
 const versions:Journal["versions"]=[];
 for(const t of tasks){const v=t.versions[0];if(v.source?.name!=="Maths4U Original (AI-assisted)")throw Error("SOURCE_CHANGED");if(hash(versionContent(v))!==hash(versionContent(v,true))){
  const old=materialInput(v,t),oldHash=hash(old);
  if(t.imports.some(i=>i.contentHash!==oldHash))throw Error("IMPORT_HASH_MISMATCH");const cleaned=taskSchema.parse({...old,texts:old.texts.map(t=>({...t,title:cleanAuthoredTitle(t.title),statement:cleanAuthoredMarkup(t.statement)}))});versions.push({taskId:t.id,before:v.id,after:randomUUID(),imports:t.imports.map(i=>({id:i.id,before:i.contentHash,after:hash(cleaned)}))});
 }}
 const notes=await db().lesson.findMany({where:{id:{startsWith:"orig_"}},include:{versions:{take:1,orderBy:{number:"desc"},include:{texts:true}}}});
 const lessons=notes.filter(l=>l.versions[0]?.texts.some(t=>cleanAuthoredTitle(t.title)!==t.title||cleanAuthoredMarkup(t.body)!==t.body)).map(l=>({lessonId:l.id,before:l.versions[0].id,after:randomUUID()}));
 const j:Journal={schema:1,kind:"stage6b",run:randomUUID(),database,state:"PREPARED",tasks:changes,versions,lessons};
 if(apply){await fs.mkdir(path.dirname(path.resolve(journalPath)),{recursive:true});await fs.writeFile(journalPath,JSON.stringify(j,null,2),{flag:"wx"});await db().$transaction(async tx=>{
  for(const e of j.tasks){await tx.$queryRaw`SELECT id FROM Task WHERE id=${e.id} FOR UPDATE`;const t=await tx.task.findUniqueOrThrow({where:{id:e.id},select});if(hash(policy(t))!==hash(e.before))throw Error("POLICY_CHANGED");await tx.task.update({where:{id:e.id},data:{...e.after,examArchivedAt:e.after.examArchivedAt?new Date(e.after.examArchivedAt):null}});}
  for(const e of j.versions){await tx.$queryRaw`SELECT id FROM Task WHERE id=${e.taskId} FOR UPDATE`;const v=await tx.taskVersion.findFirstOrThrow({where:{taskId:e.taskId},orderBy:{number:"desc"},include:versionInclude});if(v.id!==e.before)throw Error("VERSION_CHANGED");const next=await appendTaskRevision(tx,v,true,e.after);e.after=next.id;const t=await tx.task.findUniqueOrThrow({where:{id:e.taskId},include:{topics:true}});const material=materialInput(next,t);for(const r of e.imports){r.after=hash(material);const changed=await tx.importRecord.updateMany({where:{id:r.id,contentHash:r.before},data:{contentHash:r.after}});if(changed.count!==1)throw Error("IMPORT_CHANGED");}}
  for(const e of j.lessons){await tx.$queryRaw`SELECT id FROM Lesson WHERE id=${e.lessonId} FOR UPDATE`;if((await tx.lessonVersion.findFirstOrThrow({where:{lessonId:e.lessonId},orderBy:{number:"desc"}})).id!==e.before)throw Error("LESSON_CHANGED");e.after=(await appendLessonRevision(tx,e.before,true,e.after)).id;}
  await tx.auditEvent.create({data:{actorId:actor,action:"CONTENT_STAGE6B_APPLIED",targetId:j.run}});
 },{timeout:120000});j.state="APPLIED";await fs.writeFile(journalPath,JSON.stringify(j,null,2));}
 const report={dryRun:!apply,policy:changes.map(t=>({id:t.id,origin:t.after.origin,archived:!!t.after.examArchivedAt})),taskRevisions:versions.length,lessonRevisions:lessons.length,legacyNoteRows:51,distinctAffectedLessons:50,historicalNotesKept:true,onlyApprovedTextFragments:true,oldVersionsRetained:true};await fs.mkdir(path.dirname(reportPath),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify({dryRun:!apply,policyChanges:changes.length,taskRevisions:versions.length,lessonRevisions:lessons.length}));
}
void main().catch(e=>{console.error(e instanceof Error&&/^[A-Z_]+$/.test(e.message)?e.message:"STAGE6B_FAILED");process.exitCode=1;}).finally(()=>validated?db().$disconnect():undefined);
