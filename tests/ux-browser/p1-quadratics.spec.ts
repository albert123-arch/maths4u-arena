import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/quadratics-v1.json';

const base='http://127.0.0.1:3109',out='.local/p1-quadratics-20261108/screenshots';
test.beforeAll(async()=>{await fs.mkdir(out,{recursive:true});});
test('five public lessons: desktop and mobile notes, mathematical layout and main-only lists',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const l of pack.lessons)for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id);
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible();
    await expect(page.locator('#examples .square-example')).toHaveCount(4);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    await expect(page.locator('#challenge .square-challenges button')).toHaveCount(pack.questions.filter(q=>q.lesson===l.key&&q.collection==='exam'&&q.variant_index===0).length);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
  }
  expect(errors).toEqual([]);
});

test('guest full-root checking, fresh review and draft persistence',async({page})=>{
  const path='/courses/'+pack.course.slug+'/topics/orig_quadratics_factorisation';
  await page.goto(base+path);
  const field=page.getByRole('textbox',{name:'All real roots',exact:true});
  await field.fill('0');await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('item')).toBe('M4U-9709-P1-QD-CHECK-EQUATIONS-1-1');
  await page.getByRole('textbox',{name:'All real roots',exact:true}).fill('{-3,0}');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();await expect(page.getByRole('textbox',{name:'All real roots',exact:true})).toHaveValue('{-3,0}');
  await expect(page.locator('#review')).toContainText('Return after a break');
});

test('exam marks, all numerical variants and protected vector solutions',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const q=pack.questions.find(q=>q.variant_index===0&&q.id.endsWith('-02'))!;
  const lesson=pack.lessons.find(l=>l.key===q.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+lesson.id+'?item='+q.id+'#practice');
  await expect(page.locator('.square-question ol.parts > li')).toHaveCount(q.parts.length);
  await expect(page.locator('.square-question .square-marks')).toHaveCount(q.parts.length);
  await expect(page.getByRole('button',{name:'Worked solution',exact:true})).toBeDisabled();
  const asset=pack.assets.find(a=>a.question_uid===q.id&&a.role==='SOLUTION')!;
  const before=await page.request.get(base+'/api/files/'+asset.file_id);expect([403,404]).toContain(before.status());
  await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();
  await page.getByRole('button',{name:'Worked solution',exact:true}).click();
  const image=page.locator('.question-support img');await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  const src=await image.getAttribute('src');expect(src).toContain('support=');
  const response=await page.request.get(base+src);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toBe('image/svg+xml');
  for(let index=1;index<=3;index++){
    await page.getByRole('button',{name:'Try a fresh version of this question →',exact:true}).click();
    const family=pack.questions.find(r=>r.family_uid===q.family_uid&&r.variant_index===index)!;
    expect(new URL(page.url()).searchParams.get('item')).toBe(family.id);
  }
  await page.screenshot({path:out+'/exam-390.png',fullPage:true});
});

test('teacher previews current and preserved old questions without learner unlocks',async({browser})=>{
  const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
  const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
  expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()});const page=await ctx.newPage();
  for(const suffix of ['', '?practice=previous']){
    await page.goto('/courses/'+pack.course.slug+'/topics/orig_quadratics_factorisation'+suffix);
    await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
    await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
    await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true})).not.toContainText('QUESTION_CHANGED');
    await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('.katex')).not.toHaveCount(0);
    await expect(page.getByRole('tab',{name:'Answers',exact:true})).toBeEnabled();
  }
  await ctx.close();await api.dispose();
});
