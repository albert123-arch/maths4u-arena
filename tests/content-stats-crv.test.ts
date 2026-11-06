import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {readPackageAssets} from "../src/lib/content-package-assets";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
import {automaticPoints} from "../src/lib/works";
const p=contentPackage("9231-stats-crv");
test("Further Statistics: all 38 owner tasks, 119 parts, five lessons and 16 solution-only figures",async()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,38);assert.equal(written.reduce((sum,q)=>sum+q.parts.length,0),119);
 assert.equal(written.reduce((sum,q)=>sum+q.marks,0),343);assert.equal(written.filter(q=>q.provenance).length,38);
 assert.equal(p.source.supplied,38);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,5);
 assert.equal(p.assets?.length,16);assert.equal((await readPackageAssets(p)).length,16);
 for(const q of written){const task=packageTask(p,q);assert(task.parts.every(part=>part.kind==="MANUAL"));assert(task.assets.every(asset=>asset.role==="SOLUTION"));}
 assert.equal(p.course.slug,"maths4u-9231-statistics");
});
test("Further Statistics: complete quantiles, coefficients, rational density and support endpoints",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-CRV-"+id)!,provenance:undefined});
 assert(gradeSquare(get("C31"),{q1:"1",q3:"sqrt(3)",iqr:"sqrt(3)-1"}).correct);
 assert(!gradeSquare(get("C31"),{q1:"1",q3:"sqrt(3)"}).correct);
 assert(gradeSquare(get("T31"),{pdf:"2;2y^2",lower:"2/4",upper:"1"}).correct);
 assert(!gradeSquare(get("T31"),{pdf:"1;y",lower:"1/2",upper:"1"}).correct);
 assert(gradeSquare(get("B31"),{A:"2/3",B:"1/3",C:"1/3",break:"1",upper:"4"}).correct);
 assert(!gradeSquare(get("B31"),{A:"1/3",B:"1/3",C:"1/3",break:"1",upper:"4"}).correct);
 const q=get("T31"),part=packageTask(p,q).parts[0],frozen={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(frozen as never,{value:"2;2y^2"},q.id),1);assert.equal(automaticPoints(frozen as never,{value:"1;y"},q.id),0);
});
test("Further Statistics: every complete key, field omission, rendering, rubric and review family",()=>{
 for(const l of p.lessons){
  const topic=packageTopic(l.id)!,dto=squarePublicLesson(topic);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);
  assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  const raw=JSON.stringify(dto);for(const hidden of ['"expected"','"original_uid"','"ownerProvenance"','"verification"','Maths4U Original'])assert(!raw.includes(hidden),hidden);
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])])assert(!text.includes("katex-error"),l.id);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,c)=>sum+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes("katex-error"),q.id);
   assert(!q.prompt_html.includes("/api/files/"));
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);assert(!gradeSquare(q,{...answers,[f.key]:f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:"999"}).correct,q.id);}
  }
  const first=dto.questions.find(q=>q.collection==="short")!,snapshot=squareSnapshot([{eventKey:"weak",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);assert.equal(nextSquareReview(dto.questions,snapshot,1000)[0].collection,"variant");
 }
});
