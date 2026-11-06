import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const root=process.env.UX_REPORT_ROOT ? process.env.UX_REPORT_ROOT+'/stage4b' : 'test-results/stage4b-20261105',path='/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square',version='2026-11-05.1',uid='M4U-9709-Q26-E-CS01';
test.setTimeout(180000);
test('stage4b: server gate, independent panels and paper self marks survive reload',async({page,request})=>{
  await fs.mkdir(root+'/after',{recursive:true});
  for(const kind of ['solution','guidance']){
    const r=await request.post('/api/learning/square/help',{headers:{Origin:'http://127.0.0.1:3102'},data:{uid,version,kind}});expect(r.status()).toBe(403);expect(await r.text()).not.toContain('description_html');
    const forged=await request.post('/api/learning/square/help',{headers:{Origin:'http://127.0.0.1:3102'},data:{uid,version,kind,access:'attempt'}});expect(forged.status()).toBe(403);
  }
  const before=await(await request.get(path+'?item='+uid)).text();expect(before).not.toContain('Use vertex form with an unknown scale factor');
  await page.setViewportSize({width:390,height:844});await page.goto(path+'?item='+uid+'#practice');const q=page.locator('.square-question');await expect(q.locator('h3')).toHaveText('Build a graph from its vertex');
  await expect(q.getByRole('button',{name:'Hint',exact:true})).toBeEnabled();await expect(q.getByRole('button',{name:'Worked solution',exact:true})).toBeDisabled();await expect(q.getByRole('button',{name:'Marking guidance',exact:true})).toBeDisabled();
  await q.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();const guidance=q.getByRole('button',{name:'Marking guidance',exact:true});await guidance.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await guidance.click();
  await expect(q.locator('.marking-table tbody tr')).toHaveCount(8);expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThanOrEqual(2);await expect(guidance).toHaveAttribute('aria-expanded','true');
  const cells=q.locator('.marking-self input');for(let i=0;i<3;i++)await cells.nth(i).check();await expect(q.locator('.marking-score')).toHaveText('3 / 8');
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('maths4u.square.draft.guest.2026-11-05.1.M4U-9709-Q26-E-CS01.support')!));expect(data.helpUsed).not.toBe(true);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('maths4u.square.guest.v1')??'{"events":[]}').events.length)).toBe(0);
  await page.reload();await expect(q.locator('.support-saved')).toContainText('3 / 8');await guidance.click();await expect(cells.nth(0)).toBeChecked();await expect(q.locator('.marking-score')).toHaveText('3 / 8');
  const matrix=[];
  for(const theme of ['light','dark'] as const){await page.emulateMedia({colorScheme:theme});for(const width of [390,1280,360,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await q.locator('.marking-table tbody tr').first().evaluate(e=>getComputedStyle(e).display)).toBe(width<=600?'grid':'table-row');const overflow=await q.locator('.support-guidance').evaluate(root=>[...root.querySelectorAll<HTMLElement>('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+1&&!e.closest('.katex,.katex-display,.sr-only')&&e.textContent?.trim();}).map(e=>e.className));expect(overflow).toEqual([]);matrix.push({theme,width,overflow});if([390,1280].includes(width))await q.locator('.support-guidance').screenshot({path:root+'/after/marking-'+width+'-'+theme+'.png'});}}
  await page.setViewportSize({width:390,height:844});const info=q.getByRole('button',{name:'About marking codes',exact:true});await info.click();await expect(page.getByRole('tooltip')).toContainText('self-assessed');await expect(page.getByRole('tooltip')).not.toContainText('FT');await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);await expect(info).toBeFocused();
  await info.focus();await page.keyboard.press('Tab');await q.locator('.marking-code button').first().focus();await expect(page.getByRole('tooltip')).toContainText('Method mark');await page.keyboard.press('Escape');await q.locator('.marking-code button').first().click();await expect(page.getByRole('tooltip')).toBeVisible();await q.locator('h3').click();await expect(page.getByRole('tooltip')).toHaveCount(0);await q.locator('.marking-code button').first().hover();await expect(page.getByRole('tooltip')).toBeVisible();await page.screenshot({path:root+'/after/marking-code-tooltip-390.png'});await page.mouse.move(0,0);await expect(page.getByRole('tooltip')).toHaveCount(0);
  await q.getByRole('button',{name:'Worked solution',exact:true}).click();await expect(q.locator('.support-solution')).toContainText('(a)');expect(await q.locator('.support-solution').innerText()).not.toMatch(/marking guidance|mark scheme|Cambridge/i);expect((await page.evaluate(()=>JSON.parse(localStorage.getItem('maths4u.square.draft.guest.2026-11-05.1.M4U-9709-Q26-E-CS01')!))).helpUsed).toBe(true);
  await q.getByRole('button',{name:'Hint',exact:true}).click();await expect(q.locator('.support-hint')).toBeVisible();await fs.writeFile(root+'/guidance-responsive.json',JSON.stringify(matrix,null,2));
});
test('stage4b: legacy guidance stays available to administrators without inventing a table',async({browser,request})=>{
  const ctx=await browser.newContext({baseURL:'http://127.0.0.1:3102',storageState:'.local/components-20261105/admin-session.json'}),page=await ctx.newPage();
  try{
    await page.setViewportSize({width:390,height:844});await page.goto('/admin/archive');const q=page.locator('.archive-task').first();
    await expect(q.getByRole('button',{name:'Hint',exact:true})).toBeEnabled();await expect(q.getByRole('button',{name:'Marking guidance',exact:true})).toBeDisabled();
    await q.getByRole('button',{name:'I’ve finished on paper',exact:true}).click();await q.getByRole('button',{name:'Marking guidance',exact:true}).click();await expect(q.locator('.support-guidance')).toBeVisible();await expect(q.locator('.marking-table')).toHaveCount(0);
    const image=q.locator('.support-guidance img').first();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);const src=await image.getAttribute('src');expect((await ctx.request.get(src!)).status()).toBe(200);expect((await request.get(src!)).status()).toBe(404);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await q.locator('.support-guidance').screenshot({path:root+'/after/legacy-admin-guidance-390.png'});
  }finally{await page.close();await ctx.close();}
});
