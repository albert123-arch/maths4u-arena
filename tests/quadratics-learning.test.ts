import test from "node:test";
import assert from "node:assert/strict";
import { checkExact, type ExactField } from "../src/lib/exact-answer";
import { questionsForTopic, squarePublicLesson, gradeSquare, squareHelp } from "../src/lib/square-content";
import { quadraticTopics, nextSquareReview, squareSnapshot } from "../src/lib/square-model";
import { completeAnswers } from "./quadratics-answers";
test("all 152 original questions have complete, accepted keys; missing/wrong fields fail",()=>{
  let n=0;
  for(const t of quadraticTopics)for(const q of questionsForTopic(t.key)){
    n++;const answers=completeAnswers(q);
    assert.equal(gradeSquare(q,answers).correct,true,q.id+JSON.stringify(gradeSquare(q,answers)));
    for(const f of q.fields){const missing={...answers};delete missing[f.key];assert.equal(gradeSquare(q,missing).correct,false,q.id);
      const wrong=f.type==="choice"?Object.keys(f.options!).find(k=>k!==f.expected)!:f.type==="factors"?"x+999 ; x-999":f.type==="ratio"?"999 ; 1":f.type==="pairs"?"(999,999)":f.type==="set"||f.type==="integers"?"{999}":"999";
      assert.equal(gradeSquare(q,{...answers,[f.key]:wrong}).correct,false,q.id+f.key);
    }
  }assert.equal(n,152);
});
test("new answer formats compare exact meaning and preserve requested structure",()=>{
  const check=(f:Partial<ExactField>,input:string)=>checkExact({key:"q",label:"q",type:"number",expected:"0",...f},input);
  for(const input of ["(u-p);(u-1)","2u-2 ; (u-p)/2"])assert(check({type:"factors",variables:["u","p"],factor_variable:"u",expected:"u^2-(p+1)u+p"},input));
  assert(!check({type:"factors",variables:["u","p"],factor_variable:"u",expected:"u^2-(p+1)u+p"},"u^2-(p+1)u+p ; 1"));
  for(const input of ["5x^2-20x+15=0","x^2+3=4x","-x^2+4x-3"])assert(check({type:"equation",variables:["x"],expected:"x^2-4x+3"},input));
  assert(!check({type:"equation",variables:["x","k"],expected:"x^2-k*x+k+2"},"k*(x^2-k*x+k+2)=0"));
  assert(!check({type:"equation",variables:["x"],expected:"x^2-4x+3"},"0=0"));
  assert(check({type:"pairs",dimension:3,expected:"(-6,-2,13);(2,2,5)"},"(2,2,5);(-6,-2,13)"));
  assert(!check({type:"pairs",dimension:3,expected:"(-6,-2,13);(2,2,5)"},"(-6,2,5);(2,-2,13)"));
  assert(check({type:"pairs",expected:"empty"},"{}"));
  assert(check({type:"integers",expected:"{-1,0,1}"},"{2/2,-1,0}"));
  assert.throws(()=>check({type:"integers",expected:"{-1,0,1}"},"[-1,1]"));
  assert(!check({type:"integers",expected:"{-1,0,1}"},"{-1,0,1/2,1}"));
  assert(check({type:"ratio",variables:["k"],expected:["-k","k-2"]},"k ; 2-k"));
  assert(!check({type:"ratio",variables:["k"],expected:["-k","k-2"]},"-k*(k+1) ; (k-2)*(k+1)"));
});
test("each topic has notes, four examples, diagnostics, exact public fields and clean KaTeX",()=>{
  for(const t of quadraticTopics){const lesson=squarePublicLesson(t),qs=questionsForTopic(t.key);
    assert.equal(lesson.examples.length,4);assert.equal(lesson.questions.filter(q=>q.collection==="short").length,12);assert.equal(lesson.questions.filter(q=>q.collection==="variant").length,12);
    assert(lesson.questions.some(q=>q.collection==="diagnostic"));assert.equal(lesson.questions.filter(q=>q.collection==="exam").length,4);
    assert(!JSON.stringify(lesson).includes('"expected"'));
    for(const html of [lesson.notes,...lesson.examples.flatMap(e=>[e.question,e.solution]),...lesson.questions.map(q=>q.prompt),...qs.flatMap(q=>[squareHelp(q,"hint"),squareHelp(q,"solution")])])assert(!html.includes('class="katex-error"'),t.key+html.slice(0,200));
    const q=lesson.questions.find(q=>q.collection==="short")!,s=squareSnapshot([{eventKey:"a",uid:q.uid,family:q.family,correct:false,helpUsed:false,at:100}]);
    assert.equal(nextSquareReview(lesson.questions,s,100)[0].collection,"variant");
    for(const other of quadraticTopics.filter(x=>x.key!==t.key))assert.equal(nextSquareReview(squarePublicLesson(other).questions,s,100).length,0);
  }
});
