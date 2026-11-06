import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
import {automaticPoints} from "../src/lib/works";
const p=contentPackage("9231-fp1-matrices1");
test("Matrices: 60 owner identities, book sequence, 20 archive links and 40 new originals",()=>{
 assert.equal(p.questions.filter(q=>q.collection==="exam").length,60);
 assert.equal(p.questions.filter(q=>q.collection!=="exam").length,40);
 assert.deepEqual(p.lessons.map(l=>l.key),["operations","inverses","determinants","plane-maps","invariants"]);
 assert.equal(p.assets,undefined);assert.equal(p.source.held.length,0);
 const adapted=p.questions.filter(q=>q.collection==="exam"&&q.provenance);
 assert.equal(adapted.length,20);assert.equal(new Set(adapted.map(q=>q.provenance!.archiveTaskId)).size,20);
 assert.equal(p.questions.filter(q=>q.collection==="exam"&&!q.provenance).length,40);
 for(const q of p.questions.filter(q=>q.collection==="exam")){
  const task=packageTask(p,q);assert.equal(task.assets.length,0);assert.equal(task.parts.reduce((s,p)=>s+p.maxPoints,0),q.marks);
 }
});
test("Matrices: complete keys, partial matrices, all KaTeX and private source projections",()=>{
 for(const lesson of p.lessons){
  const dto=squarePublicLesson(packageTopic(lesson.id)!);
  assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);
  assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  const json=JSON.stringify(dto);
  for(const hidden of ['"expected"','"ownerProvenance"','original_uid','original_exam','teacher_note','"verification"','Maths4U Original'])assert(!json.includes(hidden),hidden);
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution]),...dto.questions.map(q=>q.prompt)])assert(!text.includes("katex-error"),lesson.id);
  for(const q of questionsForTopic(lesson.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,r)=>sum+r.marks,0),q.marks);
   for(const text of [squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(r=>r.html)])assert(!text.includes("katex-error"),q.id);
   if(!q.fields.length){assert(!gradeSquare(q,{}).valid);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));
   assert(gradeSquare(q,answers).correct,q.id+" complete key");
   for(const field of q.fields){
    const missing={...answers};delete missing[field.key];assert(!gradeSquare(q,missing).correct,q.id+" accepts missing entry");
    assert(!gradeSquare(q,{...answers,[field.key]:field.type==="choice"?Object.keys(field.options!).find(k=>k!==field.expected)!:"999"}).correct,q.id+" wrong entry");
   }
  }
  const first=dto.questions.find(q=>q.collection==="short")!;
  const state=squareSnapshot([{eventKey:"review",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);
  assert.equal(nextSquareReview(dto.questions,state,1000)[0].collection,"variant");
 }
});
test("Matrices: equivalent exact entries, complete sets and whole line equations",()=>{
 const product=questionsForTopic("fp1_matrices_operations").find(q=>q.id==="M4U-9231-M1-O11")!;
 const correct=Object.fromEntries(product.fields.map(f=>[f.key,f.expected as string]));
 assert(gradeSquare(product,correct).correct);
 assert(gradeSquare(product,{...correct,r1c1:"8/2"}).correct);
 const incomplete={...correct};delete incomplete.r2c2;assert(!gradeSquare(product,incomplete).correct);
 const roots=questionsForTopic("fp1_matrices_determinants").find(q=>q.id==="M4U-9231-M1-D21")!;
 assert(gradeSquare(roots,{values:"{3,1,-1}"}).correct);assert(!gradeSquare(roots,{values:"{1,3}"}).correct);
 const line=questionsForTopic("fp1_matrices_plane_maps").find(q=>q.id==="M4U-9231-M1-P31")!;
 assert(gradeSquare(line,{line:"-6*u+8*v+2=0"}).correct);
 assert(!gradeSquare(line,{line:"-3*u+4*v=0"}).correct);
 const first=packageTask(p,p.questions.find(q=>q.id===product.id)!).parts[0];
 const frozen={...first,acceptedAnswers:first.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(frozen as never,{value:"8/2"},product.id),1);
 assert.equal(automaticPoints(frozen as never,{value:"999"},product.id),0);
});
