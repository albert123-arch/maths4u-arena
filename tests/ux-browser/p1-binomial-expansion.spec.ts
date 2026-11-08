import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/binomial-expansion-v1.json';

const base='http://127.0.0.1:3109',out='.local/p1-binomial-expansion-20261108/screenshots';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-p1-binomial-expansion');await fs.mkdir(out,{recursive:true});});
test('Binomial Expansion chapter and five lessons on desktop and mobile',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  expect((await page.goto(base+'/courses/'+pack.course.slug+'?chapter='+pack.chapter.id))?.status()).toBe(200);
  await expect(page.locator('a[href="/courses/'+pack.course.slug+'/topics/'+pack.lessons[0].id+'"]').first()).toBeVisible();
  for(const l of pack.lessons)for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id);
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Check answer',exact:true})).toBeEnabled();
    await expect(page.locator('#examples .square-example')).toHaveCount(4);
    for(const summary of await page.locator('#examples summary').all())await summary.click();
    await expect(page.locator('.katex-error')).toHaveCount(0);
    await expect(page.locator('#challenge .square-challenges button')).toHaveCount(10);
    for(const img of await page.locator('#notes img, #examples img').all())await expect.poll(()=>img.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
    if(l.key==='general_term'&&width===390)await page.locator('#examples .square-example').first().screenshot({path:out+'/term-number-390.png'});
  }
  expect(errors).toEqual([]);
});

test('guest expansion requires multiplied-out form and review keeps a fresh answer',async({page})=>{
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_binomial_expansion_expansion');
  const q=pack.questions.find(q=>q.id==='M4U-9709-P1-BE-CHECK-EXPANSION-1-0')!;
  await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('(1-2*x)^4');
  await page.getByRole('textbox',{name:q.fields[1].label,exact:true}).fill(q.fields[1].expected);
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  await expect(page).toHaveURL(/item=M4U-9709-P1-BE-CHECK-EXPANSION-1-1/);
  const fresh=pack.questions.find(q=>q.id==='M4U-9709-P1-BE-CHECK-EXPANSION-1-1')!;
  for(const f of fresh.fields)await page.getByRole('textbox',{name:f.label,exact:true}).fill(f.expected);
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();await expect(page.getByRole('textbox',{name:fresh.fields[0].label,exact:true})).toHaveValue(fresh.fields[0].expected);
  await expect(page.locator('#review')).toContainText('Return after a break');
});

test('both signed parameters and their corresponding coefficients are required',async({page})=>{
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_binomial_expansion_parameters?item=M4U-9709-P1-BE-CHECK-PARAMETERS-1-0#practice');
  await page.getByRole('textbox',{name:'All k-values',exact:true}).fill('{-2,2}');
  const input=page.getByRole('textbox',{name:'All (k, cubic coefficient) pairs',exact:true});await input.fill('(2,160)');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await input.fill('(2,160);(-2,-160)');await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
});

test('written parts, all three fresh variants, SVG and solutions on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const asset=pack.assets.find(a=>a.role==='SOLUTION'&&pack.questions.some(q=>q.id===a.question_uid&&q.variant_index===0))!;
  const q=pack.questions.find(q=>q.id===asset.question_uid)!,l=pack.lessons.find(l=>l.key===q.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id+'?item='+q.id+'#practice');
  await expect(page.locator('.square-question ol.parts > li')).toHaveCount(q.parts.length);
  await expect(page.locator('.square-question .square-marks')).toHaveCount(q.parts.length);
  expect([403,404]).toContain((await page.request.get(base+'/api/files/'+asset.file_id)).status());
  await expect(page.getByRole('button',{name:'Worked solution',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({path:out+'/written-question-390.png',fullPage:true});
  await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();
  await page.getByRole('button',{name:'Worked solution',exact:true}).click();
  await expect(page.locator('.question-support .katex').first()).toBeVisible();
  const solutionFigure=page.locator('.question-support img').first();await expect(solutionFigure).toBeVisible();
  await expect.poll(()=>solutionFigure.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await solutionFigure.getAttribute('src')).toContain('support=');
  await page.screenshot({path:out+'/written-solution-390.png',fullPage:true});
  await expect(page.locator('.katex-error')).toHaveCount(0);
  for(let v=1;v<=3;v++){
    await page.getByRole('button',{name:'Try a fresh version of this question →',exact:true}).click();
    await expect(page).toHaveURL(new RegExp('item='+pack.questions.find(r=>r.family_uid===q.family_uid&&r.variant_index===v)!.id));
  }

});

test('teacher has immediate answers, solution, marking guidance and full mixed MCQ preview',async({browser})=>{
  const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
  const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
  expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_binomial_expansion_expansion');
  await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
  await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
  await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('.katex')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'Marking guidance',exact:true}).click();
  await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_binomial_expansion_expansion?item=M4U-9709-P1-BE-CHECK-EXPANSION-4-0#practice');
  await expect(page.locator('.teacher-task-preview .full-question-options > li')).toHaveCount(3);
  const written=pack.questions.find(q=>q.collection==='exam'&&q.variant_index===0)!,lesson=pack.lessons.find(l=>l.key===written.lesson)!;
  await page.goto('/courses/'+pack.course.slug+'/topics/'+lesson.id+'?item='+written.id+'#practice');
  await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
  const image=page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('img').first();await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  await page.getByRole('link',{name:'Question bank and saved work',exact:true}).click();
  await expect(page).toHaveURL(/view=legacy/);await expect(page.locator('.square-lesson')).toHaveCount(0);
  await ctx.close();await api.dispose();
});
