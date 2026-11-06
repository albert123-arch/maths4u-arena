import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:3105',origin='https://arena.maths4u.sbs',root='test-results/release-d-20261106';
const cookies=new Map<string,string>();
let fixture:{password:string;cam:string;file:string;lesson:string;course:string;attempt:string;student:string;teacher:string;admin:string;work:string;classId:string};
async function role(name:string){
 const login=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:origin}});
 const r=await login.post('/api/auth/login',{data:{username:'qa_h1_'+name,password:fixture.password}});expect(r.status()).toBe(200);
 const cookie=r.headers()['set-cookie'].split(';')[0];cookies.set(name,cookie);await login.dispose();
 return request.newContext({baseURL:base,extraHTTPHeaders:{Origin:origin,Cookie:cookie}});
}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile('.local/release-d-20261106/fixture.json','utf8'));await fs.mkdir(root+'/screenshots',{recursive:true});});

test('Release D: all guest pages, roles, scans, history, real 404 and default quarantine',async()=>{
 const guest=await request.newContext({baseURL:base}),student=await role('student'),teacher=await role('teacher'),admin=await role('admin');
 try{
 const pages=[],ids=new Set<string>(),sources:Record<string,number>={};let examTitles=0;
 for(let page=1;page<=14;page++){const r=await guest.get('/api/catalog?pageSize=50&page='+page);expect(r.status()).toBe(200);const d=await r.json();expect(d.total).toBe(688);expect(d.pages).toBe(14);pages.push(d.items.length);for(const t of d.items){ids.add(t.id);expect(['Cambridge','Cambridge International']).not.toContain(t.version.source);sources[t.version.source]=(sources[t.version.source]??0)+1;if(/\b(?:19|20)\d{2}\b/.test(t.version.title)&&/\bp\d+\b/i.test(t.version.title)&&/\bq\d+\b/i.test(t.version.title))examTitles++;}}
 expect(ids.size).toBe(688);expect(examTitles).toBe(0);
 for(const api of [guest,student,teacher]){
  expect((await(await api.get('/api/catalog')).json()).total).toBe(688);
  const courses=await(await api.get('/api/catalog/courses')).json();expect(courses.length).toBe(2);
  for(const slug of ['maths4u-0606','maths4u-9231-fp1','maths4u-9231-fp2','maths4u-9231-mechanics','maths4u-9231-statistics']){expect((await api.get('/api/catalog/courses?slug='+slug)).status()).toBe(404);expect((await api.get('/courses/'+slug)).status()).toBe(404);}
  expect((await api.get('/api/catalog/topics/'+fixture.lesson)).status()).toBe(404);
  expect((await api.get('/courses/'+fixture.course+'/topics/'+fixture.lesson)).status()).toBe(404);
  expect([401,403,404]).toContain((await api.get('/api/tasks/'+fixture.cam)).status());
  for(const variant of ['original','preview','thumbnail'])expect((await api.get('/api/files/'+fixture.file+'?variant='+variant)).status()).toBe(404);
 }
 expect((await(await admin.get('/api/catalog')).json()).total).toBe(3342);
 expect((await(await admin.get('/api/catalog?origin=CAMBRIDGE_EXAM&archive=1')).json()).total).toBe(2654);
 expect((await admin.get('/api/tasks/'+fixture.cam)).status()).toBe(200);expect((await admin.get('/api/files/'+fixture.file)).status()).toBe(200);
 const history=await(await student.get('/api/attempts/'+fixture.attempt)).json();expect(history.containsUnavailable).toBe(true);expect(history.answers[0].response.value).toBe('Synthetic preserved pre-release working');expect(history.answers[0].points).toBe(1);
 for(const q of history.questions){expect(q.unavailable).toBe(true);expect(q.statement).toBe('<p>This material is no longer available</p>');expect(q.assets).toEqual([]);expect(q.source).toBeUndefined();expect(q.solution).toBeUndefined();}
 const enter=await admin.post('/api/view/enter',{data:{mode:'ROLE',role:'STUDENT'}});expect(enter.status()).toBe(200);const lens=(await(await admin.get('/api/auth/me')).json()).lens;
 expect((await admin.get('/api/files/'+fixture.file,{headers:{'X-Arena-View':lens.nonce}})).status()).toBe(404);
 expect((await(await admin.get('/api/catalog',{headers:{'X-Arena-View':lens.nonce}})).json()).total).toBe(688);
 expect((await admin.post('/api/view/exit',{data:{}})).status()).toBe(200);
 for(const path of ['/courses','/library','/search','/courses/olymp-number-theory2','/courses/maths4u-9709-p1'])expect((await guest.get(path)).status()).toBe(200);
 const sitemap=await(await guest.get('/sitemap.xml')).text();expect(sitemap).toContain('/courses/maths4u-9709-p1');expect(sitemap).not.toContain('maths4u-0606');expect((await guest.get('/robots.txt')).status()).toBe(200);
 const html=await(await guest.get('/courses/maths4u-9709-p1')).text();expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);expect(html).toContain('rel="canonical" href="https://arena.maths4u.sbs/courses/maths4u-9709-p1"');
 await fs.writeFile(root+'/access.json',JSON.stringify({guestVisible:ids.size,pages,sources,examTitles,cambridgeHidden:2654,adminVisible:3342,historyPreserved:true,hiddenPagesReal404:true,lensDenied:true,productionIndex:true},null,2));
 }finally{await Promise.all([guest.dispose(),student.dispose(),teacher.dispose(),admin.dispose()]);}
});

test('Release D: notes, full-answer check, fresh review and responsive dashboards',async({browser})=>{
 const errors:string[]=[],bad:string[]=[],matrix=[];
 for(const name of ['guest','student','teacher','admin']){
  const api=name==='guest'?null:await role(name),cookie=api?cookies.get(name)??'':'';
  const ctx=await browser.newContext({baseURL:base});
  if(cookie){const split=cookie.indexOf('=');await ctx.addCookies([{name:cookie.slice(0,split),value:cookie.slice(split+1),domain:'127.0.0.1',path:'/',httpOnly:true,secure:false,sameSite:'Lax'}]);}
  // The local artifact uses plain loopback HTTP; production uses HTTPS. Only
  // mutation requests need the configured production Origin in this harness.
  await ctx.route(base+'/api/**',async route=>{const r=route.request();if(r.method()==='GET'){await route.continue();return;}const response=await route.fetch({headers:{...r.headers(),origin}});await route.fulfill({response});});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)bad.push(r.url()+':'+r.status());});
  try{
   const paths=name==='guest'?[['home','/'],['courses','/courses'],['library','/library'],['square','/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square']]:[[name,'/'+name]];
   for(const [label,url] of paths)for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto(url);await expect(page.locator('.brand')).toBeVisible();await expect(page.locator('body')).toHaveCSS('margin','0px');await expect(page.locator('.loading,.skeleton,.catalog-skeleton')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    if(name!=='guest'){const me=await page.evaluate(async()=>{const r=await fetch('/api/auth/me');return r.json();});expect(me.user?.roles.map((r:{role:string})=>r.role)).toContain(name.toUpperCase());expect(page.url()).not.toContain('/login');}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)console.log(JSON.stringify({role:name,url,width,theme,wide:await page.evaluate(()=>[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,class:e.className,text:e.textContent?.slice(0,80),right:e.getBoundingClientRect().right})))}));expect(overflow).toBe(false);matrix.push({role:name,page:label,width,theme,overflow});
    if([390,1280].includes(width))await page.screenshot({path:`${root}/screenshots/${label}-${width}-${theme}.png`,fullPage:true});
   }
   if(name==='guest'){
    await page.goto('/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square?item=M4U-9709-Q26-S-CS01');
    await expect(page.getByRole('heading',{name:'Completing the square',exact:true})).toBeVisible();
    for(const [label,value] of [['Multiplier a','1'],['Centre h (the form uses x − h)','-7'],['Constant c outside the square','-9']])await page.getByRole('textbox',{name:label,exact:true}).fill(value);
    await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('status')).toContainText(/Look again|Not quite/i);
    await page.getByRole('textbox',{name:'Centre h (the form uses x − h)',exact:true}).fill('7');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('status')).toContainText(/correct|good/i);
    await page.reload();await expect(page.getByRole('textbox',{name:'Centre h (the form uses x − h)',exact:true})).toHaveValue('7');
    await page.goto('/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square?item=M4U-9709-Q26-S-CS07');
    await page.getByRole('textbox').first().fill('{3-sqrt(22)/2}');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('status')).toContainText(/Look again|Not quite/i);
    await expect(page.getByRole('button',{name:/Review with a fresh variant/i})).toBeVisible();await page.getByRole('button',{name:/Review with a fresh variant/i}).click();
    await expect(page.locator('.square-question')).toContainText('Fresh check');
    await page.screenshot({path:root+'/screenshots/review-fresh-768-dark.png',fullPage:true});
   }
  }finally{await page.close();await ctx.close();await api?.dispose();}
 }
 expect(errors).toEqual([]);expect(bad).toEqual([]);
 await fs.writeFile(root+'/responsive.json',JSON.stringify({states:matrix.length,checks:matrix,pageErrors:errors,http5xx:bad},null,2));
});
