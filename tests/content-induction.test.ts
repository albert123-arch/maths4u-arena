import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {contentPackage,packageTopic,contentPackages} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
import {automaticPoints} from "../src/lib/works";
const p=contentPackage("9231-fp1-induction");

test("Induction: independently authored identities, complete lessons and original-only provenance",async()=>{
 assert.equal(p.lessons.length,5);assert.equal(p.questions.length,70);assert.equal(p.source.supplied,0);assert.deepEqual(p.source.held,[]);
 assert.equal(p.questions.filter(q=>q.collection==="exam").length,30);
 assert(p.questions.every(q=>!q.provenance));assert.equal(p.assets?.length??0,0);
 for(const q of p.questions){
  const task=packageTask(p,q);assert.equal(task.assets.length,0);
  assert.equal(JSON.parse(task.texts[0].teacherNote!).provenance.type,"independently-authored");
 }
 for(const lesson of p.lessons){
  assert.equal(lesson.examples.length,4);assert.equal(p.questions.filter(q=>q.lesson===lesson.key&&q.collection==="exam").length,6);
  for(const link of [...lesson.before.matchAll(/href="([^"]+)"/g)].map(m=>m[1])){
   const id=link.split("/").at(-1)!;assert(contentPackages.some(pack=>pack.lessons.some(l=>l.id===id)),"Broken prerequisite: "+link);
  }
 }
 const audit=JSON.parse(await fs.readFile("docs/ARENA-C3-INDUCTION-SOURCE-AUDIT-20261106.json","utf8"));
 assert.equal(audit.rows.length,70);assert(audit.rows.every((r:{archiveLink:unknown})=>r.archiveLink===null));
});

test("Induction: complete algebraic steps accept equivalent forms; every missing or wrong field fails",()=>{
 for(const lesson of p.lessons){
  const topic=packageTopic(lesson.id)!,dto=squarePublicLesson(topic);
  assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);
  const raw=JSON.stringify(dto);
  for(const hidden of ['"expected"','"ownerProvenance"','"verification"','"sourceSha256"','Maths4U Original'])assert(!raw.includes(hidden),hidden);
  for(const q of questionsForTopic(lesson.id)){
   assert.equal(squareMarkingRows(q).reduce((a,c)=>a+c.marks,0),q.marks);
   for(const text of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(r=>r.html)])assert(!text.includes("katex-error"),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,f.expected as string]));
   assert(gradeSquare(q,answers).correct,q.id+" rejects its key");
   for(const field of q.fields){
    const missing={...answers};delete missing[field.key];assert(!gradeSquare(q,missing).correct,q.id);
    const bad={...answers,[field.key]:field.type==="choice"?Object.keys(field.options!).find(k=>k!==field.expected)!:"999"};assert(!gradeSquare(q,bad).correct,q.id);
   }
  }
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),lesson.id);
  const first=dto.questions.find(q=>q.collection==="short")!,state=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);
  assert.equal(nextSquareReview(dto.questions,state,1000)[0].collection,"variant");
 }
 const q={...p.questions.find(q=>q.id==="M4U-9231-IN-Q-S11")!,provenance:undefined};
 assert(gradeSquare(q,{term:"3+5k",target:"(k+1)*(5k+6)/2"}).correct);
 assert(!gradeSquare(q,{term:"5k-2",target:"(k+1)*(5k+6)/2"}).correct);
 const a={...p.questions.find(q=>q.id==="M4U-9231-IN-Q-D11")!,provenance:undefined};
 assert(gradeSquare(a,{A:"3",B:"6/4",C:"6"}).correct);
 const part=packageTask(p,a).parts[1],frozen={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(frozen as never,{value:"6/4"},a.id),1);
 assert.equal(automaticPoints(frozen as never,{value:"3"},a.id),0);
});

test("Induction: full proofs are manual with a base, hypothesis and conclusion, separate from autoPoints",()=>{
 for(const q of p.questions.filter(q=>q.collection==="exam")){
  assert.equal(q.fields.length,0);assert(q.prompt_html.toLowerCase().includes("induction"),q.id);
  assert(q.parts.flatMap(p=>p.marking_criteria).some(c=>c.code.startsWith("M")),q.id);
  const task=packageTask(p,q);assert(task.parts.every(part=>part.kind==="MANUAL"));
  assert(task.parts.every(part=>automaticPoints({...part,numericAnswer:null,acceptedAnswers:[],options:[]} as never,{value:"true"},q.id)===null));
 }
});
