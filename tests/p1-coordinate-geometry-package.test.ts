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
import {gradeStudyCheck,studyRevision} from '../src/lib/authored-study';
import teaching from '../content/original/9709-p1/coordinate-geometry-study.json';

const p=contentPackage('9709-p1-coordinate-geometry');
test('Coordinate Geometry keeps five existing lesson identities and every written answer, mark and criterion',async()=>{
  assert.deepEqual(p.lessons.map(l=>l.id),['orig_coordinate_geometry_distance_midpoint','orig_coordinate_geometry_parallel_perpendicular','orig_coordinate_geometry_straight_lines','orig_coordinate_geometry_circles','orig_coordinate_geometry_line_circle']);
  assert.equal(p.questions.length,240);assert.equal(p.questions.filter(q=>q.variant_index===0).length,50);assert.equal(p.questions.filter(q=>(q.variant_index??0)>0).length,150);
  const audit=JSON.parse(await fs.readFile('docs/ARENA-9709-P1-COORDINATE-GEOMETRY-SOURCE-AUDIT-20261108.json','utf8'));
  const hash=(t:string)=>createHash('sha256').update(t).digest('hex');
  for(const q of p.questions.filter(q=>q.collection==='exam')){
    const row=audit.mapping.find((r:{uid:string})=>r.uid===q.id);assert(row);
    assert.equal(q.marks,row.marks);assert.equal(hash(q.answer_html),row.answerSha256);assert.equal(hash(q.hint_html),row.hintSha256);
    assert.equal(hash(q.solution_html.replace(/<p><img[\s\S]*$/,'')),row.solutionSha256);
    assert.equal(hash(JSON.stringify(q.parts.map(part=>part.marking_criteria.map(c=>[c.code,c.marks,c.description_html])))),row.criteriaSha256);
  }
  assert.equal(await publicLearningTopic(p.lessons[0].id,async()=>null),undefined);
});

test('all full quick answers work, missing or wrong fields fail and review changes the question',()=>{
  for(const l of p.lessons){
    const dto=squarePublicLesson(packageTopic(l.id)!),qs=questionsForTopic(l.id);
    assert.equal(dto.examples.length,teaching[l.id as keyof typeof teaching].examples.length);
    assert.equal(qs.filter(q=>q.collection!=='exam').length,8);
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

test('every Coordinate Geometry section has a readable example, fresh check and exact answer',()=>{
  assert.deepEqual(Object.keys(teaching),p.lessons.map(l=>l.id));
  for(const [lessonId,lesson] of Object.entries(teaching)){
    const dto=squarePublicLesson(packageTopic(lessonId)!);
    assert(dto.study);
    assert.deepEqual(dto.study.sections.map(s=>s.id),lesson.sections.map(s=>s.id));
    const revision=studyRevision(lessonId);
    assert(revision);
    assert.match(revision.body,/\/assets\/original\/coordinate-geometry\/study-/);
    const rendered=[...Object.values(revision),...dto.examples.flatMap(e=>[e.question,...(e.steps??[])])];
    for(const section of dto.study.sections){
      assert(section.blocks.some(b=>b.kind==='example'));
      assert(section.blocks.some(b=>b.kind==='check'));
      rendered.push(section.intro,...section.blocks.flatMap(b=>'html' in b?[b.html]:b.kind==='check'?[b.prompt,b.hint]:[]));
    }
    for(const html of rendered)assert.doesNotMatch(html,/katex-error/);
    for(const section of lesson.sections)for(const block of section.blocks){
      if(block.kind!=='check'||!block.field)continue;
      const correct=gradeStudyCheck(lessonId,block.id,block.field.expected);
      assert.equal(correct?.status,'correct',block.id);
      assert.doesNotMatch(correct.feedback,/katex-error/);
      for(const retry of block.retry){
        const incorrect=gradeStudyCheck(lessonId,block.id,retry.answer);
        assert.equal(incorrect?.status,'retry',block.id+' / '+retry.answer);
        assert.doesNotMatch(incorrect.feedback,/katex-error/);
      }
    }
  }
});

test('lesson checks accept exact lengths, scaled equations, all points and strict parameter bounds',()=>{
  const [distance,directions,lines,circles,intersections]=p.lessons.map(l=>l.id);
  for(const [lessonId,id,answers] of [
    [distance,'exact-surd-distance',['√73','sqrt(73)']],
    [distance,'missing-endpoint',['x=-5, y=7','(-5,7)']],
    [directions,'perpendicular-equation',['y=3x/2-5/2','6x-4y-10=0']],
    [directions,'horizontal-segment-bisector',['x=-2','-2x-4=0']],
    [lines,'axis-intercept-pairs',['(0,−6), (4,0)','(4,0);(0,-6)']],
    [lines,'distinct-parallel-no-intersection',['empty','∅']],
    [circles,'circle-from-a-centre-and-point',['(x+2)^2+(y-4)^2=25','x^2+y^2+4x-8y-5=0']],
    [circles,'tangent-from-centre-and-contact',['3x-4y=3','y=3(x-1)/4']],
    [intersections,'both-secant-points',['(3,4), (-4,-3)']],
    [intersections,'secant-parameter-interval',['-4 < k < 4','(-4,4)']],
    [intersections,'both-tangent-parameters',['k=-4 or k=4','{4,-4}']],
    [intersections,'missing-circle-parameter-set',['k<-4 or k>4','(-inf,-4) U (4,inf)']],
  ] as const){
    for(const answer of answers)assert.equal(gradeStudyCheck(lessonId,id,answer)?.status,'correct',id+' / '+answer);
  }
  for(const [lessonId,id,answer,message] of [
    [distance,'radius-squared-from-diameter','50',/quarters/],
    [directions,'perpendicular-bisector','3x+y=-2',/must pass through the midpoint/],
    [lines,'axis-intercept-pairs','(4,0)',/Also set/],
    [circles,'circle-from-a-centre-and-point','(x-2)^2+(y+4)^2=25',/must vanish/],
    [intersections,'secant-parameter-interval','[-4,4]',/strict interval/],
    [intersections,'both-common-circle-points','(3,2)',/lower point/],
  ] as const){
    const result=gradeStudyCheck(lessonId,id,answer);
    assert.equal(result?.status,'retry',id);
    assert.match(result.feedback,message);
  }
  assert.equal(gradeStudyCheck(intersections,'both-secant-points','(3,)')?.status,'format');
  assert.equal(gradeStudyCheck(circles,'both-secant-points','(3,4)'),undefined);
});

test('line and circle equations allow equivalent forms, but not incorrect geometry or incomplete pairs',()=>{
  const line=p.questions.find(q=>q.id==='M4U-9709-P1-CG-CHECK-DIRECTIONS-2-0')!.fields[0];
  assert(checkExact(line,'y=2*x/3-4'));assert(checkExact(line,'4*x-6*y-24=0'));assert(!checkExact(line,'2*x-3*y-13=0'));assert(!checkExact(line,'0=0'));
  const circle=p.questions.find(q=>q.id==='M4U-9709-P1-CG-CHECK-CIRCLES-1-0')!.fields[0];
  assert(checkExact(circle,'(x+1)^2+(y-2)^2=25'));assert(checkExact(circle,'x^2+y^2+2*x-4*y-20=0'));assert(checkExact(circle,'-(x+1)^2-(y-2)^2=-25'));
  assert(!checkExact(circle,'(x+1)^2+(y-2)^2=5'));assert(!checkExact(circle,'(x-1)^2+(y+2)^2=25'));
  const q=p.questions.find(q=>q.id==='M4U-9709-P1-CG-CHECK-INTERSECTIONS-1-0')!;
  assert(checkExact(q.fields[0],'(2,4);(-4,-2)'));assert(!checkExact(q.fields[0],'(2,4)'));assert(!checkExact(q.fields[0],'(-4,4);(2,-2)'));
  const boundary=p.questions.find(q=>q.id==='M4U-9709-P1-CG-CHECK-INTERSECTIONS-2-0')!.fields[0];
  assert(checkExact(boundary,'(-5,3)'));assert(!checkExact(boundary,'[-5,3]'));
});

test('100 SVG placements retain 99 distinct immutable files and separate protected solutions',async()=>{
  const files=await readPackageAssets(p);assert.equal(files.length,100);assert.equal(new Set(files.map(f=>f.asset.sha256)).size,99);
  assert.equal(files.filter(f=>f.asset.role==='STATEMENT').length,40);assert.equal(files.filter(f=>f.asset.role==='SOLUTION').length,60);
  assert.equal(new Set(files.map(f=>f.asset.file_id)).size,99,'identical statement artwork uses one immutable StoredFile');
  assert.equal(new Set(files.map(f=>f.asset.question_uid+':'+f.asset.file_id+':'+f.asset.role)).size,100);
  const duplicate=structuredClone(p);duplicate.assets!.push(duplicate.assets![0]);assert.equal(contentPackageSchema.safeParse(duplicate).success,false);
  const conflicting=structuredClone(p),shared=conflicting.assets!.find(a=>conflicting.assets!.filter(b=>b.file_id===a.file_id).length>1)!;shared.width++;
  assert.equal(contentPackageSchema.safeParse(conflicting).success,false,'shared file metadata must match exactly');
  for(const attribute of ['data-circle-index','data-line-index']){
    const svg=(value:string)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle ${attribute}="${value}" cx="5" cy="5" r="2"/></svg>`);
    validatePackageSvg(svg('0'),10,10);assert.throws(()=>validatePackageSvg(svg('https://evil.test'),10,10));
  }
  const mixed=p.questions.filter(q=>q.fields.length>1&&q.fields.some(f=>f.type==='choice'));assert.equal(mixed.length,2);
  for(const q of mixed){const part=packageTask(p,q).parts[0];assert.equal(part.kind,'CHOICE');assert.equal(part.options.length,3);assert.equal(part.options.filter(o=>o.correct).length,1);}
});
