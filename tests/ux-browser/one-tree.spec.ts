import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='http://127.0.0.1:3109',dir='test-results/one-tree-20261107';
let password:string,qa:{taskId:string;fileId:string;oldLessonId:string;works:string[]};
async function login(role:string){const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});expect((await api.post('/api/auth/login',{data:{username:'qa_c1_'+role,password}})).status()).toBe(200);return api;}
test.beforeAll(async()=>{password=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8')).password;qa=JSON.parse(await fs.readFile('.local/one-tree-20261107/qa.json','utf8'));await fs.mkdir(dir,{recursive:true});});
test('One Tree: ordinary admin courses and separate archive at desktop and mobile widths',async({browser})=>{
 const api=await login('admin'),ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage(),errors:string[]=[],matrix=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const courses=await(await api.get('/api/catalog/courses')).json();expect(courses).toHaveLength(6);
  for(const slug of ['maths4u-9231-fp1','maths4u-9231-fp2','maths4u-9231-mechanics','maths4u-9231-statistics']){
   const c=courses.find((c:{slug:string})=>c.slug===slug);
   for(const width of [360,390,768,1280])for(const theme of ['light','dark'] as const){
    await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});expect((await page.goto('/courses/'+slug))?.status()).toBe(200);
    await expect(page.locator('.chapter-topics')).toBeVisible();await expect(page.locator('.archive-badge')).toHaveCount(0);await expect(page.getByText('Cambridge archive only',{exact:true})).toHaveCount(0);
    await expect(page.locator('.chapter-navigation > a')).toHaveCount(c.chapters.length);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(page.locator('.katex-error')).toHaveCount(0);matrix.push({slug,width,theme});
    if(slug==='maths4u-9231-mechanics'&&[390,1280].includes(width))await page.screenshot({path:dir+'/mechanics-'+width+'-'+theme+'.png',fullPage:true});
   }
  }
  const archive=await(await api.get('/api/admin/course-tree/catalog')).json(),mechanics=archive.find((c:{slug:string})=>c.slug==='maths4u-9231-mechanics');
  for(const width of [390,1280])for(const theme of ['light','dark'] as const){await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});await page.goto('/admin/archive-bank?course='+mechanics.id);await expect(page.getByRole('heading',{name:'Cambridge question archive',exact:true})).toBeVisible();await expect(page.locator('.archive-course-cards a')).toHaveCount(5);await expect(page.getByText('Momentum',{exact:false}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await page.screenshot({path:dir+'/archive-'+width+'-'+theme+'.png',fullPage:true});}
  await page.getByText('Update archive placement',{exact:true}).click();await page.getByRole('button',{name:'Dry run placement',exact:true}).click();await expect(page.getByText('1261 questions · 1159 exact links · 63 unallocated',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Apply placement',exact:true}).click();await expect(page.getByText('Rows changed: 0',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);await fs.writeFile(dir+'/responsive.json',JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await api.dispose();}
});
test('Archive: old bookmarks, provenance links, unallocated questions and unchanged old assignments',async({browser})=>{
 const api=await login('admin'),ctx=await browser.newContext({baseURL:base,storageState:await api.storageState(),viewport:{width:390,height:900}}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/api/learning/packages/*/open',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'})); // Navigation QA must not touch an existing learner progress timestamp.
 try{
  const old=await api.get('/courses/maths4u-9231-mechanics/topics/'+qa.oldLessonId,{maxRedirects:0});expect(old.status()).toBe(307);expect(old.headers().location).toContain('/admin/archive-bank?');
  await page.goto('/courses/maths4u-9231-mechanics/topics/'+qa.oldLessonId);await expect(page).toHaveURL(/\/admin\/archive-bank\?.*legacyLesson=/);await expect(page.locator('.archive-origin-navigation')).toBeVisible();await expect(page.locator('.catalog-tasks')).toHaveAttribute('aria-busy','false');
  const context=await(await api.get('/api/admin/course-tree/context?legacyLesson='+qa.oldLessonId)).json();expect(context.origin.destinations.length).toBeGreaterThan(0);
  for(const d of context.origin.destinations){const list=await(await api.get('/api/catalog?source=CAMBRIDGE&topic='+d.id+'&legacyLesson='+qa.oldLessonId)).json();expect(list.total).toBe(d.count);}
  await page.goto('/admin/archive-bank?source=CAMBRIDGE&taskId='+qa.taskId);await expect(page.locator('.catalog-task')).toHaveCount(1);await expect(page.locator('.catalog-tasks')).toHaveAttribute('aria-busy','false');
  const adaptation=page.locator('.archive-related a').first();await expect(adaptation).toBeVisible();const href=await adaptation.getAttribute('href');expect(href).toContain('?item=');await page.goto(href!);await expect(page.locator('.square-lesson')).toBeVisible();await expect(page.getByRole('link',{name:'Compare with Cambridge source →',exact:true})).toBeVisible();
  await page.goto('/admin/archive-bank?source=CAMBRIDGE&topic=archive_unallocated_fp1_induction');await expect(page.locator('.catalog-total')).toHaveText('Available tasks: 63');
  const baseline=JSON.parse(await fs.readFile('.local/one-tree-20261107/work-baseline.json','utf8'));const records=[];
  for(const item of baseline){const res=await api.get(item.path),text=await res.text();expect(res.status()).toBe(item.status);expect(createHash('sha256').update(text).digest('hex')).toBe(item.sha256);records.push({path:item.path,status:res.status()});}
  expect((await api.get('/api/health')).status()).toBe(200);expect(errors).toEqual([]);await fs.writeFile(dir+'/archive-flow.json',JSON.stringify({oldRedirect:true,destinations:context.origin.destinations.length,reciprocalLinks:true,unallocated:63,oldWorkAndFileReadbacks:records,pageErrors:errors},null,2));
 }finally{await ctx.close();await api.dispose();}
});
test('Guest, student, teacher and role previews cannot see the Cambridge archive',async()=>{
 const baseline=JSON.parse(await fs.readFile('.local/one-tree-20261107/roles-before.json','utf8')),results=[];
 for(const role of ['guest','student','teacher']){
  const api=role==='guest'?await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}}):await login(role);
  const c=await(await api.get('/api/catalog/courses')).json();expect(c).toHaveLength(baseline[role].courses.length);let seen=0;
  for(let page=1;;page++){const data=await(await api.get('/api/catalog?pageSize=50&page='+page)).json();expect(data.total).toBe(2857);for(const q of data.items){expect(q).not.toHaveProperty('related');expect(q).not.toHaveProperty('origin');expect(q.version.source??'').not.toMatch(/^Cambridge(?: International)?$/);seen++;}if(page>=data.pages)break;}
  expect(seen).toBe(2857);expect((await api.get('/api/catalog?source=CAMBRIDGE')).status()).toBe(403);expect((await api.get('/api/catalog/topics/'+qa.oldLessonId)).status()).toBe(404);expect((await api.get('/api/files/'+qa.fileId)).status()).toBe(404);expect((await api.get('/api/admin/course-tree/catalog')).status()).toBe(role==='guest'?401:403);
  expect((await api.get('/courses/maths4u-9231-mechanics/topics/'+qa.oldLessonId)).status()).toBe(404);
  const xml=await(await api.get('/sitemap.xml')).text();expect(xml).not.toContain(qa.oldLessonId);expect(xml).not.toContain('archive_unallocated');expect(xml).not.toContain('/admin/');
  results.push({role,seen,archiveHidden:true});await api.dispose();
 }
 const admin=await login('admin');
 for(const role of ['STUDENT','TEACHER']){
  expect((await admin.post('/api/view/enter',{data:{mode:'ROLE',role}})).status()).toBe(200);const me=await(await admin.get('/api/auth/me')).json();const headers={'x-arena-view':me.lens.nonce};
  expect((await admin.get('/api/admin/course-tree/catalog',{headers})).status()).toBe(403);expect((await admin.get('/api/catalog?source=CAMBRIDGE',{headers})).status()).toBe(403);expect((await admin.get('/courses/maths4u-9231-mechanics/topics/'+qa.oldLessonId)).status()).toBe(404);expect((await admin.post('/api/view/exit',{headers,data:{}})).status()).toBe(200);
 }
 await admin.dispose();await fs.writeFile(dir+'/public-boundaries.json',JSON.stringify({results,rolePreviews:2,searchAndSitemapGuarded:true},null,2));
});
