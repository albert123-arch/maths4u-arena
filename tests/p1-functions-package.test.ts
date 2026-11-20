import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {contentPackage,packageTopic} from '../src/lib/content-package-content';
import {readPackageAssets} from '../src/lib/content-package-assets';
import {squarePublicLesson,questionsForTopic,gradeSquare,squareHelp,squareMarkingRows} from '../src/lib/square-content';
import {squareSnapshot,nextSquareReview} from '../src/lib/square-model';
import {publicLearningTopic} from '../src/lib/public-learning-topic';
import {checkExact} from '../src/lib/exact-answer';
import {packageTask} from '../src/lib/content-packages';
import {automaticPoints} from '../src/lib/works';
import {gradeStudyCheck, studyRevision} from '../src/lib/authored-study';
import teaching from '../content/original/9709-p1/functions-study.json';

const p=contentPackage('9709-p1-functions');
const firstLesson = "orig_functions_inverse";
test('Functions reuses the five existing lessons and preserves all 200 authored written records',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_functions_inverse','orig_functions_composite','orig_functions_restricted_inverse','orig_functions_inverse_graphs','orig_functions_transformations']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);
  assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-P1-FUNCTIONS-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.answerSha256);assert.equal(hash(q.hint_html),row.hintSha256);
    assert.equal(hash(q.solution_html.replace(/<p><img[\s\S]*$/,'')),row.solutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined,'new code alone cannot take over the existing generic lesson');
});

test('all complete function answers work, wrong fields and missing restrictions fail, review uses a fresh question',()=>{
  for(const l of p.lessons){
    const topic=packageTopic(l.id)!,dto=squarePublicLesson(topic),qs=questionsForTopic(l.id);
    assert.equal(dto.examples.length,l.id===firstLesson ? 7 : 4);
    assert.equal(!!dto.study,l.id===firstLesson);
    assert.equal(qs.filter(q=>q.collection!=='exam').length,8);
    for(const key of ['"expected"','source_problem_id','source_exam','ownerProvenance','archiveTaskId'])assert(!JSON.stringify(dto).includes(key),key);
    for(const html of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution]),...dto.questions.map(q=>q.prompt)])assert(!html.includes('katex-error'),l.id);
    for(const q of qs){
      assert(!squareHelp(q,'solution').includes('katex-error'),q.id);assert.equal(squareMarkingRows(q).reduce((n,r)=>n+r.marks,0),q.marks);
      if(!q.fields.length)continue;
      const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(';'):f.expected]));
      assert(gradeSquare(q,answers).correct,JSON.stringify({uid:q.id,result:gradeSquare(q,answers)}));
      for(const f of q.fields){const wrong={...answers,[f.key]:f.type==='choice'?Object.keys(f.options!).find(k=>k!==f.expected)!:'98765'};assert(!gradeSquare(q,wrong).correct,q.id);const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);}
    }
    const q=dto.questions.find(q=>q.collection==='short')!,snapshot=squareSnapshot([{eventKey:'test',uid:q.uid,family:q.family,correct:false,helpUsed:false,at:1000}]);
    const fresh=nextSquareReview(dto.questions,snapshot,1000)[0];assert.equal(fresh.family,q.family);assert.notEqual(fresh.uid,q.uid);assert.equal(fresh.collection,'variant');
  }
});

test("the first Functions lesson gives a worked example and a fresh check in each section", () => {
  const source = teaching.orig_functions_inverse;
  const dto = squarePublicLesson(packageTopic(firstLesson)!);
  assert(dto.study);
  assert.equal(dto.study.sections.length, 7);
  assert.equal(dto.study.sections.at(-1)?.level, "extension");
  const rendered = [...dto.examples.flatMap(e => [e.question, ...(e.steps ?? [])]),
    ...Object.values(studyRevision(firstLesson)!)];
  let checks = 0;
  for (const section of dto.study.sections) {
    assert(section.blocks.some(b => b.kind === "example"));
    assert(section.blocks.some(b => b.kind === "check"));
    rendered.push(section.intro, ...section.blocks.flatMap(b => "html" in b ? [b.html] : b.kind === "check" ? [b.prompt, b.hint] : []));
  }
  assert(rendered.every(html => !html.includes("katex-error")));
  for (const section of source.sections) for (const block of section.blocks) {
    if (block.kind !== "check" || !block.field) continue;
    const expected = block.field.expected;
    const answer = Array.isArray(expected) ? expected.join(";") : expected;
    const result = gradeStudyCheck(firstLesson, block.id!, answer);
    assert.equal(result?.status, "correct", block.id);
    assert.doesNotMatch(result.feedback, /katex-error/);
    checks++;
  }
  assert.equal(checks, 10);
  assert.equal(gradeStudyCheck("orig_functions_composite", "range-of-decreasing-line", "[2,14)"), undefined);
});

test("Functions checks accept full ranges, exclusions and inverse pairs in exam notation", () => {
  const grade = (id: string, answer: string) => gradeStudyCheck(firstLesson, id, answer)!;
  for (const [id, answers] of [
    ["range-of-decreasing-line", ["2 ≤ g(x) < 14", "14 > y >= 2", "[2,14)"]],
    ["root-and-denominator-domain", ["−5 ≤ x ≤ 2 and x ≠ −3", "−3 != x and x>=-5 and x<=2", "[-5,-3) U (-3,2]"]],
    ["same-output-two-inputs", ["x = −3 or x = −1", "{-3,-1}"]],
    ["reverse-all-pairs", ["(3,−4), (0,−1), (8,5)", "x=8,y=5; x=3,y=-4; x=0,y=-1"]],
    ["linear-inverse-rule", ["(10-x)/4", "5/2-x/4"]],
    ["linear-inverse-domain", ["2 ≤ x < 10", "[2,10)"]],
    ["fraction-inverse-rule", ["4x+2;x-1", "8x+4;2x-2"]],
    ["fraction-inverse-domain", ["x ≠ 1", "x != 1", String.raw`x \ne 1`, "(-∞,1) ∪ (1,∞)"]],
  ] as const) {
    for (const answer of answers) assert.equal(grade(id,answer).status, "correct", id + " / " + answer);
  }
  for (const [id, answer, hint] of [
    ["range-of-decreasing-line", "2 ≤ x < 14", /output values.*domain/],
    ["range-of-decreasing-line", "(2,14]", /included input/],
    ["root-and-denominator-domain", "[-5,2]", /denominator is zero/],
    ["same-output-two-inputs", "x = -1", /other|negative square root/],
    ["undo-not-reciprocal", "1/11", /reciprocal/],
    ["reverse-all-pairs", "(3,-4),(0,-1)", /Reverse each pair/],
    ["linear-inverse-domain", "(0,2]", /outputs of/],
    ["fraction-inverse-domain", "x != 4", /excluded from the original inputs/],
  ] as const) {
    const wrong = grade(id,answer);
    assert.equal(wrong.status, "retry", id);
    assert.match(wrong.feedback, hint);
  }
  assert.equal(grade("fraction-inverse-domain","x ≠").status,"format");
  assert.equal(grade("fraction-inverse-domain","x ≠ 1 ≠ 2").status,"format");
});

test('fractional answers accept equivalent whole ratios and interval checks respect both endpoints',()=>{
  const rational=p.questions.find(q=>q.lesson==='inverse'&&q.fields[0]?.type==='ratio')!.fields[0];
  assert(checkExact(rational,'6*x+10;2*x-4'));assert(!checkExact(rational,'3*x+5;x-3'));
  const domain=p.questions.find(q=>q.id==='M4U-9709-P1-FN-CHECK-RESTRICTED-4-0')!.fields.find(f=>f.key==='domain')!;
  assert(checkExact(domain,'(3,inf)'));assert(!checkExact(domain,'[3,inf)'));assert(!checkExact(domain,'(-inf,inf)'));
});

test('all 76 SVG files preserve immutable bytes and separate 32 statements from 44 solutions',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,76);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,32);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,44);
});

test('mixed quick checks retain real MCQ options alongside free answer parts in teacher previews and assignments',()=>{
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,10);
  for(const q of mixed){const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){
        assert.equal(part.options.length,Object.keys(f.options!).length);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));
        const assigned={...part,options:part.options.map((o,n)=>({...o,id:String(n)}))};
        assert.equal(automaticPoints(assigned as never,{optionId:assigned.options.find(o=>o.correct)!.id,value:''}),1);
        assert.equal(automaticPoints(assigned as never,{optionId:assigned.options.find(o=>!o.correct)!.id,value:''}),0);
      }
    }
  }
});
