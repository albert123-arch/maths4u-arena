import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
type Representative={slug:string;title:string;sourceId:string;taskId:string;lessonId:string};
async function login(page:Page,role:'admin'|'student'|'teacher') {const f=JSON.parse(await readFile('.local/content-bank/preview.json','utf8'));await page.goto('/login');await page.locator('[name=username]').fill(f.users[role]);await page.locator('[name=password]').fill(f.password);await page.locator('form button[type=submit]').click();await expect(page.locator('[name=password]')).toHaveCount(0);await page.getByRole('button',{name:'EN',exact:true}).click();return f;}
async function images(page:Page){await expect.poll(()=>page.locator('.math-content img:visible').evaluateAll(nodes=>nodes.every(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0))).toBe(true);}
test('compact course index, >100 tasks, guest boundary and saved filters',async({page})=>{
  await page.goto('/courses');await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('heading',{name:'Further Mathematics 9231',exact:true})).toBeVisible();await expect(page.locator('.compact-course')).toHaveCount(6);expect(await page.locator('.math-content img').count()).toBe(0);
  await page.screenshot({path:'.local/content-bank/catalog-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/content-bank/catalog-mobile.png',fullPage:true});
  const f=JSON.parse(await readFile('.local/content-bank/preview.json','utf8')),course=f.courses.find((c:{slug:string})=>c.slug==='maths4u-0606');await page.goto('/library?course='+course.id+'&page=6');await expect(page.locator('.task-number').first()).toHaveText('126');await page.locator('.task-content summary').first().click();await page.getByRole('link',{name:'Sign in to practise',exact:true}).click();await expect(page.locator('[name=password]')).toBeVisible();await page.goBack();await expect(page.locator('.task-number').first()).toHaveText('126');
  const denied=await page.request.post('/api/study/start',{headers:{origin:'http://127.0.0.1:3103'},data:{taskId:'invalid'}});expect(denied.status()).toBe(401);
});
test('all five real courses: student practice, original media, MS and phone layout',async({page})=>{
  await login(page,'student');const rows:Representative[]=JSON.parse(await readFile('.local/content-bank/browser-fixture.json','utf8'));
  for(const row of rows){await page.setViewportSize({width:1440,height:1000});await page.goto(`/courses/${row.slug}/topics/${row.lessonId}?q=${encodeURIComponent(row.title)}`);await expect(page.locator('.catalog-task')).toHaveCount(1);await page.locator('.task-content summary').click();await images(page);await expect(page.locator('.katex-error')).toHaveCount(0);await page.screenshot({path:`.local/content-bank/${row.slug}-${row.sourceId}-desktop.png`,fullPage:true});
    await page.getByRole('button',{name:/^(Practise|Continue)$/}).last().click();await expect(page).toHaveURL(/\/attempts\//);await page.getByRole('button',{name:/^MS \/ criteria/}).click();await expect(page.getByRole('button',{name:'MS / criteria ✓',exact:true})).toBeVisible();await images(page);
    await page.getByRole('button',{name:/^Detailed solution/}).click();await expect(page.getByRole('button',{name:'Detailed solution ✓',exact:true})).toBeVisible();await expect(page.locator('.katex-error')).toHaveCount(0);await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await images(page);if(row.sourceId==='6124')expect(await page.locator('.math-content table').first().locator('th').first().evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(70);await page.screenshot({path:`.local/content-bank/${row.slug}-${row.sourceId}-mobile.png`,fullPage:true});
    await page.getByRole('button',{name:'Topic & history',exact:true}).click();await expect(page.locator('input[type=search]')).toHaveValue(row.title);
  }
});
test('teacher assigns real bank tasks; administrator can review the resumable importer',async({page})=>{
  const f=await login(page,'teacher'),rows:Representative[]=JSON.parse(await readFile('.local/content-bank/browser-fixture.json','utf8'));
  for(const row of rows.slice(0,2)){await page.goto(`/courses/${row.slug}/topics/${row.lessonId}?q=${encodeURIComponent(row.title)}`);await page.locator('.task-select input').first().check();}
  await page.goto('/teacher/works/new');await page.locator('[name=title]').fill('Five-course browser validation');await page.locator('[name=classId]').selectOption(f.classId);const request=page.waitForResponse(r=>r.url().endsWith('/api/works')&&r.request().method()==='POST');await page.getByRole('button',{name:'Assign to students',exact:true}).click();expect((await request).status()).toBe(201);
  await page.context().clearCookies();await login(page,'admin');await page.goto('/admin/import');await expect(page.getByRole('heading',{name:'0606 / 9231 course transfer',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Check / resume (dry run)',exact:true})).toBeDisabled();
});
test('administrator repeats the complete package through the browser importer without duplicates',async({page})=>{
  await login(page,'admin');await page.goto('/admin/import');await page.locator('input[webkitdirectory]').setInputFiles(path.resolve('.local/content-bank/publish'));
  await page.getByLabel('Publish new materials that are public in the source. Keep existing material visibility.').check();
  await page.getByRole('button',{name:'Check / resume (dry run)',exact:true}).click();await expect(page.getByRole('button',{name:'Apply reviewed import',exact:true})).toBeVisible({timeout:180000});
  await expect(page.getByText('New: 0 · New versions: 0 · Unchanged: 2654',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByText('Import complete. Repeat the dry run: all tasks should be unchanged.',{exact:true})).toBeVisible({timeout:180000});
});
