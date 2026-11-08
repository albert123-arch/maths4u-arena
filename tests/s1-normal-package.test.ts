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
import {notationProgressPolicy} from '../src/lib/content-progress-policy';
import {readSquareDevice} from '../src/lib/square-device-progress';

const p=contentPackage('9709-s1-normal');
test('Normal distribution has distinct course and lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_9709_s1_norm_normal_areas','orig_9709_s1_norm_inverse_normal','orig_9709_s1_norm_normal_models','orig_9709_s1_norm_binomial_approximation','orig_9709_s1_norm_mixed_inverse']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-NORMAL-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.projectedAnswerSha256);assert.equal(hash(q.hint_html),row.projectedHintSha256);
    assert.equal(hash(q.solution_html),row.projectedSolutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined);

});

test('normal notation, conditioning and exact continuity boundaries stay distinct from approximate probabilities',()=>{
 assert.equal(p.chapter.position,7);const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-S1-NORM-CHECK-'+suffix)!;
 const notation=q('NORMAL_AREAS-1-0');assert(checkExact(notation.fields[0],'4'));assert(!checkExact(notation.fields[0],'16'));assert(checkExact(notation.fields[2],'0.1587'));assert(!checkExact(notation.fields[2],'0.8413'));
 const point=q('NORMAL_AREAS-3-0');assert(checkExact(point.fields[2],'0'));assert(!checkExact(point.fields[2],'0.00001'));assert(point.fields[2].type==='number');
 const cond=q('NORMAL_MODELS-1-0');assert(checkExact(cond.fields[2],'0.3173'));assert(!checkExact(cond.fields[2],'0.1587'));
 const upper=q('BINOMIAL_APPROXIMATION-2-0');assert(checkExact(upper.fields[0],'44.5'));assert(!checkExact(upper.fields[0],'45.5'));assert(checkExact(upper.fields[2],'0.1792'));
 const strict=q('BINOMIAL_APPROXIMATION-3-0');assert(checkExact(strict.fields[0],'34.5'));assert(checkExact(strict.fields[1],'45.5'));assert(!checkExact(strict.fields[0],'33.5'));
 const notEnough=q('BINOMIAL_APPROXIMATION-1-1');assert(checkExact(notEnough.fields[2],'C'));
 const integer=q('MIXED_INVERSE-2-0');assert(checkExact(integer.fields[1],'57'));assert(!checkExact(integer.fields[1],'56.41'));
 for(const l of p.lessons){const dto=squarePublicLesson(packageTopic(l.id)!);assert(!JSON.stringify(dto).includes('absolute_tolerance'));assert(!JSON.stringify(dto).includes('minimum'));}
});

test('the fifty selected families do not claim replacement of all 289 source records',async()=>{
 const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-S1-NORMAL-SOURCE-AUDIT-20261108.json','utf8'));
 assert.equal(audit.source_scope.input_chapter_record_count,289);assert.equal(audit.source_scope.selected_record_count,50);assert.equal(audit.source_scope.unselected_record_count,239);assert.equal(audit.source_scope.source_text_included_in_output,false);
 assert.equal(new Set(audit.mapping.map((r:{family:number})=>r.family)).size,50);assert.equal(audit.mapping.length,200);
 assert.equal(p.questions.filter(q=>q.collection==='exam').reduce((sum,q)=>sum+q.marks,0),1416);
 assert.equal(audit.mapping.filter((r:{sourceDifficulty:string})=>r.sourceDifficulty==='moderate').length,36);
 for(const l of p.lessons)assert(l.before.includes('second parameter is variance'));
});

test('only the approved notation correction retains prior Normal checks and guest mastery',()=>{
 assert.equal(p.version,'1.0.1');assert.equal(notationProgressPolicy(p).length,1);
 const topic=packageTopic(p.lessons[0].id)!;assert.deepEqual(topic.compatibleVersions,['1.0.0']);
 const q=p.questions.find(q=>q.collection==='short')!;
 const events=[{eventKey:'old-normal',uid:q.id,answers:{sd:'4',z:'1',probability:'.1587'},helpUsed:false,at:1000,result:{eventKey:'old-normal',uid:q.id,family:q.family_uid,correct:true,helpUsed:false,at:1000}}];
 const raw=JSON.stringify({version:'1.0.0',events}),restored=readSquareDevice(raw,topic);assert.deepEqual(restored.events,events);assert.equal(restored.version,'1.0.1');assert.equal(JSON.parse(raw).version,'1.0.0');
 for(const change of [(c:typeof p)=>{c.questions[0].fields[0].expected='999';},(c:typeof p)=>{c.questions[0].prompt_html+='<p>A different question.</p>';},(c:typeof p)=>{c.version='1.0.2';}]){const c=structuredClone(p);change(c);assert.deepEqual(notationProgressPolicy(c),[]);}
 assert(p.lessons[1].examples[3].solution.includes(String.raw`\mu+\sigma z_a`));
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

test('36 immutable solution SVGs and separate solution roles',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,36);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,36);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,0);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,36);
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
  const bars=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect class="probability-bar" data-value="9+" data-probability="1/4" x="0" y="0" width="2" height="2"/></svg>');
  validatePackageSvg(bars,10,10);
  const hatch=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><pattern id="h" patternUnits="userSpaceOnUse" width="2" height="2"><path d="M0 0 L2 2" stroke="black"/></pattern><marker id="a" markerWidth="2" markerHeight="2" refX="1" refY="1" orient="auto"><path d="M0 0 L2 1"/></marker></defs><path d="M0 0 L8 8" fill="url(#h)" marker-end="url(#a)"/><text font-style="italic">x</text></svg>');
  validatePackageSvg(hatch,10,10);
  for(const replacement of ['url(https://evil.test/h)','url(data:image/svg+xml,x)','url(//evil.test/h)'])assert.throws(()=>validatePackageSvg(Buffer.from(hatch.toString().replace('url(#h)',replacement)),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(hatch.toString().replace('orient="auto"','orient="auto" onload="alert(1)"')),10,10));
  for(const [from,to] of [['class="probability-bar"','class="arbitrary-style"'],['data-value="9+"','data-value="https://evil.test"'],['data-probability="1/4"','data-probability="-1/4"'],['data-probability="1/4"','data-probability="5/4"'],['data-probability="1/4"','data-probability="1/0"']])assert.throws(()=>validatePackageSvg(Buffer.from(bars.toString().replace(from,to)),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('aria-label="Discrete progression"','aria-label="https://evil.test"')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('viewBox=','width="10" viewBox=')),10,10));
  assert.throws(()=>validatePackageSvg(Buffer.from(responsive.toString().replace('<circle','<script/><circle')),10,10));
  assert(renderContent('<p><img src="/assets/original/s1-normal/normal-region.svg" alt="Available gaps"></p>').includes('normal-region.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,8);
  for(const q of mixed){
    const task=packageTask(p,q);
    for(const [i,f] of q.fields.entries()){
      const part=task.parts[i];assert.equal(part.kind,f.type==='choice'?'CHOICE':'SHORT');
      if(f.type==='choice'){assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);assert.deepEqual(part.options.map(o=>o.texts[0].text),Object.values(f.options!));}
    }
  }
});
