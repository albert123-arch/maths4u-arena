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

const p=contentPackage('9709-s1-binomial-geometric');
test('Binomial and geometric distributions has distinct course and lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_9709_s1_bg_binomial_models','orig_9709_s1_bg_inverse_binomial','orig_9709_s1_bg_mixed_binomial','orig_9709_s1_bg_geometric','orig_9709_s1_bg_success_sequences']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-BINOMIAL-GEOMETRIC-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.projectedAnswerSha256);assert.equal(hash(q.hint_html),row.projectedHintSha256);
    assert.equal(hash(q.solution_html),row.projectedSolutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined);
  const money=p.questions.find(q=>q.id==='M4U-9709-S1-07-F010-M')!;
  assert(money.prompt_html.includes('&#36;180'));assert(renderContent(money.prompt_html).includes('$180'));assert(!renderContent(money.prompt_html).includes('katex-error'));
  assert(renderContent(money.answer_html).includes('$87.10'));
});

test('binomial assumptions, integer boundaries, two roots and capped waiting are checked completely',()=>{
 assert.equal(p.chapter.position,6);assert.equal(p.course.slug,'maths4u-9709-s1');
 const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-S1-BG-CHECK-'+suffix)!;
 const interval=q('BINOMIAL_MODELS-3-0');assert(checkExact(interval.fields[0],'5/8'));assert(!checkExact(interval.fields[0],'15/16'));
 const target=q('INVERSE_BINOMIAL-3-0');assert(checkExact(target.fields[0],'3'));assert(checkExact(target.fields[1],'4'));assert(!checkExact(target.fields[1],'3'));
 const roots=q('INVERSE_BINOMIAL-4-0');assert(checkExact(roots.fields[0],'1/4'));assert(checkExact(roots.fields[1],'3/4'));assert(!checkExact(roots.fields[1],'1/4'));
 const shared=q('MIXED_BINOMIAL-2-0');assert(checkExact(shared.fields[1],'5/16'));assert(checkExact(shared.fields[2],'5/8'));assert(!checkExact(shared.fields[1],'1/4'));assert(checkExact(shared.fields[3],'B'));
 const memory=q('GEOMETRIC-2-0');assert(checkExact(memory.fields[2],'3'));assert(checkExact(memory.fields[3],'5'));assert(!checkExact(memory.fields[3],'3'));
 const cap=q('GEOMETRIC-4-0');assert(checkExact(cap.fields[0],'1/4'));assert(!checkExact(cap.fields[0],'1/8'));assert(checkExact(cap.fields[1],'7/4'));assert(!checkExact(cap.fields[1],'2'));
 const second=q('SUCCESS_SEQUENCES-1-0');assert(checkExact(second.fields[0],'3/16'));assert(checkExact(second.fields[1],'11/16'));assert(!checkExact(second.fields[0],'11/16'));
 const race=q('SUCCESS_SEQUENCES-4-0');assert(checkExact(race.fields[0],'7/27'));assert(checkExact(race.fields[2],'22/9'));
 const condition=q('MIXED_BINOMIAL-4-0');assert(condition.solution_html.includes(String.raw`\mathrm E(X\mid H)`));assert(!checkExact(condition.fields[2],'3/2'));
 assert(cap.solution_html.includes(String.raw`\frac1p`));assert(p.lessons[3].before.includes(String.raw`\operatorname{Geo}(p)`));
 const firstExample=p.lessons[0].examples[0].solution;assert(firstExample.includes(String.raw`X\sim\mathrm B`));assert(!firstExample.includes(String.raw`X&=\mathrm B`));
});

test('fifty selected anchors remain private and do not claim all 126 source records were replaced',async()=>{
 const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-BINOMIAL-GEOMETRIC-SOURCE-AUDIT-20261108.json','utf8'));
 assert.equal(audit.source_scope.source_chapter_records,126);assert.equal(audit.source_scope.selected_anchor_records,50);assert.equal(audit.source_scope.unselected_records,76);assert.equal(audit.source_scope.original_text_in_output,false);
 assert.equal(new Set(audit.mapping.map((r:{family:number})=>r.family)).size,50);assert.equal(audit.mapping.length,200);
 const applied=p.questions.find(q=>q.prompt_html.includes('Mixed-topic prerequisite'))!;assert(applied);for(const raw of ['additional_combinations_5.2','conditional_probability_5.3','finite_distribution_table_5.4','geometric_within_chapter'])assert(!applied.prompt_html.includes(raw));
 const dto=squarePublicLesson(packageTopic(p.lessons[0].id)!);for(const key of ['source_uid','source_reference','redevelopment_note_ru','checkSpecs'])assert(!JSON.stringify(dto).includes(key));
 assert.equal(p.questions.filter(q=>q.collection==='exam').reduce((sum,q)=>sum+q.marks,0),1376);
 assert(p.lessons.every(l=>l.before.includes('starting at 1')));
 const notes=p.lessons.map(l=>l.ideas).join('');assert(!notes.includes('operatorname{Var}(T)'));assert(notes.includes('no negative-binomial theorem is required'));
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
  const bars=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect class="probability-bar" data-value="9+" data-probability="1/4" x="0" y="0" width="2" height="2"/></svg>');
  validatePackageSvg(bars,10,10);
  for(const [from,to] of [['class="probability-bar"','class="arbitrary-style"'],['data-value="9+"','data-value="https://evil.test"'],['data-probability="1/4"','data-probability="-1/4"'],['data-probability="1/4"','data-probability="5/4"'],['data-probability="1/4"','data-probability="1/0"']])assert.throws(()=>validatePackageSvg(Buffer.from(bars.toString().replace(from,to)),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/s1-binomial-geometric/first-success.svg" alt="Available gaps"></p>').includes('first-success.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,6);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});
