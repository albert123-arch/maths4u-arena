import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-fp2-ode");
test("FP2 Differential equations: 69 supplied tasks, 135 parts, 655 marks; five lessons",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,69);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),135);assert.equal(written.reduce((n,q)=>n+q.marks,0),655);
 assert.equal(written.filter(q=>q.provenance).length,69);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,5);assert.equal(p.assets?.length??0,0);
 for(const q of written)assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));
});
test("Differential equations: whole polynomials, all roots and every solution coefficient",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-FODE-"+id)!,provenance:undefined});
 assert(gradeSquare(get("F11"),{polynomial:"3*x/2-5/4",constant:"13/4"}).correct);assert(!gradeSquare(get("F11"),{polynomial:"3*x/2",constant:"13/4"}).correct);
 assert(gradeSquare(get("C11"),{roots:"{-2,1}",a:"2",b:"1"}).correct);assert(!gradeSquare(get("C11"),{roots:"{1}",a:"2",b:"1"}).correct);
 assert(gradeSquare(get("C21"),{polynomial:"1+4*x"}).correct);assert(!gradeSquare(get("C21"),{polynomial:"1"}).correct);
 assert(gradeSquare(get("S21"),{constant:"2",exponential:"1"}).correct);assert(!gradeSquare(get("S21"),{constant:"2"}).correct);
});
test("Differential equations: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const e of dto.examples)assert((e.question+e.solution).includes('class="katex"'),e.title);
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
