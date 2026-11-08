import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-s1/binomial-geometric-v1.json';

const base='http://127.0.0.1:3109',out='.local/s1-binomial-geometric-20261108/screenshots';
const quick=(suffix:string)=>pack.questions.find(q=>q.id==='M4U-9709-S1-BG-CHECK-'+suffix)!;
const lessonUrl=(question:typeof pack.questions[number])=>base+'/courses/'+pack.course.slug+'/topics/'+pack.lessons.find(l=>l.key===question.lesson)!.id+'?item='+question.id+'#practice';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-s1-binomial-geometric');await fs.mkdir(out,{recursive:true});});

test('Binomial and geometric distributions chapter and five lessons on desktop and mobile',async({page})=>{
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

async function fill(page:import('@playwright/test').Page,q:typeof pack.questions[number],answers:string[]){
 for(const [i,value] of answers.entries()){
  const f=q.fields[i];if(f.type==='choice')await page.locator('input[name="'+f.key+'"][value="'+value+'"]').check();
  else await page.getByRole('textbox',{name:f.label,exact:true}).fill(value);
 }
}
async function check(page:import('@playwright/test').Page,correct:boolean){
 await page.getByRole('button',{name:'Check answer',exact:true}).click();
 await expect(page.locator('.square-result')).toContainText(correct?'Correct':'Look at the fields');
}

test('guest checks the complete count model and reviews a fresh persistent variant',async({page})=>{
 await page.setViewportSize({width:390,height:900});const q=quick('BINOMIAL_MODELS-1-0');await page.goto(lessonUrl(q));
 await fill(page,q,['4','1/3','8/27','22/27']);await check(page,false);
 await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();await expect(page).toHaveURL(/item=M4U-9709-S1-BG-CHECK-BINOMIAL_MODELS-1-1/);
 const fresh=quick('BINOMIAL_MODELS-1-1'),values=['5','1/2','5/16','13/16'];await fill(page,fresh,values);await check(page,true);
 await page.reload();for(const [i,value] of values.entries())await expect(page.getByRole('textbox',{name:fresh.fields[i].label,exact:true})).toHaveValue(value);
});

test('strict thresholds and both parameter branches are required',async({page})=>{
 const q=quick('INVERSE_BINOMIAL-3-0');await page.goto(lessonUrl(q));await fill(page,q,['3','3','7/8']);await check(page,false);
 await fill(page,q,['3','4','7/8']);await check(page,true);
 const roots=quick('INVERSE_BINOMIAL-4-0');await page.goto(lessonUrl(roots));await fill(page,roots,['1/4','1/4','1','3']);await check(page,false);
 await fill(page,roots,['1/4','3/4','1','3']);await check(page,true);
});

test('a shared cause is not independent; conditional moments retain their condition',async({page})=>{
 const q=quick('MIXED_BINOMIAL-2-0');await page.goto(lessonUrl(q));await fill(page,q,['1/2','1/4','1/2','A']);await check(page,false);
 await fill(page,q,['1/2','5/16','5/8','B']);await check(page,true);
 const cond=quick('MIXED_BINOMIAL-4-0');await page.goto(lessonUrl(cond));await fill(page,cond,['3/7','3/7','3/2']);await check(page,false);
 await fill(page,cond,['3/7','3/7','12/7']);await check(page,true);
});

test('geometric further waiting and the capped final mass use the correct convention',async({page})=>{
 const q=quick('GEOMETRIC-2-0');await page.goto(lessonUrl(q));await fill(page,q,['8/27','8/81','3','3']);await check(page,false);
 await fill(page,q,['8/27','4/27','3','5']);await check(page,true);
 const cap=quick('GEOMETRIC-4-0');await page.goto(lessonUrl(cap));await fill(page,cap,['1/8','2','7/8','2']);await check(page,false);
 await fill(page,cap,['1/4','7/4','7/8','2']);await check(page,true);
});

test('second-success events and competing stopping rules exclude already stopped histories',async({page})=>{
 const q=quick('SUCCESS_SEQUENCES-1-0');await page.goto(lessonUrl(q));await fill(page,q,['11/16','11/16','1/16']);await check(page,false);
 await fill(page,q,['3/16','11/16','1/16']);await check(page,true);
 const race=quick('SUCCESS_SEQUENCES-4-0');await page.goto(lessonUrl(race));await fill(page,race,['7/27','4/9','3','1/3']);await check(page,false);
 await fill(page,race,['7/27','4/9','22/9','1/3']);await check(page,true);
});

test('written parts, protected solution diagrams and all three fresh variants work on mobile',async({page})=>{
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
 const money=pack.questions.find(q=>q.id==='M4U-9709-S1-07-F010-M')!;await page.goto(lessonUrl(money));
 await expect(page.locator('.square-question')).toContainText('$180');await expect(page.locator('.katex-error')).toHaveCount(0);
 await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();await page.getByRole('button',{name:'Worked solution',exact:true}).click();
 await expect(page.locator('.question-support')).toContainText('$87.10');await expect(page.locator('.katex-error')).toHaveCount(0);
});

test('teacher immediately sees complete MCQ, answers, worked diagrams and marking guidance',async({browser})=>{
 const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
 const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
 await page.goto(lessonUrl(quick('BINOMIAL_MODELS-4-0')));
 await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
 await expect(page.locator('.teacher-task-preview .full-question-options li')).toHaveCount(3);
 for(const name of ['Answers','Worked solution','Marking guidance']){
  await page.getByRole('tab',{name,exact:true}).click();await expect(page.getByRole('tabpanel',{name,exact:true})).not.toBeEmpty();await expect(page.locator('.katex-error')).toHaveCount(0);
 }
 await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
 const asset=pack.assets.find(a=>a.role==='SOLUTION')!;await page.goto(lessonUrl(pack.questions.find(q=>q.id===asset.question_uid)!));
 await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
 const img=page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('img').first();await expect(img).toBeVisible();await expect.poll(()=>img.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.getByRole('link',{name:'Question bank and saved work',exact:true}).click();await expect(page).toHaveURL(/view=legacy/);
 await ctx.close();await api.dispose();
});
