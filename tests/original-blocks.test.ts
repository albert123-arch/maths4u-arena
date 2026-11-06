import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
import { userSelect } from "../src/lib/security";
import { originalBlockSchema, originalBlocks, originalLessonId, importOriginalBlockLocal } from "../src/lib/original-blocks";
import { publicVersion, versionInclude } from "../src/lib/content";
import { courseCatalog, topicContent, catalog } from "../src/lib/catalog";
import {quadraticTopics} from "../src/lib/square-model";
import {questionsForTopic} from "../src/lib/square-content";
import {allPure1Questions} from "../src/lib/pure1-variants";

test("registered original blocks: separate identities, complete rubrics, unchanged versions and guest boundaries",async()=>{
 const cfg=databaseConfig();assert.equal(process.env.MATHS4U_ENV,"test");assert.equal(cfg.host,"127.0.0.1");assert.match(cfg.database,/^maths4u_test_bank_/);
 const actor=await db().user.findFirstOrThrow({where:{roles:{some:{role:"ADMIN"}}},select:userSelect});
 const short={questions:allPure1Questions};
 const before=await db().taskVersion.count(),beforeLessons=await db().lessonVersion.count(),seen=new Set<string>();
 for(const block of Object.values(originalBlocks).map(b=>b.key)){
  const pack=originalBlockSchema.parse(JSON.parse(await readFile(`content/original/${block}-v1.json`,"utf8")));
  const result=await importOriginalBlockLocal(actor,pack);assert.equal(result.created,0);assert.equal(result.skipped,10);
  for(const p of pack.problems){
   const taskId=result.mapping[p.uid];assert.ok(!seen.has(taskId));seen.add(taskId);
   const task=await db().task.findUniqueOrThrow({where:{id:taskId},include:{versions:{orderBy:{number:"desc"},include:versionInclude}}});
   assert.deepEqual(task.versions.map(v=>v.number).sort((a,b)=>a-b),Array.from({length:task.versions.length},(_,i)=>i+1));const v=task.versions[0];assert.equal(v.sourceUid,p.uid);
   assert.equal(v.parts.length,3);assert.equal(v.parts.reduce((n,a)=>n+a.maxPoints,0),p.marks);
   assert.equal(v.examBoard,null);assert.equal(v.year,null);assert.equal(v.texts[0].markSchemeStatus,"DRAFT");
   const noHelp=publicVersion(v,"en",false),help=publicVersion(v,"en",true);
   assert.ok(!("answer"in noHelp)&&!("solution"in noHelp)&&!("markScheme"in noHelp));
   assert.ok(help.solution&&help.markScheme?.includes("not an official"));
   for(const [i,a]of p.parts.entries()){
    assert.equal(v.parts[i].kind,"MANUAL");assert.equal(v.parts[i].maxPoints,a.marks);
    assert.ok(noHelp.parts[i].prompt);assert.ok(!("rubric"in noHelp.parts[i]));assert.ok(!("answer"in noHelp.parts[i]));
    assert.ok(help.parts[i].answer);for(const criterion of a.criteria)assert.ok(help.parts[i].rubric?.includes(criterion.id));
   }
  }
  for(const l of pack.lessons){
   const id=originalLessonId(pack.key,l.key),lesson=await db().lesson.findUniqueOrThrow({where:{id},include:{versions:true,tasks:true}});
   assert.ok(lesson.versions.length>=1);
   assert.deepEqual(lesson.versions.map(v=>v.number).sort((a,b)=>a-b),Array.from({length:lesson.versions.length},(_,i)=>i+1));
   assert.equal(lesson.tasks.length,2+short.questions.filter(q=>q.block===block&&q.skill===l.key).length+(quadraticTopics.find(t=>t.lessonId===id)?questionsForTopic(quadraticTopics.find(t=>t.lessonId===id)!.key).length:0));
   const content=await topicContent(null,id,"en");assert.ok(content.body.length>100);assert.ok((content.body+content.examples).includes("katex"));assert.ok(content.examples.includes("Example 3"));
   if(block==="coordinate-geometry")assert.ok(content.body.includes('<img src="/assets/original/coordinate-geometry/'));
   if(block==="circular-measure")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="composite-sectors"?2:1);
   if(block==="trigonometry")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="graphs"?2:1);
   if(block==="series")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="geometric"?2:1);
   if(block==="binomial-expansion")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="general-term"?2:1);
   if(block==="differentiation")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="curve-behaviour"?2:1);
   if(block==="integration")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="areas"?2:1);
   if(block==="cross-topic-revision")assert.equal((content.body.match(/<img /g)||[]).length,l.key==="geometry-calculus"?2:1);
   const questions=await catalog(null,"en",{topic:id,mode:"WRITTEN"});assert.equal(questions.total,2+(quadraticTopics.find(t=>t.lessonId===id)?questionsForTopic(quadraticTopics.find(t=>t.lessonId===id)!.key).length:0));
   assert.ok(questions.items.every(t=>[1,3].includes(t.version.parts.length)&&!("solution"in t.version)));
  }
  const changed=structuredClone(pack);changed.problems[0].title+=" changed";
  await assert.rejects(importOriginalBlockLocal(actor,changed),/ORIGINAL_EXPLICIT_VERSION_MIGRATION_REQUIRED/);
  const late=structuredClone(pack);late.lessons[2].notes_html+="<p>Changed revision.</p>";
  await assert.rejects(importOriginalBlockLocal(actor,late),/ORIGINAL_LESSON_CHANGED/);
  const wrongTopic=structuredClone(pack);wrongTopic.lessons[0].php_subchapter_id=99999;assert.throws(()=>originalBlockSchema.parse(wrongTopic));
  const badCriteria=structuredClone(pack);badCriteria.problems[0].parts[0].criteria[0].id="other-task:a:C1";assert.throws(()=>originalBlockSchema.parse(badCriteria));
  const wrongBlock=structuredClone(pack);wrongBlock.problems[0].uid="M4U-ORIG-"+(block==="functions"?"QUAD":"FUNC")+"-001";assert.throws(()=>originalBlockSchema.parse(wrongBlock));
 }
 assert.equal(seen.size,Object.keys(originalBlocks).length*10);assert.equal(await db().taskVersion.count(),before);
 assert.equal(await db().lessonVersion.count(),beforeLessons);
 const courses=await courseCatalog(null,"en","maths4u-9709-p1");assert.equal(courses[0].count,Object.keys(originalBlocks).length*10+short.questions.length+152);assert.equal(courses[0].chapters.length,Object.keys(originalBlocks).length);
 for(const spec of Object.values(originalBlocks))assert.equal(courses[0].chapters.find(c=>c.id===spec.chapterId)?.topics.length,5);
}).finally(()=>db().$disconnect());
