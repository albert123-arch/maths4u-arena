import test from "node:test";import assert from "node:assert/strict";
import {db} from "../src/lib/prisma";import {databaseConfig} from "../src/lib/database-url";
import {secret,userSelect} from "../src/lib/security";
import {beginStudy,revealStudyHelp} from "../src/lib/study";import {getAttempt,mutateAttempt} from "../src/lib/works";
import {pure1Review} from "../src/lib/pure1-review";

test("Pure 1 review uses only own completed current short practice, retains recovery, excludes legacy and manual study",async()=>{
 const cfg=databaseConfig();assert.equal(process.env.MATHS4U_ENV,"test");assert.equal(cfg.host,"127.0.0.1");assert.match(cfg.database,/^maths4u_test_bank_/);
 const actors=[];
 try{
  for(let i=0;i<2;i++)actors.push(await db().user.create({data:{username:"review_test_"+secret().slice(0,14).replaceAll("-","a"),displayName:"Disposable review integration",passwordHash:"DISABLED_LOCAL_QA_LOGIN",roles:{create:{role:"STUDENT"}}},select:userSelect}));
  const [actor,other]=actors;
  async function check(taskId:string,answer:string,lessonId?:string){const start=await beginStudy(actor,{taskId,lessonId},"en"),dto=await getAttempt(actor,start.id,"en");assert.equal(dto.status,"IN_PROGRESS");await mutateAttempt(actor,start.id,{revision:dto.revision,answers:[{partId:dto.questions[0].parts[0].id,response:{value:answer}}]},true);return start.id;}
  assert.equal((await pure1Review(actor)).reviewedSkills,0);
  const candidates=await db().task.findMany({where:{visibility:"PUBLIC",featureKey:null,archivedAt:null,versions:{some:{parts:{every:{kind:"NUMERIC"}}}}},take:100,select:{id:true,versions:{orderBy:{number:"desc"},take:1,select:{sourceUid:true,parts:{select:{kind:true}}}}}});
  const legacy=candidates.find(t=>!t.versions[0]?.sourceUid?.startsWith("M4U-P1-QP-")&&t.versions[0]?.parts.length===1&&t.versions[0].parts[0].kind==="NUMERIC");assert.ok(legacy,"Read-only legacy practice fixture exists");
  await check(legacy.id,"0");assert.equal((await pure1Review(actor)).reviewedSkills,0,"Legacy auto-graded practice is not relabelled or scheduled by this feature");
  const original=await db().taskVersion.findFirstOrThrow({where:{sourceUid:"M4U-P1-QP-FUNCTIONS-INVERSE-01",number:1},select:{taskId:true}}),lessonId="orig_functions_inverse";
  const variant=await db().taskVersion.findFirstOrThrow({where:{sourceUid:"M4U-P1-QP-VAR-FUNCTIONS-INVERSE-01",number:1},select:{taskId:true}});
  const wrongId=await check(original.taskId,"999",lessonId),wrong=await pure1Review(actor);assert.equal(wrong.dueSkills,1);assert.equal(wrong.skills[0].failed,1);assert.ok(wrong.skills[0].href.includes("reviewTask="+variant.taskId),"An unseen variant replaces the missed exact question");
  await assert.rejects(getAttempt(other,wrongId,"en"),/NOT_FOUND/);assert.equal((await pure1Review(other)).reviewedSkills,0);
  const correctId=await check(variant.taskId,"5",lessonId),correct=await pure1Review(actor);assert.equal(correct.dueSkills,0);assert.equal(correct.skills[0].weak,1);assert.equal(correct.skills[0].failed,0);assert.equal(correct.skills[0].attempted,1,"Variant successes belong to the same objective");
  assert.equal((await getAttempt(actor,wrongId,"en")).score,0,"Original assessment is retained");assert.ok(correct.skills[0].href.includes(original.taskId),"After all variants were used, choose the least recent");
  const due=correct.skills[0].nextDue;await check(variant.taskId,"5",lessonId);assert.equal((await pure1Review(actor)).skills[0].nextDue,due,"An early retry does not postpone review");
  await revealStudyHelp(actor,correctId,{kind:"solution"},"en");assert.equal((await pure1Review(actor)).skills[0].weak,1);
  const manual=await db().taskVersion.findFirstOrThrow({where:{sourceUid:"M4U-ORIG-FUNC-001"},select:{taskId:true}}),paper=await beginStudy(actor,{taskId:manual.taskId,lessonId},"en");const paperDto=await getAttempt(actor,paper.id,"en");assert.ok(paperDto.study?.selfDirected);assert.equal((await pure1Review(actor)).reviewedSkills,1);
  assert.equal((await pure1Review(actor,due)).dueSkills,1,"Due-time boundary is inclusive");
 }finally{
  const ids=actors.map(a=>a.id);if(ids.length){const where={userId:{in:ids}};await db().practiceStudy.deleteMany({where:{attempt:where}});await db().answer.deleteMany({where:{attempt:where}});await db().attempt.deleteMany({where});await db().workItem.deleteMany({where:{workVersion:{work:{ownerId:{in:ids}}}}});await db().workVersion.deleteMany({where:{work:{ownerId:{in:ids}}}});await db().work.deleteMany({where:{ownerId:{in:ids}}});
   await db().userRole.deleteMany({where});await db().user.deleteMany({where:{id:{in:ids}}});
  }await db().$disconnect();
 }
});
