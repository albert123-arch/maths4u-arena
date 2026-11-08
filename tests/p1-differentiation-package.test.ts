import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {contentPackage,packageTopic} from '../src/lib/content-package-content';
import {readPackageAssets} from '../src/lib/content-package-assets';
import {validatePackageSvg} from '../src/lib/content-package-svg';
import {squarePublicLesson,questionsForTopic,gradeSquare,squareHelp,squareMarkingRows} from '../src/lib/square-content';
import {squareSnapshot,nextSquareReview} from '../src/lib/square-model';
import {publicLearningTopic} from '../src/lib/public-learning-topic';
import {checkExact} from '../src/lib/exact-answer';
import {packageTask} from '../src/lib/content-packages';
import {contentPackageSchema} from '../src/lib/content-package-schema';
import {renderContent} from '../src/lib/content';

const p=contentPackage('9709-p1-differentiation');
test('Differentiation preserves lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_differentiation_derivatives','orig_differentiation_tangents_normals','orig_differentiation_curve_behaviour','orig_differentiation_rates','orig_differentiation_optimisation']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-P1-DIFFERENTIATION-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.answerSha256);assert.equal(hash(q.hint_html),row.hintSha256);
    assert.equal(hash(q.solution_html.replace(/<p><img[\s\S]*$/,'')),row.solutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined);
});

test('every complete quick answer works; missing and incorrect fields fail; review selects a fresh variant',()=>{
  for(const l of p.lessons){
    const dto=squarePublicLesson(packageTopic(l.id)!),qs=questionsForTopic(l.id);
    assert.equal(dto.examples.length,4);assert.equal(qs.filter(q=>q.collection!=='exam').length,8);
    assert.equal(qs.filter(q=>q.collection==='exam'&&q.variant_index===0).length,10);
    for(const forbidden of ['"expected"','source_problem_id','source_exam','ownerProvenance','archiveTaskId'])assert(!JSON.stringify(dto).includes(forbidden),forbidden);
    for(const html of [dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution]),...dto.questions.map(q=>q.prompt)])assert(!html.includes('katex-error'),l.id);
    for(const q of qs){
      assert(!squareHelp(q,'solution').includes('katex-error'),q.id);assert.equal(squareMarkingRows(q).reduce((n,r)=>n+r.marks,0),q.marks);
      for(const raw of [q.answer_html,q.hint_html,...(q.parts??[]).flatMap(part=>part.marking_criteria.map(c=>c.description_html))])assert(!renderContent(raw).includes('katex-error'),q.id);
      if(!q.fields.length)continue;
      const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(';'):f.expected]));
      assert(gradeSquare(q,answers).correct,JSON.stringify({uid:q.id,result:gradeSquare(q,answers)}));
      for(const f of q.fields){const wrong={...answers,[f.key]:f.type==='choice'?Object.keys(f.options!).find(k=>k!==f.expected)!:'98765'};assert(!gradeSquare(q,wrong).correct,q.id);const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);}
    }
    const q=dto.questions.find(q=>q.collection==='short')!,snapshot=squareSnapshot([{eventKey:'test',uid:q.uid,family:q.family,correct:false,helpUsed:false,at:1000}]);
    const fresh=nextSquareReview(dto.questions,snapshot,1000)[0];assert.equal(fresh.family,q.family);assert.notEqual(fresh.uid,q.uid);assert.equal(fresh.collection,'variant');
  }
});

test('complete derivatives, line equations, coordinate sets, domains and signed rates are checked',()=>{
  const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-P1-DF-CHECK-'+suffix)!;
  const chain=q('DERIVATIVES-4-0').fields[0];assert(checkExact(chain,'8*(2*x-1)^3+3'));assert(!checkExact(chain,'4*(2*x-1)^3+3'));
  const rational=q('DERIVATIVES-3-0').fields[0];assert(checkExact(rational,'3*u^2+2;2*u^3'));assert(checkExact(rational,'6*u^2+4;4*u^3'));assert(!checkExact(rational,'3*u^2+2;u^2'));
  const domain=q('DERIVATIVES-3-0').fields[2];assert(checkExact(domain,'(0,inf)'));assert(!checkExact(domain,'[0,inf)'));
  const normal=q('TANGENTS-2-0').fields[1];assert(checkExact(normal,'x=2'));assert(checkExact(normal,'2*x=4'));assert(!checkExact(normal,'y=2'));assert(!checkExact(normal,'0=0'));
  const points=q('TANGENTS-3-0').fields[0];assert(checkExact(points,'(2,2);(-2,-2)'));assert(!checkExact(points,'(2,2)'));assert(!checkExact(points,'(2,-2);(-2,2)'));
  const sign=q('BEHAVIOUR-2-0').fields[1];assert(checkExact(sign,'(-1,1)'));assert(!checkExact(sign,'[-1,1]'));
  const rate=q('RATES-3-0').fields[1];assert(checkExact(rate,'-9/5'));assert(!checkExact(rate,'9/5'));
  const endpoint=q('OPTIMISATION-2-1');assert(checkExact(endpoint.fields[0],'(2,10)'));assert(!checkExact(endpoint.fields[0],'(3,11)'));
  const transform=q('OPTIMISATION-4-0').fields[0];assert(checkExact(transform,'3*x^2/4-3'));assert(!checkExact(transform,'3*x^2/2-6'));
});

test('228 SVG placements retain 212 immutable files and separate solution roles',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,228);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,212);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,28);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,200);
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,212);
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,228);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),extra={...conflicting.assets![0],question_uid:conflicting.questions.find(q=>q.id!==conflicting.assets![0].question_uid)!.id};extra.width++;conflicting.assets!.push(extra);
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false);
  const responsive=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-label="Discrete progression"><circle cx="5" cy="5" r="2"/></svg>');
  validatePackageSvg(responsive,10,10);assert.throws(()=>validatePackageSvg(responsive,11,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/differentiation/tangent-normal.svg" alt="Partial sums"></p>').includes('tangent-normal.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,8);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});
