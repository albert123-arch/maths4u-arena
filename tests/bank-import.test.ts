import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {randomBytes} from "node:crypto";
import {db} from "../src/lib/prisma";
import {databaseConfig} from "../src/lib/database-url";
import {digest,userSelect} from "../src/lib/security";
import {hashPassword} from "../src/lib/password";
import {readPilot} from "../scripts/pilot/import";
import {writePilot} from "../src/lib/pilot-import";
import {beginBank,stageBankBatch,bankAssetStatus,stageBankFile,applyBankStructure,checkBankTasks,applyBankTasks,bankStatus} from "../src/lib/bank-import";
import {bankManifestSchema,bankAssetsSchema,bankTasksSchema, type BankAsset} from "../src/lib/bank-schema";
import {createClass,joinClass} from "../src/lib/classrooms";
import {publishWork,startAttempt,getAttempt,mutateAttempt,gradeAttempt} from "../src/lib/works";
import {beginStudy,revealStudyHelp} from "../src/lib/study";
import {versionInclude,renderContent,publicVersion} from "../src/lib/content";
import {catalog,courseCatalog} from "../src/lib/catalog";
import {download} from "../src/lib/files";
import {privateStorageRoot} from "../src/lib/storage-config";
import {GET,POST} from "../src/app/api/[...path]/route";

test("complete five-course bank, resumable import and historical preservation",{timeout:900000},async t=>{
  t.after(()=>db().$disconnect());let passed=0;
  const check=async(name:string,fn:()=>Promise<void>)=>t.test(name,async()=>{await fn();passed++;});
  const cfg=databaseConfig();assert.equal(process.env.MATHS4U_ENV,"test");assert.equal(cfg.host,"127.0.0.1");assert.match(cfg.database,/^maths4u_test_bank_/);
  const root=path.resolve('.local/content-bank/publish'),manifest=bankManifestSchema.parse(JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'))),payload=async(key:string)=>JSON.parse(await readFile(path.join(root,'batches',key+'.json'),'utf8'));
  const password=randomBytes(24).toString('base64url'),hash=await hashPassword(password);
  const user=async(name:string,role:"ADMIN"|"TEACHER"|"STUDENT")=>db().user.create({data:{username:name,displayName:name,passwordHash:hash,roles:{create:{role}},profile:{create:{locale:'en'}}},select:userSelect});
  const admin=await user('bank_admin','ADMIN'),teacher=await user('bank_teacher','TEACHER'),student=await user('bank_student','STUDENT'),other=await user('bank_other','STUDENT');
  const pilot=await readPilot(path.resolve('.local/content-pilot')),oldImport=await writePilot(admin,pilot.bundle,pilot.fileData,'bank-control-pilot'),pilotIds=oldImport.sections[0].taskIds;
  const classroom=await createClass(teacher,{title:'Bank control class'});await joinClass(student,{code:classroom.joinCode});
  const oldWork=await publishWork(teacher,{title:'Historical assessment',classId:classroom.id,taskIds:pilotIds.slice(0,2),opensAt:new Date(Date.now()-1000),dueAt:new Date(Date.now()+7*86400000),resultPolicy:'MANUAL',revealSolutions:true});
  const attempt=await startAttempt(student,oldWork.id),dto=await getAttempt(student,attempt.id,'en');await mutateAttempt(student,attempt.id,{revision:dto.revision,answers:[{partId:dto.questions[0].parts[0].id,response:{value:'Keep the original answer'}}]},true);await gradeAttempt(teacher,attempt.id,{reviews:[{partId:dto.questions[0].parts[0].id,points:1,comment:'Keep the original grade'}]});
  const historicalIds=(await db().taskVersion.findMany({select:{id:true}})).map(v=>v.id);
  const snapshot=async()=>digest(JSON.stringify({users:await db().user.findMany({orderBy:{id:'asc'},include:{roles:true,profile:true}}),versions:await db().taskVersion.findMany({where:{id:{in:historicalIds}},orderBy:{id:'asc'},include:versionInclude}),work:await db().workVersion.findUnique({where:{id:oldWork.versions[0].id},include:{items:true}}),attempt:await db().attempt.findUnique({where:{id:attempt.id},include:{answers:{include:{review:true}}}})}));
  const before=await snapshot();let runId='';const plans=new Map<string,Awaited<ReturnType<typeof checkBankTasks>>>();
  await check('dry run stages bounded batches and leaves all learning data untouched',async()=>{
    await assert.rejects(beginBank(student,{manifest}),/FORBIDDEN/);const r=await beginBank(admin,{manifest,publishNew:true});runId=r.runId;
    for(const m of manifest.batches) {const p=await payload(m.key);assert.equal(digest(JSON.stringify(p)),m.sha256);assert.ok(Buffer.byteLength(JSON.stringify(p))<=512*1024);await stageBankBatch(admin,{runId,key:m.key,payload:p});}
    assert.deepEqual((await bankStatus(admin,runId)).missingBatches,[]);
    const first=manifest.batches.find(b=>b.kind==='tasks')!;await assert.rejects(stageBankBatch(admin,{runId,key:first.key,payload:[]}),/BANK_BATCH_HASH/);
    let created=0,updated=0;for(const b of manifest.batches.filter(b=>b.kind==='tasks')){const p=await checkBankTasks(admin,{runId,key:b.key});plans.set(b.key,p);created+=p.created;updated+=p.updated;}
    assert.equal(created,manifest.tasks-36);assert.equal(updated,36);assert.equal(await db().task.count(),56);assert.equal(await snapshot(),before);
    await writeFile('.local/content-bank/dry-run.json',JSON.stringify({runId,plans:Object.fromEntries(plans)},null,2));
  });
  const assets:BankAsset[]=[];
  await check('original assets are resumable, validated and private',async()=>{
    let n=0;for(const b of manifest.batches.filter(b=>b.kind==='assets')){const rows=bankAssetsSchema.parse(await payload(b.key));assets.push(...rows);const status=await bankAssetStatus(admin,{runId,key:b.key});
      for(const a of rows)if(status.missing.includes(a.id)){const bytes=await readFile(path.join(root,a.file));assert.equal(digest(bytes),a.sha256);await stageBankFile(admin,{runId,key:b.key,id:a.id,base64:bytes.toString('base64')});if(++n%500===0)console.log('Verified and staged bank files: '+n);}
      assert.deepEqual((await bankAssetStatus(admin,{runId,key:b.key})).missing,[]);
    }assert.equal(await snapshot(),before);const a=assets.find(a=>a.id.startsWith('bank_'))!;await assert.rejects(download(null,a.id),/NOT_FOUND/);
  });
  await check('interrupted task import resumes, reuses all pilot IDs and preserves old results',async()=>{
    for(const b of manifest.batches.filter(b=>b.kind==='structure'))await applyBankStructure(admin,{runId,key:b.key});
    const batches=manifest.batches.filter(b=>b.kind==='tasks');let n=0;
    for(const b of batches){const p=plans.get(b.key)!;await applyBankTasks(admin,{runId,key:b.key,fingerprint:p.fingerprint});n+=b.count;if(n%250===0)console.log('Imported bank tasks: '+n);if(n===250){const resumed=await beginBank(admin,{manifest,publishNew:true});assert.equal(resumed.runId,runId);assert.ok(resumed.applied.includes(b.key));assert.equal(await snapshot(),before);}}
    assert.equal(await db().task.count(),manifest.tasks+20);assert.equal(await snapshot(),before);
    for(const r of pilot.bundle.sections[0].records){const legacy=await db().importRecord.findUniqueOrThrow({where:{sourceProject_legacyId:{sourceProject:'maths4u',legacyId:r.id}}}),canonical=await db().importRecord.findUniqueOrThrow({where:{sourceProject_legacyId:{sourceProject:'maths4u',legacyId:'problems:'+r.id}}});assert.equal(legacy.taskId,canonical.taskId);assert.ok(pilotIds.includes(canonical.taskId));}
    const count=await db().taskVersion.count();for(const b of batches){const p=await checkBankTasks(admin,{runId,key:b.key});assert.equal(p.created+p.updated,0);await applyBankTasks(admin,{runId,key:b.key,fingerprint:p.fingerprint});}assert.equal(await db().taskVersion.count(),count);assert.equal(await snapshot(),before);
  });
  await check('complete hierarchy, pagination, role boundaries and original file hashes',async()=>{
    const courses=await courseCatalog(admin,'en');const expected=JSON.parse(await readFile('.local/content-bank/report.json','utf8'));
    for(const c of manifest.courses){const actual=courses.find(x=>x.slug==='maths4u-'+c.key)!;const source=expected.courses.find((x:{course:string})=>x.course===c.title);assert.equal(actual.count,source.tasks);assert.equal(actual.chapters.length,source.chapters);assert.equal(actual.chapters.reduce((n,ch)=>n+ch.topics.length,0),source.subtopics);}
    const additional=courses.find(c=>c.slug==='maths4u-0606')!,page=await catalog(student,'en',{course:additional.id,page:6,pageSize:25});assert.equal(page.total,1393);assert.equal(page.items[0].number,126);assert.equal(page.items.length,25);assert.equal('solution' in page.items[0].version,false);
    for(const a of assets){const stored=await db().storedFile.findUniqueOrThrow({where:{id:a.id}});assert.equal(digest(await readFile(path.join(privateStorageRoot(),stored.storageKey))),a.sha256);}
    const ms=assets.find(a=>a.role==='MARK_SCHEME'&&a.id.startsWith('bank_'))!;await assert.rejects(download(null,ms.id),/NOT_FOUND/);await assert.rejects(download(other,ms.id),/NOT_FOUND/);
    const selected=page.items[0],task=await db().task.findUniqueOrThrow({where:{id:selected.id},include:{lessons:true}});const study=await beginStudy(student,{taskId:task.id,lessonId:task.lessons[0].lessonId},"en");const hidden=await getAttempt(student,study.id,'en');assert.equal('markScheme' in hidden.questions[0],false);await revealStudyHelp(student,study.id,{kind:'markScheme'},'en');const helped=await getAttempt(student,study.id,'en');assert.ok(helped.questions[0].markScheme);assert.equal('solution' in helped.questions[0],false);
    const w=await publishWork(teacher,{title:'New bank assignment',classId:classroom.id,taskIds:[selected.id],opensAt:new Date(Date.now()-1000),dueAt:new Date(Date.now()+86400000),resultPolicy:'MANUAL',revealSolutions:true});assert.equal((await db().workItem.findFirstOrThrow({where:{workVersionId:w.versions[0].id}})).taskVersionId,selected.version.id);
    const denied=await POST(new Request(process.env.APP_URL+'/api/study/start',{method:'POST',headers:{origin:process.env.APP_URL!,'content-type':'application/json'},body:JSON.stringify({taskId:selected.id})}),{params:Promise.resolve({path:['study','start']})});assert.equal(denied.status,401);
    assert.equal((await GET(new Request(process.env.APP_URL+'/api/health'),{params:Promise.resolve({path:['health']})})).status,200);
    assert.equal(await snapshot(),before);
  });
  let renderChecked=false;
  await check('all source statements and solutions render; new fields export without exposure',async()=>{
    let checked=0;for(const b of manifest.batches.filter(b=>b.kind==='tasks'))for(const row of bankTasksSchema.parse(await payload(b.key))){const rec=await db().importRecord.findUniqueOrThrow({where:{sourceProject_legacyId:{sourceProject:'maths4u',legacyId:row.table+':'+row.id}}}),v=await db().taskVersion.findFirstOrThrow({where:{taskId:rec.taskId},orderBy:{number:'desc'},include:versionInclude});
      for(const field of ['statement','answer','solution','markScheme']as const)assert.ok(!renderContent(v.texts[0][field]??'').includes('katex-error'),row.id+':'+field);
      const publicDto=publicVersion(v,'en');assert.equal('answer' in publicDto,false);assert.equal('markSchemeText' in publicDto,false);assert.equal(v.component,row.material.component);checked++;
    }assert.equal(checked,manifest.tasks);renderChecked=true;
  });
  const courses=await courseCatalog(admin,'en');await writeFile('.local/content-bank/preview.json',JSON.stringify({password,users:{admin:admin.username,teacher:teacher.username,student:student.username,other:other.username},classId:classroom.id,oldWorkId:oldWork.id,oldAttemptId:attempt.id,courses:courses.map(c=>({id:c.id,slug:c.slug,title:c.title,count:c.count,firstLessonId:c.chapters.flatMap(ch=>ch.topics)[0]?.id}))}));
  assert.equal(passed,5);assert.ok(renderChecked);await writeFile('.local/content-bank/validation.json',JSON.stringify({tasks:manifest.tasks,files:manifest.files,bytes:manifest.bytes,runId,pilotTasksPreserved:36,historicalSnapshotBefore:before,historicalSnapshotAfter:await snapshot(),repeat:'no new tasks or versions',checkedAt:new Date().toISOString()},null,2));
  await db().$disconnect();
});
