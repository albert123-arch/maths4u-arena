import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-fp2-differentiation");
test("FP2 Differentiation: all 77 owner tasks, 189 parts, 684 marks and disclosed later-topic links",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,77);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),189);assert.equal(written.reduce((n,q)=>n+q.marks,0),684);
 assert.equal(written.filter(q=>q.provenance).length,77);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,6);assert.equal(p.assets?.length??0,0);
 for(const q of written)assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));
 const mixed=p.lessons.find(l=>l.key==="mixed")!;assert(mixed.before.includes("Q62"));assert(mixed.before.includes("Q77"));assert(mixed.before.includes("later FP2"));
});
test("Differentiation: whole rational derivatives, complete stationary sets, chain factors and full series",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-FDIFF-"+id)!,provenance:undefined});
 assert(gradeSquare(get("I11"),{gradient:"-2*x-y;x+2*y"}).correct);
 assert(!gradeSquare(get("I11"),{gradient:"-2*x;x+2*y"}).correct);
 assert(gradeSquare(get("P11"),{gradient:"3*t^2-2;2*t",second:"3*t^2+2;4*t^3"}).correct);
 assert(!gradeSquare(get("P11"),{gradient:"3*t^2-2;2*t",second:"3*t^2+2;2*t^2"}).correct);
 assert(gradeSquare(get("H11"),{first:"3*h*c^2",second:"9*c^3-6*c"}).correct);
 assert(!gradeSquare(get("H11"),{first:"3*h*c^2",second:"9*c^3-3*c"}).correct);
 assert(gradeSquare(get("G11"),{points:"(-6,-3);(6,3)",upper:"-1/12",lower:"1/12"}).correct);
 assert(!gradeSquare(get("G11"),{points:"(6,3)",upper:"-1/12",lower:"1/12"}).correct);
 assert(gradeSquare(get("M11"),{polynomial:"1+2*x+5*x^2/2+2*x^3"}).correct);
 assert(!gradeSquare(get("M11"),{polynomial:"1+2*x+5*x^2+2*x^3"}).correct);
});
test("Differentiation: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const e of dto.examples)assert(e.question.includes('class="katex"'),e.title);
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
