import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-s1/counting-v1.json';

const base='http://127.0.0.1:3109',out='.local/s1-counting-20261108/screenshots';
const quick=(suffix:string)=>pack.questions.find(q=>q.id==='M4U-9709-S1-COUNT-CHECK-'+suffix)!;
const lessonUrl=(question:typeof pack.questions[number])=>base+'/courses/'+pack.course.slug+'/topics/'+pack.lessons.find(l=>l.key===question.lesson)!.id+'?item='+question.id+'#practice';
test.beforeAll(async()=>{expect(pack.key).toBe('9709-s1-counting');await fs.mkdir(out,{recursive:true});});

test('Permutations and combinations chapter and five lessons on desktop and mobile',async({page})=>{
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

test('guest corrects leading-zero overcount, then reviews a fresh persistent variant',async({page})=>{
 await page.setViewportSize({width:390,height:900});const q=quick('DISTINCT_ARRANGEMENTS-2-0');await page.goto(lessonUrl(q));
 await fill(page,q,['300','60','96','180']);await check(page,false);
 await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();await expect(page).toHaveURL(/item=M4U-9709-S1-COUNT-CHECK-DISTINCT_ARRANGEMENTS-2-1/);
 const fresh=quick('DISTINCT_ARRANGEMENTS-2-1'),values=['48','12','18','30'];await fill(page,fresh,values);await check(page,true);
 await page.reload();for(const [i,value] of values.entries())await expect(page.getByRole('textbox',{name:fresh.fields[i].label,exact:true})).toHaveValue(value);
});

test('exactly one pair excludes a triple and pair-event intersections are removed correctly',async({page})=>{
 const q=quick('REPEATED_OBJECTS-4-0');await page.goto(lessonUrl(q));await fill(page,q,['24','96','24']);await check(page,false);
 await fill(page,q,['24','72','24']);await check(page,true);
 const overlap=quick('REPEATED_OBJECTS-2-0');await page.goto(lessonUrl(overlap));await fill(page,overlap,['24','72','1/2']);await check(page,false);
 await fill(page,overlap,['24','72','3/4']);await check(page,true);
});

test('only equal-size unnamed groups can be swapped and mixed MCQ checks all fields',async({page})=>{
 const q=quick('ALLOCATIONS-2-0');await page.goto(lessonUrl(q));await fill(page,q,['630','105','A']);await check(page,false);
 await fill(page,q,['630','315','B']);await check(page,true);
 const teams=quick('ALLOCATIONS-1-0');await page.goto(lessonUrl(teams));await fill(page,teams,['20','20','4']);await check(page,false);
 await fill(page,teams,['20','10','4']);await check(page,true);
});

test('uniform physical subsets are not uniform visible patterns',async({page})=>{
 const q=quick('MIXED_COUNTING-2-0');await page.goto(lessonUrl(q));await fill(page,q,['6','4','1/2','5/6']);await check(page,false);
 await fill(page,q,['6','4','2/3','5/6']);await check(page,true);
});

test('conditioning restricts the denominator for numbered rows and overlapping blocks',async({page})=>{
 const q=quick('ALLOCATIONS-3-0');await page.goto(lessonUrl(q));await fill(page,q,['288','192','4/15']);await check(page,false);
 await fill(page,q,['288','192','2/3']);await check(page,true);
 const overlap=quick('MIXED_COUNTING-3-0');await page.goto(lessonUrl(overlap));await fill(page,overlap,['48','384','1/3']);await check(page,false);
 await fill(page,overlap,['48','384','5/9']);await check(page,true);
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
 await page.goto(lessonUrl(quick('ALLOCATIONS-2-0')));
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
