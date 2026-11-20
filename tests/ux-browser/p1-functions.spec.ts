import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/functions-v1.json';
import teaching from '../../content/original/9709-p1/functions-study.json';

const base='http://127.0.0.1:3109',out='.local/p1-functions-20261108/screenshots';
const coursePath = '/courses/' + pack.course.slug;
const chapterPath = coursePath + '/chapters/functions';
const lessonPath = coursePath + '/topics/orig_functions_inverse';
const lessonUrl = base + lessonPath;
const compositePath = coursePath + '/topics/orig_functions_composite';
const restrictedPath = coursePath + '/topics/orig_functions_restricted_inverse';
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
    const lesson = teaching[l.id as keyof typeof teaching];
    if (lesson) {
      const checks = lesson.sections.reduce((total, section) => total + section.blocks.filter(block => block.kind === 'check').length, 0);
      await expect(page.locator('#examples li a')).toHaveCount(lesson.examples.length);
      await expect(page.locator('[data-study-check]')).toHaveCount(checks);
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
    for (const path of [chapterPath, lessonPath, compositePath, restrictedPath]) {
      expect(sitemap.split('<loc>https://arena.maths4u.sbs' + path + '</loc>')).toHaveLength(2);
    }
    expect(sitemap).not.toContain('?view=revision');
    await page.goto(compositePath);
    await expect(page).toHaveTitle('Composite functions and their domains | 9709 Pure 1 | Maths4U');
    await expect(page.locator('head link[rel=canonical]')).toHaveAttribute('href','https://arena.maths4u.sbs'+compositePath);
    await expect(page.locator('#which-function-first header img')).toBeVisible();
    await expect(page.locator('#keep-original-exclusions article ol > li:visible')).toHaveCount(3);
    await page.goto(restrictedPath);
    await expect(page).toHaveTitle('Ranges, restrictions and inverse branches | 9709 Pure 1 | Maths4U');
    await expect(page.locator('head link[rel=canonical]')).toHaveAttribute('href','https://arena.maths4u.sbs'+restrictedPath);
    await expect(page.locator('#range-of-the-restriction header img')).toBeVisible();
    await expect(page.locator('#swap-domain-and-range table tbody tr')).toHaveCount(2);
    await expect(page.locator('#choose-the-inverse-sign article').first().locator('ol > li:visible')).toHaveCount(3);
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

test('composite lesson checks both domains and offers a fresh practice variant', async ({page}) => {
  await page.setViewportSize({width:390,height:860});
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto(base + compositePath + '#which-function-first');
  const images = page.locator('#notes header img[src*="/composite-"]');
  await expect(images).toHaveCount(4);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el:HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  const worked = page.locator('#pull-back-root article');
  await expect(worked.locator('ol > li:visible')).toHaveCount(1);
  await worked.getByRole('button',{name:'Show next step'}).click();
  await expect(worked.locator('ol > li:visible')).toHaveCount(2);

  const root = page.locator('[data-study-check="root-needs-two-branches"]');
  await root.getByRole('button',{name:'Hint',exact:true}).click();
  await expect(root.getByText('Take both branches', {exact:false})).toBeVisible();
  await root.getByRole('textbox').fill('[3,4)');
  await root.getByRole('button',{name:'Check',exact:true}).click();
  await expect(root.locator('[data-status=retry]')).toContainText('positive branch');
  await root.getByRole('textbox').fill('−5 ≤ x ≤ −3 or 3 ≤ x < 4');
  await root.getByRole('textbox').press('Enter');
  await expect(root.locator('[data-status=correct]')).toBeVisible();

  const fraction = page.locator('[data-study-check="fraction-composite-domain"]');
  await fraction.getByRole('textbox').fill('x ≠ −2');
  await fraction.getByRole('button',{name:'Check',exact:true}).click();
  await expect(fraction.locator('[data-status=retry]')).toContainText('original fraction');
  await fraction.getByRole('textbox').fill('x ≠ −2 and x ≠ 0');
  await fraction.getByRole('button',{name:'Check',exact:true}).click();
  await expect(fraction.locator('[data-status=correct]')).toBeVisible();
  await expect(page.locator('#keep-original-exclusions a[href="#practice"]')).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.locator('#review').getByRole('link',{name:'Quick revision sheet (A4)'}).click();
  await expect(page).toHaveURL(base + compositePath + '?view=revision');
  await expect(page.locator('head meta[name=robots]')).toHaveAttribute('content',/noindex/);
  await expect(page.getByRole('heading',{name:'Composite functions and their domains',exact:true})).toBeVisible();

  await page.goto(base + compositePath + '#practice');
  const practice = page.locator('#practice');
  const fg = practice.getByRole('textbox',{name:'fg(x)',exact:true});
  const gf = practice.getByRole('textbox',{name:'gf(x)',exact:true});
  await fg.fill('9x^2-12x+5');
  await gf.fill('9x^2-12x+5');
  await practice.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(practice.locator('.square-result')).toContainText('Look at the fields');
  await page.locator('#review').getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  await expect(page).toHaveURL(/item=M4U-9709-P1-FN-CHECK-COMPOSITE-1-1/);
  await fg.fill('3-2x^2');
  await gf.fill('(5-2x)^2+1');
  await practice.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(practice.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();
  await expect(fg).toHaveValue('3-2x^2');
  await expect(gf).toHaveValue('(5-2x)^2+1');
});

test('restricted inverse checks the branch, exact output bounds and fresh practice', async ({page}) => {
  await page.setViewportSize({width:390,height:860});
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto(base + restrictedPath + '#choose-the-inverse-sign');
  const worked = page.locator('#choose-the-inverse-sign article').first();
  await expect(worked.locator('ol > li:visible')).toHaveCount(1);
  await worked.getByRole('button',{name:'Show all steps'}).click();
  await expect(worked.locator('ol > li:visible')).toHaveCount(3);
  const sign = page.locator('[data-study-check="right-branch-exact-inverse-value"]');
  await sign.getByRole('button',{name:'Hint',exact:true}).click();
  await expect(sign.getByText('gives an input of at least',{exact:false})).toBeVisible();
  await sign.getByRole('textbox').fill('3−√5');
  await sign.getByRole('textbox').press('Enter');
  await expect(sign.locator('[data-status=retry]')).toContainText('use the other root');
  await sign.getByRole('textbox').fill('3+√5');
  await sign.getByRole('textbox').press('Enter');
  await expect(sign.locator('[data-status=correct]')).toBeVisible();

  const domain = page.locator('[data-study-check="actual-domain-of-the-inverse"]');
  await domain.getByRole('textbox').fill('x ≥ −1');
  await domain.getByRole('button',{name:'Check',exact:true}).click();
  await expect(domain.locator('[data-status=retry]')).toContainText('only the outputs');
  await domain.getByRole('textbox').fill('0 < x ≤ 8');
  await domain.getByRole('button',{name:'Check',exact:true}).click();
  await expect(domain.locator('[data-status=correct]')).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.locator('#review').getByRole('link',{name:'Quick revision sheet (A4)'}).click();
  await expect(page).toHaveURL(base + restrictedPath + '?view=revision');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
  await expect(page.getByRole('heading',{name:'Ranges, restrictions and inverse branches',exact:true})).toBeVisible();

  await page.goto(base + restrictedPath + '?item=M4U-9709-P1-FN-CHECK-RESTRICTED-1-0#practice');
  const practice = page.locator('#practice');
  const formula = practice.getByRole('group',{name:'Inverse formula',exact:true});
  const inputs = practice.getByRole('textbox',{name:'Inverse domain',exact:true});
  const outputs = practice.getByRole('textbox',{name:'Inverse range',exact:true});
  await formula.locator('input[value="B"]').check();
  await inputs.fill('x ≥ 5');
  await outputs.fill('y ≥ 3');
  await practice.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(practice.locator('.square-result')).toContainText('Look at the fields');
  await page.locator('#review').getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  await expect(page).toHaveURL(/item=M4U-9709-P1-FN-CHECK-RESTRICTED-1-1/);
  await formula.locator('input[value="A"]').check();
  await inputs.fill('x ≥ 13');
  await outputs.fill('y ≥ 4');
  await practice.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(practice.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();
  await expect(formula.locator('input[value="A"]')).toBeChecked();
  await expect(inputs).toHaveValue('x ≥ 13');
  await expect(outputs).toHaveValue('y ≥ 4');
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
