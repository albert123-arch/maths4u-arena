import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-mechanics-circular");
test("Further Mechanics Circular motion: 63 tasks, 125 parts, 444 marks and all 35 diagrams",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,63);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),125);assert.equal(written.reduce((n,q)=>n+q.marks,0),444);
 assert.equal(written.filter(q=>q.provenance).length,63);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,5);
 assert.equal(p.assets?.filter(a=>a.role==="STATEMENT").length,31);assert.equal(p.assets?.filter(a=>a.role==="SOLUTION").length,4);
 for(const q of written){assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));assert(q.parts.every(part=>part.marking_criteria.every(c=>c.code==="")));assert(!q.prompt_html.includes("Geometry of the new variant"));}
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==="STATEMENT"?q.prompt_html:q.solution_html).includes("/api/files/"+a.file_id));if(a.role==="SOLUTION")assert(!q.prompt_html.includes(a.file_id));}
});
test("Circular motion: full radial, conical, interval, signed-reaction, release and impact answers",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-MCIRC-"+id)!,provenance:undefined});
 assert(gradeSquare(get("H11"),{omega:"2*pi/3",speed:"pi/2",acceleration:"pi^2/3",period:"3"}).correct);assert(!gradeSquare(get("H11"),{omega:"2*pi/3",speed:"pi/2"}).correct);
 assert(gradeSquare(get("H21"),{normal:"30",friction:"15",mu:"1/2",interval:"[1/2,inf)"}).correct);assert(!gradeSquare(get("H21"),{normal:"30",friction:"15",mu:"1/2",interval:"(1/2,inf)"}).correct);
 assert(gradeSquare(get("C21"),{radius:"4",upper:"10/3",lower:"5/3"}).correct);assert(!gradeSquare(get("C21"),{radius:"5",upper:"10/3",lower:"5/3"}).correct);
 assert(gradeSquare(get("V21"),{minimum:"7/3",maximum:"13/3",interval:"[7/3,13/3]"}).correct);assert(!gradeSquare(get("V21"),{minimum:"7/3",maximum:"13/3",interval:"(7/3,13/3]"}).correct);
 assert(gradeSquare(get("V31"),{speed2:"7/10",reaction:"-1/5",top2:"1/2"}).correct);assert(!gradeSquare(get("V31"),{speed2:"7/10",reaction:"1/5",top2:"1/2"}).correct);
 assert(gradeSquare(get("S21"),{first:"-2",second:"2",speed2:"4"}).correct);assert(!gradeSquare(get("S21"),{first:"2",second:"2",speed2:"4"}).correct);
});
test("Circular motion: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const e of dto.examples)assert((e.question+e.solution).includes('class="katex"'),e.title);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   if(q.fields.length)assert(!/moment point|first moments|mass-weighted|first landing/i.test(q.hint_html),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="ratio"?"999;1":"999";assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
