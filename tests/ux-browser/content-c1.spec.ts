import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:3109',root='test-results/c1-20261106',key='9231-fp1-roots';
let fixture:{password:string};
async function session(role:string){
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const r=await api.post('/api/auth/login',{data:{username:'qa_c1_'+role,password:fixture.password}});expect(r.status()).toBe(200);
 return api;
}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));await fs.mkdir(root,{recursive:true});});
test('C1 responsive chapter preview and complete-answer flow',async({browser})=>{
 const api=await session('admin'),storage=await api.storageState(),ctx=await browser.newContext({baseURL:base,storageState:storage});
 const page=await ctx.newPage(),errors:string[]=[],matrix:unknown[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
 for(const lesson of ['coefficients','symmetric_sums','transformations','mixed']){
  for(const theme of ['light','dark'] as const)for(const width of [1280,390,360,768]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
   await page.goto('/admin/content-packages/'+key+'/preview/fp1_roots_'+lesson);
   await expect(page.locator('.square-lesson')).toBeVisible();await expect(page.getByText('Unpublished · administrator preview',{exact:true})).toBeVisible();
   await expect(page.locator('.square-lesson .katex-error')).toHaveCount(0);
   const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   expect(size.scroll).toBeLessThanOrEqual(size.width+1);
   const clipped=await page.locator('button,.square-topic-mobile summary,.square-heading h1,.square-challenges strong,.quadratics-topics a').evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??'').slice(0,80)));
   expect(clipped).toEqual([]);matrix.push({lesson,width,theme,overflow:false});
   if(width===1280||width===390)await page.screenshot({path:root+'/'+lesson+'-'+width+'-'+theme+'.png',fullPage:true});
  }
 }
 await page.goto('/admin/content-packages/'+key+'/preview/fp1_roots_coefficients?item=M4U-9231-RPE-C11');
 await page.getByRole('textbox',{name:'Sum of the roots',exact:true}).fill('999');
 await page.getByRole('textbox',{name:'Product of the roots',exact:true}).fill('-1');
 await page.getByRole('button',{name:'Check answer',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Sum of the roots',exact:true})).toHaveAttribute('aria-invalid','true');
 await page.getByRole('button',{name:'Hint',exact:true}).click();await expect(page.locator('.question-support')).toContainText(/root|coefficient/i);
 await page.getByRole('textbox',{name:'Sum of the roots',exact:true}).fill('3/2');
 await page.getByRole('button',{name:'Check answer',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('All final answers are correct.');
 await page.reload();await expect(page.getByRole('textbox',{name:'Sum of the roots',exact:true})).toHaveValue('3/2');
 await page.getByRole('button',{name:'Try a fresh variant',exact:true}).click();
 await expect(page.locator('.square-question')).toContainText('Two roots, two sums');
 await expect(page.getByRole('textbox',{name:'Sum of the roots',exact:true})).toHaveValue('');
 const pack=(await(await api.get('/api/admin/content-packages')).json())[0];
 await page.goto('/admin/content-packages/'+key);
 await expect(page.getByRole('heading',{name:'Roots of polynomial equations',exact:true})).toBeVisible();
 expect(pack.exam).toBe(62);
 await page.screenshot({path:root+'/chapter-admin.png',fullPage:true});
 expect(errors).toEqual([]);
 await fs.writeFile(root+'/responsive.json',JSON.stringify({matrix,pageErrors:errors,completeAnswers:true,draftsRestored:true,freshVariant:true},null,2));
 }finally{await ctx.close();await api.dispose();}
});
test('C1 guest/teacher privacy, manual support and locally reversible publication',async({browser})=>{
 const admin=await session('admin'),teacher=await session('teacher'),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=(await(await admin.get('/api/admin/content-packages')).json())[0];
 try{
 expect((await teacher.get('/api/admin/content-packages')).status()).toBe(403);
 expect((await guest.get('/courses/maths4u-9231-fp1')).status()).toBe(404);
 for(const id of pack.lessons.map((l:{id:string})=>l.id)){
  expect((await guest.get('/courses/maths4u-9231-fp1/topics/'+id)).status()).toBe(404);
  expect((await teacher.get('/api/catalog/topics/'+id)).status()).toBe(404);
 }
 expect((await guest.get('/content/original/9231-fp1/roots-v1.json')).status()).toBe(404);
 expect((await admin.post('/api/admin/content-packages/'+key+'/state',{data:{action:'publish',fingerprint:pack.fingerprint}})).status()).toBe(200);
 const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},colorScheme:'light'}),page=await ctx.newPage();
 try{
  await page.goto('/courses/maths4u-9231-fp1/topics/fp1_roots_coefficients?item=M4U-9231-RPE-C11');
  await expect(page.getByRole('textbox',{name:'Sum of the roots',exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'Sum of the roots',exact:true}).fill('3/2');
  await page.getByRole('textbox',{name:'Product of the roots',exact:true}).fill('-1');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('status')).toContainText('All final answers are correct.');
  await page.reload();await expect(page.getByRole('textbox',{name:'Sum of the roots',exact:true})).toHaveValue('3/2');
  await page.goto('/courses/maths4u-9231-fp1/topics/fp1_roots_transformations?item=M4U-9231-FP1-RPE-4157');
  await expect(page.getByRole('button',{name:'Check answer',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:"I’ve finished on paper",exact:true}).click();
  await page.getByRole('button',{name:'Marking guidance',exact:true}).click();
  await expect(page.locator('.marking-table')).toBeVisible();await expect(page.locator('.marking-table tfoot')).toContainText('6');
  await page.locator('.marking-self select').first().selectOption('1');
  await expect(page.locator('.marking-score')).toContainText('1 / 6');
  await page.reload();await page.getByRole('button',{name:'Marking guidance',exact:true}).click();
  await expect(page.locator('.marking-self select').first()).toHaveValue('1');
  await page.screenshot({path:root+'/marking-390-light.png',fullPage:true});
  const response=await guest.get('/courses/maths4u-9231-fp1/topics/fp1_roots_coefficients'),html=await response.text();
  expect(html).toContain('katex');expect(html).not.toContain('"expected"');expect(html).not.toContain('original_source_url');expect(html).not.toContain('teacher review pending');
  expect((await(await guest.get('/api/catalog')).json()).total).toBe(782);
  const checked=await guest.post('/api/learning/packages/fp1_roots_coefficients/check',{data:{version:'1.0.0',uid:'M4U-9231-FP1-RPE-4246',eventKey:'47dc424e-023f-4bdc-8903-c2d40295e099',answers:{},helpUsed:false,at:Date.now()}});
  expect(checked.status()).toBe(200);expect((await checked.json()).valid).toBe(false);
  const targets=JSON.parse(await fs.readFile('.local/release-d-deploy-20261106/live-targets.json','utf8'));
  let presentations=0;
  for(const id of targets.presentationLessons){
   expect((await teacher.get('/api/teaching/topics/'+id+'/presentations')).status()).toBe(404);
   const response=await admin.get('/api/teaching/topics/'+id+'/presentations');expect(response.status()).toBe(200);presentations+=(await response.json()).items.length;
  }
  expect(presentations).toBe(59);
  const student=await session('student'),studentContext=await browser.newContext({baseURL:base,storageState:await student.storageState()});
  try{
   const learner=await studentContext.newPage();await learner.goto('/student');
   await expect(learner.getByRole('heading',{name:'Review · Roots and coefficients of quadratic, cubic and quartic equations',exact:true})).toBeVisible();
   await expect(learner.getByRole('heading',{name:'Quadratics · Your learning route',exact:true})).toHaveCount(0);
  }finally{await studentContext.close();await student.dispose();}
 }finally{await ctx.close();}
 }finally{
  await admin.post('/api/admin/content-packages/'+key+'/state',{data:{action:'archive',fingerprint:pack.fingerprint}});
  await admin.post('/api/admin/content-packages/'+key+'/state',{data:{action:'restore',fingerprint:pack.fingerprint}});
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});

test('C1 shared pages and dashboards retain responsive layout',async({browser})=>{
 const results=[];
 for(const role of ['guest','student','teacher','admin']){
  const api=role==='guest'?null:await session(role);
  const ctx=await browser.newContext({baseURL:base,...(api?{storageState:await api.storageState()}: {})});
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const routes=role==='guest'?['/','/courses','/library','/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square']:['/'+role];
   for(const path of routes)for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){
    await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:theme});
    const response=await page.goto(path);expect(response?.status()).toBe(200);await expect(page.locator('.loading,.catalog-skeleton')).toHaveCount(0);
    await expect(page.locator('.brand')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
    results.push({role,path,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+'/shared-'+role+'-'+routes.indexOf(path)+'-'+width+'-'+theme+'.png',fullPage:true});
   }
   expect(errors).toEqual([]);
  }finally{await ctx.close();await api?.dispose();}
 }
 await fs.writeFile(root+'/shared-pages.json',JSON.stringify(results,null,2));
});
