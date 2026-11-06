import {test,expect,request,type APIRequestContext} from '@playwright/test';import fs from 'node:fs/promises';
const base='http://127.0.0.1:3104',root='test-results/h1-20261106',headers={Origin:base};
let f:{password:string;cam:string;file:string;lesson:string;course:string;work:string;attempt:string;classId:string;original:string};
async function role(name:string){const api=await request.newContext({baseURL:base});expect((await api.post('/api/auth/login',{headers,data:{username:'qa_h1_'+name,password:f.password}})).status()).toBe(200);return api;}
test.beforeAll(async()=>{f=JSON.parse(await fs.readFile('.local/h1-20261106/fixture.json','utf8'));await fs.mkdir(root+'/screenshots',{recursive:true});});
test('H1: HTTP catalogues, every Cambridge task, files, old attempts and administrator access',async()=>{
 const guest=await request.newContext({baseURL:base}),student=await role('student'),teacher=await role('teacher'),admin=await role('admin'),rows=[];
 try{
  const allIds=new Set<string>();let authored=0,olympiad=0,authoredExam=0;for(let page=1;page<=Math.ceil(688/50);page++){const r=await guest.get('/api/catalog?pageSize=50&page='+page);expect(r.status()).toBe(200);const data=await r.json();expect(data.total).toBe(688);for(const q of data.items){expect(['Cambridge','Cambridge International']).not.toContain(q.version.source);expect(q.version.id).toBeTruthy();allIds.add(q.id);if(q.version.source?.startsWith("Maths4U Original")){authored++;if(q.category==="EXAM")authoredExam++;}if(q.version.source?.startsWith("Olymp /"))olympiad++;}}expect(allIds.size).toBe(688);expect(authored).toBe(668);expect(olympiad).toBe(20);expect(authoredExam).toBeGreaterThan(0);
  for(const [name,api] of [['guest',guest],['student',student],['teacher',teacher]] as [string,APIRequestContext][]){
   expect((await(await api.get('/api/catalog')).json()).total).toBe(688);expect((await(await api.get('/api/learning/course-choices')).json()).length).toBe(2);
   const courses=await(await api.get('/api/catalog/courses')).json();expect(courses).toHaveLength(2);expect(courses.some((c:{slug:string})=>c.slug===f.course)).toBe(false);
   for(const url of ['/api/catalog/courses?slug='+f.course,'/api/catalog/topics/'+f.lesson,'/api/courses?slug='+f.course])expect((await api.get(url)).status()).toBe(404);
   for(const url of ['/api/catalog?q=June%202025','/api/library?q=June']){const r=await api.get(url);expect(r.status()).toBe(200);const data=await r.json();expect(Array.isArray(data)?data.length:data.total).toBe(0);}
   for(const variant of ['original','preview','thumbnail'])expect((await api.get('/api/files/'+f.file+'?variant='+variant)).status()).toBe(404);
   for(const url of ['/api/tasks/'+f.cam,'/api/tasks/'+f.cam+'/export','/api/attempts/'+f.attempt,'/api/works/'+f.work]){const denied=await api.get(url);expect([401,403,404]).toContain(denied.status());}
   rows.push({role:name,total:688,courseTopicTaskFilesDenied:true});
  }
  expect((await(await admin.get('/api/catalog')).json()).total).toBe(3342);expect((await(await admin.get('/api/learning/course-choices')).json()).length).toBe(7);expect((await(await admin.get('/api/catalog/courses')).json()).length).toBe(7);expect((await admin.get('/api/tasks/'+f.cam)).status()).toBe(200);expect((await admin.get('/api/attempts/'+f.attempt)).status()).toBe(200);expect((await admin.get('/api/files/'+f.file)).status()).toBe(200);
  expect((await student.post('/api/study/start',{headers,data:{taskId:f.cam}})).status()).toBe(404);expect((await student.post('/api/works/'+f.work+'/start',{headers,data:{}})).status()).toBe(404);
  const denied=await teacher.post('/api/works',{headers,data:{title:'Denied Cambridge assignment',classId:f.classId,kind:'HOMEWORK',taskIds:[f.cam],opensAt:new Date().toISOString(),dueAt:new Date(Date.now()+3600000).toISOString()}});expect([400,404]).toContain(denied.status());
  expect((await guest.get('/sitemap.xml')).status()).toBe(200);const sitemap=await(await guest.get('/sitemap.xml')).text();expect(sitemap).not.toContain(f.course);expect(sitemap).not.toContain(f.cam);
  const search=await(await guest.get('/search?q=Cambridge')).text();expect(search).not.toContain('/courses/'+f.course);
  await fs.writeFile(root+'/http-access.json',JSON.stringify({rows,paginatedGuestTasks:allIds.size,adminTotal:3342,authored,olympiad,authoredExam,allFileVariantsDenied:true,oldAttemptDenied:true,newWorkDenied:true,sitemapClean:true},null,2));
 }finally{await Promise.all([guest.dispose(),student.dispose(),teacher.dispose(),admin.dispose()]);}
});
test('H1: legacy interface remains usable, four widths and light/dark',async({browser})=>{
 const matrix=[],errors:string[]=[],serverErrors:string[]=[];for(const roleName of ['guest','student','teacher','admin']){
  const api=roleName==='guest'?await request.newContext({baseURL:base}):await role(roleName),ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=500)serverErrors.push(r.url());});
  try{const paths=roleName==='guest'?[['home','/'],['courses','/courses'],['library','/library'],['square','/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square']]:[[roleName,'/'+roleName]];
   for(const [name,url] of paths)for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto(url);await expect(page.locator('.brand')).toBeVisible();await expect(page.locator('.loading,.skeleton,.catalog-skeleton')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);if(name==='courses'){await expect(page.getByRole('link',{name:/Additional Mathematics/})).toHaveCount(0);await expect(page.getByRole('link',{name:/Pure Mathematics 1/}).first()).toBeVisible();}if(name==='square')await expect(page.locator('.square-question')).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);expect(overflow).toBe(false);matrix.push({role:roleName,name,theme,width,overflow});if([390,1280].includes(width))await page.screenshot({path:`${root}/screenshots/${name}-${width}-${theme}.png`,fullPage:true});}
  }finally{await ctx.close();await api.dispose();}
 }
 expect(errors).toEqual([]);expect(serverErrors).toEqual([]);await fs.writeFile(root+'/responsive.json',JSON.stringify({states:matrix.length,checks:matrix,pageErrors:errors,http5xx:serverErrors},null,2));
});
