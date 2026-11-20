import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/coordinate-geometry-v1.json';
import teaching from '../../content/original/9709-p1/coordinate-geometry-study.json';

const base='http://127.0.0.1:3109',out='.local/p1-coordinate-geometry-20261108/screenshots';
const coursePath='/courses/'+pack.course.slug,chapterPath=coursePath+'/chapters/'+pack.chapter.slug;
test.beforeAll(async()=>{await fs.mkdir(out,{recursive:true});});
test('Coordinate Geometry chapter and all five lessons on desktop and mobile',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  expect((await page.goto(base+coursePath+'?chapter='+pack.chapter.id))?.status()).toBe(200);
  await expect(page).toHaveURL(base+chapterPath);
  await expect(page.locator('a[href="/courses/'+pack.course.slug+'/topics/'+pack.lessons[0].id+'"]').first()).toBeVisible();
  for(const l of pack.lessons)for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id);
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Check answer',exact:true})).toBeEnabled();
    const notes=teaching[l.id as keyof typeof teaching];
    const checks=notes.sections.reduce((n,s)=>n+s.blocks.filter(b=>b.kind==='check').length,0);
    await expect(page.locator('#examples li a')).toHaveCount(notes.examples.length);
    await expect(page.locator('[data-study-check]')).toHaveCount(checks);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    await expect(page.locator('#challenge .square-challenges button')).toHaveCount(10);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
    if(l.key==='circles'&&width===390)await page.screenshot({path:out+'/circles-390-viewport.png'});
  }
  expect(errors).toEqual([]);
});

test('canonical chapter, notes and A4 views are readable without JavaScript',async({browser})=>{
  const context=await browser.newContext({baseURL:base,javaScriptEnabled:false,viewport:{width:390,height:900}});
  try{
    const page=await context.newPage();
    await page.goto(coursePath);
    const selector=page.locator('details.chapter-mobile');
    await selector.locator('summary').click();
    await selector.locator('a[href="'+chapterPath+'"]').click();
    await expect(page).toHaveURL(base+chapterPath);
    await expect(page).toHaveTitle('Coordinate Geometry | 9709 Pure 1 | Maths4U');
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content',/line and circle equations/);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://arena.maths4u.sbs'+chapterPath);
    const sitemap=await (await context.request.get('/sitemap.xml')).text();
    expect(sitemap.split('<loc>https://arena.maths4u.sbs'+chapterPath+'</loc>')).toHaveLength(2);
    expect(sitemap).not.toContain('?view=revision');
    for(const lesson of pack.lessons){
      const path=coursePath+'/topics/'+lesson.id;
      const first=teaching[lesson.id as keyof typeof teaching].sections[0];
      await page.goto(path);
      await expect(page).toHaveTitle(lesson.title+' | 9709 Pure 1 | Maths4U');
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://arena.maths4u.sbs'+path);
      await expect(page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Coordinate Geometry',exact:true})).toHaveAttribute('href',chapterPath);
      await expect(page.locator('#'+first.id+' article ol > li:visible')).toHaveCount(teaching[lesson.id as keyof typeof teaching].examples[0].solution.length);
      await expect(page.locator('#notes header img').first()).toBeVisible();
      expect(sitemap.split('<loc>https://arena.maths4u.sbs'+path+'</loc>')).toHaveLength(2);
      const structured=JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
      expect(structured).toEqual(expect.arrayContaining([
        expect.objectContaining({'@type':'BreadcrumbList'}),
        expect.objectContaining({'@type':['WebPage','LearningResource'],url:'https://arena.maths4u.sbs'+path}),
      ]));
      await page.locator('#review').getByRole('link',{name:'Quick revision sheet (A4)'}).click();
      await expect(page).toHaveURL(base+path+'?view=revision');
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
      await expect(page.getByRole('heading',{name:lesson.title,exact:true})).toBeVisible();
      await expect(page.locator('main img').first()).toBeVisible();
    }
  }finally{
    await context.close();
  }
});

test('line and circle checks give feedback for missing points and included tangent bounds',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto(base+coursePath+'/topics/orig_coordinate_geometry_line_circle#substitute-a-line-into-a-circle');
  const diagram=page.locator('#substitute-a-line-into-a-circle header img');
  await expect.poll(()=>diagram.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  const steps=page.locator('#substitute-a-line-into-a-circle article');
  await expect(steps.locator('ol > li:visible')).toHaveCount(1);
  await steps.getByRole('button',{name:'Show next step'}).click();
  await expect(steps.locator('ol > li:visible')).toHaveCount(2);
  const points=page.locator('[data-study-check="both-secant-points"]');
  await points.getByRole('textbox').fill('(3,4)');
  await points.getByRole('textbox').press('Enter');
  await expect(points.locator('[data-status=retry]')).toContainText('other root');
  await points.getByRole('textbox').fill('(3,4), (−4,−3)');
  await points.getByRole('textbox').press('Enter');
  await expect(points.locator('[data-status=correct]')).toBeVisible();
  const interval=page.locator('[data-study-check="secant-parameter-interval"]');
  await interval.getByRole('button',{name:'Hint',exact:true}).click();
  await expect(interval.getByText('strict inequality',{exact:false})).toBeVisible();
  await interval.getByRole('textbox').fill('[-4,4]');
  await interval.getByRole('button',{name:'Check',exact:true}).click();
  await expect(interval.locator('[data-status=retry]')).toContainText('strict interval');
  await interval.getByRole('textbox').fill('−4 < k < 4');
  await interval.getByRole('button',{name:'Check',exact:true}).click();
  await expect(interval.locator('[data-status=correct]')).toBeVisible();
});

test('straight-line starters precede circle tasks and link to the two-tangent method',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const lesson=coursePath+'/topics/orig_coordinate_geometry_straight_lines';
  const tangents=coursePath+'/topics/orig_coordinate_geometry_line_circle#find-tangents-from-an-external-point';
  await page.goto(base+lesson);
  const starter=page.locator('#challenge .exam-starter').first();
  await expect(page.locator('#challenge .exam-starter')).toHaveCount(2);
  await starter.locator('summary').first().click();
  await expect(starter.getByText('Find the intersection of',{exact:false})).toBeVisible();
  const mixed=page.locator('#challenge .exam-mixed');
  const question=mixed.getByRole('button',{name:/Both tangents from a fixed point/});
  await expect(question).toBeHidden();
  await mixed.locator('summary').click();
  await question.click();
  const method=page.locator('#practice .exam-prerequisites').getByRole('link',{name:'Two tangents from a point'});
  await expect(method).toHaveAttribute('href',tangents);
  await method.click();
  await expect(page).toHaveURL(base+tangents);
  const section=page.locator('#find-tangents-from-an-external-point');
  await expect.poll(()=>section.locator('header img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await section.getByRole('button',{name:'Show all steps'}).click();
  await expect(section.getByText('Test', {exact:false}).filter({hasText:'separately'}).first()).toBeVisible();
  for(const [id,answer] of [
    ['both-external-tangent-gradients','m=±3'],
    ['both-external-contact-points','(±3,1)'],
    ['vertical-tangent-from-outside','x=2'],
  ]){
    const check=section.locator('[data-study-check="'+id+'"]');
    await check.getByRole('textbox').fill(answer);
    await check.getByRole('button',{name:'Check',exact:true}).click();
    await expect(check.locator('[data-status=correct]')).toBeVisible();
  }
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
  const practice=page.locator('#practice');
  const input=practice.getByRole('textbox',{name:'Circle equation',exact:true});
  await input.fill('(x-1)^2+(y+2)^2=25');
  await practice.getByRole('textbox',{name:'Radius',exact:true}).fill('5');
  await practice.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(practice.locator('.square-result')).toContainText('Look at the fields');
  await input.fill('x^2+y^2+2*x-4*y=20');
  await practice.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(practice.locator('.square-result')).toContainText('All final answers are correct');
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
