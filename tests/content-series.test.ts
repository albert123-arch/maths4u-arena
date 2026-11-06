import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
import {automaticPoints} from "../src/lib/works";
const p=contentPackage("9231-fp1-summation");
test("Series: all 68 supplied new identities, four book-sequenced lessons, no unrelated assets",()=>{
 assert.equal(p.questions.filter(q=>q.collection==="exam").length,68);
 assert.equal(p.questions.filter(q=>q.collection!=="exam").length,32);
 assert.deepEqual(p.lessons.map(l=>l.key),["power-sums","finite-sums","differences","convergence"]);
 assert.equal(p.assets,undefined);assert.equal(p.source.held.length,0);
 const archived=new Set<string>();
 for(const q of p.questions.filter(q=>q.collection==="exam")){
  assert(q.provenance?.archiveTaskId);assert(!archived.has(q.provenance.archiveTaskId));archived.add(q.provenance.archiveTaskId);
  const task=packageTask(p,q);assert.equal(task.assets.length,0);assert.equal(task.parts.reduce((s,p)=>s+p.maxPoints,0),q.marks);
 }
});
test("Series: complete keys, incomplete/wrong formulae, all KaTeX and private source projections",()=>{
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
    const missing={...answers};delete missing[field.key];assert(!gradeSquare(q,missing).correct,q.id+" incomplete");
    assert(!gradeSquare(q,{...answers,[field.key]:field.type==="choice"?Object.keys(field.options!).find(k=>k!==field.expected)!:"999"}).correct,q.id+" incorrect");
   }
  }
  const first=dto.questions.find(q=>q.collection==="short")!;
  const state=squareSnapshot([{eventKey:"review",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);
  assert.equal(nextSquareReview(dto.questions,state,1000)[0].collection,"variant");
 }
});
test("Series: equivalent whole expressions and parity fields are checked separately",()=>{
 const power=questionsForTopic("fp1_series_power_sums").find(q=>q.id==="M4U-9231-SS-P11")!;
 assert(gradeSquare(power,{total:"(n^2+n)/2"}).correct);
 assert(!gradeSquare(power,{total:"n^2/2"}).correct);
 const parity=questionsForTopic("fp1_series_finite_sums").find(q=>q.id==="M4U-9231-SS-F31")!;
 assert(!gradeSquare(parity,{even:"-n*(2*n+3)",odd:"-n*(2*n+3)"}).correct);
 const ratio=questionsForTopic("fp1_series_differences").find(q=>q.id==="M4U-9231-SS-D11")!;
 assert(gradeSquare(ratio,{total:"n ; n+2"}).correct);
 assert(gradeSquare(ratio,{total:"2*n ; 2*n+4"}).correct);
 assert(!gradeSquare(ratio,{total:"n ; n+1"}).correct);
 const part=packageTask(p,p.questions.find(q=>q.id===power.id)!).parts[0];
 const frozen={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(frozen as never,{value:"n*(n+1)/2"},power.id),1);
 assert.equal(automaticPoints(frozen as never,{value:"n*n/2"},power.id),0);
});
