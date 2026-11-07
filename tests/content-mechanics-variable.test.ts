import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-mechanics-variable");
test("Further Mechanics Variable force: 33 tasks, 76 parts, 258 marks and all 8 diagrams",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,33);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),76);assert.equal(written.reduce((n,q)=>n+q.marks,0),258);
 assert.equal(written.filter(q=>q.provenance).length,33);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,4);
 assert.equal(p.assets?.filter(a=>a.role==="STATEMENT").length,4);assert.equal(p.assets?.filter(a=>a.role==="SOLUTION").length,4);
 for(const q of written){assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));assert(q.parts.every(part=>part.marking_criteria.every(c=>c.code==="")));assert(!q.prompt_html.includes("Geometry of the new variant"));}
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==="STATEMENT"?q.prompt_html:q.solution_html).includes("/api/files/"+a.file_id));if(a.role==="SOLUTION")assert(!q.prompt_html.includes(a.file_id));}
});
test("Variable force: whole functions, initial constants, branches, finite events and complete templates",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-MVAR-"+id)!,provenance:undefined});
 assert(gradeSquare(get("T11"),{velocity:"5+3*t-t^2",position:"5*t+3*t^2/2-t^3/3",force:"2"}).correct);assert(!gradeSquare(get("T11"),{velocity:"3*t-t^2",position:"5*t+3*t^2/2-t^3/3",force:"2"}).correct);
 assert(gradeSquare(get("T21"),{velocity:"20;2*(1+t)^2",position:"10*t;1+t",limit:"10",speed:"5/2"}).correct);assert(!gradeSquare(get("T21"),{velocity:"10;1+t",position:"10*t;1+t",limit:"10",speed:"5/2"}).correct);
 assert(gradeSquare(get("P11"),{velocity2:"32-4*x^3",turn:"2",acceleration:"-24"}).correct);assert(!gradeSquare(get("P11"),{velocity2:"32-2*x^3",turn:"2",acceleration:"-24"}).correct);
 assert(gradeSquare(get("P31"),{velocity:"6-2*x",A:"3",B:"4",C:"2",acceleration:"16"}).correct);assert(!gradeSquare(get("P31"),{velocity:"2*x-6",A:"3",B:"4",C:"2",acceleration:"16"}).correct);
 assert(gradeSquare(get("V21"),{velocity:"(3-t)^2",stop:"3",distance:"9",interval:"[0,3]",later:"0"}).correct);assert(!gradeSquare(get("V21"),{velocity:"(3-t)^2",stop:"3",distance:"9",interval:"[0,inf)",later:"9"}).correct);
 assert(gradeSquare(get("V31"),{A:"40",B:"-20",K:"2",R:"40",S:"-40"}).correct);assert(!gradeSquare(get("V31"),{A:"40",B:"-20",K:"2",R:"40",S:"40"}).correct);
 assert(gradeSquare(get("L31"),{A:"125",B:"-117",C:"3/4",limit:"5",power:"125/2"}).correct);assert(!gradeSquare(get("L31"),{A:"125",B:"-117",C:"1/4",limit:"5",power:"125/2"}).correct);
});
test("Variable force: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [l.objective,l.before,l.ideas,l.method,...l.examples.flatMap(e=>[e.question,e.solution]),dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])]){assert(!text.includes("katex-error"),l.id);assert(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text),"Control character in "+l.id);}
  for(const e of dto.examples)assert((e.question+e.solution).includes('class="katex"'),e.title);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   if(q.fields.length)assert(!/natural length|Hooke|elastic energy|first moments/i.test(q.hint_html),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="ratio"?"999;1":"999";assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
