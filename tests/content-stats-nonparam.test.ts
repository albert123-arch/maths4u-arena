import test from "node:test";
import assert from "node:assert/strict";
import {contentPackage,packageTopic} from "../src/lib/content-package-content";
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from "../src/lib/square-content";
import {packageTask} from "../src/lib/content-packages";
import {readPackageAssets} from "../src/lib/content-package-assets";
import {squareSnapshot,nextSquareReview} from "../src/lib/square-model";
import {automaticPoints} from "../src/lib/works";
const p=contentPackage("9231-stats-nonparam");
test("Further Statistics: all 27 owner tasks, 52 parts, four lessons, no new assets",async()=>{
 const written=p.questions.filter(q=>q.collection==="exam");assert.equal(written.length,27);assert.equal(written.reduce((sum,q)=>sum+q.parts.length,0),52);
 assert.equal(written.reduce((sum,q)=>sum+q.marks,0),227);assert.equal(written.filter(q=>q.provenance).length,27);
 assert.equal(p.source.supplied,27);assert.deepEqual(p.source.held,[]);assert.equal(p.lessons.length,4);
 assert.equal(p.assets?.length??0,0);assert.equal((await readPackageAssets(p)).length,0);
 for(const q of written){const task=packageTask(p,q);assert(task.parts.every(part=>part.kind==="MANUAL"));assert(task.assets.every(asset=>asset.role==="SOLUTION"));}
 assert.equal(p.course.slug,"maths4u-9231-statistics");
});
test("Non-parametric: exact signs, all ranks, paired thresholds and MF19 reflection",()=>{
 const get=(id:string)=>({...p.questions.find(q=>q.id==="M4U-9231-NP-"+id)!,provenance:undefined});
 assert(gradeSquare(get("S11"),{n:"10",positive:"1",negative:"9",p:"22/1024"}).correct);
 assert(!gradeSquare(get("S11"),{n:"10",positive:"1",negative:"9",p:"11/1024"}).correct);
 assert(gradeSquare(get("W11"),{r1:"1",r2:"4",r3:"2",r4:"3",wp:"6",wm:"4",T:"4"}).correct);
 assert(!gradeSquare(get("W11"),{r1:"1",r2:"4",r3:"2",r4:"3",wp:"6",wm:"4"}).correct);
 assert(gradeSquare(get("P11"),{d1:"-2/5",d2:"6/5",d3:"-9/10",d4:"5/2",wp:"7",wm:"3"}).correct);
 assert(gradeSquare(get("R11"),{ra:"14",rb:"14",reflected:"10",W:"10"}).correct);
 assert(!gradeSquare(get("R11"),{ra:"14",rb:"14",reflected:"10",W:"14"}).correct);
 const q=get("S11"),part=packageTask(p,q).parts[3],frozen={...part,acceptedAnswers:part.acceptedAnswers.map(value=>({value})),numericAnswer:null,options:[]};
 assert.equal(automaticPoints(frozen as never,{value:"22/1024"},q.id),1);assert.equal(automaticPoints(frozen as never,{value:"11/1024"},q.id),0);
});
test("Non-parametric: every complete key, field omission, rendering, rubric and review family",()=>{
 for(const l of p.lessons){
  const topic=packageTopic(l.id)!,dto=squarePublicLesson(topic);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=="exam").length,8);
  assert(dto.questions.filter(q=>q.collection==="exam").length>=2);
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
