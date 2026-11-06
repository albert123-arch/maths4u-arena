import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {readPackageAssets} from "../src/lib/content-package-assets";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-stats-pgf");
test("Further Statistics PGF: all 50 owner tasks, 167 parts and 437 marks, with five complete lessons",async()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,50);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),167);assert.equal(written.reduce((n,q)=>n+q.marks,0),437);
 assert.equal(written.filter(q=>q.provenance).length,50);assert.equal(p.source.supplied,50);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,5);assert.equal((await readPackageAssets(p)).length,0);
 for(const q of written)assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));assert.equal(p.course.slug,"maths4u-9231-statistics");
});
test("PGF: full probability polynomials and rational functions, factorial moments and independent copies",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-PGF-"+id)!,provenance:undefined});
 assert(gradeSquare(get("B11"),{k:"1/6",pgf:"(1+3*t+2*t^3)/6",missing:"0"}).correct);
 assert(!gradeSquare(get("B11"),{k:"1/6",pgf:"(1+3*t+2*t^2)/6",missing:"0"}).correct);
 assert(gradeSquare(get("B21"),{trials:"t;3-2*t",failures:"1;3-2*t",tail:"8/27"}).correct);
 assert(!gradeSquare(get("B21"),{trials:"1;3-2*t",failures:"1;3-2*t",tail:"8/27"}).correct);
 assert(gradeSquare(get("M11"),{mean:"1",factorial:"4/5",second:"9/5",variance:"4/5"}).correct);
 assert(!gradeSquare(get("M11"),{mean:"1",factorial:"9/5",second:"9/5",variance:"4/5"}).correct);
 for(const id of ["A11","T11","T21","C11","C21","C31"]){const q=get(id);const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,id);}
});
test("PGF: every complete key, every omission and wrong field, hidden provenance, rendering and fresh review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','Maths4U Original'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const e of dto.examples)assert(e.question.includes('class="katex"'),e.title+" question has typeset mathematics");
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="ratio"?"999;1":"999";assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
