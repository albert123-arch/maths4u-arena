import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { contentPackage, packageTopic } from '../src/lib/content-package-content';
import { contentPackageSchema } from '../src/lib/content-package-schema';
import { readPackageAssets } from '../src/lib/content-package-assets';
import { validatePackageSvg } from '../src/lib/content-package-svg';
import { squarePublicLesson, gradeSquare, questionsForTopic, squareHelp, squareMarkingRows } from '../src/lib/square-content';
import { quadraticTopics, squareSnapshot, nextSquareReview } from '../src/lib/square-model';
import { packageTask } from '../src/lib/content-packages';
import {publicLearningTopic} from '../src/lib/public-learning-topic';

const p=contentPackage('9709-p1-quadratics');
const revisedStudy: Record<string,{count:number;first:string;last:string}> = {
  equations: { count: 7, first: 'What are we trying to find?', last: 'Fractions, reciprocals and real situations' },
  square: { count: 10, first: 'What does completing the square do?', last: 'Restricted domains can change the range' },
  discriminant: { count: 11, first: 'What does the discriminant tell you?', last: 'Positive or negative for all real x' },
  inequalities: { count: 11, first: 'An inequality asks where, not just where zero occurs', last: 'Build the condition, then interpret the answer' },
  simultaneous: { count: 9, first: 'One solution is a matching pair', last: 'Translate the conditions, then interpret the pairs' },
};
test('old lessons remain available until the exact new package is published',async()=>{
  const id=p.lessons[0].id,old=quadraticTopics[0];
  assert.deepEqual(await publicLearningTopic(id,async()=>null),old);
  assert.deepEqual(await publicLearningTopic(id,async()=>({state:'DRAFT',version:p.version,fingerprint:''})),old);
  assert.deepEqual(await publicLearningTopic(id,async()=>({state:'PUBLISHED',version:'0.9.0',fingerprint:''})),old);
  const fingerprint=createHash('sha256').update(JSON.stringify(p)).digest('hex');
  assert.equal((await publicLearningTopic(id,async()=>({state:'PUBLISHED',version:p.version,fingerprint})))?.packageKey,p.key);
});
test('Quadratics reuses all five canonical lessons and keeps every source part and mark', async()=>{
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);
  assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  assert.deepEqual(p.lessons.map(l=>l.id),quadraticTopics.map(t=>t.lessonId));
  const source=JSON.parse(await fs.readFile('docs/ARENA-9709-P1-QUADRATICS-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const raw=source.mapping.find((r:{uid:string})=>r.uid===q.id);assert(raw);
    assert.equal(hash(q.answer_html),raw.answerSha256);
    assert.equal(hash(q.solution_html.replace(/<p><img[\s\S]*$/,'')),raw.solutionSha256);
    assert.equal(q.marks,raw.marks);assert.equal(hash(q.hint_html),raw.hintSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),raw.criteriaSha256);
    assert.equal(packageTask(p,q).parts[0].kind,'MANUAL');assert.match(q.prompt_html,/<ol class="parts" type="a">/);
  }
  const invalid=structuredClone(p);invalid.questions.find(q=>q.variant_index===0)!.variant_index=1;
  assert.equal(contentPackageSchema.safeParse(invalid).success,false);
});

test('all complete quick answers work; wrong or missing fields fail; review changes the numbers',()=>{
  for(const l of p.lessons){
    const topic=packageTopic(l.id)!,dto=squarePublicLesson(topic),qs=questionsForTopic(l.id);
    const study = revisedStudy[l.key];
    assert.equal(dto.examples.length,study?.count??4);assert.equal(qs.filter(q=>q.collection!=='exam').length,8);
    if(study){
      assert.equal(dto.notes.match(/<h2>/g)?.length,6);
      assert(dto.notes.startsWith('<h2>'+study.first+'</h2>'));
      assert(dto.notes.includes('<h2>'+study.last+'</h2>'));
      assert(!/<script\b|<style\b|data-panel|data-math|m4-graph-explorer/.test(dto.notes));
      assert.equal(dto.version,topic.version);
    }
    if(l.key==='square'){
      assert(dto.notes.includes('/assets/original/quadratics/restricted-domain.svg'));
      assert(dto.examples.find(e=>e.title==='Combine the useful forms')?.solution.includes('/assets/original/quadratics/square-sketch.svg'));
    }
    if(l.key==='discriminant'){
      assert(dto.notes.includes('/assets/original/quadratics/discriminant-root-cases.svg'));
      assert(dto.notes.includes('/assets/original/quadratics/parabola-line-intersections.svg'));
      assert.equal(dto.notes.match(/<div class="table-scroll"><table>/g)?.length,3);
      assert(dto.examples.find(e=>e.title==='Classify a whole family')?.solution.includes('<div class="table-scroll"><table>'));
    }
    if(l.key==='inequalities'){
      assert(dto.notes.includes('/assets/original/quadratics/inequality-sign-interval.svg'));
      assert(dto.notes.includes('/assets/original/quadratics/inequality-domain-overlap.svg'));
      const product=dto.examples.find(e=>e.title==='A product that must be negative');
      const hole=dto.examples.find(e=>e.title==='Cancelling leaves a hole');
      assert(product);
      assert(product.solution.includes('<div class="table-scroll"><table>'));
      assert(product.solution.includes('x\\in(-5,2)'));
      assert(hole);
      assert(hole.solution.includes('<div class="table-scroll"><table>'));
      assert(hole.solution.includes('(-\\infty,2)\\cup(2,3]'));
    }
    if(l.key==='simultaneous'){
      assert(dto.notes.includes('/assets/original/quadratics/simultaneous-matching-pairs.svg'));
      assert(dto.notes.includes('/assets/original/quadratics/simultaneous-tangency-cases.svg'));
      const first=dto.examples.find(e=>e.title==='A line and a parabola');
      assert(first);
      assert(first.solution.includes('<div class="table-scroll"><table>'));
      assert(first.solution.includes('(-1,1)'));
      assert(first.solution.includes('(4,6)'));
    }
    assert.equal(dto.navigation?.directionTitle,'AS & A Level');
    const raw=JSON.stringify(dto);for(const key of ['"expected"','ownerProvenance','source_problem_id','source_exam','sourceSha256','archiveTaskId'])assert(!raw.includes(key),key);
    for(const text of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution]),...dto.questions.map(q=>q.prompt)])assert(!text.includes('katex-error'),l.key);
    for(const q of qs){
      assert(!squareHelp(q,'solution').includes('katex-error'),q.id);assert.equal(squareMarkingRows(q).reduce((n,r)=>n+r.marks,0),q.marks);
      if(!q.fields.length)continue;
      const answers=Object.fromEntries(q.fields.map(f=>[f.key,f.expected as string]));assert(gradeSquare(q,answers).correct,JSON.stringify({uid:q.id,result:gradeSquare(q,answers)}));
      for(const f of q.fields){const wrong={...answers,[f.key]:f.type==='choice'?'A':'98765'};assert(!gradeSquare(q,wrong).correct,q.id);const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);}
    }
    const q=dto.questions.find(q=>q.collection==='short')!,state=squareSnapshot([{eventKey:'test',uid:q.uid,family:q.family,correct:false,helpUsed:false,at:1000}]);
    const fresh=nextSquareReview(dto.questions,state,1000)[0];assert.equal(fresh.family,q.family);assert.notEqual(fresh.uid,q.uid);assert.equal(fresh.collection,'variant');
  }
  const q=p.questions.find(q=>q.fields.some(f=>f.key==='roots')&&q.lesson==='equations')!;
  assert(!gradeSquare({...q,provenance:undefined},{roots:'0'}).correct,'one root is an incomplete answer');
});

test('vectors are immutable private assets; active SVG, remote references and entities are rejected',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,60);
  assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,56);
  const safe=files[0].data;validatePackageSvg(safe,680,470);
  const svg=(body:string)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="680" height="470">'+body+'</svg>');
  for(const body of ['<script>alert(1)</script>','<image href="https://evil.test/x"/>','<text onclick="alert(1)">x</text>','<foreignObject/>','<path fill="url(https://evil.test/a)"/>','<style>@import "https://evil.test";</style>'])assert.throws(()=>validatePackageSvg(svg(body),680,470));
  assert.throws(()=>validatePackageSvg(Buffer.concat([Buffer.from('<!DOCTYPE svg>'),safe]),680,470));
  assert.throws(()=>validatePackageSvg(safe,1,1));
});
