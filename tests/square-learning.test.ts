import test from "node:test";
import assert from "node:assert/strict";
import { checkExact } from "../src/lib/exact-answer";
import { squareQuestions, gradeSquare, squarePublicLesson, squareHelp } from "../src/lib/square-content";
import { squareSnapshot, nextSquareReview } from "../src/lib/square-model";
import { completeAnswers } from "./quadratics-answers";
function check(type: string, expected: string, input: string, variables?: string[]) {
  return checkExact({ key: "answer", label: "Answer", type, expected, variables }, input);
}
test("all 30 original questions: complete key accepted, each omitted or wrong field rejected", () => {
  for (const q of squareQuestions) {
    const answers = completeAnswers(q);
    assert.equal(gradeSquare(q, answers).correct,true,q.id);
    for (const f of q.fields) {
      const missing = {...answers}; delete missing[f.key];
      assert.equal(gradeSquare(q,missing).correct,false,q.id+":"+f.key);
      const wrong = f.type === "choice" ? Object.keys(f.options!).find(k=>k!==f.expected)! : f.type === "set" ? "{999}" : f.type === "pairs" ? "(999,999)" : "999";
      assert.equal(gradeSquare(q,{...answers,[f.key]:wrong}).correct,false,q.id+":"+f.key);
    }
  }
});
test("exact fractions, equivalent surds, polynomial identities, complete sets and boundaries",()=>{
  for(const [type,expected,input,vars] of [
    ["number","-33/4","-8.25",[]],["number","sqrt(22)/2","sqrt(11/2)",[]],
    ["number","sqrt(3)/3","1/sqrt(3)",[]],["number","sqrt(2)-1","1/(sqrt(2)+1)",[]],
    ["number","0","sqrt(8)-2sqrt(2)",[]],
    ["polynomial","2*x^2+12*x+14","2(x+3)^2-4",["x"]],
    ["polynomial","4+h-h^2","-(h-2)*(h+1)+2",["h"]],
    ["set","{2-sqrt(21)/3,2+sqrt(21)/3}","{2+sqrt(7/3),2-sqrt(7/3)}",[]],
    ["set","[-9,7) U {9}","{9} U [-9,7)",[]],["set","(3,5]","(3,4) U [4,5]",[]],
    ["pairs","(-1,-3);(-1,1);(2,0);(2,4)","(2,4);(-1,1);(-1,-3);(2,0)",[]],
    ["set","empty","{}",[]],
  ] as [string,string,string,string[]][]) assert(check(type,expected,input,vars),input);
  for(const [type,expected,input] of [
    ["set","(3,5]","[3,5]"],["set","(3,5]","(3,5)"],["set","{1,4}","{1}"],
    ["set","[-9,7) U {9}","[-9,9]"],["number","sqrt(2)","1.41421356"],
    ["pairs","(-1,3);(2,4)","(-1,4);(2,3)"],["polynomial","x^2","x"],
  ]) assert.equal(check(type,expected,input,type==="polynomial"?["x"]:[]),false,input);
  for(const input of ["1/0","sqrt(-1)","process.exit()","2^999","NaN","Infinity","x/x", "(".repeat(30)+"1"+")".repeat(30), "1".repeat(401)]) assert.throws(()=>check("number","1",input),input);
});
test("no practice answers in the public projection; professional formula rendering",()=>{
  const lesson=squarePublicLesson(), s=JSON.stringify(lesson);
  assert(!s.includes('"expected"')); assert(!s.includes('"answer_html"')); assert(!s.includes('"solution_html"'));
  assert(lesson.notes.includes('class="katex"'));
  for(const html of [lesson.notes,...lesson.examples.flatMap(e=>[e.question,e.solution]),...lesson.questions.map(q=>q.prompt),...squareQuestions.flatMap(q=>[squareHelp(q,"hint"),squareHelp(q,"solution")])]) assert(!html.includes('class="katex-error"'),html.slice(0,90));
});
test("fresh review, help, same-day retry and later interval",()=>{
  const qs=squarePublicLesson().questions, a=qs.find(q=>q.uid.endsWith("S-CS01"))!, b=qs.find(q=>q.uid.endsWith("V-CS01"))!, at=100000;
  const e={eventKey:"a",uid:a.uid,family:a.family,correct:false,helpUsed:false,at};
  let s=squareSnapshot([e]); assert.equal(nextSquareReview(qs,s,at)[0].uid,b.uid);
  s=squareSnapshot([e,{...e,eventKey:"b",uid:b.uid,correct:true,at:at+100}]);
  assert.equal(s.states[a.family].streak,1);assert.equal(nextSquareReview(qs,s,at+101).length,0);
  s=squareSnapshot([...s.evidence,{...e,eventKey:"c",correct:true,at:at+200}]);
  assert.equal(s.states[a.family].streak,1);
  s=squareSnapshot([...s.evidence,{...e,eventKey:"d",correct:true,at:s.states[a.family].dueAt}]);
  assert.equal(s.states[a.family].streak,2);
  s=squareSnapshot([...s.evidence,{...e,eventKey:"e",correct:true,helpUsed:true,at:s.states[a.family].checkedAt+1}]);assert.equal(s.states[a.family].streak,0);
});
test("older imported mistakes preserve newer account progress; imports cannot build mastery",()=>{
  const base={eventKey:"a",uid:"q1",family:"f",correct:true,helpUsed:false,at:1000};
  let s=squareSnapshot([base,{...base,eventKey:"b",correct:false,at:100,imported:true}]);
  assert.equal(s.states.f.correct,true);
  s=squareSnapshot([{...base,imported:true},{...base,eventKey:"c",at:1000+8*86400000,imported:true}]);
  assert.equal(s.states.f.streak,1);
});
test("expanded-form request requires expanded terms",()=>{
  const q=squareQuestions.find(q=>q.id.endsWith("S-CS10"))!;
  const answers=completeAnswers(q);
  assert.equal(gradeSquare(q,{...answers,expanded:"2(x+3)^2-4"}).correct,false);
  assert.equal(gradeSquare(q,{...answers,expanded:"(14 + 12x + 2x^2)"}).correct,true);
});
