import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/coordinate-geometry-v1.json';

const base='http://127.0.0.1:3109',out='.local/p1-coordinate-geometry-20261108/screenshots';
test.beforeAll(async()=>{await fs.mkdir(out,{recursive:true});});
test('Coordinate Geometry chapter and all five lessons on desktop and mobile',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  expect((await page.goto(base+'/courses/'+pack.course.slug+'?chapter='+pack.chapter.id))?.status()).toBe(200);
  await expect(page.locator('a[href="/courses/'+pack.course.slug+'/topics/'+pack.lessons[0].id+'"]').first()).toBeVisible();
  for(const l of pack.lessons)for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id);
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Check answer',exact:true})).toBeEnabled();
    await expect(page.locator('#examples .square-example')).toHaveCount(4);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    await expect(page.locator('#challenge .square-challenges button')).toHaveCount(10);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
    if(l.key==='circles'&&width===390)await page.screenshot({path:out+'/circles-390-viewport.png'});
  }
  expect(errors).toEqual([]);
});

test('guest exact lengths, complete midpoint, fresh review and retained answers',async({page})=>{
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_coordinate_geometry_distance_midpoint');
  await page.getByRole('textbox',{name:'Length AB',exact:true}).fill('0');
  await page.getByRole('textbox',{name:'Midpoint (x,y)',exact:true}).fill('(1,3)');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('item')).toBe('M4U-9709-P1-CG-CHECK-DISTANCE-1-1');
  await page.getByRole('textbox',{name:'Length AB',exact:true}).fill('sqrt(61)');
  await page.getByRole('textbox',{name:'Midpoint (x,y)',exact:true}).fill('(2,9/2)');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();await expect(page.getByRole('textbox',{name:'Midpoint (x,y)',exact:true})).toHaveValue('(2,9/2)');
  await expect(page.locator('#review')).toContainText('Return after a break');
});

test('free equation input accepts an equivalent circle and rejects a wrong centre',async({page})=>{
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_coordinate_geometry_circles');
  const input=page.getByRole('textbox',{name:'Circle equation',exact:true});
  await input.fill('(x-1)^2+(y+2)^2=25');
  await page.getByRole('textbox',{name:'Radius',exact:true}).fill('5');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await input.fill('x^2+y^2+2*x-4*y=20');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
});

test('written parts, all variants, statement diagrams and protected solutions on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const asset=pack.assets.find(a=>a.role==='SOLUTION'&&pack.questions.some(q=>q.id===a.question_uid&&q.variant_index===0))!;
  const q=pack.questions.find(q=>q.id===asset.question_uid)!,l=pack.lessons.find(l=>l.key===q.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id+'?item='+q.id+'#practice');
  await expect(page.locator('.square-question ol.parts > li')).toHaveCount(q.parts.length);
  await expect(page.locator('.square-question .square-marks')).toHaveCount(q.parts.length);
  await expect(page.getByRole('button',{name:'Worked solution',exact:true})).toBeDisabled();
  expect([403,404]).toContain((await page.request.get(base+'/api/files/'+asset.file_id)).status());
  await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();
  await page.getByRole('button',{name:'Worked solution',exact:true}).click();
  const image=page.locator('.question-support img').first();await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await image.getAttribute('src')).toContain('support=');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({path:out+'/written-solution-390.png',fullPage:true});
  for(let v=1;v<=3;v++){
    await page.getByRole('button',{name:'Try a fresh version of this question →',exact:true}).click();
    expect(new URL(page.url()).searchParams.get('item')).toBe(pack.questions.find(r=>r.family_uid===q.family_uid&&r.variant_index===v)!.id);
  }
  const statement=pack.assets.find(a=>a.role==='STATEMENT')!,question=pack.questions.find(q=>q.id===statement.question_uid)!,lesson=pack.lessons.find(l=>l.key===question.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+lesson.id+'?item='+question.id+'#practice');
  const figure=page.locator('.square-question img').first();await expect(figure).toBeVisible();
  await expect.poll(()=>figure.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('teacher sees solutions, mixed MCQ options and the preserved question bank',async({browser})=>{
  const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
  const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
  expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_coordinate_geometry_distance_midpoint');
  await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
  await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
  await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('.katex')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'Marking guidance',exact:true}).click();
  await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_coordinate_geometry_parallel_perpendicular?item=M4U-9709-P1-CG-CHECK-DIRECTIONS-4-0#practice');
  await expect(page.locator('.teacher-task-preview .full-question-options > li')).toHaveCount(3);
  await page.getByRole('link',{name:'Question bank and saved work',exact:true}).click();
  await expect(page).toHaveURL(/view=legacy/);await expect(page.locator('.square-lesson')).toHaveCount(0);
  await ctx.close();await api.dispose();
});
