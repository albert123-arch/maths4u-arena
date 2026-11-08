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

const p=contentPackage('9709-s1-representation');
test('Representation of data has distinct course and lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_9709_s1_rep_stem_reading','orig_9709_s1_rep_stem_comparison','orig_9709_s1_rep_histograms','orig_9709_s1_rep_cumulative','orig_9709_s1_rep_boxplots']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-REPRESENTATION-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.projectedAnswerSha256);assert.equal(hash(q.hint_html),row.projectedHintSha256);
    assert.equal(hash(q.solution_html),row.projectedSolutionSha256);
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

test('complete statistical summaries, densities, inverse readings and whisker conventions are checked',()=>{
  assert.equal(p.course.slug,'maths4u-9709-s1');assert.equal(p.course.code,'9709');
  const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-S1-REP-CHECK-'+suffix)!;
  const quartiles=q('STEM_READING-3-0');assert(checkExact(quartiles.fields[0],'13'));assert(!checkExact(quartiles.fields[0],'14'));assert(checkExact(quartiles.fields[3],'7'));
  const densities=q('HISTOGRAMS-1-0');assert(checkExact(densities.fields[1],'3/5'));assert(!checkExact(densities.fields[1],'12'));
  const boundary=q('HISTOGRAMS-3-0').fields[0];assert(checkExact(boundary,'[19.5,29.5)'));assert(!checkExact(boundary,'[20,30)'));assert(!checkExact(boundary,'[19.5,29.5]'));
  const grouped=q('HISTOGRAMS-4-0');assert(checkExact(grouped.fields[0],'19'));assert(checkExact(grouped.fields[2],'sqrt(94)'));assert(!checkExact(grouped.fields[2],'94'));
  const cum=q('CUMULATIVE-1-0');assert(checkExact(cum.fields[1],'20'));assert(!checkExact(cum.fields[1],'30'));
  const tail=q('CUMULATIVE-3-0');assert(checkExact(tail.fields[0],'20'));assert(checkExact(tail.fields[1],'15'));assert(!checkExact(tail.fields[1],'30-15+1'));
  const percentile=q('CUMULATIVE-4-0');assert(checkExact(percentile.fields[0],'24'));assert(!checkExact(percentile.fields[0],'32'));assert(!checkExact(percentile.fields[0],'80'));
  const fences=q('BOXPLOTS-2-0');assert(checkExact(fences.fields[2],'{35,2}'));assert(!checkExact(fences.fields[2],'{-2,30}'));assert(!checkExact(fences.fields[2],'{2}'));
  const pooled=q('STEM_COMPARISON-4-0');assert(checkExact(pooled.fields[2],'2*sqrt(3)'));assert(!checkExact(pooled.fields[2],'5/2'));
  const later=p.questions.find(q=>q.id==='M4U-9709-S1-01-F048-M')!;assert(later.prompt_html.includes('Chapter 8'));assert(later.prompt_html.includes('recognition'));
  const box=p.questions.find(q=>q.id==='M4U-9709-S1-01-F041-M')!;assert(box.prompt_html.includes('Whiskers reach the minimum and maximum'));
});

test('128 SVG placements retain 128 immutable files and separate solution roles',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,128);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,128);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,20);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,108);
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,128);
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,128);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),extra={...conflicting.assets![0],question_uid:conflicting.questions.find(q=>q.id!==conflicting.assets![0].question_uid)!.id};extra.width++;conflicting.assets!.push(extra);
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false);
  const responsive=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-label="Discrete progression"><circle cx="5" cy="5" r="2"/></svg>');
  validatePackageSvg(responsive,10,10);assert.throws(()=>validatePackageSvg(responsive,11,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/s1-representation/histogram.svg" alt="Circular cross-section"></p>').includes('histogram.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,16);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});


test('book-style stem tables survive sanitization without unsafe HTML capabilities',()=>{
 const html=renderContent('<div class="stem-leaf-scroll wrong" onclick="alert(1)"><table class="stem-leaf stem-leaf-back bad" style="position:fixed"><thead><tr><th scope="col">A</th><th>Stem</th><th>B</th></tr></thead><tbody><tr><td>8 2</td><th scope="row">1</th><td>3 7</td></tr></tbody></table><script>alert(1)</script></div>');
 assert(html.includes('class="stem-leaf-scroll"'));assert(html.includes('class="stem-leaf stem-leaf-back"'));assert(html.includes('scope="row"'));assert(!/onclick|style=|<script|wrong|\bbad\b/.test(html));
 const single=p.questions.find(q=>q.id==='M4U-9709-S1-01-F001-M')!,back=p.questions.find(q=>q.id==='M4U-9709-S1-01-F016-M')!;
 assert(renderContent(single.solution_html).includes('class="stem-leaf"'));assert(renderContent(back.prompt_html).includes('class="stem-leaf stem-leaf-back"'));
 assert(back.prompt_html.includes('>8 7</th><td>6</td>')); // The smaller left leaf stays nearest the central stem.
 assert(!JSON.stringify(squarePublicLesson(packageTopic(p.lessons[0].id)!)).includes('verification_inputs'));
});
