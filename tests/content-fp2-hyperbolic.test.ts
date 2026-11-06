import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {readPackageAssets} from "../src/lib/content-package-assets";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-fp2-hyperbolic");
test("FP2 Hyperbolic: 50 owner tasks, all 104 parts and 337 marks, six lessons and 11 solution-only graphs",async()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,50);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),104);assert.equal(written.reduce((n,q)=>n+q.marks,0),337);
 assert.equal(written.filter(q=>q.provenance).length,6);assert.equal(p.source.supplied,50);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,6);assert.equal((await readPackageAssets(p)).length,11);
 for(const q of written){const task=packageTask(p,q);assert(task.parts.every(part=>part.kind==="MANUAL"));assert(task.assets.every(a=>a.role==="SOLUTION"));assert(!q.prompt_html.includes("<img"));}
 assert.equal(p.course.slug,"maths4u-9231-fp2");const mixed=p.lessons.find(l=>l.key==="mixed")!;assert(mixed.before.includes("46–50"));assert(mixed.before.includes("first-order differential equations"));
});
test("Hyperbolic: every exact value and root, reciprocal ratios, whole ranges and inverse branches",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-HYP-"+id)!,provenance:undefined});
 assert(gradeSquare(get("E11"),{sinh:"4/3",cosh:"5/3",negative:"-4/5",sech:"3/5"}).correct);
 assert(!gradeSquare(get("E11"),{sinh:"4/3",cosh:"5/3",negative:"4/5",sech:"3/5"}).correct);
 assert(gradeSquare(get("E31"),{quadratic:"2*u^2-14*u+12",roots:"{6,1}"}).correct);assert(!gradeSquare(get("E31"),{quadratic:"2*u^2-14*u+12",roots:"{6}"}).correct);
 assert(gradeSquare(get("G21"),{lower:"-1",upper:"5",centre:"(-1,2)",range:"(-1,5)"}).correct);assert(!gradeSquare(get("G21"),{lower:"-1",upper:"5",centre:"(-1,2)",range:"[-1,5]"}).correct);
 assert(gradeSquare(get("V21"),{alpha:"1/3",argument:"2*x+2;4",domain:"(-3,1)",range:"(-inf,inf)"}).correct);
 assert(!gradeSquare(get("V21"),{alpha:"1/3",argument:"2*x+2;4",domain:"[-3,1]",range:"(-inf,inf)"}).correct);
});
test("Hyperbolic: all complete keys, omitted and wrong fields, renderer, rubrics and fresh review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','Maths4U Original'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const e of dto.examples)assert(e.question.includes('class="katex"'),e.title);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="ratio"?"999;1":f.type==="pairs"?"(999,999)":"999";assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
