import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-s1/normal-v1.json';

const base='http://127.0.0.1:3109',out='.local/s1-normal-20261108/screenshots';
const quick=(suffix:string)=>pack.questions.find(q=>q.id==='M4U-9709-S1-NORM-CHECK-'+suffix)!;
const lessonUrl=(question:typeof pack.questions[number])=>base+'/courses/'+pack.course.slug+'/topics/'+pack.lessons.find(l=>l.key===question.lesson)!.id+'?item='+question.id+'#practice';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-s1-normal');await fs.mkdir(out,{recursive:true});});

test('Normal distribution chapter and five lessons on desktop and mobile',async({page})=>{
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

test('normal parameters and tails use complete answers; calculator precision survives fresh review and reload',async({page})=>{
 await page.setViewportSize({width:390,height:900});const q=quick('NORMAL_AREAS-1-0');await page.goto(lessonUrl(q));
 await fill(page,q,['16','1','0.8413']);await check(page,false);
 await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();await expect(page).toHaveURL(/item=M4U-9709-S1-NORM-CHECK-NORMAL_AREAS-1-1/);
 const fresh=quick('NORMAL_AREAS-1-1'),values=['3','-1','0.841344746068543'];await fill(page,fresh,values);await check(page,true);
 await expect(page.getByText('Round as requested in the label, or enter your calculator value. Decimal or fraction input is accepted.',{exact:true})).toBeVisible();
 await page.reload();for(const [i,value] of values.entries())await expect(page.getByRole('textbox',{name:fresh.fields[i].label,exact:true})).toHaveValue(value);
});

test('inverse normal uses the correct quantile sign and distinguishes standard deviation from variance',async({page})=>{
 const q=quick('INVERSE_NORMAL-1-0');await page.goto(lessonUrl(q));await fill(page,q,['-1.2816','43.59']);await check(page,false);
 await fill(page,q,['1.2816','56.41']);await check(page,true);
 const fit=quick('INVERSE_NORMAL-4-0');await page.goto(lessonUrl(fit));await fill(page,fit,['54.49','127.78','0.7000']);await check(page,false);
 await fill(page,fit,['54.49','11.30','0.7000']);await check(page,true);
});

test('conditioning and rounded observations retain the correct sample space',async({page})=>{
 const q=quick('NORMAL_MODELS-1-0');await page.goto(lessonUrl(q));await fill(page,q,['0.5','0.1587','0.1587']);await check(page,false);
 await fill(page,q,['0.5','0.1587','0.3173']);await check(page,true);
 const rounded=quick('NORMAL_MODELS-4-0');await page.goto(lessonUrl(rounded));await fill(page,rounded,['18','0.0995','0.1355','C']);await check(page,false);
 await fill(page,rounded,['17.5','0.0995','0.1355','C']);await check(page,true);
});

test('continuity corrections distinguish inclusive tails, strict intervals and point strips',async({page})=>{
 const q=quick('BINOMIAL_APPROXIMATION-2-0');await page.goto(lessonUrl(q));await fill(page,q,['45','0.9186','0.1792']);await check(page,false);
 await fill(page,q,['44.5','0.9186','0.1792']);await check(page,true);
 const interval=quick('BINOMIAL_APPROXIMATION-3-0');await page.goto(lessonUrl(interval));await fill(page,interval,['33.5','46.5','0.7812']);await check(page,false);
 await fill(page,interval,['34.5','45.5','0.7812']);await check(page,true);
 const point=quick('BINOMIAL_APPROXIMATION-4-0');await page.goto(lessonUrl(point));await fill(page,point,['20','20','0']);await check(page,false);
 await fill(page,point,['19.5','20.5','0.1089']);await check(page,true);
});

test('integer design cutoffs stay exact and equality to five does not meet the approximation criterion',async({page})=>{
 const q=quick('MIXED_INVERSE-2-0');await page.goto(lessonUrl(q));await fill(page,q,['56.41','56','0.9192']);await check(page,false);
 await fill(page,q,['56.41','57','0.91924334076622']);await check(page,true);
 const cond=quick('BINOMIAL_APPROXIMATION-1-1');await page.goto(lessonUrl(cond));await fill(page,cond,['5','15','B']);await check(page,false);
 await fill(page,cond,['5','15','C']);await check(page,true);
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

});

test('teacher immediately sees complete MCQ, answers, worked diagrams and marking guidance',async({browser})=>{
 const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
 const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
 await page.goto(lessonUrl(quick('NORMAL_AREAS-4-0')));
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
