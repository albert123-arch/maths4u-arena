import { z } from 'zod';
import { db } from './prisma';
import type { Prisma } from '../generated/prisma/client';
import { admin, digest, lockUser, type Actor } from './security';
import { ensure } from './errors';
import { archiveAdmin } from './content-access';
import { cambridgeTask } from './cambridge-access';
import { contentPackages } from './content-package-content';
import { buildCourseTreePlan, unallocatedId, type TreeInput } from './course-tree-plan';
type Client=Prisma.TransactionClient;
function permit(actor:Actor){admin(actor);ensure(archiveAdmin(actor),403,'FORBIDDEN');}
async function input(client:Client):Promise<TreeInput>{
 const installed=await client.contentPackage.findMany(),packs=contentPackages.filter(p=>p.course.direction==='further'&&installed.some(i=>i.key===p.key));
 for(const p of packs)ensure(installed.find(i=>i.key===p.key)?.fingerprint===digest(JSON.stringify(p)),409,'PACKAGE_CHANGED');
 const rows=await client.course.findMany({orderBy:{id:'asc'},where:{slug:{in:packs.map(p=>p.course.slug)}},include:{texts:true,topics:{orderBy:{id:'asc'},include:{texts:true,lessons:{orderBy:{id:'asc'},include:{tasks:true,versions:{take:1,orderBy:{number:'desc'},include:{texts:true}}}}}}}});
 const tasks=await client.task.findMany({where:{OR:[{origin:'CAMBRIDGE_EXAM'},cambridgeTask]},orderBy:{id:'asc'},select:{id:true}});
 return {courses:rows.map(c=>({id:c.id,slug:c.slug,title:c.texts.find(t=>t.locale==='en')!.title,chapters:c.topics.map(ch=>({id:ch.id,title:ch.texts.find(t=>t.locale==='en')!.title,lessons:ch.lessons.map(l=>({id:l.id,title:l.versions[0]?.texts.find(t=>t.locale==='en')?.title??l.id,position:l.position,taskIds:l.tasks.map(t=>t.taskId)}))}))})),
  packages:packs.map(p=>({courseSlug:p.course.slug,chapterId:p.chapter.id,chapterTitle:p.chapter.title,lessons:p.lessons.map(l=>({id:l.id,title:l.title})),links:p.questions.filter(q=>q.provenance).map(q=>({uid:q.id,taskId:q.provenance!.archiveTaskId,lessonId:p.lessons.find(l=>l.key===q.lesson)!.id}))})),archiveTaskIds:tasks.map(t=>t.id),approvals:await client.archiveLessonLink.findMany({orderBy:{sourceLessonId:'asc'},select:{sourceLessonId:true,approvedLessonId:true}})};
}
async function plan(client:Client){
 const data=await input(client),result=buildCourseTreePlan(data),existing={chapters:await client.archiveChapterLink.findMany({orderBy:{sourceTopicId:'asc'}}),lessons:await client.archiveLessonLink.findMany({orderBy:{sourceLessonId:'asc'}}),placements:await client.archiveTaskPlacement.findMany({orderBy:[{courseId:'asc'},{taskId:'asc'}]})};
 return {token:digest(JSON.stringify({data,result,existing})),data,result};
}
async function write(client:Client,actor:Actor,result:ReturnType<typeof buildCourseTreePlan>){
 let writes=0;
 for(const row of result.chapters){const data={...row,active:true},old=await client.archiveChapterLink.findUnique({where:{sourceTopicId:row.sourceTopicId}});if(JSON.stringify(old)!==JSON.stringify(data)&&(!old||old.canonicalTopicId!==row.canonicalTopicId||old.reason!==row.reason||!old.active)){await client.archiveChapterLink.upsert({where:{sourceTopicId:row.sourceTopicId},create:data,update:data});writes++;}}
 for(const row of result.lessons){const old=await client.archiveLessonLink.findUnique({where:{sourceLessonId:row.sourceLessonId}});if(!old||Object.entries(row).some(([k,v])=>old[k as keyof typeof old]!==v)){await client.archiveLessonLink.upsert({where:{sourceLessonId:row.sourceLessonId},create:row,update:row});writes++;}}
 for(const row of result.placements){const old=await client.archiveTaskPlacement.findUnique({where:{courseId_taskId:{courseId:row.courseId,taskId:row.taskId}}});if(!old||Object.entries(row).some(([k,v])=>JSON.stringify(old[k as keyof typeof old])!==JSON.stringify(v))){await client.archiveTaskPlacement.upsert({where:{courseId_taskId:{courseId:row.courseId,taskId:row.taskId}},create:row,update:row});writes++;}}
 if(writes)await client.auditEvent.create({data:{actorId:actor.id,action:'COURSE_TREE_APPLIED',targetId:'one-tree:'+digest(JSON.stringify(result))}});
 return {writes,chapters:result.chapters.length,lessons:result.lessons.length,placements:result.placements.length};
}
export async function planCourseTree(actor:Actor){permit(actor);return plan(db());}
export async function archivePresentationLessons(actor:Actor){
 permit(actor);
 const rows=await db().lesson.findMany({where:{archivedAt:null,topic:{course:{archivedAt:null}},presentations:{some:{archivedAt:null}}},include:{versions:{orderBy:{number:'desc'},take:1,include:{texts:true}},topic:{include:{texts:true,course:{include:{texts:true}}}},_count:{select:{presentations:{where:{archivedAt:null}}}}}});
 const lessons=rows.map(l=>({id:l.id,title:l.versions[0]?.texts.find(t=>t.locale==='en')?.title??l.id,chapter:l.topic.texts.find(t=>t.locale==='en')?.title??l.topic.slug,courseId:l.topic.courseId,course:l.topic.course.texts.find(t=>t.locale==='en')?.title??l.topic.course.slug,count:l._count.presentations})).sort((a,b)=>a.course.localeCompare(b.course)||a.chapter.localeCompare(b.chapter)||a.title.localeCompare(b.title));
 return {total:lessons.reduce((n,l)=>n+l.count,0),lessons};
}
export async function applyCourseTree(actor:Actor,value:unknown){
 permit(actor);const {token}=z.object({token:z.string().length(64)}).strict().parse(value);
 return db().$transaction(async tx=>{await lockUser(tx,actor.id);const p=await plan(tx);ensure(p.token===token,409,'STALE_DRY_RUN');return write(tx,actor,p.result);},{maxWait:30000,timeout:180000,isolationLevel:'Serializable'});
}
export async function disableCourseTree(actor:Actor,courseId:string){
 permit(actor);return db().$transaction(async tx=>{await lockUser(tx,actor.id);const changed=await tx.archiveChapterLink.updateMany({where:{active:true,source:{courseId}},data:{active:false}});if(changed.count)await tx.auditEvent.create({data:{actorId:actor.id,action:'COURSE_TREE_DISABLED',targetId:courseId}});return {changed:changed.count};});
}
// New chapters join an already enabled overlay in the same package transaction.
export async function syncEnabledCourseTree(tx:Client,actor:Actor,courseId:string){
 if(!await tx.archiveChapterLink.count({where:{active:true,source:{courseId}}}))return;
 const p=await plan(tx),chapterIds=new Set(p.data.courses.find(c=>c.id===courseId)?.chapters.map(ch=>ch.id));
 await write(tx,actor,{chapters:p.result.chapters.filter(ch=>chapterIds.has(ch.sourceTopicId)),lessons:p.result.lessons.filter(l=>chapterIds.has(l.sourceTopicId)),placements:p.result.placements.filter(p=>p.courseId===courseId)});
}
export async function courseTreeOverlay(actor:Actor|null){
 if(!archiveAdmin(actor))return null;
 const chapters=await db().archiveChapterLink.findMany({where:{active:true},include:{source:{select:{courseId:true}},lessons:true}});
 const placements=chapters.length?await db().archiveTaskPlacement.findMany({where:{chapter:{active:true},task:{archivedAt:null}}}):[];
 return {chapters,placements};
}
export async function archiveLessonNavigation(actor:Actor|null,id:string){
 if(!archiveAdmin(actor))return null;
 const link=await db().archiveLessonLink.findUnique({where:{sourceLessonId:id},include:{chapter:{include:{source:{include:{course:true}}}}}});
 if(!link?.chapter.active||!link.chapter.canonicalTopicId)return null;
 const placements=await db().archiveTaskPlacement.findMany({where:{sourceLessonId:id,chapter:{active:true}},select:{targetLessonId:true}}),targets=[...new Set(placements.map(p=>p.targetLessonId).filter((x):x is string=>!!x))];
 targets.sort();const first=await db().lesson.findFirst({where:{topicId:link.chapter.canonicalTopicId},orderBy:[{position:'asc'},{id:'asc'}],select:{id:true}});
 const destination=link.approvedLessonId??targets[0]??(placements.length?unallocatedId(link.chapter.canonicalTopicId):link.proposedLessonId??first?.id);
 if(!destination)return null;
 return '/admin/archive-bank?course='+encodeURIComponent(link.chapter.source.course.id)+'&chapter='+encodeURIComponent(link.chapter.canonicalTopicId)+'&topic='+encodeURIComponent(destination)+'&source=CAMBRIDGE&legacyLesson='+encodeURIComponent(id);
}
export async function archiveRelated(actor:Actor|null,ids:string[]){
 const result:Record<string,{id:string;href:string;label:string}[]>={};if(!archiveAdmin(actor)||!ids.length)return result;
 const installed=await db().contentPackage.findMany({select:{key:true}}),packs=contentPackages.filter(p=>installed.some(i=>i.key===p.key)),questions=packs.flatMap(p=>p.questions.filter(q=>q.provenance).map(q=>({p,q})));
 const refs=await db().importRecord.findMany({where:{OR:[{taskId:{in:ids}},{legacyId:{in:questions.filter(x=>ids.includes(x.q.provenance!.archiveTaskId)).map(x=>x.q.id)}}],sourceProject:{startsWith:'arena-package-'}},select:{taskId:true,legacyId:true}});
 for(const {p,q} of questions){const source=q.provenance!.archiveTaskId,adapt=refs.find(r=>r.legacyId===q.id)?.taskId;if(!adapt)continue;
  const lesson=p.lessons.find(l=>l.key===q.lesson)!.id;
  if(ids.includes(source))(result[source]??=[]).push({id:adapt,label:q.title,href:'/courses/'+p.course.slug+'/topics/'+lesson+'?item='+encodeURIComponent(q.id)+'#practice'});
  if(ids.includes(adapt))(result[adapt]??=[]).push({id:source,label:'Cambridge source',href:'/admin/archive-bank?source=CAMBRIDGE&taskId='+source});
 }
 return result;
}
export async function adminArchiveContext(actor:Actor,lessonId?:string,uid?:string,legacyLesson?:string){
 permit(actor);const overlay=await courseTreeOverlay(actor),count=overlay?.placements.filter(p=>p.targetLessonId===lessonId).length??0;
 const refs=uid?await db().importRecord.findMany({where:{legacyId:uid,sourceProject:{startsWith:'arena-package-'}},select:{taskId:true}}):[],related=await archiveRelated(actor,refs.map(r=>r.taskId));
 let origin:{title:string;destinations:{id:string;title:string;count:number;href:string}[]}|undefined;
 if(legacyLesson){
  const link=await db().archiveLessonLink.findUnique({where:{sourceLessonId:legacyLesson},include:{source:{include:{versions:{take:1,orderBy:{number:'desc'},include:{texts:true}}}},chapter:{include:{source:{include:{course:true}}}}}});
  ensure(link?.chapter.active,404,'NOT_FOUND');
  const placements=await db().archiveTaskPlacement.findMany({where:{sourceLessonId:legacyLesson,chapter:{active:true}},include:{targetLesson:{include:{versions:{take:1,orderBy:{number:'desc'},include:{texts:true}}}}}});
  const targets=[...new Set(placements.map(p=>p.targetLessonId??unallocatedId(p.targetTopicId)))].sort();
  origin={title:link.source.versions[0]?.texts.find(t=>t.locale==='en')?.title??legacyLesson,destinations:targets.map(id=>({id,title:placements.find(p=>p.targetLessonId===id)?.targetLesson?.versions[0]?.texts.find(t=>t.locale==='en')?.title??'Unallocated',count:placements.filter(p=>(p.targetLessonId??unallocatedId(p.targetTopicId))===id).length,href:'/admin/archive-bank?course='+encodeURIComponent(link.chapter.source.course.id)+'&chapter='+encodeURIComponent(placements[0].targetTopicId)+'&topic='+encodeURIComponent(id)+'&source=CAMBRIDGE&legacyLesson='+encodeURIComponent(legacyLesson)}))};
 }
 return {count,links:refs.flatMap(r=>related[r.taskId]??[]),origin};
}
