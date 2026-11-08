import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/integration-v1.json';

const base='http://127.0.0.1:3109',out='.local/p1-integration-20261108/screenshots';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-p1-integration');await fs.mkdir(out,{recursive:true});});
test('Integration chapter and five lessons on desktop and mobile',async({page})=>{
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
    if(l.key==='power'&&width===390)await page.locator('#examples .square-example').last().screenshot({path:out+'/improper-endpoints-390.png'});
  }
  expect(errors).toEqual([]);
});

test('guest primitive error, a fresh integral review and retained answers',async({page})=>{
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_integration_power_integrals');
  const q=pack.questions.find(q=>q.id==='M4U-9709-P1-IN-CHECK-POWER-1-0')!;
  await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('98765');
  await page.getByRole('radio',{name:'Every constant has zero derivative',exact:true}).check();
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  await expect(page).toHaveURL(/item=M4U-9709-P1-IN-CHECK-POWER-1-1/);
  const fresh=pack.questions.find(q=>q.id==='M4U-9709-P1-IN-CHECK-POWER-1-1')!;
  await page.getByRole('textbox',{name:fresh.fields[0].label,exact:true}).fill(fresh.fields[0].expected as string);
  await page.getByRole('radio',{name:'Every constant has zero derivative',exact:true}).check();
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
  await page.reload();await expect(page.getByRole('textbox',{name:fresh.fields[0].label,exact:true})).toHaveValue(fresh.fields[0].expected as string);
  await expect(page.locator('#review')).toContainText('up to date');
});

test('the complete fractional-power curve retains its constant and open domain',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const q=pack.questions.find(q=>q.id==='M4U-9709-P1-IN-CHECK-CURVES-2-0')!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_integration_curve_equations?item='+q.id);
  await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('2*u^3-4*u-7');
  await page.getByRole('textbox',{name:q.fields[1].label,exact:true}).fill('-7');
  const domain=page.getByRole('textbox',{name:q.fields[2].label,exact:true});await domain.fill('[0,inf)');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await domain.fill('(0,inf)');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
  await expect(page.locator('.katex-error')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({path:out+'/complete-curve-and-domain-390.png',fullPage:true});
});

test('signed cancellation cannot replace total geometric area',async({page})=>{
  const q=pack.questions.find(q=>q.id==='M4U-9709-P1-IN-CHECK-AREAS-1-0')!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_integration_areas?item='+q.id);
  await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('{1,-1}');
  await page.getByRole('textbox',{name:q.fields[1].label,exact:true}).fill('4/3');
  const area=page.getByRole('textbox',{name:q.fields[2].label,exact:true});await area.fill('4/3');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await area.fill('4');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
});

test('washer radii and the variable for vertical-axis rotation are checked',async({page})=>{
  const q=pack.questions.find(q=>q.id==='M4U-9709-P1-IN-CHECK-VOLUMES-2-0')!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_integration_volumes?item='+q.id);
  const integrand=page.getByRole('textbox',{name:q.fields[0].label,exact:true});await integrand.fill('(2-x)^2');
  await page.getByRole('textbox',{name:q.fields[1].label,exact:true}).fill('16*pi/3');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await integrand.fill('4-x^2');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
  const v=pack.questions.find(q=>q.id==='M4U-9709-P1-IN-CHECK-VOLUMES-3-0')!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_integration_volumes?item='+v.id);
  await page.getByRole('textbox',{name:v.fields[0].label,exact:true}).fill('y^4');
  await page.getByRole('textbox',{name:v.fields[1].label,exact:true}).fill('32*pi/5');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
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

  const statement=pack.assets.find(a=>a.role==='STATEMENT')!,sq=pack.questions.find(q=>q.id===statement.question_uid)!,sl=pack.lessons.find(l=>l.key===sq.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+sl.id+'?item='+sq.id+'#practice');
  const image=page.locator('.square-question img').first();await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);

});

test('teacher has immediate answers, solution, marking guidance and full mixed MCQ preview',async({browser})=>{
  const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
  const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
  expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_integration_power_integrals');
  await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
  await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
  await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('.katex')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'Marking guidance',exact:true}).click();
  await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_integration_power_integrals?item=M4U-9709-P1-IN-CHECK-POWER-1-0#practice');
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
