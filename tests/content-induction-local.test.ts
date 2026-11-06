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
import {checkSquare,squareProgress} from "../src/lib/square-learning";
const cfg=databaseConfig();
if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||cfg.port!==33317||cfg.database!=="maths4u_test_bank_c1_1cf6766c2a4d")throw Error("C3_LOCAL_ONLY");
test.after(()=>db().$disconnect());
test("Induction: guarded append-only import, reversible visibility, repeat zero writes and independent progress",async()=>{
 const fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));
 const [admin,teacher,student]=await Promise.all([fixture.admin,fixture.teacher,fixture.student].map(id=>db().user.findUniqueOrThrow({where:{id},select:userSelect})));
 const p=contentPackage("9231-fp1-induction"),topic=packageTopic(p.lessons[0].id)!,fingerprint=packageFingerprint(p);
 const old=await db().contentPackage.findMany({where:{key:{in:["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation","9231-fp1-matrices1","9231-fp1-polar","9231-fp1-vectors"]}}});assert.equal(old.length,6);assert(old.every(p=>p.state==="PUBLISHED"));
 for(const [key,skip] of [["9231-fp1-roots",94],["9231-fp1-rational",93],["9231-fp1-summation",100],["9231-fp1-matrices1",100],["9231-fp1-polar",103],["9231-fp1-vectors",124]] as const){const d=await planContentPackage(admin,key);assert.equal(d.state,"ALREADY_APPLIED");assert.equal(d.skip,skip);}
 const counts=async()=>({tasks:await db().task.count(),versions:await db().taskVersion.count(),audit:await db().auditEvent.count(),files:await db().storedFile.count()});
 const before=await counts();await assert.rejects(()=>planContentPackage(teacher,p.key));
 const dry=await planContentPackage(admin,p.key);assert.deepEqual(await counts(),before);
 if(dry.state!=="ALREADY_APPLIED"){
  assert.equal(dry.create,70);await assert.rejects(()=>applyContentPackage(admin,p.key,{token:"0".repeat(64)}));await applyContentPackage(admin,p.key,{token:dry.token});
 }
 assert.equal((await catalog(null,"en",{})).total,1302);
 const again=await planContentPackage(admin,p.key),after=await counts();assert.equal(again.skip,70);await applyContentPackage(admin,p.key,{token:again.token});assert.deepEqual(await counts(),after);
 assert.equal(after.files,before.files);assert.equal(await db().contentRelease.count({where:{key:"pkg:"+p.key+":"+p.version}}),1);
 const q=p.questions.find(q=>q.id==="M4U-9231-IN-Q-S11")!,event={version:p.version,eventKey:randomUUID(),uid:q.id,answers:{term:"5k+3",target:"(5k^2+11k+6)/2"},helpUsed:false,at:Date.now()};
 await assert.rejects(()=>checkSquare(null,event,topic));assert((await checkSquare(admin,event,topic)).correct);
 await changeContentPackage(admin,p.key,{action:"publish",fingerprint});
 try{
  assert.equal((await catalog(null,"en",{})).total,1372);
  const checks=await db().independentCheck.count();assert((await checkSquare(null,event,topic)).correct);assert.equal(await db().independentCheck.count(),checks);
  const wrong={...event,eventKey:randomUUID(),answers:{...event.answers,target:"999"}};
  assert(!(await checkSquare(student,wrong,topic)).correct);
  const progress=await squareProgress(student,topic);assert(progress.evidence.some(e=>e.eventKey===wrong.eventKey&&!e.correct));
 }finally{
  await changeContentPackage(admin,p.key,{action:"archive",fingerprint});await changeContentPackage(admin,p.key,{action:"restore",fingerprint});
 }
 assert.equal((await catalog(null,"en",{})).total,1302);
 assert.deepEqual(await db().contentPackage.findMany({where:{key:{in:old.map(p=>p.key)}}}),old);
 await fs.writeFile(".local/c3-induction-20261106/lifecycle.json",JSON.stringify({before,after,dryRunReadonly:true,packageTasks:70,repeatNoWrites:true,guestPublishedCount:1372,finalGuestCount:1302,oldPackagesUnchanged:true},null,2));
});
