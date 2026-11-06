import { z } from "zod";
import { db } from "./prisma";
import type { Prisma } from "../generated/prisma/client";
import { admin, digest, lockUser, type Actor } from "./security";
import { ensure } from "./errors";
import { requestView } from "./request-view";
import { createTaskVersion, taskSchema } from "./content";
import { contentPackage, contentPackages } from "./content-package-content";
import type { ContentPackage, PackageQuestion } from "./content-package-schema";

type Client=Prisma.TransactionClient;
const project=(p:ContentPackage)=>"arena-package-"+p.key;
const releaseKey=(p:ContentPackage)=>"pkg:"+p.key+":"+p.version;
export const packageFingerprint=(p:ContentPackage)=>digest(JSON.stringify(p));
function permit(actor:Actor){admin(actor);ensure(!requestView()?.lens,403,"FORBIDDEN");}
export function packageTask(p:ContentPackage,q:PackageQuestion) {
  const manual=q.collection==="exam",choice=q.fields.length===1&&q.fields[0].type==="choice",f=q.fields[0];
  const criteria=q.parts.flatMap(p=>p.marking_criteria.map(c=>'<p>'+p.label+' · '+c.code+': '+c.description_html+'</p>')).join('');
  return taskSchema.parse({visibility:"PRIVATE",materialCategory:manual?"EXAM":"TRAINING",difficulty:q.difficulty,difficultyKnown:true,
    source:"Maths4U",sourceUid:q.id,syllabus:p.course.code,component:p.course.title,topicIds:[p.chapter.id],
    // Source exam metadata is not copied into public TaskVersion columns.
    texts:[{locale:"en",title:q.title,statement:q.prompt_html,answer:q.answer_html,hint:q.hint_html,solution:q.solution_html,markScheme:criteria,markSchemeText:criteria,markSchemeStatus:"DRAFT",
      teacherNote:JSON.stringify({editorialUid:q.id,provenance:q.provenance??{type:"independently-authored"},package:p.key,version:p.version,markingStatus:"DRAFT",fullAnswerChecker:"exact-v1"})}],
    parts:choice?[{kind:"CHOICE",maxPoints:q.marks,texts:[{locale:"en",prompt:"",answer:q.answer_html}],options:Object.entries(f.options!).map(([key,text])=>({correct:key===f.expected,texts:[{locale:"en",text}]}))}]
      :manual?[{kind:"MANUAL",maxPoints:q.marks,texts:[{locale:"en",prompt:"",answer:q.answer_html,rubric:criteria,markSchemeText:criteria,markSchemeStatus:"DRAFT"}]}]
      :q.fields.map(f=>({kind:"SHORT",maxPoints:1,acceptedAnswers:[JSON.stringify({checker:"arena-exact-v1",field:f})],texts:[{locale:"en",prompt:"<p>"+f.label+"</p>",answer:q.answer_html,rubric:"One mark for this complete field."}]})),
  });
}
function lessonText(p:ContentPackage,l:ContentPackage["lessons"][number]){
  return {locale:"en" as const,title:l.title,body:'<h2>Objective</h2><p>'+l.objective+'</p><h3>Before you start</h3>'+l.before+'<h2>Key ideas</h2>'+l.ideas+'<h2>Method</h2>'+l.method+'<h3>Common mistakes</h3><ul>'+l.mistakes.map(s=>'<li>'+s+'</li>').join('')+'</ul>',
    examples:l.examples.map(e=>'<h3>'+e.title+'</h3>'+e.question+'<details><summary>Follow the solution</summary>'+e.solution+'</details>').join('')};
}
async function plan(client:Client,p:ContentPackage){
  const fingerprint=packageFingerprint(p),release=await client.contentRelease.findUnique({where:{key:releaseKey(p)}});
  ensure(!release||release.fingerprint===fingerprint,409,"PACKAGE_VERSION_CHANGED");
  const state=await client.contentPackage.findUnique({where:{key:p.key}});
  ensure(!state||state.state!=="ARCHIVED",409,"PACKAGE_ARCHIVED");
  const course=await client.course.findUnique({where:{slug:p.course.slug}});
  const chapter=await client.topic.findUnique({where:{id:p.chapter.id}});
  ensure(!chapter||chapter.courseId===course?.id,409,"PACKAGE_ID_COLLISION");
  const records=await client.importRecord.findMany({where:{sourceProject:project(p)},orderBy:{legacyId:"asc"},include:{task:{include:{versions:{orderBy:{number:"desc"},take:1,select:{id:true,sourceUid:true}},lessons:true}}}});
  let create=0,update=0,skip=0;
  for(const q of p.questions){const r=records.find(r=>r.legacyId===q.id);
    ensure(!r||r.task.versions[0]?.sourceUid===q.id&&r.task.origin==="ORIGINAL"&&r.task.originManual&&!r.task.examArchivedAt,409,"PACKAGE_IDENTITY_CHANGED");
    if(!r){ensure(!await client.taskVersion.count({where:{sourceUid:q.id}}),409,"PACKAGE_ID_COLLISION");create++;}
    else if(r.contentHash!==digest(JSON.stringify(packageTask(p,q))))update++;else skip++;
  }
  const lessons=await client.lesson.findMany({where:{id:{in:p.lessons.map(l=>l.id)}},include:{versions:{orderBy:{number:"desc"},take:1,include:{texts:true}}}});
  ensure(lessons.every(l=>l.topicId===p.chapter.id&&!l.archivedAt),409,"PACKAGE_LESSON_COLLISION");
  const lessonChanges=p.lessons.filter(l=>{const old=lessons.find(r=>r.id===l.id)?.versions[0]?.texts.find(t=>t.locale==="en"),t=lessonText(p,l);return !old||old.title!==t.title||old.body!==t.body||old.examples!==t.examples;}).length;
  ensure(!release||!create&&!update&&!lessonChanges,409,"PACKAGE_INSTALLED_CHANGED");
  const token=digest(JSON.stringify({fingerprint,course,chapter,state,records:records.map(r=>({id:r.taskId,uid:r.legacyId,hash:r.contentHash,versions:r.task.versions,visibility:r.task.visibility,archivedAt:r.task.archivedAt})),lessons}));
  return {key:p.key,version:p.version,fingerprint,token,state:release?"ALREADY_APPLIED":"DRY_RUN",create,update,skip,lessonChanges};
}
export async function planContentPackage(actor:Actor,key:string){permit(actor);return plan(db(),contentPackage(key));}
export async function applyContentPackage(actor:Actor,key:string,input:unknown){
  permit(actor);const {token}=z.object({token:z.string().length(64)}).strict().parse(input),p=contentPackage(key);
  return db().$transaction(async tx=>{
    await lockUser(tx,actor.id);const report=await plan(tx,p);
    ensure(report.token===token,409,"STALE_DRY_RUN");
    if(report.state==="ALREADY_APPLIED")return report; // Zero writes, including audit.
    const old=await tx.contentPackage.findUnique({where:{key}});
    if(old){const a=old.version.split('.').map(Number),b=p.version.split('.').map(Number);ensure(b.some((n,i)=>n>a[i]&&b.slice(0,i).every((m,j)=>m===a[j])),409,"PACKAGE_VERSION_ORDER");}
    const course=await tx.course.findUnique({where:{slug:p.course.slug}})??await tx.course.create({data:{slug:p.course.slug,published:false,texts:{create:{locale:"en",title:p.course.title,description:""}}}});
    const chapter=await tx.topic.findUnique({where:{id:p.chapter.id}})??await tx.topic.create({data:{id:p.chapter.id,courseId:course.id,slug:p.chapter.slug,position:p.chapter.position,texts:{create:{locale:"en",title:p.chapter.title}}}});
    ensure(chapter.courseId===course.id,409,"PACKAGE_ID_COLLISION");
    for(const [position,l] of p.lessons.entries()){
      const t=lessonText(p,l),previous=await tx.lesson.findUnique({where:{id:l.id},include:{versions:{orderBy:{number:"desc"},take:1,include:{texts:true}}}});
      if(!previous)await tx.lesson.create({data:{id:l.id,topicId:chapter.id,position,versions:{create:{number:1,texts:{create:t}}}}});
      else {const v=previous.versions[0],text=v.texts.find(t=>t.locale==="en");if(!text||text.title!==t.title||text.body!==t.body||text.examples!==t.examples)await tx.lessonVersion.create({data:{lessonId:l.id,number:v.number+1,texts:{create:t}}});}
    }
    const members=[];
    for(const [position,q] of p.questions.entries()){
      const identity={sourceProject:project(p),legacyId:q.id},r=await tx.importRecord.findUnique({where:{sourceProject_legacyId:identity}});
      const data=packageTask(p,q),hash=digest(JSON.stringify(data));let taskId=r?.taskId;
      if(!r||r.contentHash!==hash){
        const current=taskId?await tx.task.findUniqueOrThrow({where:{id:taskId}}):null;
        const v=await createTaskVersion(tx,actor,{...data,visibility:current?.visibility??"PRIVATE"},taskId);
        taskId=v.taskId;
        await tx.task.update({where:{id:taskId},data:{origin:"ORIGINAL",originManual:true,originReason:"Owner-approved authored content package "+p.key,originRule:"content-package-v1"}});
        await tx.importRecord.upsert({where:{sourceProject_legacyId:identity},create:{...identity,taskId,contentHash:hash},update:{contentHash:hash}});
      }
      const lesson=p.lessons.find(l=>l.key===q.lesson)!;
      await tx.lessonTask.upsert({where:{lessonId_taskId:{lessonId:lesson.id,taskId:taskId!}},create:{lessonId:lesson.id,taskId:taskId!,position},update:{}});
      const latest=await tx.taskVersion.findFirstOrThrow({where:{taskId:taskId!},orderBy:{number:"desc"},select:{id:true}});
      members.push({uid:q.id,taskId:taskId!,versionId:latest.id});
    }
    await tx.contentPackage.upsert({where:{key},create:{key,version:p.version,fingerprint:report.fingerprint,courseId:course.id,chapterId:chapter.id,state:"DRAFT"},update:{version:p.version,fingerprint:report.fingerprint}});
    await tx.contentRelease.create({data:{key:releaseKey(p),fingerprint:report.fingerprint,state:"APPLIED",completedAt:new Date(),details:{created:report.create,updated:report.update,skipped:report.skip,members}}});
    await tx.auditEvent.create({data:{actorId:actor.id,action:"CONTENT_PACKAGE_APPLIED",targetId:releaseKey(p)}});
    return {...report,state:"APPLIED"};
  },{maxWait:30000,timeout:180000,isolationLevel:"Serializable"});
}
export async function changeContentPackage(actor:Actor,key:string,input:unknown){
  permit(actor);const data=z.object({action:z.enum(["publish","archive","restore"]),fingerprint:z.string().length(64)}).strict().parse(input),p=contentPackage(key);
  return db().$transaction(async tx=>{
    await lockUser(tx,actor.id);const pack=await tx.contentPackage.findUnique({where:{key}});
    ensure(pack&&pack.fingerprint===data.fingerprint&&data.fingerprint===packageFingerprint(p),409,"PACKAGE_CHANGED");
    const next=data.action==="publish"?"PUBLISHED":data.action==="archive"?"ARCHIVED":"DRAFT";
    if(pack.state===next)return {state:next};
    ensure(data.action!=="restore"||pack.state==="ARCHIVED",409,"PACKAGE_NOT_ARCHIVED");
    ensure(data.action!=="publish"||pack.state!=="ARCHIVED",409,"PACKAGE_ARCHIVED");
    const refs=await tx.importRecord.findMany({where:{sourceProject:project(p)},select:{taskId:true}});
    ensure(refs.length===p.questions.length,409,"PACKAGE_INCOMPLETE");
    const ids=refs.map(r=>r.taskId);
    ensure(await tx.task.count({where:{id:{in:ids},origin:"ORIGINAL",originManual:true,examArchivedAt:null}})===ids.length,409,"PACKAGE_PROVENANCE_CHANGED");
    await tx.task.updateMany({where:{id:{in:ids}},data:data.action==="publish"?{visibility:"PUBLIC",archivedAt:null}:data.action==="archive"?{archivedAt:new Date()}:{archivedAt:null,visibility:"PRIVATE"}});
    await tx.lesson.updateMany({where:{id:{in:p.lessons.map(l=>l.id)}},data:{archivedAt:data.action==="archive"?new Date():null}});
    if(data.action==="publish")await tx.course.update({where:{id:pack.courseId},data:{published:true}});
    await tx.contentPackage.update({where:{key},data:{state:next,publishedAt:data.action==="publish"?new Date():null}});
    await tx.auditEvent.create({data:{actorId:actor.id,action:"CONTENT_PACKAGE_"+data.action.toUpperCase(),targetId:releaseKey(p)}});
    return {state:next};
  },{maxWait:30000,timeout:60000,isolationLevel:"Serializable"});
}
export async function contentPackageStatus(actor:Actor){
  permit(actor);const installed=await db().contentPackage.findMany();
  return contentPackages.map(p=>({key:p.key,version:p.version,fingerprint:packageFingerprint(p),title:p.chapter.title,course:p.course.title,coursePath:"/courses/"+p.course.slug,
    state:installed.find(s=>s.key===p.key)?.state??"NOT_INSTALLED",lessons:p.lessons.map(l=>({id:l.id,title:l.title,path:"/courses/"+p.course.slug+"/topics/"+l.id})),
    questions:p.questions.length,exam:p.questions.filter(q=>q.collection==="exam").length,held:p.source.held,
    // Deliberately only on this authenticated administrator endpoint.
    sourceLinks:p.questions.filter(q=>q.provenance).map(q=>({uid:q.id,original_id:q.provenance!.original_id,original_uid:q.provenance!.original_uid,archiveTaskId:q.provenance!.archiveTaskId}))}));
}
export async function packageVersionMappings(key:string){
  const p=contentPackage(key),state=await db().contentPackage.findUnique({where:{key}});
  ensure(state&&state.state!=="ARCHIVED"&&state.fingerprint===packageFingerprint(p),404,"NOT_FOUND");
  const refs=await db().importRecord.findMany({where:{sourceProject:project(p)},include:{task:{include:{versions:{orderBy:{number:"desc"},take:1}}}}});
  const receipt=await db().contentRelease.findUniqueOrThrow({where:{key:releaseKey(p)}});
  const approved=(receipt.details as {members:{uid:string;versionId:string}[]}).members;
  const mappings=new Map<string,string>();
  for(const q of p.questions){const r=refs.find(r=>r.legacyId===q.id),v=r?.task.versions[0];ensure(r&&v&&r.contentHash===digest(JSON.stringify(packageTask(p,q)))&&v.sourceUid===q.id&&approved.some(a=>a.uid===q.id&&a.versionId===v.id),409,"QUESTION_CHANGED");mappings.set(q.id,v.id);}
  return mappings;
}
