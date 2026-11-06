import test from "node:test";
import assert from "node:assert/strict";
import { contentPackageSchema } from "../src/lib/content-package-schema";
import { contentPackages, packageTopic } from "../src/lib/content-package-content";
import { squarePublicLesson, questionsForTopic, gradeSquare, squareHelp, squareMarkingRows } from "../src/lib/square-content";
import { squareSnapshot, nextSquareReview } from "../src/lib/square-model";
import { packageTask } from "../src/lib/content-packages";
import { automaticPoints } from "../src/lib/works";
test("C1 package schema, complete marks and all supplied identities",()=>{
 const p=contentPackages[0];assert.equal(p.questions.length,94);assert.equal(p.source.supplied,62);assert.equal(p.source.held.length,0);
 assert.equal(p.questions.filter(q=>q.provenance).length,62);
 const wrong=structuredClone(p);wrong.questions[0].marks++;assert.equal(contentPackageSchema.safeParse(wrong).success,false);
 const duplicate=structuredClone(p);duplicate.questions.push(duplicate.questions[0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
 for(const q of p.questions){assert(!q.id.startsWith("legacy_"));assert.equal(squareMarkingRows({...q,provenance:undefined}).reduce((n,r)=>n+r.marks,0),q.marks);}
});
test("four lessons reuse the complete-answer/review engine without leaking keys or provenance",()=>{
 const p=contentPackages[0];
 for(const l of p.lessons){
  const topic=packageTopic(l.id)!,dto=squarePublicLesson(topic),raw=JSON.stringify(dto),questions=questionsForTopic(l.id);
  assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);
  for(const forbidden of ['"expected"','"ownerProvenance"','"original_id"','original_source_url','original_exam','"verification"','teacher_review','Maths4U Original','FM June'])assert(!raw.includes(forbidden),forbidden);
  for(const q of questions){
   for(const text of [q.prompt_html,squareHelp(q,"hint"),squareHelp(q,"solution"),...squareMarkingRows(q).map(r=>r.html)])assert(!text.includes("katex-error"),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,f.expected as string]));assert(gradeSquare(q,answers).correct,q.id);
   for(const field of q.fields){
    const wrong={...answers,[field.key]:field.type==="choice"?Object.keys(field.options!).find(k=>k!==field.expected)!:"999"};
    assert(!gradeSquare(q,wrong).correct,q.id);const missing={...answers};delete missing[field.key];assert(!gradeSquare(q,missing).correct,q.id);
   }
  }
  for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution]),...dto.questions.map(q=>q.prompt)])assert(!text.includes("katex-error"),l.id);
  const q=dto.questions.find(q=>q.collection==="short")!,e={eventKey:"test",uid:q.uid,family:q.family,correct:false,helpUsed:false,at:1000},state=squareSnapshot([e]);
  assert.equal(nextSquareReview(dto.questions,state,1000)[0].collection,"variant");
 }
});
test("assigned quick-check keys are immutable descriptors and equivalent exact answers work",()=>{
 const p=contentPackages[0],q=p.questions.find(q=>q.fields.length>1)!,task=packageTask(p,q);
 assert.equal(task.parts.length,q.fields.length);
 for(const [i,part] of task.parts.entries()){
  const value=q.fields[i].expected as string;
  const full={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
  assert.equal(automaticPoints(full as never,{value},q.id),1);
  assert.equal(automaticPoints(full as never,{value:"999"},q.id),0);
  assert.equal(automaticPoints(full as never,{value:"1/0"},q.id),0);
 }
 const eq=p.questions.find(q=>q.fields[0]?.type==="equation")!,part=packageTask(p,eq).parts[0];
 const full={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(full as never,{value:"2*("+eq.fields[0].expected+")=0"},eq.id),1);
});
