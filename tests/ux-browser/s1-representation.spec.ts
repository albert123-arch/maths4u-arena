import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-s1/representation-v1.json';

const base='http://127.0.0.1:3109',out='.local/s1-representation-20261108/screenshots';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-s1-representation');await fs.mkdir(out,{recursive:true});});
test('Representation of data chapter and five lessons on desktop and mobile',async({page})=>{
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
    if(l.key==='stem_comparison'&&width===390)await page.locator('#notes .stem-leaf-scroll').first().screenshot({path:out+'/back-to-back-book-style-390.png'});
  }
  expect(errors).toEqual([]);
});

test('book-style stems and complete diagram MCQ remain usable on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_stem_comparison');
 const table=page.locator('#notes table.stem-leaf-back').first();await expect(table).toBeVisible();
 const stem=table.locator('tbody tr').first().locator('th');
 expect(await stem.evaluate(e=>getComputedStyle(e).borderLeftWidth)).toBe('2px');expect(await stem.evaluate(e=>getComputedStyle(e).borderRightWidth)).toBe('2px');
 expect(await table.evaluate(e=>getComputedStyle(e).display)).toBe('table');
 const q=pack.questions.find(q=>q.id==='M4U-9709-S1-REP-CHECK-STEM_READING-2-0')!;
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_stem_reading?item='+q.id+'#practice');
 await expect(page.locator('.square-choice table.stem-leaf')).toHaveCount(3);
 await page.locator('input[name="diagram"][value="A"]').check();await page.getByRole('textbox',{name:'Total leaves',exact:true}).fill('7');
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();await expect(page).toHaveURL(/item=M4U-9709-S1-REP-CHECK-STEM_READING-2-1/);
 await page.locator('input[name="diagram"][value="C"]').check();await page.getByRole('textbox',{name:'Total leaves',exact:true}).fill('7');
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
 await page.reload();await expect(page.locator('input[name="diagram"][value="C"]')).toBeChecked();await expect(page.getByRole('textbox',{name:'Total leaves',exact:true})).toHaveValue('7');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('density is not frequency and quartiles are inverse graph readings',async({page})=>{
 const q=pack.questions.find(q=>q.id==='M4U-9709-S1-REP-CHECK-HISTOGRAMS-1-0')!;
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_histograms?item='+q.id);
 for(const [i,v] of ['2/5','12','4/5'].entries())await page.getByRole('textbox',{name:q.fields[i].label,exact:true}).fill(v);
 await page.locator('input[name="modal"][value="B"]').check();await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('textbox',{name:q.fields[1].label,exact:true}).fill('3/5');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
 const c=pack.questions.find(q=>q.id==='M4U-9709-S1-REP-CHECK-CUMULATIVE-2-1')!;
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_cumulative?item='+c.id);
 for(const [i,v] of ['45/4','35/2','55/2','65/4'].entries())await page.getByRole('textbox',{name:c.fields[i].label,exact:true}).fill(v);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
});

test('outlier fences cannot replace the stated min/max whiskers',async({page})=>{
 const q=pack.questions.find(q=>q.id==='M4U-9709-S1-REP-CHECK-BOXPLOTS-2-0')!;
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_boxplots?item='+q.id);
 await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('-2');await page.getByRole('textbox',{name:q.fields[1].label,exact:true}).fill('30');
 const whiskers=page.getByRole('textbox',{name:q.fields[2].label,exact:true});await whiskers.fill('{-2,30}');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await whiskers.fill('{35,2}');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
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
  await expect(page.getByRole('button',{name:'Try a fresh version of this question →',exact:true})).toHaveCount(0);
  await expect(page.locator('#practice')).toContainText('last prepared variant');

  const statement=pack.assets.find(a=>a.role==='STATEMENT')!,sq=pack.questions.find(q=>q.id===statement.question_uid)!,sl=pack.lessons.find(l=>l.key===sq.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+sl.id+'?item='+sq.id+'#practice');
  const image=page.locator('.square-question img').first();await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);

});

test('written back-to-back diagrams retain their keys and course conventions',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_stem_comparison?item=M4U-9709-S1-01-F016-M#practice');
 const table=page.locator('.square-question table.stem-leaf-back');await expect(table).toHaveCount(1);await expect(table.locator('tbody tr').first()).toContainText('8 7');
 const centre=table.locator('tbody tr').first().locator('td').first();expect(await centre.evaluate(e=>getComputedStyle(e).borderLeftWidth)).toBe('2px');
 await expect(page.locator('.square-question')).toContainText('Key:');await expect(page.locator('.square-question')).toContainText('excluding the overall median');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 await page.screenshot({path:out+'/written-stem-390.png',fullPage:true});
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_boxplots?item=M4U-9709-S1-01-F041-M#practice');await expect(page.locator('.square-question')).toContainText('Whiskers reach the minimum and maximum');
 await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_boxplots?item=M4U-9709-S1-01-F048-M#practice');await expect(page.locator('.square-question')).toContainText('Chapter 8');
});

test('teacher sees all diagram MCQ, answers, solutions and marking guidance immediately',async({browser})=>{
 const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
 const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
 await page.goto('/courses/'+pack.course.slug+'/topics/orig_9709_s1_rep_stem_reading?item=M4U-9709-S1-REP-CHECK-STEM_READING-2-0#practice');
 await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
 await expect(page.locator('.teacher-task-preview .full-question-options table.stem-leaf')).toHaveCount(3);
 await page.getByRole('tab',{name:'Worked solution',exact:true}).click();await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('table.stem-leaf')).toHaveCount(1);
 await page.getByRole('tab',{name:'Marking guidance',exact:true}).click();await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
 const asset=pack.assets.find(a=>a.role==='SOLUTION')!,q=pack.questions.find(q=>q.id===asset.question_uid)!,l=pack.lessons.find(l=>l.key===q.lesson)!;
 await page.goto('/courses/'+pack.course.slug+'/topics/'+l.id+'?item='+q.id+'#practice');await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
 const image=page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('img').first();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.getByRole('link',{name:'Question bank and saved work',exact:true}).click();await expect(page).toHaveURL(/view=legacy/);
 await ctx.close();await api.dispose();
});
