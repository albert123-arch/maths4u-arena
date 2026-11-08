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

const p=contentPackage('9709-s1-variation');
test('Measures of variation has distinct course and lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_9709_s1_var_raw_moments','orig_9709_s1_var_coded_totals','orig_9709_s1_var_reconstruction','orig_9709_s1_var_changes_combining','orig_9709_s1_var_frequency_synthesis']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-VARIATION-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.projectedAnswerSha256);assert.equal(hash(q.hint_html),row.projectedHintSha256);
    assert.equal(hash(q.solution_html),row.projectedSolutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined);
});

test('all feasible counts and mean signs, positive SDs, ordered pairs and exact quartiles are required',()=>{
 assert.equal(p.chapter.position,2);assert.equal(p.course.slug,'maths4u-9709-s1');
 const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-S1-VAR-CHECK-'+suffix)!;
 const counts=q('RECONSTRUCTION-1-0').fields[0];assert(checkExact(counts,'{10,5}'));assert(!checkExact(counts,'{5}'));assert(!checkExact(counts,'{5,10,15}'));
 const means=q('RECONSTRUCTION-2-1').fields[0];assert(checkExact(means,'{-6,6}'));assert(!checkExact(means,'{6}'));
 const scale=q('CODED_TOTALS-2-1');assert(checkExact(scale.fields[0],'14'));assert(checkExact(scale.fields[1],'18'));assert(checkExact(scale.fields[2],'3*sqrt(2)'));assert(!checkExact(scale.fields[2],'-3*sqrt(2)'));
 const quartiles=q('RAW_MOMENTS-2-0');assert(checkExact(quartiles.fields[1],'5/2'));assert(checkExact(quartiles.fields[2],'19/2'));assert(checkExact(quartiles.fields[3],'7'));assert(!checkExact(quartiles.fields[1],'3'));
 const fail=q('RECONSTRUCTION-4-0');assert(checkExact(fail.fields[0],'150'));assert(checkExact(fail.fields[1],'-5/3'));assert(checkExact(fail.fields[2],'B'));assert(!checkExact(fail.fields[2],'A'));
 const pool=q('CHANGES_COMBINING-3-0');assert(checkExact(pool.fields[1],'41/5'));assert(!checkExact(pool.fields[1],'5/2'));
 const percentile=q('FREQUENCY_SYNTHESIS-3-0');assert(checkExact(percentile.fields[0],'35/3'));assert(!checkExact(percentile.fields[0],'10'));assert(checkExact(percentile.fields[3],'40'));
 const pair=q('FREQUENCY_SYNTHESIS-4-0').fields[2];assert(checkExact(pair,'(8,10)'));assert(!checkExact(pair,'(10,8)'));assert(!checkExact(pair,'(9,9)'));
});

test('source scope, original reference privacy, book-style stems and all teacher marking totals remain intact',async()=>{
 const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-VARIATION-SOURCE-AUDIT-20261108.json','utf8'));
 assert.equal(audit.source_scope.source_records_covered,36);assert.equal(audit.source_scope.additional_main_families,14);
 assert.equal(audit.mapping.filter((r:{sourceRelationship:string})=>r.sourceRelationship==='source_skill_redevelopment').length,144);
 assert.equal(audit.mapping.filter((r:{sourceRelationship:string})=>r.sourceRelationship==='additional_exam_skill_family').length,56);
 const question=p.questions.find(q=>q.id==='M4U-9709-S1-03-F036-M')!;
 const html=renderContent(question.prompt_html);assert(html.includes('stem-leaf stem-leaf-back'));assert(html.includes('Key:'));assert(!question.prompt_html.includes('chapter_01_stem_and_leaf'));
 const dto=squarePublicLesson(packageTopic(p.lessons[0].id)!);assert(!JSON.stringify(dto).includes('checkSpecs'));assert(!JSON.stringify(dto).includes('legacy_9709'));
 assert(renderContent(p.questions.find(q=>q.id==='M4U-9709-S1-VAR-CHECK-RAW_MOMENTS-2-0')!.prompt_html).includes('class="stem-leaf"'));
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

test('36 SVG placements retain 36 immutable files and separate solution roles',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,36);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,36);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,4);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,32);
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,36);
  for(const {asset} of files){
    const q=p.questions.find(q=>q.id===asset.question_uid)!;
    const html=asset.role==='STATEMENT'?q.prompt_html:q.solution_html;
    assert(html.includes('/api/files/'+asset.file_id));
    if(asset.role==='SOLUTION')assert(!q.prompt_html.includes(asset.file_id));
  }
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,36);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),extra={...conflicting.assets![0],question_uid:conflicting.questions.find(q=>q.id!==conflicting.assets![0].question_uid)!.id};extra.width++;conflicting.assets!.push(extra);
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false);
  const responsive=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-label="Discrete progression"><circle cx="5" cy="5" r="2"/></svg>');
  validatePackageSvg(responsive,10,10);assert.throws(()=>validatePackageSvg(responsive,11,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/s1-variation/percentiles.svg" alt="Interpolated quartiles"></p>').includes('percentiles.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,4);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});
