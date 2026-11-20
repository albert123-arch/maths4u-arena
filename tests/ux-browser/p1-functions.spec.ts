import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/functions-v1.json';

const base='http://127.0.0.1:3109',out='.local/p1-functions-20261108/screenshots';
const coursePath = '/courses/' + pack.course.slug;
const chapterPath = coursePath + '/chapters/functions';
const lessonPath = coursePath + '/topics/orig_functions_inverse';
const lessonUrl = base + lessonPath;
test.beforeAll(async()=>{await fs.mkdir(out,{recursive:true});});
test('Functions: all five public lessons at desktop and mobile widths',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const chapter=await page.goto(base+'/courses/'+pack.course.slug+'?chapter='+pack.chapter.id);expect(chapter?.status()).toBe(200);
  await expect(page).toHaveURL(base + chapterPath);
  await expect(page.locator('a[href="/courses/'+pack.course.slug+'/topics/orig_functions_inverse"]').first()).toBeVisible();
  for(const l of pack.lessons)for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id);
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Check answer',exact:true})).toBeEnabled();
    if (l.id === 'orig_functions_inverse') {
      await expect(page.locator('#examples li a')).toHaveCount(7);
      await expect(page.locator('[data-study-check]')).toHaveCount(10);
    } else await expect(page.locator('#examples .square-example')).toHaveCount(4);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    await expect(page.locator('#challenge .square-challenges button')).toHaveCount(10);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
    if(l.key==='restricted'&&width===390)await page.screenshot({path:out+'/restricted-390-viewport.png'});
  }
  expect(errors).toEqual([]);
});

test('the new Functions lesson and canonical chapter are readable without JavaScript', async ({browser}) => {
  const ctx = await browser.newContext({baseURL:base, javaScriptEnabled:false, viewport:{width:390,height:860}});
  try {
    const page = await ctx.newPage();
    await page.goto(coursePath);
    const chapters = page.locator('details.chapter-mobile');
    await chapters.locator('summary').click();
    await chapters.locator('a[href="' + chapterPath + '"]').click();
    await expect(page).toHaveURL(base + chapterPath);
    await page.locator('a[href="' + lessonPath + '"]').first().click();
    await expect(page).toHaveTitle('Functions, domain, range and inverses | 9709 Pure 1 | Maths4U');
    await expect(page.locator('head link[rel=canonical]')).toHaveAttribute('href', 'https://arena.maths4u.sbs' + lessonPath);
    await expect(page.locator('head meta[name=description]')).toHaveAttribute('content', /test whether a function is one/);
    await expect(page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Functions',exact:true})).toHaveAttribute('href', chapterPath);
    await expect(page.locator('#reverse-the-mapping header img')).toBeVisible();
    const inverse = page.locator('#inverse-formula article').first();
    await expect(inverse.locator('ol > li:visible')).toHaveCount(4);
    await expect(inverse).toContainText('Check the pair from the beginning');
    await expect(page.locator('#notes form').first().getByRole('textbox')).toBeHidden();
    const document = await (await ctx.request.get(lessonPath)).text();
    expect(document).toContain('<noscript><p>Work out your answer on paper.');
    const structured = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(structured!)).toEqual(expect.arrayContaining([
      expect.objectContaining({'@type':'BreadcrumbList'}),
      expect.objectContaining({'@type':['WebPage','LearningResource'],url:'https://arena.maths4u.sbs'+lessonPath}),
    ]));
    const sitemap = await (await ctx.request.get('/sitemap.xml')).text();
    for (const path of [chapterPath, lessonPath]) {
      expect(sitemap.split('<loc>https://arena.maths4u.sbs' + path + '</loc>')).toHaveLength(2);
    }
    expect(sitemap).not.toContain('?view=revision');
  } finally {
    await ctx.close();
  }
});

test('Functions graphics, worked steps, answer feedback and the A4 view work on mobile', async ({page}) => {
  await page.setViewportSize({width:390,height:860});
  await page.emulateMedia({colorScheme:'dark'});
  await page.addInitScript(() => {window.print = () => {document.body.dataset.printChecked = 'true';};});
  await page.goto(lessonUrl + '#attained-outputs');
  for (const section of ['attained-outputs','one-one','reverse-the-mapping']) {
    const img = page.locator('#' + section + ' header img');
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el:HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  const worked = page.locator('#inverse-formula article').first();
  await expect(worked.locator('ol > li:visible')).toHaveCount(1);
  await worked.getByRole('button',{name:'Show next step'}).click();
  await expect(worked.locator('ol > li:visible')).toHaveCount(2);
  await worked.getByRole('button',{name:'Show all steps'}).click();
  await expect(worked.locator('ol > li:visible')).toHaveCount(4);
  const samples = [
    ['range-of-decreasing-line','2 ≤ x < 14','retry','output values'],
    ['range-of-decreasing-line','2 ≤ g(x) < 14','correct','Correct'],
    ['root-and-denominator-domain','[-5,2]','retry','denominator is zero'],
    ['root-and-denominator-domain','−5 ≤ x ≤ 2 and x ≠ −3','correct','Correct'],
    ['undo-not-reciprocal','1/11','retry','reciprocal of'],
    ['reverse-all-pairs','(3,−4), (0,−1), (8,5)','correct','Correct'],
    ['fraction-inverse-domain','x ≠','format','Check the format'],
    ['fraction-inverse-domain','x ≠ 1','correct','Correct'],
  ];
  for (const [id,answer,status,text] of samples) {
    const check = page.locator('[data-study-check="' + id + '"]');
    await check.getByRole('textbox').fill(answer);
    await check.getByRole('button',{name:'Check',exact:true}).click();
    await expect(check.locator('[data-status=' + status + ']')).toContainText(text);
  }
  await expect(page.locator('#inverse-formula a[href="#practice"]')).toBeVisible();
  await expect(page.locator('#review')).toContainText('Your review plan starts after your first check');
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.locator('#review').getByRole('link',{name:'Quick revision sheet (A4)'}).click();
  await expect(page).toHaveURL(lessonUrl + '?view=revision');
  await expect(page.getByText('Pure Mathematics 1 (9709) · Functions · Quick revision',{exact:true})).toBeVisible();
  await expect(page.locator('head meta[name=robots]')).toHaveAttribute('content',/noindex/);
  await expect(page.locator('head link[rel=canonical]')).toHaveAttribute('href','https://arena.maths4u.sbs'+lessonPath);
  await page.getByRole('button',{name:'Print / Save as PDF'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-checked','true');
});

test('guest checking rejects a wrong endpoint, gives a fresh inverse and retains the complete answer',async({page})=>{
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_functions_inverse');
  await page.getByRole('textbox',{name:'Inverse formula in x',exact:true}).fill('(7-x)/2');
  await page.getByRole('textbox',{name:'Inverse domain',exact:true}).fill('[1,9]');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('item')).toBe('M4U-9709-P1-FN-CHECK-INVERSE-1-1');
  await page.getByRole('textbox',{name:'Inverse formula in x',exact:true}).fill('(10-x)/3');
  await page.getByRole('textbox',{name:'Inverse domain',exact:true}).fill('1 < x ≤ 13');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();await expect(page.getByRole('textbox',{name:'Inverse domain',exact:true})).toHaveValue('1 < x ≤ 13');
  await expect(page.locator('#review')).toContainText('Return after a break');
});

test('written variants and diagrams retain marks and help boundaries on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const asset=pack.assets.find(a=>a.role==='SOLUTION'&&pack.questions.some(q=>q.id===a.question_uid&&q.variant_index===0))!;
  const q=pack.questions.find(q=>q.id===asset.question_uid)!,lesson=pack.lessons.find(l=>l.key===q.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+lesson.id+'?item='+q.id+'#practice');
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
  for(let i=1;i<=3;i++){
    await page.getByRole('button',{name:'Try a fresh version of this question →',exact:true}).click();
    expect(new URL(page.url()).searchParams.get('item')).toBe(pack.questions.find(r=>r.family_uid===q.family_uid&&r.variant_index===i)!.id);
  }
  const statement=pack.assets.find(a=>a.role==='STATEMENT')!,question=pack.questions.find(q=>q.id===statement.question_uid)!,l=pack.lessons.find(l=>l.key===question.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id+'?item='+question.id+'#practice');
  await expect(page.locator('.square-question img').first()).toBeVisible();
  await expect.poll(()=>page.locator('.square-question img').first().evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('teacher solutions open immediately and the earlier question bank remains accessible',async({browser})=>{
  const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
  const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
  expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()}),page=await ctx.newPage();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_functions_inverse');
  await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
  await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
  await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('.katex')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'Marking guidance',exact:true}).click();
  await expect(page.getByRole('region',{name:'Marking guidance table'})).toBeVisible();
  await page.goto('/courses/'+pack.course.slug+'/topics/orig_functions_inverse?item=M4U-9709-P1-FN-CHECK-INVERSE-2-0#practice');
  await expect(page.locator('.teacher-task-preview .full-question-options > li')).toHaveCount(3);
  await page.getByRole('link',{name:'Question bank and saved work',exact:true}).click();
  await expect(page).toHaveURL(/view=legacy/);await expect(page.locator('.square-lesson')).toHaveCount(0);
  await ctx.close();await api.dispose();
});
