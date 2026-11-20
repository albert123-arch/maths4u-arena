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
import teaching from "../content/original/9709-p1/quadratics-study.json";
import { gradeStudyCheck as gradeQuadraticsStudyCheck, studyRevision as quadraticsRevision, legacyQuadraticsStudy as quadraticsStudy } from "../src/lib/authored-study";
import { answerFormat } from "../src/lib/square-presentation";
import {publicLearningTopic} from '../src/lib/public-learning-topic';

const p=contentPackage('9709-p1-quadratics');
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
    assert(dto.study);
    assert.equal(dto.study.sections.filter(s => s.level !== "extension").length, 6);
    assert.equal(qs.filter(q=>q.collection!=='exam').length,8);
    assert.equal(dto.version,topic.version);
    const authored = teaching[l.id as keyof typeof teaching];
    const includedExamples = dto.study.sections.flatMap(s => s.blocks.filter(b => b.kind === "example").map(b => b.index));
    assert.deepEqual([...includedExamples].sort((a,b) => a-b), authored.examples.map((_, i) => i));
    for (const section of dto.study.sections) {
      assert(section.blocks.some(b => b.kind === "example" && !b.tryFirst), section.id);
      assert(section.blocks.some(b => b.kind === "check"), section.id);
    }
    const notes = quadraticsStudy(l.id)!.notes;
    assert(!/<script\b|<style\b|data-panel|data-math|m4-graph-explorer/.test(notes));
    assert(Object.values(quadraticsRevision(l.id)!).every(html => !html.includes('katex-error')));
    for (const section of authored.sections) {
      for (const block of section.blocks) {
        if (block.kind !== "check" || !("field" in block) || !block.field) continue;
        const result = gradeQuadraticsStudyCheck(l.id, block.id!, block.field.expected);
        assert.equal(result?.status, "correct", block.id);
        assert(!result.feedback.includes("katex-error"), block.id);
      }
    }
    assert.equal(dto.navigation?.directionTitle,'AS & A Level');
    const raw=JSON.stringify(dto);for(const key of ['"expected"','ownerProvenance','source_problem_id','source_exam','sourceSha256','archiveTaskId'])assert(!raw.includes(key),key);
    const notesHtml = dto.study.sections.flatMap(s => [s.intro, ...s.blocks.flatMap(b => "html" in b ? [b.html] : b.kind === "check" ? [b.prompt,b.hint] : [])]);
    for(const text of [...notesHtml,...dto.examples.flatMap(e=>[e.question,...(e.steps ?? [])]),...dto.questions.map(q=>q.prompt)])assert(!text.includes('katex-error'),l.key);
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

test("root checks accept natural notation and require the entire set", () => {
  const q = questionsForTopic("orig_quadratics_factorisation").find(q => q.id === "M4U-9709-P1-QD-CHECK-EQUATIONS-1-0")!;
  for (const roots of ["x = 0 or x = 5", "5, 0", "{0, 5}", "x=5 and x=0"]) {
    assert(gradeSquare(q, { roots }).correct, roots);
  }
  for (const roots of ["0", "x=5", "[0,5]", "x=0 or y=5", "x=0 or"]) {
    assert(!gradeSquare(q, { roots }).correct, roots);
  }
  const lesson = "orig_quadratics_factorisation";
  assert.equal(gradeQuadraticsStudyCheck(lesson, "monic-roots", "x=−5 or x=3")?.status, "correct");
  assert.equal(gradeQuadraticsStudyCheck(lesson, "monic-roots", "x=3")?.status, "retry");
  assert.match(gradeQuadraticsStudyCheck(lesson, "monic-roots", "x=3")!.feedback, /another root/);
  assert.equal(gradeQuadraticsStudyCheck(lesson, "formula-roots", "x=2 ± sqrt(5)")?.status, "correct");
  assert.equal(gradeQuadraticsStudyCheck(lesson, "monic-roots", "x=−5 or z=3")?.status, "format");
  assert.equal(gradeQuadraticsStudyCheck("orig_trigonometry_equations", "monic-roots", "-5,3"), undefined);
});

test("range checks accept equivalent exam notation and distinguish inputs, endpoints and syntax", () => {
  const lesson = "orig_quadratics_completing_square";
  const grade = (id: string, value: string) => gradeQuadraticsStudyCheck(lesson, id, value)!;
  for (const value of ["f(x) ≤ 8", "y <= 8", "8 ≥ f(x)", String.raw`f(x) \leq 8`, "(−inf, 8]", "(-∞, 8]"]) {
    assert.equal(grade("full-parabola-range", value).status, "correct", value);
  }
  for (const value of ["x ≤ 8", "8 >= x", "0 <= x <= 9"]) {
    const result = grade("full-parabola-range", value);
    assert.equal(result.status, "retry", value);
    assert.match(result.feedback, /output values.*domain/);
  }
  for (const value of ["y < 8", "y ≥ 8", "(-inf, 8)", "{8}"]) {
    assert.equal(grade("full-parabola-range", value).status, "retry", value);
  }
  for (const value of ["y <== 8", "f(x) <=", "y <= x", "y <= 1] U (1,8", "[-∞,8]"]) {
    assert.equal(grade("full-parabola-range", value).status, "format", value);
  }
  for (const value of ["[0,9]", "0 ≤ g(x) <= 9", "9 >= y ≥ 0", "0 ≤ y ≤ 3^2"]) {
    assert.equal(grade("restricted-parabola-range", value).status, "correct", value);
  }
  assert.equal(grade("restricted-parabola-range", "0 ≤ y < 9").status, "retry");
  assert.equal(grade("restricted-parabola-range", "0 ≤ f(x) ≤ 9").status, "retry");
  assert.equal(grade("restricted-parabola-range", "0 ≤ y >= 9").status, "format");
  assert.equal(grade("open-domain-range", "1 < h(x)").status, "correct");
  assert.equal(grade("open-domain-range", "h(x) >= 1").status, "retry");
  assert.equal(grade("sketch-intercepts-roots", "y <= 8").status, "retry");

  const q = questionsForTopic(lesson).find(q => q.id === "M4U-9709-P1-QD-CHECK-SQUARE-2-0")!;
  const answers = Object.fromEntries(q.fields.map(f => [f.key, f.expected as string]));
  assert(gradeSquare(q, { ...answers, range: "f(x) ≥ 3" }).correct);
  const wrong = gradeSquare(q, { ...answers, range: "x >= 3" });
  assert(wrong.valid && !wrong.correct);
  assert.match(wrong.fields.range.message, /output values.*domain/);
});

test("exam notation matches the real inequality, parameter, scalar and coordinate fields", () => {
  const correct: [string, string, string[]][] = [
    ["inequalities", "strict-between", ["2 < x < 6", "6 > x > 2", "x > 2 and x < 6"]],
    ["inequalities", "outside-including-roots", ["x ≤ −2 or x ≥ 3", "3 <= x or -2 >= x", "(−inf,−2] U [3,inf)", "(−∞, −2] or [3, ∞)"]],
    ["inequalities", "model-length", ["3 ≤ x ≤ 7", "[3,7]"]],
    ["inequalities", "exact-interval", ["2-√3 ≤ x ≤ 2+√3"]],
    ["inequalities", "graph-comparison", ["1 < x < 3"]],
    ["inequalities", "domain-overlap", ["-3 < x <= -1 or 4 <= x <= 6"]],
    ["inequalities", "one-value-roots", ["x = -1", "-1 ≤ x ≤ -1"]],
    ["roots", "two-root-parameters", ["k < −2 or k > 2", "2 < k or −2 > k"]],
    ["roots", "strict-sign-parameters", ["k > 8", "(8,inf)"]],
    ["factorisation", "signed-b", ["b = −4", "-4"]],
    ["roots", "linear-case-root", ["x = 2", "2"]],
    ["roots", "tangent-intercept", ["c = 0", "0"]],
    ["roots", "calculate-d", ["D = 49"]],
    ["simultaneous", "full-intersections", ["(2, 4), (−1, 1)", "(-1,1);(2,4)", "(2,4) and (-1,1)", "x=2,y=4; y=1,x=-1", "x=2,y=4, y=1,x=-1"]],
    ["simultaneous", "tangent-point", ["x = 2, y = 5", "(y=5, x=2)"]],
  ];
  for (const [lesson, id, values] of correct) for (const value of values) {
    assert.equal(gradeQuadraticsStudyCheck("orig_quadratics_" + lesson,id,value)?.status, "correct", id + " " + value);
  }
  for (const [lesson, id, value] of [
    ["inequalities","outside-including-roots","x < -2 or x ≥ 3"],
    ["inequalities","outside-including-roots","x ≤ -2 or k ≥ 3"],
    ["inequalities","strict-between","x < 6"], ["roots","strict-sign-parameters","x > 8"],
    ["factorisation","signed-b","c = -4"], ["roots","linear-case-root","m = 2"],
    ["simultaneous","full-intersections","(2,4)"], ["simultaneous","full-intersections","(2,1),(-1,4)"],
    ["simultaneous","tangent-point","x=2,x=5"], ["simultaneous","tangent-point","2,5"],
    ["simultaneous","rectangle-dimensions","x=5,y=9"],
  ]) {
    assert.notEqual(gradeQuadraticsStudyCheck("orig_quadratics_" + lesson,id,value)?.status, "correct", id + " " + value);
  }
  const lesson = squarePublicLesson(packageTopic("orig_quadratics_inequalities")!);
  const check = lesson.study!.sections.flatMap(s => s.blocks).find(b => b.kind === "check" && b.id === "outside-including-roots");
  assert(check?.kind === "check");
  const help = answerFormat(check.field);
  assert.match(help.en, /inequalit/i);
  assert.doesNotMatch(help.en, /every root/i);
});

test("practice and fresh review variants accept the same exam notation as the study checks", () => {
  const cases: [string, string, Record<string, string>, Record<string, string>][] = [
    ["inequalities", "INEQUALITIES-1-0", {allowed: "−2 ≤ x ≤ 3"}, {allowed: "−2 < x ≤ 3"}],
    ["inequalities", "INEQUALITIES-2-1", {allowed: "x < −2 or x > 5"}, {allowed: "x > 5"}],
    ["roots", "DISCRIMINANT-1-1", {parameters: "k < −√3 or k > √3"}, {parameters: "k < −√3 and k > √3"}],
    ["roots", "DISCRIMINANT-2-0", {exception: "k = 1", linear_root: "x = 1", count: "2"}, {exception: "x = 1", linear_root: "x = 1", count: "2"}],
    ["simultaneous", "SIMULTANEOUS-1-0", {points: "(4, 9), (−1, −1)"}, {points: "(4, −1), (−1, 9)"}],
    ["simultaneous", "SIMULTANEOUS-2-0", {points: "x=2,y=1; y=6,x=1/3"}, {points: "x=2,y=1"}],
  ];
  for (const [lesson, item, right, wrong] of cases) {
    const q = questionsForTopic("orig_quadratics_" + lesson).find(q => q.id === "M4U-9709-P1-QD-CHECK-" + item)!;
    assert(gradeSquare(q, right).correct, item);
    const result = gradeSquare(q, wrong);
    assert(result.valid && !result.correct, item);
  }
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
