import { test, expect, request, type APIRequestContext } from "@playwright/test";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run=promisify(execFile),base="http://127.0.0.1:3102",headers={Origin:base},root=process.env.STAGE6_REPORT_ROOT??"test-results/stage6-20261106";
let fixture:{task:string;title:string;part:string;lesson:string;course:string;file:string;attempt:string;studentId:string;demo:string;classId:string;work:string};
async function sql(){const r=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8')),u=new URL(r.MATHS4U_DATABASE_URL);if(r.MATHS4U_ENV!=="test"||u.hostname!=="127.0.0.1"||!u.pathname.startsWith('/maths4u_test_bank_'))throw Error('LOCAL_ONLY');return mysql.createConnection(u.href);}
async function role(name:string){
  const file=`.local/components-20261105/${name}-session.json`,api=await request.newContext({baseURL:base,storageState:file});
  const me=await(await api.get('/api/auth/me')).json();if(me.lens)await api.post('/api/view/exit',{headers,data:{}});
  if(!me.user){const seed=JSON.parse(await fs.readFile('.local/content-bank/preview.json','utf8'));expect((await api.post('/api/auth/login',{headers,data:{username:seed.users[name],password:seed.password}})).status()).toBe(200);await api.storageState({path:file});}
  return api;
}
async function lens(api:APIRequestContext,mode:string,role:string,targetId?:string){expect((await api.post('/api/view/enter',{headers,data:{mode,role,...(targetId?{targetId}:{})}})).status()).toBe(200);return(await(await api.get('/api/auth/me')).json()).lens.nonce as string;}
async function leave(api:APIRequestContext){expect((await api.post('/api/view/exit',{headers,data:{}})).status()).toBe(200);}
test.describe.configure({mode:'serial'});
test.beforeAll(async()=>{
 await fs.mkdir(root,{recursive:true});const c=await sql(),student=await role('student');try{
 const me=await(await student.get('/api/auth/me')).json();
 const [[row]]=await c.query<mysql.RowDataPacket[]>(`SELECT a.id attempt,a.workVersionId,w.id work,w.classId,v.taskId task,(SELECT p.id FROM TaskPart p WHERE p.versionId=v.id ORDER BY p.position LIMIT 1) part,(SELECT tt.title FROM TaskText tt WHERE tt.versionId=v.id AND locale='en') title,lt.lessonId lesson,c.slug course,(SELECT ta.fileId FROM TaskAsset ta WHERE ta.versionId=v.id AND ta.role='MARK_SCHEME' LIMIT 1) file FROM Attempt a JOIN WorkVersion wv ON wv.id=a.workVersionId JOIN Work w ON w.id=wv.workId JOIN WorkItem i ON i.workVersionId=wv.id JOIN TaskVersion v ON v.id=i.taskVersionId JOIN Task t ON t.id=v.taskId JOIN LessonTask lt ON lt.taskId=t.id JOIN Lesson l ON l.id=lt.lessonId JOIN Topic ch ON ch.id=l.topicId JOIN Course c ON c.id=ch.courseId WHERE a.userId=? AND t.examArchivedAt IS NOT NULL AND EXISTS(SELECT 1 FROM TaskAsset ta WHERE ta.versionId=v.id AND ta.role='MARK_SCHEME') ORDER BY a.startedAt LIMIT 1`,[me.user.id]);expect(row).toBeTruthy();
 const [[demo]]=await c.query<mysql.RowDataPacket[]>(`SELECT t.id FROM Task t JOIN TaskVersion v ON v.taskId=t.id JOIN Source s ON s.id=v.sourceId WHERE s.name='Local preview demo' LIMIT 1`);
 fixture={...row,studentId:me.user.id,demo:demo.id} as typeof fixture;
 let seeded:{attempt:string;work:string}|null=null;try{seeded=JSON.parse(await fs.readFile('.local/stage6-20261106/history-seed.json','utf8'));}catch{}
 if(!seeded){
   const teacher=await role('teacher'),admin=await role('admin'),teacherId=(await(await teacher.get('/api/auth/me')).json()).user.id;
   const [[member]]=await c.query<mysql.RowDataPacket[]>('SELECT m.classId FROM ClassMembership m JOIN Classroom c ON c.id=m.classId WHERE m.userId=? AND m.removedAt IS NULL AND c.teacherId=? AND c.archivedAt IS NULL LIMIT 1',[me.user.id,teacherId]);expect(member).toBeTruthy();
   const [[before]]=await c.query<mysql.RowDataPacket[]>("SELECT originManual,originReason,originRule,DATE_FORMAT(examArchivedAt,'%Y-%m-%d %H:%i:%s.%f') stamp FROM Task WHERE id=?",[fixture.task]);
   try{
     expect((await admin.patch('/api/admin/content/'+fixture.task,{headers,data:{archive:false,reason:'Controlled local history fixture setup'}})).status()).toBe(200);
     const created=await teacher.post('/api/works',{headers,data:{title:'Stage 6 controlled archive-history QA',classId:member.classId,kind:'HOMEWORK',taskIds:[fixture.task],opensAt:new Date(Date.now()-10000).toISOString(),dueAt:new Date(Date.now()+3600000).toISOString(),resultPolicy:'AFTER_SUBMIT',revealSolutions:true}});expect(created.status()).toBe(201);const work=(await created.json()).id;
     const started=await student.post(`/api/works/${work}/start`,{headers,data:{}});expect(started.status()).toBe(200);const attempt=(await started.json()).id,a=await(await student.get('/api/attempts/'+attempt)).json(),parts=a.questions.flatMap((q:{parts:{id:string;maxPoints:number}[]})=>q.parts);
     expect((await student.post(`/api/attempts/${attempt}/submit`,{headers,data:{revision:a.revision,answers:parts.map((p:{id:string})=>({partId:p.id,response:{value:'Synthetic student solution retained for the local archive-history test.'}}))}})).status()).toBe(200);
     expect((await teacher.post(`/api/attempts/${attempt}/review`,{headers,data:{reviews:parts.map((p:{id:string;maxPoints:number})=>({partId:p.id,points:Math.min(1,p.maxPoints),comment:'Synthetic teacher feedback for preservation check.',revision:0}))}})).status()).toBe(200);
     seeded={attempt,work};await fs.writeFile('.local/stage6-20261106/history-seed.json',JSON.stringify(seeded));
   }finally{await c.query('UPDATE Task SET examArchivedAt=?,originManual=?,originReason=?,originRule=? WHERE id=?',[before.stamp,before.originManual,before.originReason,before.originRule,fixture.task]);await Promise.all([teacher.dispose(),admin.dispose()]);}
 }
 fixture.attempt=seeded!.attempt;fixture.work=seeded!.work;
 await fs.writeFile('.local/stage6-20261106/fixture.json',JSON.stringify(fixture));
 }finally{await c.end();await student.dispose();}
});

test('stage6: guests, students, teachers and lenses cannot retrieve archived questions or files',async()=>{
 const admin=await role('admin'),guest=await request.newContext({baseURL:base}),student=await role('student'),teacher=await role('teacher');
 try{
  for(const api of [guest,student,teacher]){
    const catalog=await(await api.get('/api/catalog?pageSize=50')).json();expect(catalog.items.some((t:{id:string})=>t.id===fixture.task)).toBe(false);
    expect((await api.get('/api/catalog?origin=CAMBRIDGE_EXAM')).status()).toBe(403);
    expect((await api.get('/api/catalog/topics/'+fixture.lesson)).status()).toBe(404);
    expect((await api.get('/api/catalog/courses?slug='+fixture.course)).status()).toBe(404);
    expect((await api.get('/api/courses?slug='+fixture.course)).status()).toBe(404);
    expect((await api.get('/courses/'+fixture.course)).status()).toBe(404);
    expect((await api.get(`/courses/${fixture.course}/topics/${fixture.lesson}`)).status()).toBe(404);
    expect((await api.post(`/api/catalog/tasks/${fixture.task}/support`,{headers,data:{kind:'guidance',access:'paper'}})).status()).toBe(404);
    for(const variant of ['original','preview','thumbnail'])expect((await api.get(`/api/files/${fixture.file}?variant=${variant}`)).status()).toBe(404);
    const old=await(await api.get('/api/library?q='+encodeURIComponent(fixture.title))).json();expect(old.some((t:{id:string})=>t.id===fixture.task)).toBe(false);
  }
  expect((await student.post(`/api/tasks/${fixture.task}/practice`,{headers,data:{}})).status()).toBe(404);
  expect((await student.post('/api/study/start',{headers,data:{taskId:fixture.task}})).status()).toBe(404);
  const privileged=await(await admin.get('/api/catalog?origin=CAMBRIDGE_EXAM&archive=1')).json();expect(privileged.total).toBe(2654);expect(privileged.items[0].examArchivedAt).toBeTruthy();
  expect((await admin.get('/api/tasks/'+fixture.task)).status()).toBe(200);expect((await teacher.get('/api/tasks/'+fixture.task)).status()).toBe(404);expect((await admin.get('/api/files/'+fixture.file)).status()).toBe(200);
  for(const api of [teacher,admin]){
    const classes=await(await api.get('/api/classes?manage=1')).json();const id=classes.find((c:{archivedAt:string|null})=>!c.archivedAt)?.id;expect(id).toBeTruthy();
    expect((await api.post('/api/works',{headers,data:{title:'Forbidden archived assignment',kind:'HOMEWORK',classId:id,taskIds:[fixture.task],opensAt:new Date(Date.now()-10000).toISOString(),dueAt:new Date(Date.now()+3600000).toISOString()}})).status()).toBe(400);
    const nonce=await lens(api,'ROLE','STUDENT');expect((await api.get('/api/files/'+fixture.file,{headers:{'X-Arena-View':nonce}})).status()).toBe(404);expect((await api.get('/api/catalog/topics/'+fixture.lesson,{headers:{'X-Arena-View':nonce}})).status()).toBe(404);await leave(api);
  }
  const n=await lens(admin,'USER','STUDENT',fixture.studentId);expect((await admin.get('/api/files/'+fixture.file,{headers:{'X-Arena-View':n}})).status()).toBe(404);await leave(admin);
  const sitemap=await(await guest.get('/sitemap.xml')).text();expect(sitemap).not.toContain('/courses/'+fixture.course);expect(sitemap).toContain('/courses/maths4u-9709-p1');
  const search=await(await guest.get('/search?q='+encodeURIComponent(fixture.title))).text();expect(search).not.toContain('href="/courses/'+fixture.course);
  await fs.writeFile(root+'/access-matrix.json',JSON.stringify({guestStudentTeacherDenied:true,allFileVariantsDenied:true,adminAllowed:true,lensesDenied:true,emptyHierarchy404:true,newAssignmentDeniedIncludingAdmin:true,sitemapClean:true},null,2));
 }finally{await Promise.all([admin.dispose(),guest.dispose(),student.dispose(),teacher.dispose()]);}
});

test('stage6: existing history keeps the student response and points without the question',async({browser})=>{
 const c=await sql(),api=await role('student');try{
  const [before]=await c.query('SELECT * FROM Answer WHERE attemptId=?',[fixture.attempt]);const [attemptBefore]=await c.query('SELECT * FROM Attempt WHERE id=?',[fixture.attempt]);
  const r=await api.get('/api/attempts/'+fixture.attempt);expect(r.status()).toBe(200);const a=await r.json();expect(a.containsUnavailable).toBe(true);expect(a.title).toBe('This material is no longer available');expect(a.answers.length).toBeGreaterThan(0);
  const [saved]=await c.query<mysql.RowDataPacket[]>('SELECT a.id,a.response,COALESCE(r.points,a.autoPoints,0) points FROM Answer a LEFT JOIN Review r ON r.answerId=a.id WHERE a.attemptId=?',[fixture.attempt]);
  for(const answer of a.answers){const original=saved.find(s=>s.id===answer.id)!;expect(answer.response).toEqual(typeof original.response==='string'?JSON.parse(original.response):original.response);}
  if(a.resultVisible)expect(a.score).toBeCloseTo(saved.reduce((n,r)=>n+r.points,0),8);
  for(const q of a.questions){expect(q.unavailable).toBe(true);expect(q.statement).toBe('<p>This material is no longer available</p>');expect(q.assets).toEqual([]);for(const key of ['answer','hint','solution','markScheme','teacherNote','source'])expect(q[key]).toBeUndefined();}
  expect((await api.post(`/api/attempts/${fixture.attempt}/help`,{headers,data:{kind:'solution'}})).status()).toBeGreaterThanOrEqual(400);
  const [after]=await c.query('SELECT * FROM Answer WHERE attemptId=?',[fixture.attempt]);const [attemptAfter]=await c.query('SELECT * FROM Attempt WHERE id=?',[fixture.attempt]);expect(after).toEqual(before);expect(attemptAfter).toEqual(attemptBefore);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();try{
   for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto('/attempts/'+fixture.attempt);await expect(page.getByRole('heading',{level:1})).toHaveText('This material is no longer available');await expect(page.getByLabel('Your answer',{exact:true}).first()).toHaveAttribute('readonly','');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if([390,1280].includes(width))await page.screenshot({path:`${root}/after/history-${width}-${theme}.png`,fullPage:true});}
  }finally{await page.close();await ctx.close();}
  await fs.writeFile(root+'/history-preserved.json',JSON.stringify({responsesUnchanged:true,attemptUnchanged:true,questionAndGuidanceAbsent:true,answerCount:a.answers.length,score:a.score??null},null,2));
 }finally{await c.end();await api.dispose();}
});

test('stage6: restore works; re-archive invalidates an already issued scan link and cached public page',async()=>{
 const c=await sql(),admin=await role('admin'),guest=await request.newContext({baseURL:base});const [[before]]=await c.query<mysql.RowDataPacket[]>("SELECT originManual,originReason,originRule,DATE_FORMAT(examArchivedAt,'%Y-%m-%d %H:%i:%s.%f') stamp FROM Task WHERE id=?",[fixture.task]);
 try{
  expect((await admin.patch('/api/admin/content/'+fixture.task,{headers,data:{origin:'CAMBRIDGE_EXAM',archive:false,reason:'Controlled local explicit owner approval and restoration test'}})).status()).toBe(200);
  expect((await guest.get('/api/files/'+fixture.file)).status()).toBe(404); // help remains gated until explicitly requested
  const support=await guest.post(`/api/catalog/tasks/${fixture.task}/support`,{headers,data:{kind:'guidance',access:'paper'}});expect(support.status()).toBe(200);const help=await support.json(),url=help.html.match(/(?:src|href)=["']([^"']+support=[^"']+)/)?.[1]?.replaceAll('&amp;','&');expect(url).toBeTruthy();expect((await guest.get(url)).status()).toBe(200);
  expect((await guest.get(`/courses/${fixture.course}/topics/${fixture.lesson}`)).status()).toBe(200);
  expect((await admin.patch('/api/admin/content/'+fixture.task,{headers,data:{archive:true,reason:'Controlled local re-archival test'}})).status()).toBe(200);
  expect((await guest.get(url)).status()).toBe(404);expect((await guest.get(`/courses/${fixture.course}/topics/${fixture.lesson}`)).status()).toBe(404);
  await fs.writeFile(root+'/restore-and-stale-grant.json',JSON.stringify({restoreAvailable:true,signedScanReadBeforeArchive:true,sameSignedScanDeniedImmediatelyAfterArchive:true,publicPage404Immediately:true},null,2));
 }finally{await c.query('UPDATE Task SET examArchivedAt=?,originManual=?,originReason=?,originRule=? WHERE id=?',[before.stamp,before.originManual,before.originReason,before.originRule,fixture.task]);await c.end();await Promise.all([admin.dispose(),guest.dispose()]);}
});

test('stage6: manual owner origin is not overwritten by the classifier',async()=>{
 const c=await sql(),admin=await role('admin');const [[old]]=await c.query<mysql.RowDataPacket[]>('SELECT origin,originManual,originReason,originRule,examArchivedAt FROM Task WHERE id=?',[fixture.demo]);
 try{
  expect((await admin.patch('/api/admin/content/'+fixture.demo,{headers,data:{origin:'OTHER_THIRD_PARTY',archive:false,reason:'Controlled local manual-origin preservation test'}})).status()).toBe(200);
  const runtime=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8'));
  await run(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/content-policy.ts','--mode','classify','--apply','--actor',(await(await admin.get('/api/auth/me')).json()).user.id,'--report','.local/stage6-20261106/manual-test.json'],{env:{...process.env,...runtime},windowsHide:true});
  const [[current]]=await c.query<mysql.RowDataPacket[]>('SELECT origin,originManual,originReason FROM Task WHERE id=?',[fixture.demo]);expect(current.origin).toBe('OTHER_THIRD_PARTY');expect(current.originManual).toBe(1);expect(current.originReason).toContain('Controlled local');
 }finally{await c.query('UPDATE Task SET origin=?,originManual=?,originReason=?,originRule=?,examArchivedAt=? WHERE id=?',[old.origin,old.originManual,old.originReason,old.originRule,old.examArchivedAt,fixture.demo]);await c.end();await admin.dispose();}
});

test('stage6: admin archive is usable at four widths in both themes',async({browser})=>{
 const api=await role('admin'),ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto('/admin/archive');
   await expect(page.locator('.archive-task').first()).toBeVisible();await expect(page.locator('.archive-task').first()).toContainText('Archived · Cambridge');
   await expect(page.getByRole('button',{name:'Restore from archive'}).first()).toBeEnabled();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if([390,1280].includes(width))await page.screenshot({path:`${root}/after/archive-${width}-${theme}.png`});
  }
  expect(errors).toEqual([]);
 }finally{await page.close();await ctx.close();await api.dispose();}
});
