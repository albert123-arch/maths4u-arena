import test from "node:test";
import assert from "node:assert/strict";
import { contentPackage, packageTopic } from "../src/lib/content-package-content";
import { contentPackageSchema } from "../src/lib/content-package-schema";
import { gradeSquare, squarePublicLesson, squareHelp, squareMarkingRows, questionsForTopic } from "../src/lib/square-content";
import { packageTask } from "../src/lib/content-packages";
import { readPackageAssets } from "../src/lib/content-package-assets";
import { squareSnapshot, nextSquareReview } from "../src/lib/square-model";
import { automaticPoints } from "../src/lib/works";
const p=contentPackage("9231-fp1-vectors");
test("Vectors package: all 84 supplied identities, five lessons and solution-only diagrams",async()=>{
 assert.equal(p.questions.filter(q=>q.collection==="exam").length,84);
 assert.equal(p.questions.filter(q=>q.collection!=="exam").length,40);
 assert.equal(p.lessons.length,5);assert.equal(p.assets?.length,8);assert.equal(p.source.held.length,0);
 const files=await readPackageAssets(p);assert.equal(files.length,8);
 for(const asset of p.assets!){assert.equal(asset.role,"SOLUTION");assert(p.questions.some(q=>q.id===asset.question_uid));}
 const tampered=structuredClone(p);tampered.assets![0].path="../outside.png";assert(!contentPackageSchema.safeParse(tampered).success);
 const mismatch=structuredClone(p);mismatch.assets![0].question_uid="missing_question";assert(!contentPackageSchema.safeParse(mismatch).success);
});

test("Vectors: all coordinates and normalised coefficients are required, with exact frozen grading",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-VC-"+id)!,provenance:undefined});
 const q=get("P11"),answers=Object.fromEntries(q.fields.map(f=>[f.key,f.expected as string]));
 assert(gradeSquare(q,answers).correct);assert(!gradeSquare(q,{...answers,component2:"6"}).correct);
 const plane=get("N11");assert(gradeSquare(plane,{coef_b:"-1",coef_c:"2/4",constant:"1"}).correct);
 assert(!gradeSquare(plane,{coef_b:"-1",coef_c:"1/2"}).correct);
 assert(gradeSquare(get("T21"),{values:"{6,-6}"}).correct);assert(!gradeSquare(get("T21"),{values:"{6}"}).correct);
 assert(gradeSquare(get("T31"),{parallel:"1",at_parallel:"sqrt(5)",otherwise:"1"}).correct);
 assert(!gradeSquare(get("T31"),{parallel:"1",at_parallel:"1",otherwise:"1"}).correct);
 for(const source of p.questions.filter(q=>q.collection==="exam")){
  const task=packageTask(p,source),images=p.assets!.filter(a=>a.question_uid===source.id);
  assert.equal(task.assets.length,images.length);assert(task.assets.every(a=>a.role==="SOLUTION"));
  for(const asset of images)assert(task.texts[0].solution?.includes("/api/files/"+asset.file_id));
 }
 const part=packageTask(p,plane).parts[1],frozen={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(frozen as never,{value:"2/4"},plane.id),1);
 assert.equal(automaticPoints(frozen as never,{value:"2"},plane.id),0);
});
test("Vectors complete answers, fresh variants, notes and guidance have valid mathematics rendering",()=>{
 for(const lesson of p.lessons){
  const topic=packageTopic(lesson.id)!,dto=squarePublicLesson(topic);
  assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);
  assert(dto.questions.filter(q=>q.collection==="exam").length>=6);
  const raw=JSON.stringify(dto);
  for(const hidden of ['"expected"','"ownerProvenance"','source_uid','source_title','source_exam','teacher_note','"verification"','Maths4U Original'])assert(!raw.includes(hidden),hidden);
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution]),...dto.questions.map(q=>q.prompt)])assert(!text.includes("katex-error"),lesson.id);
  for(const q of questionsForTopic(lesson.id)){
   assert.equal(squareMarkingRows(q).reduce((sum,r)=>sum+r.marks,0),q.marks);
   for(const text of [squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(r=>r.html)])assert(!text.includes("katex-error"),q.id);
   assert(!q.prompt_html.includes("/api/files/"),"Solution figure leaked into question");
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(";"):f.expected]));
   assert(gradeSquare(q,answers).correct,q.id+" rejects its complete key");
   for(const field of q.fields){
    const missing={...answers};delete missing[field.key];assert(!gradeSquare(q,missing).correct,q.id+" accepts a missing field");
    const bad={...answers,[field.key]:field.type==="choice"?Object.keys(field.options!).find(k=>k!==field.expected)!:"999"};
    assert(!gradeSquare(q,bad).correct,q.id+" accepts a wrong field");
   }
  }
  const first=dto.questions.find(q=>q.collection==="short")!,state=squareSnapshot([{eventKey:"review",uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);
  assert.equal(nextSquareReview(dto.questions,state,1000)[0].collection,"variant");
 }
});
