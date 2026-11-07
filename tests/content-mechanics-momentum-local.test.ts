import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/prisma';import {databaseConfig} from '../src/lib/database-url';import {userSelect} from '../src/lib/security';
import {contentPackage,contentPackages,packageTopic} from '../src/lib/content-package-content';
import {planContentPackage,applyContentPackage,changeContentPackage,packageFingerprint} from '../src/lib/content-packages';
import {catalog} from '../src/lib/catalog';import {checkSquare,squareProgress} from '../src/lib/square-learning';
const cfg=databaseConfig();
if(process.env.MATHS4U_ENV!=='test'||cfg.host!=='127.0.0.1'||cfg.port!==33317||cfg.database!=='maths4u_test_bank_c1_1cf6766c2a4d')throw Error('MOMENTUM_LOCAL_ONLY');
test.after(()=>db().$disconnect());

test('Momentum: guarded import, exact archive overlay, reversible visibility and zero-write repeat',async()=>{
 const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
 const [admin,teacher,student]=await Promise.all([fixture.admin,fixture.teacher,fixture.student].map(id=>db().user.findUniqueOrThrow({where:{id},select:userSelect})));
 const p=contentPackage('9231-mechanics-momentum'),fingerprint=packageFingerprint(p),topic=packageTopic(p.lessons[0].id)!;
 const old=await db().contentPackage.findMany({where:{key:{not:p.key}},orderBy:{key:'asc'}}),registeredKeys=new Set(contentPackages.filter(pack=>pack.key!==p.key).map(pack=>pack.key)),registered=old.filter(pack=>registeredKeys.has(pack.key));assert.equal(registered.length,23);assert(registered.every(p=>p.state==='PUBLISHED'));
 for(const prior of registered){const dry=await planContentPackage(admin,prior.key);assert.equal(dry.state,'ALREADY_APPLIED');assert.equal(dry.create,0);assert.equal(dry.update,0);assert.equal(dry.skip,contentPackage(prior.key).questions.length);}
 const archivedIds=p.questions.filter(q=>q.provenance).map(q=>q.provenance!.archiveTaskId),archiveBefore=await db().task.findMany({where:{id:{in:archivedIds}},include:{versions:{orderBy:{number:'asc'}}},orderBy:{id:'asc'}});assert.equal(archiveBefore.length,39);
 const counts=async()=>({tasks:await db().task.count(),versions:await db().taskVersion.count(),files:await db().storedFile.count(),releases:await db().contentRelease.count(),audit:await db().auditEvent.count()});
 const before=await counts(),guestBefore=(await catalog(null,'en',{})).total;
 await assert.rejects(()=>planContentPackage(teacher,p.key));
 const dry=await planContentPackage(admin,p.key);assert.deepEqual(await counts(),before);
 assert.equal(dry.create,71);assert.equal(dry.update,0);assert.equal(dry.skip,0);
 await assert.rejects(()=>applyContentPackage(admin,p.key,{token:'0'.repeat(64)}));assert.deepEqual(await counts(),before);
 await applyContentPackage(admin,p.key,{token:dry.token});
 const after=await counts();assert.equal(after.tasks-before.tasks,71);assert.equal(after.versions-before.versions,71);assert.equal(after.files-before.files,16);assert.equal(after.releases-before.releases,1);
 assert.equal((await catalog(null,'en',{})).total,guestBefore);
 const placements=await db().archiveTaskPlacement.findMany({where:{taskId:{in:archivedIds}}});assert.equal(placements.length,39);
 for(const placement of placements){assert.equal(placement.method,'PROVENANCE');assert.equal(placement.targetTopicId,'fm_momentum');const q=p.questions.find(q=>q.provenance?.archiveTaskId===placement.taskId)!;assert.equal(placement.targetLessonId,'fm_momentum_'+q.lesson);}
 const again=await planContentPackage(admin,p.key);assert.equal(again.skip,71);assert.equal(again.create,0);assert.equal(again.update,0);await applyContentPackage(admin,p.key,{token:again.token});assert.deepEqual(await counts(),after);
 assert.equal(await db().contentRelease.count({where:{key:'pkg:'+p.key+':'+p.version}}),1);
 const q=p.questions.find(q=>q.lesson===p.lessons[0].key&&q.collection==='short'&&q.fields.every(f=>f.type==='number'))!;assert(q);
 const event={version:p.version,eventKey:randomUUID(),uid:q.id,answers:Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(';'):f.expected])),helpUsed:false,at:Date.now()};
 await assert.rejects(()=>checkSquare(null,event,topic));assert((await checkSquare(admin,event,topic)).correct);
 await changeContentPackage(admin,p.key,{action:'publish',fingerprint});
 try{
  assert.equal((await catalog(null,'en',{})).total,guestBefore+71);
  const checks=await db().independentCheck.count();assert((await checkSquare(null,event,topic)).correct);assert.equal(await db().independentCheck.count(),checks);
  const wrong={...event,eventKey:randomUUID(),answers:{...event.answers,[q.fields[0].key]:'999'}};assert(!(await checkSquare(student,wrong,topic)).correct);
  const progress=await squareProgress(student,topic);assert(progress.evidence.some(e=>e.eventKey===wrong.eventKey&&!e.correct));
 }finally{
  await changeContentPackage(admin,p.key,{action:'archive',fingerprint});await changeContentPackage(admin,p.key,{action:'restore',fingerprint});
 }
 assert.equal((await catalog(null,'en',{})).total,guestBefore);
 assert.deepEqual(await db().contentPackage.findMany({where:{key:{not:p.key}},orderBy:{key:'asc'}}),old);
 assert.deepEqual(await db().task.findMany({where:{id:{in:archivedIds}},include:{versions:{orderBy:{number:'asc'}}},orderBy:{id:'asc'}}),archiveBefore);
 await fs.writeFile('.local/c5-mechanics-momentum-20261107/lifecycle.json',JSON.stringify({before,after,guestBefore,guestPublished:guestBefore+71,ownerTasks:39,quickChecks:32,oldPackagesUnchanged:23,archiveSourceTasksUnchanged:39,exactPlacements:39,dryRunReadonly:true,repeatNoWrites:true,finalState:'DRAFT'},null,2));
});
