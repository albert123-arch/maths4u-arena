import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-mechanics-hooke");
test("Further Mechanics Hooke law: 31 tasks, 72 parts, 230 marks and all 21 diagrams",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,31);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),72);assert.equal(written.reduce((n,q)=>n+q.marks,0),230);
 assert.equal(written.filter(q=>q.provenance).length,31);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,4);
 assert.equal(p.assets?.filter(a=>a.role==="STATEMENT").length,20);assert.equal(p.assets?.filter(a=>a.role==="SOLUTION").length,1);
 for(const q of written){assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));assert(q.parts.every(part=>part.marking_criteria.every(c=>c.code==="")));assert(!q.prompt_html.includes("Geometry of the new variant"));}
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==="STATEMENT"?q.prompt_html:q.solution_html).includes("/api/files/"+a.file_id));if(a.role==="SOLUTION")assert(!q.prompt_html.includes(a.file_id));}
});
test("Hooke law: complete calibration, signs, load changes, taut intervals and collision loss",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-MHOOK-"+id)!,provenance:undefined});
 assert(gradeSquare(get("M11"),{stiffness:"200/6",natural:"1",modulus:"100/3"}).correct);assert(!gradeSquare(get("M11"),{stiffness:"100/3",natural:"1"}).correct);
 assert(gradeSquare(get("M31"),{initial:"1/6",equilibrium:"1/3",speed2:"1/12",maximum:"1/2"}).correct);assert(!gradeSquare(get("M31"),{initial:"1/3",equilibrium:"1/3",speed2:"1/12",maximum:"1/2"}).correct);
 assert(gradeSquare(get("E12"),{force:"12",energy:"9/5",work:"8/5"}).correct);assert(!gradeSquare(get("E12"),{force:"-12",energy:"9/5",work:"8/5"}).correct);
 assert(gradeSquare(get("E21"),{turn:"-1/6",length:"5/6",speed2:"2/3"}).correct);assert(!gradeSquare(get("E21"),{turn:"1/6",length:"5/6",speed2:"2/3"}).correct);
 assert(gradeSquare(get("C21"),{position:"(19-k)/3",interval:"(0,10)",upper:"4",lower:"3"}).correct);assert(!gradeSquare(get("C21"),{position:"(19-k)/3",interval:"(0,10]",upper:"4",lower:"3"}).correct);
 assert(gradeSquare(get("C31"),{minimum:"1",upper:"2",interval:"[1,2)",stop:"1/4"}).correct);assert(!gradeSquare(get("C31"),{minimum:"1",upper:"2",interval:"(1,2)",stop:"1/4"}).correct);
 assert(gradeSquare(get("S11"),{speed2:"4/3",minimum:"1/3",acceleration:"3"}).correct);assert(!gradeSquare(get("S11"),{speed2:"4/3",minimum:"1",acceleration:"3"}).correct);
 assert(gradeSquare(get("S31"),{shared:"1",compression:"sqrt(3)/3",lost:"3"}).correct);assert(!gradeSquare(get("S31"),{shared:"1",compression:"sqrt(3)/3",lost:"0"}).correct);
});
test("Hooke law: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [l.objective,l.before,l.ideas,l.method,...l.examples.flatMap(e=>[e.question,e.solution]),dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])]){assert(!text.includes("katex-error"),l.id);assert(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text),"Control character in "+l.id);}
  for(const e of dto.examples)assert((e.question+e.solution).includes('class="katex"'),e.title);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   if(q.fields.length)assert(!/moment point|first moments|mass-weighted|angular speed to radians/i.test(q.hint_html),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="ratio"?"999;1":"999";assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
