import {contentPackageSchema} from "../src/lib/content-package-schema";
import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
const p=contentPackage("9231-fp2-integration");
test("FP2 Integration: all 109 owner tasks, 268 parts, 1051 marks and 23 role-aware diagrams",()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,109);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),268);assert.equal(written.reduce((n,q)=>n+q.marks,0),1051);
 assert.equal(written.filter(q=>q.provenance).length,109);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,6);assert.equal(p.assets?.length,23);
 assert.equal(p.assets?.filter(a=>a.role==="STATEMENT").length,18);assert.equal(p.assets?.filter(a=>a.role==="SOLUTION").length,5);
 for(const q of written)assert(packageTask(p,q).parts.every(part=>part.kind==="MANUAL"));
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==="STATEMENT"?q.prompt_html:q.solution_html).includes('/api/files/'+a.file_id));if(a.role==="SOLUTION")assert(!q.prompt_html.includes(a.file_id));}
});
test("Integration: complete recurrence, exact arcs, radius signs, rectangle formulae and strict integers",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-FINT-"+id)!,provenance:undefined});
 assert(gradeSquare(get("T31"),{log:"9/2",constant:"135/32"}).correct);
 assert(!gradeSquare(get("T31"),{log:"9/2"}).correct);
 assert(gradeSquare(get("R11"),{a:"-2",b:"n",c:"1/4",d:"-3/4"}).correct);
 assert(!gradeSquare(get("R11"),{a:"-2",b:"n",c:"1/4",d:"-1/4"}).correct);
 assert(gradeSquare(get("H11"),{base:"pi/4",middle:"pi/8",target:"3*pi/32"}).correct);
 assert(gradeSquare(get("A31"),{length:"3*sqrt(5)/2"}).correct);
 assert(gradeSquare(get("S31"),{split:"2",area:"13*pi*sqrt(2)"}).correct);
 assert(!gradeSquare(get("S31"),{split:"2",area:"5*pi*sqrt(2)"}).correct);
 assert(gradeSquare(get("L11"),{upper:"8*n^2+9*n+1;6*n^2",lower:"8*n^2-9*n+1;6*n^2",limit:"4/3"}).correct);
 assert(!gradeSquare(get("L21"),{least:"2000"}).correct);assert(gradeSquare(get("L21"),{least:"2001"}).correct);
});
test("Integration: every complete key, omitted/wrong fields, protected provenance, KaTeX, marking and review",()=>{
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

test("Integration assets: schema accepts only statement and solution placements",()=>{
 for(const role of ["ANSWER","MS","HINT","TEACHER"]){const invalid=structuredClone(p);(invalid.assets![0] as {role:string}).role=role;assert.equal(contentPackageSchema.safeParse(invalid).success,false);}
 const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
 const wrong=structuredClone(p);wrong.assets![0].question_uid="missing";assert.equal(contentPackageSchema.safeParse(wrong).success,false);
});
