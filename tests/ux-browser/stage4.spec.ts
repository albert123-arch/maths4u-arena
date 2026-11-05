import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
const root = 'test-results/stage4-20261105';
const book = '/courses/olymp-number-theory2', topic = book + '/topics/pilot_f2da4f4d6de9a3f01df74fffaacdbcf3792b3e29';
test.setTimeout(180000);
async function ready(page: Page, url: string) { await page.goto(url); await expect(page.locator('.brand')).toBeVisible(); await expect(page.locator('.catalog-skeleton,.skeleton')).toHaveCount(0); await page.evaluate(() => document.fonts.ready); }

test('stage4: server HTML, canonical, real language pairs and unavailable translations', async ({ request, browser }) => {
  const report=[];
  for(const path of ['/','/courses','/library','/courses/maths4u-9709-p1',book,topic,'/learn/olympiad']){
    const response=await request.get(path,{headers:{Cookie:'maths4u_locale=ru; maths4u_theme=dark'}}),html=await response.text();
    expect(response.status()).toBe(200);expect(html).toMatch(/<html[^>]*lang="en"/);expect(html).not.toMatch(/<html[^>]*data-theme=/);expect(html).toContain('theme-before-paint');
    expect(html).not.toContain('>Loading…<');expect(html).toContain('rel="canonical" href="https://arena.maths4u.sbs'+path+'"');
    const paired=[book,topic,'/learn/olympiad'].includes(path);expect(html.includes('hrefLang="ru"')).toBe(paired);report.push({path,status:response.status(),paired});
    if(path==='/courses')expect(html).toContain('Additional Mathematics');if(path==='/library')expect(html).toContain('catalog-task');
  }
  for(const path of ['/ru/courses/maths4u-9709-p1','/ru/learn/igcse','/ru/library','/ru/student'])expect((await request.get(path)).status()).toBe(404);
  for(const path of ['/student','/teacher','/admin','/login','/access']){const html=await (await request.get(path)).text();expect(html).toMatch(/name="robots" content="noindex, nofollow"/);expect(html).not.toContain('hrefLang=');}
  const staticContext=await browser.newContext({javaScriptEnabled:false}); const staticPage=await staticContext.newPage();
  await staticPage.goto('http://127.0.0.1:3102/courses/maths4u-9709-p1');await expect(staticPage.locator('h1')).toHaveText('Pure Mathematics 1 (9709)');await expect(staticPage.locator('.topic-entry')).toHaveCount(5);
  await staticPage.goto('http://127.0.0.1:3102/library');await expect(staticPage.locator('.catalog-task')).toHaveCount(25);await staticContext.close();
  await fs.writeFile(root+'/server-and-seo.json',JSON.stringify(report,null,2));
  const sitemap=await (await request.get('/sitemap.xml')).text();
  for(const path of [book,topic,'/learn/olympiad']){expect(sitemap).toContain('https://arena.maths4u.sbs/ru'+path);}
  expect(sitemap.match(/<loc>https:\/\/arena.maths4u.sbs\/ru\//g)).toHaveLength(3);
  expect(sitemap).not.toContain('/student');expect(sitemap).not.toContain('/search');
});

test('stage4: course navigation, five-chapter disclosures and display-only source cleanup', async ({page,request})=>{
  await page.setViewportSize({width:390,height:844});await ready(page,'/courses/maths4u-9709-p1');
  await expect(page.locator('.chapter-navigation')).toBeHidden();await expect(page.locator('.chapter-mobile summary')).toContainText('Chapter · Quadratics (1 of 10)');
  const disclosure=page.locator('.chapter-mobile summary');
  expect(await disclosure.evaluate(e=>getComputedStyle(e).listStyleType)).toBe('none');
  expect(await disclosure.evaluate(e=>getComputedStyle(e,'::marker').content)).toBe('""');
  await expect(disclosure.locator('[aria-hidden=true]')).toHaveText('▾');
  expect(await page.locator('.chapter-topics').evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(750);
  await expect(page.locator('h1')).not.toContainText('Maths4U Original');await expect(page.locator('.course-origin')).toHaveCount(1);
  await expect(page.locator('.page-heading')).not.toContainText('pilot:');await expect(page.locator('.course-personal-progress')).toHaveCount(0);
  await page.locator('.chapter-mobile summary').click();await page.locator('.chapter-mobile nav a').filter({hasText:'Functions'}).first().click();
  await expect(page.locator('.chapter-topics>h2')).toHaveText('Functions');await expect(page.locator('.chapter-mobile')).not.toHaveAttribute('open');
  const url=page.url();await page.reload();await expect(page.locator('.chapter-topics>h2')).toHaveText('Functions');expect(page.url()).toBe(url);
  await page.setViewportSize({width:1280,height:900});await expect(page.locator('.chapter-navigation a[aria-current=page]')).toContainText('Functions');
  for(const a of await page.locator('.chapter-navigation a').all()){await expect(a.locator('small')).toContainText('questions');expect(await a.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);}
  await page.goto('/courses');const card=page.locator('.compact-course').filter({has:page.getByRole('link',{name:'Pure Mathematics 1 (9709) →',exact:true})});
  await expect(card.locator('.chapter-index li')).toHaveCount(5);await card.getByRole('button',{name:'Show all (10)',exact:true}).click();await expect(card.locator('.chapter-index li')).toHaveCount(10);
  const all=await (await request.get('/api/catalog/courses?lang=en')).json(),functions=all.find((c:{slug:string})=>c.slug==='maths4u-9709-p1').chapters.find((c:{title:string})=>c.title==='Functions');
  const functionTopic='/courses/maths4u-9709-p1/topics/'+functions.topics[0].id;
  await ready(page,functionTopic);await expect(page.locator('.topic-theory')).not.toContainText('Maths4U Original');
  await ready(page,functionTopic+'?mode=WRITTEN');
  const text=await page.locator('main').innerText();expect(text).not.toMatch(/M4U-ORIG-|Maths4U Original ·/);await expect(page.locator('.catalog-task').first()).toBeVisible();
});

test('stage4: public HTML and learner data omit internal editorial provenance',async({request,page})=>{
  const forbidden=/\bAI\b|AI-assisted|editorial review|teacher_review|редакторск.{0,30}провер|провер.{0,30}ожидается/iu;
  const courses=await (await request.get('/api/catalog/courses?lang=en')).json();
  const paths=new Set<string>(['/','/courses','/library','/search?q=functions','/for-teachers','/ru/learn/olympiad','/ru'+book,'/ru'+topic]);
  const originalTopics:{path:string;id:string}[]=[];
  for(const course of courses){
    paths.add('/courses/'+course.slug);
    for(const chapter of course.chapters)if(chapter.original)for(const lesson of chapter.topics){
      const path='/courses/'+course.slug+'/topics/'+lesson.id;
      originalTopics.push({path,id:lesson.id});paths.add(path);paths.add(path+'?view=legacy');paths.add(path+'?mode=WRITTEN');
    }
  }
  const checked=[];
  for(const path of paths){const response=await request.get(path);expect(response.status(),path).toBe(200);expect(await response.text(),path).not.toMatch(forbidden);checked.push(path);}
  for(const lesson of originalTopics){const response=await request.get('/api/catalog/topics/'+lesson.id+'?lang=en');expect(response.status()).toBe(200);expect(await response.text()).not.toMatch(forbidden);}
  // Scan every page, including original rows beyond the first 25 results.
  let pages=1,total=0;
  for(let current=1;current<=pages;current++){
    const response=await request.get('/api/catalog?lang=en&pageSize=50&page='+current);expect(response.status()).toBe(200);
    const raw=await response.text();expect(raw).not.toMatch(forbidden);const data=JSON.parse(raw);pages=data.pages;total+=data.items.length;
  }
  await ready(page,'/courses/maths4u-9709-p1/topics/orig_functions_composite');
  expect(await page.locator('main').innerText()).not.toMatch(forbidden);
  await page.setViewportSize({width:390,height:844});
  for(const theme of ['light','dark'] as const){await page.emulateMedia({colorScheme:theme});await page.screenshot({path:root+'/after/functions-notes-390-'+theme+'.png',fullPage:true});}
  await ready(page,'/courses/maths4u-9709-p1/topics/orig_functions_composite?mode=WRITTEN');
  await expect(page.locator('.original-question-parts').first()).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(forbidden);
  await fs.writeFile(root+'/public-editorial-check.json',JSON.stringify({htmlPages:checked,originalTopics:originalTopics.length,catalogPages:pages,questions:total,forbiddenPhrasesFound:0},null,2));
});

test('stage4: Russian pages, cookie independence, links and responsive text overflow',async({browser,request})=>{
  const data=[];
  for(const theme of ['light','dark'] as const){const context=await browser.newContext({baseURL:"http://127.0.0.1:3102",colorScheme:theme});await context.addCookies([{name:'maths4u_locale',value:'en',url:'http://127.0.0.1:3102'}]);const page=await context.newPage();
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    for(const width of [390,1280,360,768]){await page.setViewportSize({width,height:width<800?844:900});
      for(const[name,path]of [['ru-direction','/learn/olympiad'],['ru-course',book],['ru-topic',topic]]){
        await ready(page,'/ru'+path);await expect(page.locator('html')).toHaveAttribute('lang','ru');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        const overflow=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('main *,header *,footer *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+1&&e.textContent?.trim()&&!e.closest('.katex,.katex-display,.square-nav,.quadratics-topics,.question-index')&&getComputedStyle(e).textOverflow!=='ellipsis';}).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.trim().slice(0,90),width:e.clientWidth,scroll:e.scrollWidth})));
        expect(overflow).toEqual([]);if(name==='ru-course'){await expect(page.locator('h1')).toHaveText('Теория чисел. Книга 2');await expect(page.locator('.course-description')).toHaveCount(0);}
        if(name==='ru-topic')await expect(page.locator('.topic-theory')).toContainText('Сильные задачи на НОД');
        data.push({name,width,theme,overflow});if([390,1280].includes(width))await page.screenshot({path:root+'/after/'+name+'-'+width+'-'+theme+'.png',fullPage:true});
      }
    }
    await page.setViewportSize({width:1280,height:900});await page.locator('.desktop-locale a').filter({hasText:'EN'}).click();await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page).toHaveURL(new RegExp(topic+'$'));
    expect(errors).toEqual([]);await context.close();
  }
  const html=await (await request.get('/ru'+topic+'?mode=WRITTEN')).text();expect(html).toContain('Постоянный остаток');expect(html).not.toContain('An English translation is unavailable');
  await fs.writeFile(root+'/russian-responsive.json',JSON.stringify(data,null,2));
});

test('stage4: pre-paint theme and URL language survive a saved Russian preference',async({browser})=>{
  const context=await browser.newContext({baseURL:"http://127.0.0.1:3102",colorScheme:'light'});await context.addCookies([{name:'maths4u_locale',value:'ru',url:'http://127.0.0.1:3102'},{name:'maths4u_theme',value:'dark',url:'http://127.0.0.1:3102'}]);
  const page=await context.newPage();await page.route('**/_next/static/**/*.js',r=>r.abort());
  await page.goto('/courses/maths4u-9709-p1');await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('.topic-entry')).toHaveCount(5);
  await context.close();
});
