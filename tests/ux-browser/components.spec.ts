import { test, expect, type Browser, type Page } from "@playwright/test";
import fs from "node:fs/promises";
const root=process.env.UX_REPORT_ROOT ?? "test-results/components-20261105", lesson="/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square";
test.setTimeout(240000);
async function roleContext(browser: Browser, role: string) {
  const file=`.local/components-20261105/${role}-session.json`;
  const context=await browser.newContext({baseURL:"http://127.0.0.1:3102",...await fs.access(file).then(()=>({storageState:file})).catch(()=>({}))});
  const current=await (await context.request.get('/api/auth/me')).json();
  if(!current.user){
    const f=JSON.parse(await fs.readFile('.local/content-bank/preview.json','utf8'));
    expect((await context.request.post('/api/auth/login',{headers:{Origin:'http://127.0.0.1:3102'},data:{username:f.users[role],password:f.password}})).status()).toBe(200);
    await fs.mkdir('.local/components-20261105',{recursive:true});await context.storageState({path:file});
  }
  return context;
}
async function ready(page: Page,url: string){await page.goto(url);await expect(page.locator('.skeleton')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);}
async function openLanguages(page: Page){if(await page.locator('.mobile-nav-toggle').isVisible())await page.locator('.mobile-nav-toggle').click();}

test('components: public pages and dashboards in both themes, four widths',async({browser})=>{
  await fs.mkdir(`${root}/after`,{recursive:true});const checks=[];
  for(const role of ['guest','student','teacher','admin']){
    const context=role==='guest'?await browser.newContext({baseURL:'http://127.0.0.1:3102'}):await roleContext(browser,role);
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const routes=role==='guest'?[['home','/'],['courses','/courses'],['library','/library'],['square',lesson]]:[[role,'/'+role]];
    for(const theme of ['light','dark'] as const){await page.emulateMedia({colorScheme:theme});
      for(const width of [390,1280,360,768]){await page.setViewportSize({width,height:width<800?844:900});
        for(const[name,url]of routes){await ready(page,url);
          await expect(page.locator('.brand')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
          if(width<=768){await expect(page.locator('.mobile-nav-toggle')).toBeVisible();await expect(page.locator('#site-navigation')).toBeHidden();}
          else{await expect(page.locator('.mobile-nav-toggle')).toBeHidden();await expect(page.locator('#site-navigation')).toBeVisible();}
          const audit=await page.evaluate(()=>{
            const visible=(e:Element)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
            const short=[...document.querySelectorAll('button,.ui-button,.topbar nav>a,.locale button,.discovery-account summary')].filter(e=>visible(e)&&e.getBoundingClientRect().height<43.9).map(e=>({tag:e.tagName,cls:e.className,height:e.getBoundingClientRect().height}));
            const primary=[...document.querySelectorAll('.ui-button--primary')].filter(e=>{const r=e.getBoundingClientRect();return visible(e)&&r.top<innerHeight&&r.bottom>0;}).length;
            const wrongArrows=[...document.querySelectorAll<HTMLAnchorElement>('a[href]')].filter(a=>{const u=new URL(a.href,location.href);return u.origin===location.origin&&a.textContent?.includes('↗');}).map(a=>a.pathname);
            const kickers=[...document.querySelectorAll('.eyebrow')].filter(visible).length;
            const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(e=>!e.classList.contains('ui-button')&&!e.classList.contains('ui-input')&&!e.classList.contains('ui-select')&&!e.classList.contains('ui-textarea')&&!e.closest('.m4u-statistics')).map(e=>e.tagName);
            return {short,primary,wrongArrows,kickers,controls};
          });
          expect(audit.short).toEqual([]);expect(audit.primary).toBeLessThanOrEqual(1);expect(audit.wrongArrows).toEqual([]);expect(audit.controls).toEqual([]);
          if(name!=='home')expect(audit.kickers).toBe(0);
          checks.push({role,name,theme,width,...audit});
          if([390,1280].includes(width))await page.screenshot({path:`${root}/after/${name}-${width}-${theme}.png`,fullPage:true});
        }
      }
    }
    const status=(await context.request.get('/api/admin/users')).status();expect(status).toBe(role==='admin'?200:role==='guest'?401:403);
    expect(errors).toEqual([]);await context.close();
  }
  await fs.writeFile(`${root}/responsive-and-roles.json`,JSON.stringify(checks,null,2));
});

test('components: keyboard menu, focus, language and account controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page,'/');
  await page.keyboard.press('Tab');await expect(page.locator('.brand')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('.mobile-nav-toggle')).toBeFocused();
  expect(await page.locator('.mobile-nav-toggle').evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');await expect(page.locator('#site-navigation')).toBeVisible();
  await page.keyboard.press('Tab');await expect(page.locator('#site-navigation>a').first()).toBeFocused();
  await page.screenshot({path:`${root}/after/mobile-navigation.png`,fullPage:false});
  await page.keyboard.press('Escape');await expect(page.locator('#site-navigation')).toBeHidden();await expect(page.locator('.mobile-nav-toggle')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('.discovery-account summary')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('.discovery-account')).toHaveAttribute('open','');
  await page.keyboard.press('Tab');expect(await page.evaluate(()=>getComputedStyle(document.activeElement!).outlineWidth)).toBe('3px');
  await page.keyboard.press('Escape');await expect(page.locator('.discovery-account summary')).toBeFocused();
  await expect(page.locator('.discovery-account')).not.toHaveAttribute('open');
  await page.keyboard.press('Enter');await page.getByRole('radio',{name:'System',exact:true}).focus();
  await page.keyboard.press('Tab');await expect(page.locator('.discovery-account')).not.toHaveAttribute('open');
  await openLanguages(page);await page.getByRole('button',{name:'RU',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('lang','ru');
  await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.keyboard.press('Escape');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');
  const html=await (await page.request.get('/')).text();expect(html).toMatch(/<html[^>]*lang="en"/);
  await page.locator('#discovery-q').focus();await page.keyboard.type('quadratic');await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=quadratic/);
  await ready(page,lesson+'#practice');
  const check=page.getByRole('button',{name:'Check answer',exact:true});await expect(check).toBeEnabled();
  await page.locator('.square-choice input').first().focus();await page.keyboard.press('ArrowDown');
  await expect(page.locator('.square-choice input').nth(1)).toBeChecked();
  await expect(page.locator('.square-format')).toHaveCount(0);
  await page.keyboard.press('Tab');await expect(check).toBeFocused();expect(await check.evaluate(e=>getComputedStyle(e).outlineWidth)).toBe('3px');
  await page.keyboard.press('Space');await expect(page.locator('.square-question .feedback--again').last()).toContainText('Look again');
});

test('components: theme picker persists System, Light, Dark and synchronizes tabs',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});await ready(page,lesson);
  const second=await context.newPage();await ready(second,'/');
  await page.locator('.discovery-account summary').click();
  for(const[name,value]of [['Light','light'],['Dark','dark'],['System','system']]){
    await page.getByRole('radio',{name,exact:true}).check();
    expect(await page.evaluate(()=>localStorage.getItem('maths4u_theme'))).toBe(value);
    expect((await context.cookies()).find(c=>c.name==='maths4u_theme')?.value).toBe(value);
    if(value==='system'){await expect(page.locator('html')).not.toHaveAttribute('data-theme');await expect(second.locator('html')).not.toHaveAttribute('data-theme');}
    else{await expect(page.locator('html')).toHaveAttribute('data-theme',value);await expect(second.locator('html')).toHaveAttribute('data-theme',value);}
  }
  await page.getByRole('radio',{name:'Dark',exact:true}).check();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await (await page.request.get(lesson)).text()).toMatch(/<html[^>]*data-theme="dark"/);
  await page.locator('.discovery-account summary').click();await page.screenshot({path:`${root}/after/account-dark.png`,fullPage:false});
});

test('components: answer states, single-line actions and editable drafts survive',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const theme of ['light','dark'] as const){
    await page.emulateMedia({colorScheme:theme});await ready(page,lesson+'?item=M4U-9709-Q26-D02#practice');
    const form=page.locator('.square-question'),primary=form.getByRole('button',{name:'Check answer',exact:true});
    await expect(form.locator('h3')).toHaveText('Recognise the completed square');
    await expect(primary).toBeEnabled();
    await form.locator('.square-choice input').first().check();await primary.click();await expect(form.locator('.feedback--again').last()).toContainText('Look again');
    await expect(form.locator('.feedback--format')).toHaveCount(0);await page.screenshot({path:`${root}/after/answer-again-${theme}.png`,fullPage:false});
    await form.locator('.square-choice[data-state=again]').screenshot({path:`${root}/after/selected-wrong-option-${theme}.png`});
    for(const button of await form.locator('.square-form-actions button').all())expect(await button.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    const buttonWidth=await primary.evaluate(e=>e.getBoundingClientRect().width),rowWidth=await form.locator('.square-form-actions').evaluate(e=>e.getBoundingClientRect().width);expect(Math.abs(buttonWidth-rowWidth)).toBeLessThan(1);
    const radio=await form.locator('.square-choice input').last().evaluate(e=>({appearance:getComputedStyle(e).appearance,background:getComputedStyle(e).backgroundColor,before:getComputedStyle(e,'::before').transform,scheme:getComputedStyle(e).colorScheme}));
    expect(radio.appearance).toBe('none');expect(radio.before).toContain('0');expect(radio.scheme).toBe(theme);
    await form.getByRole('button',{name:'Hint',exact:true}).click();await expect(form.locator('.feedback--hint')).toContainText('Hint');await page.screenshot({path:`${root}/after/answer-hint-${theme}.png`,fullPage:false});
    await form.locator('.square-choice input').nth(2).check();await primary.click();await expect(form.locator('.feedback--correct').last()).toContainText('Correct');await page.screenshot({path:`${root}/after/answer-correct-${theme}.png`,fullPage:false});
    await page.locator('.square-question-list summary').click();await page.locator('.square-question-list').getByRole('button',{name:'1. Unit coefficient',exact:true}).click();
    const inputs=form.locator('input:not([type=radio])');await expect(inputs.first()).toBeEnabled();for(const input of await inputs.all())await input.fill('0');await inputs.first().fill('not-math');await primary.click();
    await expect(form.locator('.feedback--format').last()).toContainText('Check the format');await expect(inputs.first()).toHaveAttribute('aria-invalid','true');await page.screenshot({path:`${root}/after/answer-format-${theme}.png`,fullPage:false});
    expect(await inputs.first().evaluate(e=>getComputedStyle(e).borderColor)).toBe(await form.locator('.feedback--format').last().evaluate(e=>getComputedStyle(e).borderColor));
    for(const input of (await inputs.all()).slice(1))await expect(input).toHaveAttribute('aria-invalid','true');
    await page.reload();await expect(inputs.first()).toHaveValue('not-math');
  }
});
