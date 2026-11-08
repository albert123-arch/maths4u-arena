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

const p=contentPackage('9709-s1-distributions');
test('Probability distributions has distinct course and lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_9709_s1_dist_tables_parameters','orig_9709_s1_dist_finite_experiments','orig_9709_s1_dist_without_replacement','orig_9709_s1_dist_conditional_processes','orig_9709_s1_dist_inverse_applications']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-DISTRIBUTIONS-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.projectedAnswerSha256);assert.equal(hash(q.hint_html),row.projectedHintSha256);
    assert.equal(hash(q.solution_html),row.projectedSolutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined);
});

test('weighted moments, physical multiplicity, stopping positions and conditional tables reject incomplete reasoning',()=>{
 assert.equal(p.chapter.position,5);assert.equal(p.course.slug,'maths4u-9709-s1');
 const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-S1-DIST-CHECK-'+suffix)!;
 const weights=q('TABLES_PARAMETERS-1-0');assert(checkExact(weights.fields[0],'1/4'));assert(checkExact(weights.fields[1],'1'));assert(checkExact(weights.fields[2],'9/2'));assert(!checkExact(weights.fields[2],'11/2'));
 const sum=q('FINITE_EXPERIMENTS-1-0');assert(checkExact(sum.fields[0],'2/9'));assert(!checkExact(sum.fields[0],'1/6'));
 const physical=q('WITHOUT_REPLACEMENT-2-0');assert(checkExact(physical.fields[0],'6'));assert(checkExact(physical.fields[1],'1/3'));assert(!checkExact(physical.fields[1],'1/4'));
 const first=q('WITHOUT_REPLACEMENT-3-0');assert(checkExact(first.fields[0],'4'));assert(checkExact(first.fields[2],'2'));assert(!checkExact(first.fields[2],'1'));
 const cond=q('CONDITIONAL_PROCESSES-3-0');assert(checkExact(cond.fields[0],'2/3'));assert(checkExact(cond.fields[1],'1/4'));assert(checkExact(cond.fields[2],'3/2'));assert(checkExact(cond.fields[3],'3/4'));assert(!checkExact(cond.fields[2],'1'));
 const transfer=q('CONDITIONAL_PROCESSES-2-0');assert(checkExact(transfer.fields[3],'8/11'));assert(!checkExact(transfer.fields[3],'2/3'));
 const affine=q('INVERSE_APPLICATIONS-1-0');assert(checkExact(affine.fields[0],'7'));assert(checkExact(affine.fields[1],'3'));assert(checkExact(affine.fields[2],'1'));assert(checkExact(affine.fields[4],'19/4'));assert(!checkExact(affine.fields[4],'19/16'));
 const help=squareHelp(questionsForTopic(p.lessons[3].id).find(q=>q.id===cond.id)!,'solution');assert(help.includes('p_H'));assert(cond.solution_html.includes(String.raw`\mathrm E(X\mid H)`));assert(cond.solution_html.includes(String.raw`\operatorname{Var}(X\mid H)`));
 const fee=q('INVERSE_APPLICATIONS-3-0');assert(checkExact(fee.fields[0],'7/3'));assert(checkExact(fee.fields[1],'1/3'));assert(!checkExact(fee.fields[1],'7/3'));
});

test('the selected fifty families retain private provenance and do not replace the other sixty-four source records',async()=>{
 const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-DISTRIBUTIONS-SOURCE-AUDIT-20261108.json','utf8'));
 assert.equal(audit.source_scope.source_records_in_chapter,114);assert.equal(audit.source_scope.selected_source_records,50);assert.equal(audit.source_scope.all_source_records_rewritten,false);
 assert.equal(new Set(audit.mapping.map((r:{family:number})=>r.family)).size,50);assert.equal(audit.mapping.length,200);
 const applied=p.questions.find(q=>q.prompt_html.includes('Mixed-topic prerequisite'))!;assert(applied);assert(applied.prompt_html.includes('Combinations: physical subsets'));assert(!applied.prompt_html.includes('combinations_5.2'));
 const dto=squarePublicLesson(packageTopic(p.lessons[0].id)!);for(const key of ['source_uid','source_attribution_status','retained_skills','checkSpecs'])assert(!JSON.stringify(dto).includes(key));
 assert.equal(p.questions.filter(q=>q.collection==='exam').reduce((sum,q)=>sum+q.marks,0),1556);
 assert(p.lessons.every(l=>l.before.includes('named binomial and geometric models follow')));
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

test('32 immutable solution SVGs and separate solution roles',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,32);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,32);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,0);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,32);
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,32);
  for(const {asset} of files){
    const q=p.questions.find(q=>q.id===asset.question_uid)!;
    const html=asset.role==='STATEMENT'?q.prompt_html:q.solution_html;
    assert(html.includes('/api/files/'+asset.file_id));
    if(asset.role==='SOLUTION')assert(!q.prompt_html.includes(asset.file_id));
  }
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,32);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),extra={...conflicting.assets![0],question_uid:conflicting.questions.find(q=>q.id!==conflicting.assets![0].question_uid)!.id};extra.width++;conflicting.assets!.push(extra);
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false);
  const responsive=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-label="Discrete progression"><circle cx="5" cy="5" r="2"/></svg>');
  validatePackageSvg(responsive,10,10);assert.throws(()=>validatePackageSvg(responsive,11,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/s1-distributions/sum-grid.svg" alt="Available gaps"></p>').includes('sum-grid.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,6);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});
