import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-s1/variation-v1.json';

const base='http://127.0.0.1:3109',out='.local/s1-variation-20261108/screenshots';
const quick=(suffix:string)=>pack.questions.find(q=>q.id==='M4U-9709-S1-VAR-CHECK-'+suffix)!;
const lessonUrl=(question:typeof pack.questions[number])=>base+'/courses/'+pack.course.slug+'/topics/'+pack.lessons.find(l=>l.key===question.lesson)!.id+'?item='+question.id+'#practice';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-s1-variation');await fs.mkdir(out,{recursive:true});});

test('Measures of variation chapter and five lessons on desktop and mobile',async({page})=>{
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
  expect(await page.locator('#notes .katex-display, #examples .katex-display').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).length)).toBe(0);
  await expect(page.locator('#challenge .square-challenges button')).toHaveCount(10);
  for(const img of await page.locator('#notes img, #examples img').all())await expect.poll(()=>img.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
 }
 expect(errors).toEqual([]);
});

test('guest review uses a new raw-data variant and retains complete answers after reload',async({page})=>{
 await page.setViewportSize({width:390,height:900});const q=quick('RAW_MOMENTS-1-0');await page.goto(lessonUrl(q));
 for(const [i,value] of ['4','9/2','3*sqrt(10)/5'].entries())await page.getByRole('textbox',{name:q.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();await expect(page).toHaveURL(/item=M4U-9709-S1-VAR-CHECK-RAW_MOMENTS-1-1/);
 const fresh=quick('RAW_MOMENTS-1-1');for(const [i,value] of ['4','16/5','4*sqrt(5)/5'].entries())await page.getByRole('textbox',{name:fresh.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
 await page.reload();await expect(page.getByRole('textbox',{name:fresh.fields[1].label,exact:true})).toHaveValue('16/5');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('all feasible counts and both possible means are necessary',async({page})=>{
 const q=quick('RECONSTRUCTION-1-0');await page.goto(lessonUrl(q));
 for(const [i,value] of ['{5}','5','4'].entries())await page.getByRole('textbox',{name:q.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('textbox',{name:q.fields[0].label,exact:true}).fill('{10,5}');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
 const means=quick('RECONSTRUCTION-2-1');await page.goto(lessonUrl(means));
 for(const [i,value] of ['{6}','6','30'].entries())await page.getByRole('textbox',{name:means.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('textbox',{name:means.fields[0].label,exact:true}).fill('{-6,6}');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
});

test('negative coding does not make SD negative and missing pairs retain their order',async({page})=>{
 const q=quick('CODED_TOTALS-2-1');await page.goto(lessonUrl(q));
 for(const [i,value] of ['14','18','-3*sqrt(2)'].entries())await page.getByRole('textbox',{name:q.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('textbox',{name:q.fields[2].label,exact:true}).fill('3*sqrt(2)');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
 const pair=quick('FREQUENCY_SYNTHESIS-4-0');await page.goto(lessonUrl(pair));
 for(const [i,value] of ['18','164','(10,8)'].entries())await page.getByRole('textbox',{name:pair.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('textbox',{name:pair.fields[2].label,exact:true}).fill('(8,10)');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
});

test('impossible moments are rejected and percentile ranks cannot replace their values',async({page})=>{
 const q=quick('RECONSTRUCTION-4-0');await page.goto(lessonUrl(q));
 for(const [i,value] of ['150','-5/3'].entries())await page.getByRole('textbox',{name:q.fields[i].label,exact:true}).fill(value);
 await page.locator('input[name="choice"][value="A"]').check();await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.locator('input[name="choice"][value="B"]').check();await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
 const percentile=quick('FREQUENCY_SYNTHESIS-3-0');await page.goto(lessonUrl(percentile));
 for(const [i,value] of ['10','85/3','50/3','40'].entries())await page.getByRole('textbox',{name:percentile.fields[i].label,exact:true}).fill(value);
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Look at the fields');
 await page.getByRole('textbox',{name:percentile.fields[0].label,exact:true}).fill('35/3');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.square-result')).toContainText('Correct');
});

test('written parts, solution protection, statement grid and all three variants work on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 const asset=pack.assets.find(a=>a.role==='SOLUTION'&&pack.questions.some(q=>q.id===a.question_uid&&q.variant_index===0))!;
 const q=pack.questions.find(q=>q.id===asset.question_uid)!;await page.goto(lessonUrl(q));
 await expect(page.locator('.square-question ol.parts > li')).toHaveCount(q.parts.length);
 await expect(page.locator('.square-question .square-marks')).toHaveCount(q.parts.length);
 expect([403,404]).toContain((await page.request.get(base+'/api/files/'+asset.file_id)).status());
 await expect(page.getByRole('button',{name:'Worked solution',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 await page.screenshot({path:out+'/written-question-390.png',fullPage:true});
 await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();await page.getByRole('button',{name:'Worked solution',exact:true}).click();
 await expect(page.locator('.question-support .katex').first()).toBeVisible();
 const img=page.locator('.question-support img').first();await expect(img).toBeVisible();await expect.poll(()=>img.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 expect(await img.getAttribute('src')).toContain('support=');await expect(page.locator('.katex-error')).toHaveCount(0);
 await page.screenshot({path:out+'/written-solution-390.png',fullPage:true});
 for(let v=1;v<=3;v++){
  await page.getByRole('button',{name:'Try a fresh version of this question →',exact:true}).click();
  await expect(page).toHaveURL(new RegExp('item='+pack.questions.find(r=>r.family_uid===q.family_uid&&r.variant_index===v)!.id));
 }
 await expect(page.getByRole('button',{name:'Try a fresh version of this question →',exact:true})).toHaveCount(0);
 await expect(page.locator('#practice')).toContainText('last prepared variant');
 const statement=pack.assets.find(a=>a.role==='STATEMENT')!;await page.goto(lessonUrl(pack.questions.find(q=>q.id===statement.question_uid)!));
 const grid=page.locator('.square-question img').first();await expect(grid).toBeVisible();await expect.poll(()=>grid.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('written back-to-back diagrams retain their central rules, key and all observations',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(lessonUrl(pack.questions.find(q=>q.id==='M4U-9709-S1-03-F036-M')!));
 const table=page.locator('.square-question table.stem-leaf-back');await expect(table).toHaveCount(1);await expect(table.locator('tbody tr').first()).toContainText('8 7 7 5 3 3 3');
 expect(await table.evaluate(e=>e.scrollWidth<=(e.parentElement?.clientWidth??0)+1)).toBe(true);
 const centre=table.locator('tbody tr').first().locator('td').nth(1);expect(await centre.evaluate(e=>getComputedStyle(e).borderLeftWidth)).toBe('2px');expect(await centre.evaluate(e=>getComputedStyle(e).borderRightWidth)).toBe('2px');
 await expect(page.locator('.square-question')).toContainText('Key:');await expect(page.locator('.square-question')).toContainText('23.4 mm');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 await page.locator('.square-question .stem-leaf-scroll').screenshot({path:out+'/written-back-to-back-390.png'});
});

test('teacher sees complete MCQ, answers, worked solutions, diagrams and marking without a learner gate',async({browser})=>{
 const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
 const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
 await page.goto(lessonUrl(quick('RECONSTRUCTION-4-0')));
 await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
 await expect(page.locator('.teacher-task-preview .full-question-options li')).toHaveCount(3);
 for(const name of ['Answers','Worked solution','Marking guidance']){
  await page.getByRole('tab',{name,exact:true}).click();await expect(page.getByRole('tabpanel',{name,exact:true})).not.toBeEmpty();await expect(page.locator('.katex-error')).toHaveCount(0);
 }
 await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
 const asset=pack.assets.find(a=>a.role==='SOLUTION')!;await page.goto(lessonUrl(pack.questions.find(q=>q.id===asset.question_uid)!));
 await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
 const img=page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('img').first();await expect(img).toBeVisible();await expect.poll(()=>img.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.setViewportSize({width:390,height:900});await page.goto(lessonUrl(pack.questions.find(q=>q.id==='M4U-9709-S1-03-F036-M')!));
 const stem=page.locator('.teacher-task-preview table.stem-leaf-back');await expect(stem).toHaveCount(1);expect(await stem.evaluate(e=>e.scrollWidth<=(e.parentElement?.clientWidth??0)+1)).toBe(true);
 await page.getByRole('link',{name:'Question bank and saved work',exact:true}).click();await expect(page).toHaveURL(/view=legacy/);
 await ctx.close();await api.dispose();
});
