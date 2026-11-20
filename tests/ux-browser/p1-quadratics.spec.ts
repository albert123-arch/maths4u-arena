import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import pack from '../../content/original/9709-p1/quadratics-v1.json';
import study from '../../content/original/9709-p1/quadratics-study.json';

const base='http://127.0.0.1:3109',out='.local/p1-quadratics-20261108/screenshots';
test.beforeAll(async()=>{await fs.mkdir(out,{recursive:true});});
test('Quadratics is linked from the course and all five lessons are readable without JavaScript', async ({browser}) => {
  const context = await browser.newContext({baseURL:base, javaScriptEnabled:false, viewport:{width:390,height:850}});
  const course = '/courses/' + pack.course.slug, chapter = course + '/chapters/' + pack.chapter.slug;
  const origin = 'https://arena.maths4u.sbs';
  try {
    const page = await context.newPage();
    await page.goto(course);
    expect(await page.locator('a[href="' + chapter + '"]').count()).toBeGreaterThan(0);
    await page.goto(course + '?chapter=' + pack.chapter.id);
    await expect(page).toHaveURL(base + chapter);
    await expect(page.locator('h1')).toHaveText(pack.chapter.title);
    await expect(page.locator('.chapter-topics article h3 a')).toHaveCount(pack.lessons.length);
    const sitemap = await (await context.request.get('/sitemap.xml')).text();
    for (const path of [chapter, ...pack.lessons.map(l => course + '/topics/' + l.id)]) {
      const address = origin + path;
      expect(sitemap.split('<loc>' + address + '</loc>')).toHaveLength(2);
      expect(sitemap).not.toContain(address + '?');
      await page.goto(path);
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',address);
      await expect(page).toHaveTitle(/9709 Pure 1/);
      const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '[]');
      expect(graph[0].itemListElement.at(-1).item).toBe(address);
      expect(graph[1].url).toBe(address);
      expect(graph[1].description).toBe(await page.locator('meta[name=description]').getAttribute('content'));
      expect(sitemap).toContain('<lastmod>' + graph[1].dateModified + '</lastmod>');
      const lesson = pack.lessons.find(l => path.endsWith('/' + l.id));
      if (lesson) {
        const content = study[lesson.id as keyof typeof study];
        await expect(page.locator('#notes section h2')).toHaveText(content.sections.map(s => s.title));
        const count = content.examples.reduce((total, e) => total + e.solution.length, 0);
        await expect(page.locator('#notes article ol[id$="-steps"] > li:visible')).toHaveCount(count);
      }
    }
    const printed = course + '/topics/' + pack.lessons[0].id;
    await page.goto(printed + '?view=revision');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',origin + printed);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
    for (const duplicate of [printed + '/extra', printed.replace('9709-p1','9709-s1')]) {
      expect((await context.request.get(duplicate)).status()).toBe(404);
    }
  } finally { await context.close(); }
});
test('the first available worked-step control responds even when scripts load slowly', async ({page}) => {
  let releaseScripts!: () => void;
  const gate = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?|$)/, async route => { await gate; await route.continue(); });
  const example = page.locator('#factorise article').last();
  const next = example.locator('button').first();
  try {
    await page.goto(base+'/courses/'+pack.course.slug+'/topics/orig_quadratics_factorisation',{waitUntil:'commit'});
    await expect(example.locator('h3')).toBeVisible();
    await expect(next).toHaveText('Show next step');
    await expect(next).toBeHidden();
  } finally { releaseScripts(); }
  await next.click();
  await expect(example.locator('ol > li:visible')).toHaveCount(2);
});
test('five public lessons: desktop and mobile notes, mathematical layout and main-only lists',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const l of pack.lessons)for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+l.id);
    await expect(page.getByRole('heading',{name:l.title,exact:true})).toBeVisible();
    const authored=study[l.id as keyof typeof study];
    await expect(page.locator('#examples li a')).toHaveCount(authored.examples.length);
    await expect(page.locator('#notes section h2')).toHaveText(authored.sections.map(section=>section.title));
    await expect(page.locator('[data-study-check]')).toHaveCount(authored.sections.flatMap(s=>s.blocks.filter(b=>b.kind==='check')).length);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    await expect(page.locator('#challenge .square-challenges button')).toHaveCount(pack.questions.filter(q=>q.lesson===l.key&&q.collection==='exam'&&q.variant_index===0).length);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    if(l.key==='simultaneous'&&width===390){
      await page.evaluate(()=>document.fonts.ready);
      const displays=page.locator('#notes .katex-display:visible');
      expect(await displays.evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+5).map(node=>node.textContent))).toEqual([]);
    }
    await page.screenshot({path:out+'/'+l.key+'-'+width+'.png',fullPage:true});
  }
  expect(errors).toEqual([]);
});

test('guest full-root checking, fresh review and draft persistence',async({page})=>{
  const path='/courses/'+pack.course.slug+'/topics/orig_quadratics_factorisation';
  await page.goto(base+path);
  const field=page.locator('#practice').getByRole('textbox',{name:'All real roots',exact:true});
  await field.fill('0');await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('item')).toBe('M4U-9709-P1-QD-CHECK-EQUATIONS-1-1');
  await field.fill('x = 0 or x = -3');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();await expect(field).toHaveValue('x = 0 or x = -3');
  await expect(page.locator('#review')).toContainText('Return after a break');
});

test('lesson steps, mobile contents and formative feedback',async({page})=>{
  const path='/courses/'+pack.course.slug+'/topics/orig_quadratics_factorisation';
  await page.setViewportSize({width:390,height:850});
  await page.goto(base+path);
  const contents=page.locator('#notes aside > details');
  await contents.locator('summary').first().click();
  await contents.getByRole('link',{name:'Factorise and find the roots',exact:false}).click();
  await expect(page).toHaveURL(/#factorise$/);
  const example=page.locator('#factorise article').last();
  await expect(example.locator('ol>li:visible')).toHaveCount(1);
  await example.getByRole('button',{name:'Show next step'}).click();
  await expect(example.locator('ol>li:visible')).toHaveCount(2);
  await example.getByRole('button',{name:'Show all steps'}).click();
  await expect(example.locator('ol>li:visible')).toHaveCount(study.orig_quadratics_factorisation.examples[0].solution.length);
  const check=page.locator('[data-study-check="monic-roots"]');
  const answer=check.getByRole('textbox');
  await answer.fill('x = 3');
  await check.getByRole('button',{name:'Check',exact:true}).click();
  await expect(check.locator('[data-status=retry]')).toContainText('another root');
  await answer.fill('x = −5 or x = 3');
  await check.getByRole('button',{name:'Check',exact:true}).click();
  await expect(check.locator('[data-status=correct]')).toContainText('Correct');
  await expect(page.locator('#review')).toContainText('Your review plan starts after your first check');
  await page.locator('#review').getByRole('link',{name:'Quick revision sheet (A4)'}).click();
  await expect(page.getByRole('button',{name:'Print / Save as PDF'})).toBeVisible();
  await expect(page.locator('head link[rel=canonical]')).toHaveAttribute('href','https://arena.maths4u.sbs'+path);
});

test('Completing the square shows both diagrams on arrival and grades range notation as a guest', async ({page}) => {
  const path = '/courses/' + pack.course.slug + '/topics/orig_quadratics_completing_square';
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 900});
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({colorScheme});
      await page.goto(base + path);
      for (const selector of ['#make-the-square img', '#sketch-parabola img[src$="square-sketch.svg"]']) {
        const image = page.locator(selector);
        await expect(image).toHaveCount(1);
        await image.scrollIntoViewIfNeeded();
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      }
      const sketch = page.locator('#sketch-parabola header img');
      await expect(sketch).toBeVisible();
      const offsetFromHeading = await sketch.evaluate(el => el.getBoundingClientRect().top - el.closest('header')!.getBoundingClientRect().top);
      expect(offsetFromHeading).toBeLessThan(280);
      await expect(page.locator('#worked-example-6 ol>li:visible')).toHaveCount(1);
      await expect(page.locator('#restricted-range header')).toContainText('Core · about 5 min');
      await expect(page.locator('#open-and-unbounded-domains header')).toContainText('Extension');
      await expect(page.locator('#restricted-range a[href="#practice"]')).toBeVisible();
      await expect(page.locator('.katex-error')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  }
  const check = page.locator('[data-study-check="full-parabola-range"]');
  for (const [answer, status] of [['f(x) ≤ 8','correct'],['y <= 8','correct'],['(−inf, 8]','correct'],['x ≤ 8','retry'],['y < 8','retry']]) {
    await check.getByRole('textbox').fill(answer);
    await check.getByRole('button',{name:'Check',exact:true}).click();
    await expect(check.locator('[data-status='+status+']')).toBeVisible();
    if (answer.startsWith('x')) await expect(check.locator('[data-status=retry]')).toContainText('output values');
  }
  const bounded = page.locator('[data-study-check="restricted-parabola-range"]');
  await bounded.getByRole('textbox').fill('0 ≤ g(x) ≤ 9');
  await bounded.getByRole('button',{name:'Check',exact:true}).click();
  await expect(bounded.locator('[data-status=correct]')).toBeVisible();
  await expect(page.locator('#review')).toContainText('Your review plan starts after your first check');
});

test('exam-style answers work across lessons, Practice and a fresh review variant', async ({page}) => {
  const lesson = (suffix: string) => base + '/courses/' + pack.course.slug + '/topics/orig_quadratics_' + suffix;
  await page.setViewportSize({width:390, height:850});
  const examples: [string, string, string][] = [
    ['factorisation','signed-b','b = −4'],
    ['roots','strict-sign-parameters','k > 8'],
    ['simultaneous','full-intersections','(2, 4), (−1, 1)'],
    ['simultaneous','tangent-point','x = 2, y = 5'],
    ['inequalities','outside-including-roots','x ≤ −2 or x ≥ 3'],
  ];
  for (const [route, id, value] of examples) {
    await page.goto(lesson(route));
    const form = page.locator('[data-study-check="' + id + '"]');
    if (id === 'outside-including-roots') {
      await expect(form).toContainText('Use inequalities in x');
      await expect(form).not.toContainText('Give every root');
    }
    if (id === 'signed-b') await expect(page.locator('#fractional-and-reciprocal-substitutions header')).toContainText('Extension');
    await form.getByRole('textbox').fill(value);
    await form.getByRole('button',{name:'Check',exact:true}).click();
    await expect(form.locator('[data-status=correct]')).toBeVisible();
  }
  await page.goto(lesson('inequalities') + '?item=M4U-9709-P1-QD-CHECK-INEQUALITIES-1-0#practice');
  const field = page.locator('#practice').getByRole('textbox', {name:'All allowed x-values', exact:true});
  await field.fill('−2 < x ≤ 3');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('Look at the fields');
  await page.getByRole('button',{name:'Review with a fresh variant →',exact:true}).click();
  await expect(page).toHaveURL(/item=M4U-9709-P1-QD-CHECK-INEQUALITIES-1-1/);
  await field.fill('−3 ≤ x ≤ 4');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.square-result')).toContainText('All final answers are correct');
  await page.reload();
  await expect(field).toHaveValue('−3 ≤ x ≤ 4');
  await expect(page.locator('#review')).toContainText('Return after a break');
});

test('exam marks, all numerical variants and protected vector solutions',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  const q=pack.questions.find(q=>q.variant_index===0&&q.id.endsWith('-02'))!;
  const lesson=pack.lessons.find(l=>l.key===q.lesson)!;
  await page.goto(base+'/courses/'+pack.course.slug+'/topics/'+lesson.id+'?item='+q.id+'#practice');
  await expect(page.locator('.square-question ol.parts > li')).toHaveCount(q.parts.length);
  await expect(page.locator('.square-question .square-marks')).toHaveCount(q.parts.length);
  await expect(page.getByRole('button',{name:'Worked solution',exact:true})).toBeDisabled();
  const asset=pack.assets.find(a=>a.question_uid===q.id&&a.role==='SOLUTION')!;
  const before=await page.request.get(base+'/api/files/'+asset.file_id);expect([403,404]).toContain(before.status());
  await page.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();
  await page.getByRole('button',{name:'Worked solution',exact:true}).click();
  const image=page.locator('.question-support img');await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  const src=await image.getAttribute('src');expect(src).toContain('support=');
  const response=await page.request.get(base+src);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toBe('image/svg+xml');
  for(let index=1;index<=3;index++){
    await page.getByRole('button',{name:'Try a fresh version of this question →',exact:true}).click();
    const family=pack.questions.find(r=>r.family_uid===q.family_uid&&r.variant_index===index)!;
    expect(new URL(page.url()).searchParams.get('item')).toBe(family.id);
  }
  await page.screenshot({path:out+'/exam-390.png',fullPage:true});
});

test('teacher previews current and preserved old questions without learner unlocks',async({browser})=>{
  const fixture=JSON.parse(await fs.readFile('.local/c1-20261106/fixture.json','utf8'));
  const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
  expect((await api.post('/api/auth/login',{data:{username:'qa_c1_teacher',password:fixture.password}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,storageState:await api.storageState()});const page=await ctx.newPage();
  for(const suffix of ['', '?practice=previous']){
    await page.goto('/courses/'+pack.course.slug+'/topics/orig_quadratics_factorisation'+suffix);
    await expect(page.getByRole('region',{name:'Read-only teacher question preview'})).toBeVisible();
    await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
    await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true})).not.toContainText('QUESTION_CHANGED');
    await expect(page.getByRole('tabpanel',{name:'Worked solution',exact:true}).locator('.katex')).not.toHaveCount(0);
    await expect(page.getByRole('tab',{name:'Answers',exact:true})).toBeEnabled();
  }
  await ctx.close();await api.dispose();
});
