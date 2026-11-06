import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
import { userSelect } from "../src/lib/security";
import { contentPackages, packageTopic } from "../src/lib/content-package-content";
import { planContentPackage, applyContentPackage, changeContentPackage, packageFingerprint } from "../src/lib/content-packages";
import { checkSquare, helpSquare, squareProgress } from "../src/lib/square-learning";
import { catalog, courseCatalog } from "../src/lib/catalog";
import { followCourse } from "../src/lib/personal-learning";
import { contentPackageSchema } from "../src/lib/content-package-schema";
import { squareSelfMarks } from "../src/lib/question-support";

const cfg=databaseConfig();
if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||cfg.port!==33317||!cfg.database.startsWith("maths4u_test_bank_c1_"))throw Error("C1_LOCAL_ONLY");
test.after(()=>db().$disconnect());
test("C1 local lifecycle: dry run, authorisation, append-only import, drafts, publication, review, archive and restore",async()=>{
 const fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));
 const [admin,teacher,student]=await Promise.all([fixture.admin,fixture.teacher,fixture.student].map(id=>db().user.findUniqueOrThrow({where:{id},select:userSelect})));
 const p=contentPackages[0],topic=packageTopic(p.lessons[0].id)!,fingerprint=packageFingerprint(p);
 await assert.rejects(()=>planContentPackage(teacher,p.key));
 const before=await db().task.count(),audits=await db().auditEvent.count(),versions=await db().taskVersion.count();
 const dry=await planContentPackage(admin,p.key);
 assert.equal(await db().task.count(),before);assert.equal(await db().auditEvent.count(),audits);
 assert.equal(dry.create+dry.update+dry.skip,94);
 if(dry.state!=="ALREADY_APPLIED"){
  assert.equal(dry.create,94);
  await assert.rejects(()=>applyContentPackage(admin,p.key,{token:"0".repeat(64)}));
  assert.equal(await db().task.count(),before);
  await applyContentPackage(admin,p.key,{token:dry.token});
 }
 const repeated=await planContentPackage(admin,p.key),repeatBefore=await db().taskVersion.count(),repeatAudit=await db().auditEvent.count();
 assert.equal(repeated.state,"ALREADY_APPLIED");assert.equal(repeated.skip,94);
 await applyContentPackage(admin,p.key,{token:repeated.token});
 assert.equal(await db().taskVersion.count(),repeatBefore);assert.equal(await db().auditEvent.count(),repeatAudit);
 assert.equal(await db().contentRelease.count({where:{key:"pkg:"+p.key+":"+p.version}}),1);
 assert.equal((await catalog(null,"en",{})).total,688);
 await assert.rejects(()=>courseCatalog(null,"en",p.course.slug));
 const q=p.questions.find(q=>q.lesson===p.lessons[0].key&&q.collection==="short")!;
 const event={version:p.version,eventKey:randomUUID(),uid:q.id,answers:Object.fromEntries(q.fields.map(f=>[f.key,f.expected])),helpUsed:false,at:Date.now()};
 await assert.rejects(()=>checkSquare(null,event,topic));
 const adminResult=await checkSquare(admin,event,topic);assert(adminResult.correct);
 const beforePubChecks=await db().independentCheck.count();
 await changeContentPackage(admin,p.key,{action:"publish",fingerprint});
 assert.equal((await catalog(null,"en",{})).total,782);
 const c=await courseCatalog(null,"en",p.course.slug);assert.equal(c[0].chapters.length,1);assert.equal(c[0].chapters[0].topics.length,4);
 const guest=await checkSquare(null,{...event,eventKey:randomUUID()},topic);assert(guest.correct);
 assert.equal(await db().independentCheck.count(),beforePubChecks);
 await assert.rejects(()=>helpSquare({uid:q.id,kind:"solution",version:p.version},topic,null));
 assert((await helpSquare({uid:q.id,kind:"hint",version:p.version},topic,null)).html);
 const wrong={...event,eventKey:randomUUID(),answers:{...event.answers,[q.fields[0].key]:"999"}};
 assert.equal((await checkSquare(student,wrong,topic)).correct,false);
 const saved=await squareProgress(student,topic);assert.equal(saved.evidence.at(-1)!.correct,false);
 const fresh=p.questions.find(r=>r.family_uid===q.family_uid&&r.id!==q.id)!;
 assert(fresh);assert((await checkSquare(student,{...event,eventKey:randomUUID(),uid:fresh.id,answers:Object.fromEntries(fresh.fields.map(f=>[f.key,f.expected]))},topic)).correct);
 const course=await db().course.findUniqueOrThrow({where:{slug:p.course.slug}});
 await followCourse(student,course.id,{selected:true});
 const exam=p.questions.find(q=>q.collection==="exam")!;
 const guidance=await helpSquare({uid:exam.id,kind:"guidance",version:p.version,access:"paper"},packageTopic(p.lessons.find(l=>l.key===exam.lesson)!.id)!,null);
 assert.equal(guidance.rows?.reduce((n,r)=>n+r.marks,0),exam.marks);
 const beforeSelf=await db().independentCheck.count(),answerCount=await db().answer.count(),reviewCount=await db().review.count();
 await squareSelfMarks(student,{uid:exam.id,version:p.version,points:1},packageTopic(p.lessons.find(l=>l.key===exam.lesson)!.id)!);
 assert.equal(await db().independentCheck.count(),beforeSelf);assert.equal(await db().answer.count(),answerCount);assert.equal(await db().review.count(),reviewCount);
 assert(await db().practiceStudy.count({where:{selfPoints:1,attempt:{userId:student.id}}}));
 const visible=await catalog(teacher,"en",{course:course.id,pageSize:50});
 assert.equal(visible.total,94);const body=JSON.stringify(visible);
 for(const s of ['original_id','provenance','sourceReference','original_source_url','FM June','"teacherNote"'])assert(!body.includes(s),s);
 const ids=(await db().importRecord.findMany({where:{sourceProject:"arena-package-"+p.key},orderBy:{legacyId:"asc"}})).map(r=>r.taskId);
 const checks=await db().independentCheck.count(),history=await db().taskVersion.count();
 await changeContentPackage(admin,p.key,{action:"archive",fingerprint});
 assert.equal((await catalog(null,"en",{})).total,688);
 await assert.rejects(()=>checkSquare(admin,event,topic));
 await changeContentPackage(admin,p.key,{action:"restore",fingerprint});
 assert.equal(await db().taskVersion.count(),history);assert.equal(await db().independentCheck.count(),checks);
 assert.deepEqual((await db().importRecord.findMany({where:{sourceProject:"arena-package-"+p.key},orderBy:{legacyId:"asc"}})).map(r=>r.taskId),ids);
 assert.equal((await db().contentPackage.findUniqueOrThrow({where:{key:p.key}})).state,"DRAFT");
 const oldVersion=p.version;p.questions[0].hint_html+=" ";await assert.rejects(()=>planContentPackage(admin,p.key));p.questions[0].hint_html=p.questions[0].hint_html.slice(0,-1);assert.equal(p.version,oldVersion);
 await fs.writeFile(".local/c1-20261106/lifecycle.json",JSON.stringify({dryRunNoWrites:true,idempotent:true,sourceConfidential:true,guestCheckNoWrites:true,reviewSaved:true,archiveRestorePreserved:true,finalState:"DRAFT",created:dry.state==="ALREADY_APPLIED"?0:94,oldTasks:before,oldVersions:versions,packageTasks:ids.length},null,2));
});

test("a second package version appends versions without overwriting old answer keys",async()=>{
 const fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8")),admin=await db().user.findUniqueOrThrow({where:{id:fixture.admin},select:userSelect});
 const p=structuredClone(contentPackages[0]);p.key="c1-lifecycle-fixture";p.course.slug="c1-lifecycle-fixture";p.chapter.id="c1_fixture_chapter";p.chapter.slug="fixture";
 p.lessons=p.lessons.slice(0,1);p.lessons[0].id="c1_fixture_lesson";
 p.questions=p.questions.filter(q=>q.lesson===p.lessons[0].key&&q.collection!=="exam").map(q=>({...q,id:"fixture-"+q.id,family_uid:"fixture-"+q.family_uid}));
 p.source={sha256:p.source.sha256,supplied:0,held:[]};contentPackageSchema.parse(p);contentPackages.push(p);
 try{
  const installed=await db().contentPackage.findUnique({where:{key:p.key}});
  if(installed?.state==="ARCHIVED"&&installed.version==="1.0.1"){
    const r=await db().importRecord.findFirstOrThrow({where:{sourceProject:"arena-package-"+p.key,legacyId:p.questions[0].id}});
    const history=await db().taskVersion.findMany({where:{taskId:r.taskId},orderBy:{number:"asc"},include:{texts:true}});
    assert.equal(history.length,2);assert.equal(history[0].texts[0].answer,history[1].texts[0].answer);
    assert.notEqual(history[0].texts[0].hint,history[1].texts[0].hint);return;
  }
  const dry=await planContentPackage(admin,p.key);if(dry.state!=="ALREADY_APPLIED")await applyContentPackage(admin,p.key,{token:dry.token});
  const mapping=await db().importRecord.findFirstOrThrow({where:{sourceProject:"arena-package-"+p.key,legacyId:p.questions[0].id}});
  const previous=await db().taskVersion.findFirstOrThrow({where:{taskId:mapping.taskId},orderBy:{number:"desc"},include:{texts:true}});
  p.version="1.0.1";p.questions[0].hint_html="<p>Write the two root–coefficient relations before substituting the numbers.</p>";
  const plan=await planContentPackage(admin,p.key);if(plan.state!=="ALREADY_APPLIED"){assert.equal(plan.update,8);await applyContentPackage(admin,p.key,{token:plan.token});}
  const old=await db().taskVersion.findUniqueOrThrow({where:{id:previous.id},include:{texts:true}});assert.deepEqual(old,previous);
  const latest=await db().taskVersion.findFirstOrThrow({where:{taskId:mapping.taskId},orderBy:{number:"desc"}});
  assert(latest.number>=2);await changeContentPackage(admin,p.key,{action:"archive",fingerprint:packageFingerprint(p)});
 }finally{contentPackages.splice(contentPackages.indexOf(p),1);}
});
