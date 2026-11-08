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

const p=contentPackage('9709-p1-series');
test('Series preserves lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_series_arithmetic','orig_series_geometric','orig_series_trig_arithmetic','orig_series_trig_geometric','orig_series_applications']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-P1-SERIES-SOURCE-AUDIT-20261108.json','utf8'));
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

test('paired GP signs, strict integer boundaries, convergence and payment timing are checked exactly',()=>{
  const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-P1-SR-CHECK-'+suffix)!;
  const paired=q('GEOMETRIC-2-0').fields[0];assert(checkExact(paired,'(-24,-1/2);(24,1/2)'));assert(!checkExact(paired,'(24,1/2)'));assert(!checkExact(paired,'(-24,1/2);(24,-1/2)'));
  const index=q('ARITHMETIC-4-0');assert(checkExact(index.fields[0],'8'));assert(!checkExact(index.fields[0],'7'));assert(!checkExact(index.fields[0],'7.5'));
  const tail=q('GEOMETRIC-4-0').fields[2];assert(checkExact(tail,'-1/8'));assert(!checkExact(tail,'1/8'));
  const domain=q('GP_CONDITIONS-3-0').fields[0];assert(checkExact(domain,'(0,pi/3)'));assert(!checkExact(domain,'(0,pi/3]'));
  const allowed=q('AP_CONDITIONS-3-0').fields[1];assert(checkExact(allowed,'{0}'));assert(!checkExact(allowed,'{0,2}'));assert(!checkExact(allowed,'{2}'));
  const model=q('ARITHMETIC-3-0').fields[0];assert(checkExact(model,'2*n+2*n+1'));assert(!checkExact(model,'4*n+3'));
  const deposit=q('APPLICATIONS-2-0');assert(checkExact(deposit.fields[0],'3'));assert(checkExact(deposit.fields[1],'1560.80'));assert(!checkExact(deposit.fields[1],'1530.20'));
});

test('216 responsive SVG placements retain 207 immutable files and protected solution roles',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,216);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,207);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,16);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,200);
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,207);
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,216);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),shared=conflicting.assets!.find(a=>conflicting.assets!.filter(b=>b.file_id===a.file_id).length>1)!;shared.width++;
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false);
  const responsive=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-label="Discrete progression"><circle cx="5" cy="5" r="2"/></svg>');
  validatePackageSvg(responsive,10,10);assert.throws(()=>validatePackageSvg(responsive,11,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/series/partial-sums.svg" alt="Partial sums"></p>').includes('partial-sums.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,6);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});
