import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-mechanics-projectiles");
test("Further Mechanics Projectiles: 27 supplied tasks, 70 parts, 219 marks and all nine diagrams",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,27);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),70);assert.equal(written.reduce((n,q)=>n+q.marks,0),219);
 assert.equal(written.filter(q=>q.provenance).length,27);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,3);
 assert.equal(p.assets?.filter(a=>a.role==="STATEMENT").length,3);assert.equal(p.assets?.filter(a=>a.role==="SOLUTION").length,6);
 for(const q of written){assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));assert(q.parts.every(part=>part.marking_criteria.every(c=>c.code==="")));}
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==="STATEMENT"?q.prompt_html:q.solution_html).includes("/api/files/"+a.file_id));if(a.role==="SOLUTION")assert(!q.prompt_html.includes(a.file_id));}
});
test("Projectiles: complete states, both crossings, every matched launch setting and strict boundaries",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-MPROJ-"+id)!,provenance:undefined});
 assert(gradeSquare(get("C11"),{x:"9",y:"14/2",vx:"9",vy:"2",speed:"sqrt(85)"}).correct);assert(!gradeSquare(get("C11"),{x:"9",y:"7",vx:"9",vy:"2"}).correct);
 assert(gradeSquare(get("C31"),{times:"{2,1}",separation:"20",minimum:"20"}).correct);assert(!gradeSquare(get("C31"),{times:"{1}",separation:"20",minimum:"20"}).correct);
 assert(gradeSquare(get("T21"),{roots:"{3,1}",pairs:"(3,sqrt(10));(1,sqrt(2))"}).correct);assert(!gradeSquare(get("T21"),{roots:"{1,3}",pairs:"(1,sqrt(10));(3,sqrt(2))"}).correct);
 assert(gradeSquare(get("T31"),{interval:"[10+2*sqrt(10),20)"}).correct);assert(!gradeSquare(get("T31"),{interval:"[10+2*sqrt(10),20]"}).correct);
});
test("Projectiles: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
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
