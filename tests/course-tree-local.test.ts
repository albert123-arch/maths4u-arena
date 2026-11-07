import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {db} from '../src/lib/prisma';
import {databaseConfig} from '../src/lib/database-url';
import {userSelect} from '../src/lib/security';
import {applyCourseTree,planCourseTree,disableCourseTree,archiveLessonNavigation} from '../src/lib/course-tree';
import {catalog,courseCatalog} from '../src/lib/catalog';
import {inRequestView} from '../src/lib/request-view';
import {unallocatedId} from '../src/lib/course-tree-plan';
const c=databaseConfig();if(process.env.MATHS4U_ENV!=='test'||c.host!=='127.0.0.1'||c.port!==33317||c.database!=='maths4u_test_bank_c1_1cf6766c2a4d')throw Error('ONE_TREE_LOCAL_ONLY');
test.after(()=>db().$disconnect());
test('Guarded One Tree: preservation, exact placements, pending proposals, reversal and no archive leaks',async()=>{
 const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
 const [admin,teacher,student]=await Promise.all([fixture.admin,fixture.teacher,fixture.student].map(id=>db().user.findUniqueOrThrow({where:{id},select:userSelect})));
 const before=JSON.parse(await fs.readFile('.local/one-tree-20261107/roles-before.json','utf8'));
 const counts=async()=>({tasks:await db().task.count(),versions:await db().taskVersion.count(),files:await db().storedFile.count(),audit:await db().auditEvent.count(),chapters:await db().archiveChapterLink.count(),placements:await db().archiveTaskPlacement.count()});
 await assert.rejects(()=>planCourseTree(teacher));const initial=await counts(),dry=await planCourseTree(admin);assert.deepEqual(await counts(),initial);
 assert.equal(dry.result.placements.length,1261);assert.equal(dry.result.placements.filter(p=>p.method==='PROVENANCE').length,1159);assert.equal(dry.result.placements.filter(p=>p.method==='UNALLOCATED').length,63);assert.equal(dry.result.placements.filter(p=>p.method==='LEGACY').length,39);
 await assert.rejects(()=>applyCourseTree(admin,{token:'0'.repeat(64)}));const applied=await applyCourseTree(admin,{token:dry.token});assert(applied.writes>0||initial.placements===1261);
 assert.equal(await db().archiveLessonLink.count({where:{approvedLessonId:{not:null}}}),0);
 const publicResults=[];
 for(const [role,actor] of [['guest',null],['student',student],['teacher',teacher]] as const){
  const courses=await courseCatalog(actor,'en'),list=await catalog(actor,'en',{});assert.deepEqual(JSON.parse(JSON.stringify(courses,(_k,v)=>_k==='path'?undefined:v)),before[role].courses);assert.equal(list.total,before[role].total);publicResults.push({role,tasks:list.total,lessons:courses.flatMap(c=>c.chapters.flatMap(ch=>ch.topics)).length});
  await assert.rejects(()=>catalog(actor,'en',{source:'CAMBRIDGE'}));
 }
 const normal=await catalog(admin,'en',{}),all=await catalog(admin,'en',{source:'ALL'});assert.equal(normal.total,2857);assert.equal(all.total,5511);
 const hierarchy=await courseCatalog(admin,'en',undefined,false,true),normalHierarchy=await courseCatalog(admin,'en'),guest=await courseCatalog(null,'en');
 assert.equal(normalHierarchy.length,guest.length);for(const c of normalHierarchy)assert.deepEqual(c.chapters.map(ch=>ch.id),guest.find(g=>g.id===c.id)!.chapters.map(ch=>ch.id));
 const courses=[];
 for(const course of dry.data.courses){
  const nav=hierarchy.find(c=>c.id===course.id)!,publicNav=guest.find(c=>c.id===course.id)!;
  assert.deepEqual(nav.chapters.map(c=>c.id),publicNav.chapters.map(c=>c.id));assert.equal(new Set(nav.chapters.map(c=>c.title.toLowerCase())).size,nav.chapters.length);
  const placements=dry.result.placements.filter(p=>p.courseId===course.id),seen=new Set<string>();
  for(const ch of [...nav.chapters,...(nav.archiveChapters??[])]){
   assert.equal(new Set(ch.topics.map(l=>l.title.toLowerCase())).size,ch.topics.length);
   for(const id of [...ch.topics.map(l=>l.id),...(ch.unallocated?[ch.unallocated.id]:[])]){
    let page=1;do{const result=await catalog(admin,'en',{topic:id,source:'CAMBRIDGE',page,pageSize:50});for(const q of result.items){assert(!seen.has(q.id),'duplicate placement');seen.add(q.id);}if(page>=result.pages)break;page++;}while(true);
   }
  }
  assert.deepEqual([...seen].sort(),placements.map(p=>p.taskId).sort());
  courses.push({slug:course.slug,cambridge:placements.length,exact:placements.filter(p=>p.method==='PROVENANCE').length,unallocated:placements.filter(p=>p.method==='UNALLOCATED').length,archiveOnly:placements.filter(p=>p.method==='LEGACY').length,chapters:nav.chapters.length,lessons:nav.chapters.flatMap(ch=>ch.topics).length});
 }
 assert.equal((await catalog(admin,'en',{topic:unallocatedId('fp1_induction'),source:'CAMBRIDGE'})).total,63);
 for(const slug of ['maths4u-9709-p1','olymp-number-theory2'])assert.deepEqual(normalHierarchy.find(c=>c.slug===slug),before.admin.courses.find((c:{slug:string})=>c.slug===slug));
 for(const l of dry.result.lessons){const ch=dry.result.chapters.find(ch=>ch.sourceTopicId===l.sourceTopicId)!;if(ch.canonicalTopicId)assert((await archiveLessonNavigation(admin,l.sourceLessonId))?.includes('source=CAMBRIDGE'));assert.equal(await archiveLessonNavigation(teacher,l.sourceLessonId),null);}
 const lens={mode:'ROLE' as const,role:'STUDENT' as const,targetId:null,label:'student',nonce:'test',expiresAt:new Date(Date.now()+10000).toISOString()};
 await inRequestView({real:admin,actor:student,sessionId:null,lens},async()=>{assert.deepEqual(JSON.parse(JSON.stringify(await courseCatalog(student,'en'),(_k,v)=>_k==='path'?undefined:v)),before.student.courses);await assert.rejects(()=>planCourseTree(admin));});
 for(const course of dry.data.courses)await disableCourseTree(admin,course.id);
 const shape=(rows:typeof hierarchy)=>rows.map(c=>({id:c.id,count:c.count,chapters:c.chapters.map(ch=>({id:ch.id,count:ch.count,topics:ch.topics.map(l=>({id:l.id,count:l.count}))}))}));
 assert.deepEqual(shape(await courseCatalog(admin,'en',undefined,false,true)),shape(before.admin.courses));
 const restore=await planCourseTree(admin);await applyCourseTree(admin,{token:restore.token});const stable=await counts(),repeat=await planCourseTree(admin),zero=await applyCourseTree(admin,{token:repeat.token});assert.equal(zero.writes,0);assert.deepEqual(await counts(),stable);
 assert.equal(stable.tasks,initial.tasks);assert.equal(stable.versions,initial.versions);assert.equal(stable.files,initial.files);
 await fs.writeFile('.local/one-tree-20261107/lifecycle.json',JSON.stringify({applied,courses,publicResults,defaultAdmin:normal.total,allAdmin:all.total,noApprovedFallbacks:true,repeat:zero,protectedCoursesUnchanged:true,reversal:true,oldCounts:initial,finalCounts:stable},null,2));
 await fs.writeFile('docs/ARENA-ONE-TREE-MAPPING-20261107.json',JSON.stringify({status:'AWAITING_OWNER_APPROVAL',...dry},null,2)+'\n');
});
