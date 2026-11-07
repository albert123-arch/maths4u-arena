import {test,expect,request,type APIRequestContext} from '@playwright/test';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:3109',key='9231-mechanics-momentum',root='test-results/c5-mechanics-momentum-20261107';
let password:string;
async function login(role:string){const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});expect((await api.post('/api/auth/login',{data:{username:'qa_c1_'+role,password}})).status()).toBe(200);return api;}
async function status(api:APIRequestContext){return (await(await api.get('/api/admin/content-packages')).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{password=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8')).password;await fs.mkdir(root,{recursive:true});});

test('Momentum: all four rich lessons fit desktop/mobile in both themes',async({browser})=>{
 const admin=await login('admin'),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const lesson of ['direct','surfaces','spheres','successive'])for(const theme of ['light','dark'] as const)for(const width of [360,390,768,1280]){
   await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});
   expect((await page.goto('/admin/content-packages/'+key+'/preview/fm_momentum_'+lesson))?.status()).toBe(200);
   await expect(page.locator('.square-lesson')).toBeVisible();await expect(page.locator('.katex-error')).toHaveCount(0);
   for(const summary of await page.locator('#examples summary').all())await summary.click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   expect(await page.locator('button,.square-heading h1,.square-challenges strong,.quadratics-topics a').evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??'').slice(0,100)))).toEqual([]);
   const overflow=await page.locator('#examples .katex').evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.getBoundingClientRect().width>h.parentElement!.getBoundingClientRect().width+2;}).length);expect(overflow).toBe(0);
   matrix.push({lesson,width,theme});if([390,1280].includes(width))await page.screenshot({path:root+'/'+lesson+'-'+width+'-'+theme+'.png',fullPage:true});
  }
  expect(errors).toEqual([]);await fs.writeFile(root+'/responsive.json',JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});

test('Momentum: complete answers, persistent drafts, fresh review and protected written solutions',async({browser})=>{
 const admin=await login('admin'),teacher=await login('teacher'),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}}),pack=await status(admin);
 const source=JSON.parse(await fs.readFile('content/original/9231-mechanics/momentum-v1.json','utf8'));
 expect(pack.state).toBe('DRAFT');const before=(await(await guest.get('/api/catalog?pageSize=1')).json()).total;
 for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get('/api/catalog/topics/'+l.id)).status()).toBe(404);}
 for(const asset of source.assets)expect((await guest.get('/api/files/'+asset.file_id)).status()).toBe(404);
 expect((await teacher.get('/api/admin/content-packages')).status()).toBe(403);
 expect((await admin.post('/api/admin/content-packages/'+key+'/state',{data:{action:'publish',fingerprint:pack.fingerprint}})).status()).toBe(200);
 const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:900}}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const path=(q:{lesson:string;id:string})=>'/courses/maths4u-9231-mechanics/topics/fm_momentum_'+q.lesson+'?item='+q.id;
 try{
  const first=source.questions.find((q:{id:string})=>q.id==='M4U-9231-MMOM-D11');
  await page.goto(path(first));for(const f of first.fields)await page.getByRole('textbox',{name:f.label,exact:true}).fill(f.expected);
  const impulse=first.fields.find((f:{key:string})=>f.key==='Ja');await page.getByRole('textbox',{name:impulse.label,exact:true}).fill('8');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('textbox',{name:impulse.label,exact:true})).toHaveAttribute('aria-invalid','true');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();await expect(page).toHaveURL(/item=M4U-9231-MMOM-D12/);
  await page.goto(path(first));await expect(page.getByRole('textbox',{name:impulse.label,exact:true})).toHaveValue('8');await page.getByRole('textbox',{name:impulse.label,exact:true}).fill('-8');
  await page.getByRole('textbox',{name:first.fields[0].label,exact:true}).fill('4/2');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('status')).toContainText('All final answers are correct.');await page.reload();await expect(page.getByRole('textbox',{name:first.fields[0].label,exact:true})).toHaveValue('4/2');
  for(const item of [{uid:'F11',field:'vy',wrong:'-6'},{uid:'B31',field:'e',wrong:'-3/5'},{uid:'C21',field:'time',wrong:'4'}]){
   const q=source.questions.find((q:{id:string})=>q.id==='M4U-9231-MMOM-'+item.uid);await page.goto(path(q));for(const f of q.fields)await page.getByRole('textbox',{name:f.label,exact:true}).fill(f.expected);
   const f=q.fields.find((f:{key:string})=>f.key===item.field);await page.getByRole('textbox',{name:f.label,exact:true}).fill(item.wrong);await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('textbox',{name:f.label,exact:true})).toHaveAttribute('aria-invalid','true');
   await page.getByRole('textbox',{name:f.label,exact:true}).fill(f.expected);await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('status')).toContainText('All final answers are correct.');
  }
  const q=source.questions.find((q:{id:string})=>q.id==='M4U-9231-MMOM-F11');await page.goto(path(q));await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('');await page.getByRole('button',{name:'Check answer',exact:true}).click();expect(await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true);
  const answers=[];let solutionImages=0;for(const q of source.questions.filter((q:{collection:string})=>q.collection==='exam')){
   const l=pack.lessons.find((l:{id:string})=>l.id==='fm_momentum_'+q.lesson);
   for(const asset of source.assets.filter((a:{question_uid:string;role:string})=>a.question_uid===q.id&&a.role==='SOLUTION'))expect((await guest.get('/api/files/'+asset.file_id)).status()).toBe(404);
   for(const kind of ['hint','solution','guidance']){
    const response=await guest.post('/api/learning/packages/'+l.id+'/help',{data:{uid:q.id,version:source.version,kind,access:'paper'}});expect(response.status()).toBe(200);const payload=await response.json();expect(JSON.stringify(payload)).not.toMatch(/katex-error|ownerProvenance|original_uid|archiveTaskId/);
    if(kind==='solution')for(const match of payload.html.matchAll(/src="([^"]+)"/g)){const url=match[1].replaceAll('&amp;','&');expect((await guest.get(url)).status()).toBe(200);expect((await teacher.get(url)).status()).toBe(404);solutionImages++;}
   }
   answers.push({uid:q.id,lesson:q.lesson});
  }
  expect(solutionImages).toBe(2);for(const asset of source.assets){expect((await guest.get('/api/files/'+asset.file_id)).status()).toBe(asset.role==='STATEMENT'?200:404);expect((await guest.get('/'+asset.path)).status()).toBe(404);}expect((await guest.get('/content/original/9231-mechanics/momentum-v1.json')).status()).toBe(404);
  const written=source.questions.find((q:{collection:string})=>q.collection==='exam');await page.goto(path(written));await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();await page.getByRole('button',{name:'Worked solution',exact:true}).click();await expect(page.locator('.support-solution')).toBeVisible();await page.getByRole('button',{name:'Marking guidance',exact:true}).click();await expect(page.locator('.marking-table tfoot')).toContainText(String(written.marks));await expect(page.locator('.katex-error')).toHaveCount(0);
  expect((await(await guest.get('/api/catalog?pageSize=1')).json()).total).toBe(before+71);expect(errors).toEqual([]);
  await page.screenshot({path:root+'/written-mobile.png',fullPage:false});await fs.writeFile(root+'/practice.json',JSON.stringify({completeAnswers:true,drafts:true,freshReview:true,writtenTasks:answers.length,guestPublished:before+71,pageErrors:errors},null,2));
 }finally{
  await ctx.close();expect((await admin.post('/api/admin/content-packages/'+key+'/state',{data:{action:'archive',fingerprint:pack.fingerprint}})).status()).toBe(200);expect((await admin.post('/api/admin/content-packages/'+key+'/state',{data:{action:'restore',fingerprint:pack.fingerprint}})).status()).toBe(200);await admin.dispose();await teacher.dispose();await guest.dispose();
 }
});
