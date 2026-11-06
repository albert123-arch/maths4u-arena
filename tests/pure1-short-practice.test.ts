import { quadraticTopics } from "../src/lib/square-model";
import { questionsForTopic } from "../src/lib/square-content";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { userSelect } from "../src/lib/security";
import { versionInclude, publicVersion } from "../src/lib/content";
import { automaticPoints } from "../src/lib/works";
import { pure1PracticeNumber, isPure1ShortUid } from "../src/lib/pure1-practice-number";
import { pure1ShortSchema, importPure1ShortLocal } from "../src/lib/pure1-short-practice";
import { originalLessonId, originalBlocks } from "../src/lib/original-blocks";
import { topicContent } from "../src/lib/catalog";
import {allPure1Questions} from "../src/lib/pure1-variants";

test("208 canonical original checks: repeat-safe import, all options/numbers, boundaries and no help leakage",async()=>{
 const pack=pure1ShortSchema.parse(JSON.parse(await readFile("content/original/pure1-short-practice-v1.json","utf8")));
 const actor=await db().user.findFirstOrThrow({where:{roles:{some:{role:"ADMIN"}},status:"ACTIVE"},select:userSelect});
 const before=await db().taskVersion.count(),lessons=await db().lessonVersion.count();
 const result=await importPure1ShortLocal(actor,pack);assert.equal(result.created,0);assert.equal(result.skipped,208);
 for(const q of pack.questions){
  const t=await db().task.findUniqueOrThrow({where:{id:result.mapping[q.uid]},include:{versions:{orderBy:{number:"desc"},include:versionInclude}}});assert.deepEqual(t.versions.map(v=>v.number).sort((a,b)=>a-b),Array.from({length:t.versions.length},(_,i)=>i+1));const v=t.versions[0],part=v.parts[0];
  assert.equal(v.sourceUid,q.uid);assert.equal(v.materialCategory,"TRAINING");assert.equal(v.examBoard,null);assert.equal(part.kind,q.kind);
  const guest=publicVersion(v,"en");for(const field of ["answer","hint","solution","teacherNote","markScheme"])assert.ok(!(field in guest));
  assert.ok(!("numericAnswer" in guest.parts[0]));assert.ok(guest.parts[0].options.every(o=>!("correct" in o)));
  if(q.kind==="CHOICE")for(const [i,o]of part.options.entries())assert.equal(automaticPoints(part,{value:"",optionId:o.id},q.uid),i===q.correct_option?1:0,q.uid);
  else{
   for(const value of [q.answer,Number(pure1PracticeNumber(q.answer)).toFixed(8),` ${q.answer.replaceAll("-","−")} `])assert.equal(automaticPoints(part,{value},q.uid),1,q.uid+" fraction/decimal");
   assert.equal(automaticPoints(part,{value:String(part.numericAnswer!+.01)},q.uid),0);
   for(const value of ["","1/0","1+1","sqrt(4)","1,2","NaN","Infinity","9".repeat(101)])assert.equal(automaticPoints(part,{value},q.uid),0);
   if(q.answer.includes("/"))assert.equal(automaticPoints(part,{value:q.answer}),0,"Legacy decimal-only grading stays unchanged");
   assert.equal(guest.parts[0].answerFormat,"number-or-fraction");
  }
 }
 for(const b of Object.values(originalBlocks))for(const skill of Object.keys(b.skills)){
  const id=originalLessonId(("maths4u-original-"+b.key) as keyof typeof originalBlocks,skill),expected=allPure1Questions.filter(q=>q.block===b.key&&q.skill===skill),content=await topicContent(null,id,"en");
  assert.equal(content.questionCounts.MC,expected.filter(q=>q.kind==="CHOICE").length);assert.equal(content.questionCounts.SHORT,expected.filter(q=>q.kind==="NUMERIC").length);const quadratic=quadraticTopics.find(t=>t.lessonId===id);assert.equal(content.questionCounts.WRITTEN,2+(quadratic?questionsForTopic(quadratic.key).length:0));
 }
 const changed=structuredClone(pack);changed.questions[0].solution_html+=" changed";await assert.rejects(importPure1ShortLocal(actor,changed),/P1_SHORT_EXPLICIT_REVISION_REQUIRED/);
 const bad=structuredClone(pack);bad.questions[0].php_subchapter_id=999999;assert.throws(()=>pure1ShortSchema.parse(bad));
 const oldEnv=process.env.MATHS4U_ENV;try{process.env.MATHS4U_ENV="production";await assert.rejects(importPure1ShortLocal(actor,pack),/P1_SHORT_LOCAL_ONLY/);}finally{process.env.MATHS4U_ENV=oldEnv;}
 assert.equal(await db().taskVersion.count(),before);assert.equal(await db().lessonVersion.count(),lessons);
 for(const value of ["0","-3/2","2 / 4","1/-2","−3/2","1e2"] )assert.notEqual(pure1PracticeNumber(value),null);
 for(const value of ["1e999","1/0","-0/0","1/2/3","1;process.exit()","1,5","0x10"])assert.equal(pure1PracticeNumber(value),null);
 assert.ok(!isPure1ShortUid("legacy"));assert.ok(!isPure1ShortUid("M4U-P1-QP-ROOTS-01 trailing"));
}).finally(()=>db().$disconnect());
