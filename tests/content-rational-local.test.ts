import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {db} from "../src/lib/prisma";
import {databaseConfig} from "../src/lib/database-url";
import {userSelect} from "../src/lib/security";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {planContentPackage,applyContentPackage,changeContentPackage,packageFingerprint} from "../src/lib/content-packages";
import {catalog} from "../src/lib/catalog";
import {checkSquare,helpSquare,squareProgress} from "../src/lib/square-learning";
import {download} from "../src/lib/files";
const cfg=databaseConfig();
if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||cfg.port!==33317||cfg.database!=="maths4u_test_bank_c1_1cf6766c2a4d")throw Error("C2_LOCAL_ONLY");
test.after(()=>db().$disconnect());
test("C2 append-only import, media grants, checks and restore leave published C1 untouched",async()=>{
 const fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));
 const [admin,teacher,student]=await Promise.all([fixture.admin,fixture.teacher,fixture.student].map(id=>db().user.findUniqueOrThrow({where:{id},select:userSelect})));
 const p=contentPackage("9231-fp1-rational"),topic=packageTopic(p.lessons[0].id)!,fingerprint=packageFingerprint(p);
 const roots=await db().contentPackage.findUniqueOrThrow({where:{key:"9231-fp1-roots"}});assert.equal(roots.state,"PUBLISHED");
 const rootDry=await planContentPackage(admin,"9231-fp1-roots");assert.equal(rootDry.state,"ALREADY_APPLIED");assert.equal(rootDry.skip,94);
 const before={tasks:await db().task.count(),versions:await db().taskVersion.count(),audit:await db().auditEvent.count(),files:await db().storedFile.count()};
 await assert.rejects(()=>planContentPackage(teacher,p.key));
 const dry=await planContentPackage(admin,p.key);
 assert.deepEqual({tasks:await db().task.count(),versions:await db().taskVersion.count(),audit:await db().auditEvent.count(),files:await db().storedFile.count()},before);
 if(dry.state!=="ALREADY_APPLIED"){
  assert.equal(dry.create,93);await assert.rejects(()=>applyContentPackage(admin,p.key,{token:"0".repeat(64)}));
  await applyContentPackage(admin,p.key,{token:dry.token});
 }
 assert.equal((await catalog(null,"en",{})).total,782);
 const again=await planContentPackage(admin,p.key),count=await db().auditEvent.count(),fileCount=await db().storedFile.count(),versionCount=await db().taskVersion.count();
 assert.equal(again.skip,93);await applyContentPackage(admin,p.key,{token:again.token});
 assert.equal(await db().auditEvent.count(),count);assert.equal(await db().storedFile.count(),fileCount);assert.equal(await db().taskVersion.count(),versionCount);
 assert.equal(await db().contentRelease.count({where:{key:"pkg:"+p.key+":"+p.version}}),1);
 const q=p.questions.find(q=>q.id==="M4U-9231-RF-A11")!,event={version:p.version,eventKey:randomUUID(),uid:q.id,answers:Object.fromEntries(q.fields.map(f=>[f.key,f.expected])),helpUsed:false,at:Date.now()};
 await assert.rejects(()=>checkSquare(null,event,topic));assert((await checkSquare(admin,event,topic)).correct);
 const first=p.assets![0];await assert.rejects(()=>download(null,first.file_id));await assert.rejects(()=>download(teacher,first.file_id));
 await changeContentPackage(admin,p.key,{action:"publish",fingerprint});
 try{
  assert.equal((await catalog(null,"en",{})).total,875);
  const pre=await db().independentCheck.count();assert((await checkSquare(null,event,topic)).correct);assert.equal(await db().independentCheck.count(),pre);
  const wrong={...event,eventKey:randomUUID(),answers:{...event.answers,h:"999"}};
  assert.equal((await checkSquare(student,wrong,topic)).correct,false);
  assert((await squareProgress(student,topic)).evidence.some(e=>e.eventKey===wrong.eventKey&&!e.correct));
  const examTopic=packageTopic(p.lessons.find(l=>l.key===p.questions.find(q=>q.id===first.question_uid)!.lesson)!.id)!;
  await assert.rejects(()=>helpSquare({uid:first.question_uid,version:p.version,kind:"solution"},examTopic,null));
  const solution=await helpSquare({uid:first.question_uid,version:p.version,kind:"solution",access:"paper"},examTopic,null);
  assert(solution.html?.includes("?support="));const token=solution.html!.match(/support=([^"']+)/)![1];
  const loaded=await download(null,first.file_id,"original",token);assert.equal(loaded.data.length,first.size);
  await assert.rejects(()=>download(null,first.file_id));await assert.rejects(()=>download(teacher,first.file_id,"original",token));
  const other=p.assets!.find(a=>a.file_id!==first.file_id)!;await assert.rejects(()=>download(null,other.file_id,"original",token));
 }finally{
  await changeContentPackage(admin,p.key,{action:"archive",fingerprint});await changeContentPackage(admin,p.key,{action:"restore",fingerprint});
 }
 assert.equal((await catalog(null,"en",{})).total,782);assert.equal((await db().contentPackage.findUniqueOrThrow({where:{key:"9231-fp1-roots"}})).state,"PUBLISHED");
 assert.equal((await db().contentPackage.findUniqueOrThrow({where:{key:p.key}})).state,"DRAFT");
 await fs.writeFile(".local/c2-rational-20261106/lifecycle.json",JSON.stringify({before,created:dry.create,packageTasks:93,images:81,repeatNoWrites:true,privateSolutionGrants:true,guestPublishedCount:875,finalGuestCount:782,rootsState:"PUBLISHED",rationalState:"DRAFT"},null,2));
});
