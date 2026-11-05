import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
import { userSelect } from "../src/lib/security";
import { originalQuadraticsSchema, originalTask, importOriginalQuadraticsLocal, originalLessonId } from "../src/lib/original-quadratics";
import { publicVersion, renderContent, versionInclude } from "../src/lib/content";
import {quadraticTopics} from "../src/lib/square-model";
import {questionsForTopic} from "../src/lib/square-content";
import {allPure1Questions} from "../src/lib/pure1-variants";

test("original Quadratics: complete criteria, immutable IDs, local fence and no answer leakage",async()=>{
  const cfg=databaseConfig();
  assert.equal(process.env.MATHS4U_ENV,"test");assert.equal(cfg.host,"127.0.0.1");assert.match(cfg.database,/^maths4u_test_bank_/);
  const pack=originalQuadraticsSchema.parse(JSON.parse(await readFile("content/original/quadratics-v1.json","utf8")));
  const actor=await db().user.findFirstOrThrow({where:{roles:{some:{role:"ADMIN"}}},select:userSelect});
  const short={questions:allPure1Questions};
  const before=await db().taskVersion.count();
  const first=await importOriginalQuadraticsLocal(actor,pack);
  assert.equal(first.created,0);assert.equal(first.skipped,10);
  assert.equal(await db().taskVersion.count(),before);
  for(const p of pack.problems){
    const task=await db().task.findUniqueOrThrow({where:{id:first.mapping[p.uid]},include:{versions:{orderBy:{number:"desc"},include:versionInclude}}});
    assert.equal(task.versions.length,1);const v=task.versions[0];
    assert.equal(v.sourceUid,p.uid);assert.equal(v.materialCategory,"EXAM");assert.equal(v.parts.length,3);
    assert.equal(v.parts.reduce((n,a)=>n+a.maxPoints,0),p.marks);
    const hidden=publicVersion(v,"en",false);assert.equal("solution" in hidden,false);assert.equal("markScheme" in hidden,false);
    assert.ok(hidden.parts.every(p=>!("answer" in p)&&!("rubric" in p)));
    const shown=publicVersion(v,"en",true);assert.ok(shown.solution);assert.ok(shown.markScheme?.includes("not an official"));
    assert.equal(shown.markSchemeStatus,undefined);assert.equal(v.texts[0].markSchemeStatus,"DRAFT");
    for(const [i,a] of p.parts.entries()){
      assert.equal(v.parts[i].kind,"MANUAL");assert.equal(v.parts[i].maxPoints,a.marks);
      assert.ok(shown.parts[i].answer);assert.ok(shown.parts[i].rubric?.includes(a.criteria[0].id));
    }
    const material=originalTask(pack,p);
    for(const raw of material.texts.flatMap(t=>[t.statement,t.hint,t.solution,t.markScheme]))assert.ok(!renderContent(raw).includes('class="katex-error"'));
  }
  for(const l of pack.lessons){
    const lesson=await db().lesson.findUniqueOrThrow({where:{id:originalLessonId(l.key)},include:{versions:true,tasks:true}});
    assert.equal(lesson.versions.length,1);assert.equal(lesson.tasks.length,2+short.questions.filter(q=>q.block==="quadratics"&&q.skill===l.key).length+questionsForTopic(quadraticTopics.find(t=>t.lessonId===lesson.id)!.key).length);
    for(const raw of [l.notes_html,...l.examples.flatMap(e=>[e.question_html,e.solution_html])])assert.ok(!renderContent(raw).includes('class="katex-error"'));
  }
  const bad=structuredClone(pack);bad.problems[0].parts[0].marks++;
  assert.throws(()=>originalQuadraticsSchema.parse(bad));
  const changed=structuredClone(pack);changed.problems[0].title+=' changed';
  await assert.rejects(importOriginalQuadraticsLocal(actor,changed),/ORIGINAL_EXPLICIT_VERSION_MIGRATION_REQUIRED/);
  const late=structuredClone(pack);late.lessons[0].notes_html+='<p>Changed revision.</p>';
  await assert.rejects(importOriginalQuadraticsLocal(actor,late),/ORIGINAL_LESSON_CHANGED/);
  assert.equal(await db().taskVersion.count(),before);
  const env=process.env.MATHS4U_ENV;process.env.MATHS4U_ENV="production";
  try{await assert.rejects(importOriginalQuadraticsLocal(actor,pack),/ORIGINAL_LOCAL_ONLY/);}finally{process.env.MATHS4U_ENV=env;}
}).finally(async()=>{await db().$disconnect();});
