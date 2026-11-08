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

const p=contentPackage('9709-p1-circular-measure');
test('Circular Measure preserves lesson identities and the entire owner bank without answer or marking edits',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_circular_measure_radians','orig_circular_measure_arc_length','orig_circular_measure_sector_area','orig_circular_measure_segments','orig_circular_measure_composite_sectors']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-P1-CIRCULAR-MEASURE-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.answerSha256);assert.equal(hash(q.hint_html),row.hintSha256);
    assert.equal(hash(q.solution_html),row.solutionSha256);
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
      if(!q.fields.length)continue;
      const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(';'):f.expected]));
      assert(gradeSquare(q,answers).correct,JSON.stringify({uid:q.id,result:gradeSquare(q,answers)}));
      for(const f of q.fields){const wrong={...answers,[f.key]:f.type==='choice'?Object.keys(f.options!).find(k=>k!==f.expected)!:'98765'};assert(!gradeSquare(q,wrong).correct,q.id);const missing={...answers};delete missing[f.key];assert(!gradeSquare(q,missing).correct,q.id);}
    }
    const q=dto.questions.find(q=>q.collection==='short')!,snapshot=squareSnapshot([{eventKey:'test',uid:q.uid,family:q.family,correct:false,helpUsed:false,at:1000}]);
    const fresh=nextSquareReview(dto.questions,snapshot,1000)[0];assert.equal(fresh.family,q.family);assert.notEqual(fresh.uid,q.uid);assert.equal(fresh.collection,'variant');
  }
});

test('exact radian, segment, major-region and maximum answers distinguish common mistakes',()=>{
  const q=(suffix:string)=>p.questions.find(q=>q.id==='M4U-9709-P1-CM-CHECK-'+suffix)!;
  const conversion=q('RADIANS-1-0');assert(checkExact(conversion.fields[0],'pi*150/180'));assert(!checkExact(conversion.fields[0],'150'));
  const segment=q('SEGMENTS-1-0');assert(checkExact(segment.fields[0],'8*pi/3-4*sqrt(3)'));assert(!checkExact(segment.fields[0],'8*pi/3'));
  assert(checkExact(segment.fields[1],'4*(pi/3+1)'));assert(!checkExact(segment.fields[1],'8+4*pi/3'));
  const major=q('SEGMENTS-3-0');assert(checkExact(major.fields[0],'27*pi/4+9/2'));assert(!checkExact(major.fields[0],'9*pi/4-9/2'));
  const maximum=q('SECTORS-4-0');assert(checkExact(maximum.fields[0],'36-(r-6)^2'));assert(!checkExact(maximum.fields[0],'12*r+r^2'));
  const overlap=q('COMPOSITES-3-0');assert(checkExact(overlap.fields[2],'8*pi'));assert(!checkExact(overlap.fields[2],'12*pi'));
});

test('200 safe statement SVG placements retain 152 distinct immutable files; teaching diagram is allowed',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,200);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,152);
  assert(files.every(f=>f.asset.role==='STATEMENT'));
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,152);
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,200);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),shared=conflicting.assets!.find(a=>conflicting.assets!.filter(b=>b.file_id===a.file_id).length>1)!;shared.width++;
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false);
  for(const [attribute,good] of [['data-construction','2'],['data-curve-index','0'],['data-region','true'],['fill-rule','evenodd']]){
    const svg=(value:string)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path ${attribute}="${value}" d="M 0 0 L 5 5"/></svg>`);
    validatePackageSvg(svg(good),10,10);assert.throws(()=>validatePackageSvg(svg('https://evil.test'),10,10));assert.throws(()=>validatePackageSvg(svg('url(#x)'),10,10));
  }
  validatePackageSvg(await fs.readFile('public/assets/original/circular-measure/overlapping-circles.svg'),640,450);
  assert(renderContent('<p><img src="/assets/original/circular-measure/overlapping-circles.svg" alt="Overlap"></p>').includes('overlapping-circles.svg'));
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,2);
  for(const q of mixed){const part=packageTask(p,q).parts[0];assert.equal(part.kind,'CHOICE');assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);}
});
