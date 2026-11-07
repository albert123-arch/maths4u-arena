import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-mechanics-equilibrium");
test("Further Mechanics Equilibrium: 48 tasks, 111 parts, 407 marks and all 46 diagrams",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,48);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),111);assert.equal(written.reduce((n,q)=>n+q.marks,0),407);
 assert.equal(written.filter(q=>q.provenance).length,48);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,4);
 assert.equal(p.assets?.filter(a=>a.role==="STATEMENT").length,43);assert.equal(p.assets?.filter(a=>a.role==="SOLUTION").length,3);
 for(const q of written){assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));assert(q.parts.every(part=>part.marking_criteria.every(c=>c.code==="")));assert(!q.prompt_html.includes("Geometry of the new variant"));}
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==="STATEMENT"?q.prompt_html:q.solution_html).includes("/api/files/"+a.file_id));if(a.role==="SOLUTION")assert(!q.prompt_html.includes(a.file_id));}
});
test("Equilibrium: both signed moments, centres, full ranges, reference distances and all hinge forces",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-MEQU-"+id)!,provenance:undefined});
 assert(gradeSquare(get("M11"),{origin:"14/2",pivot:"-2"}).correct);assert(!gradeSquare(get("M11"),{origin:"7"}).correct);
 assert(gradeSquare(get("L11"),{x:"14/5",y:"2"}).correct);assert(!gradeSquare(get("L11"),{x:"3",y:"2"}).correct);
 assert(gradeSquare(get("L31"),{topple:"8/9",slide:"1/2",interval:"[0,1/2]"}).correct);assert(!gradeSquare(get("L31"),{topple:"8/9",slide:"1/2",interval:"(0,1/2]"}).correct);
 assert(gradeSquare(get("S11"),{ratio:"1/6",height:"99/28",topple:"56/99"}).correct);assert(!gradeSquare(get("S11"),{ratio:"1/6",height:"3",topple:"56/99"}).correct);
 assert(gradeSquare(get("C31"),{tension:"25/24",horizontal:"5/8",vertical:"2/3",modulus:"25/6"}).correct);assert(!gradeSquare(get("C31"),{tension:"25/24",horizontal:"5/8",vertical:"2/3",modulus:"25/24"}).correct);
});
test("Equilibrium of a rigid body: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const e of dto.examples)assert((e.question+e.solution).includes('class="katex"'),e.title);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   if(q.fields.length)assert(!/first landing|event time|velocity between stages/i.test(q.hint_html),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="ratio"?"999;1":"999";assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
