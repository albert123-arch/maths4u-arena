import {test,expect,request} from '@playwright/test';
import fs from 'node:fs/promises';
import {parseDocument} from 'htmlparser2';
import {findAll,textContent} from 'domutils';
const base='http://127.0.0.1:3109',dir='test-results/further-seo-20261107';
test('Published Further chapter and lesson metadata, schema and sitemap are complete and private-data-free',async()=>{
 const api=await request.newContext({baseURL:base}),pages=JSON.parse(await fs.readFile('.local/one-tree-20261107/seo-pages.json','utf8')),results=[];
 try{
  expect(pages).toHaveLength(135);
  for(const item of pages){
   const r=await api.get(item.path);expect(r.status(),item.path).toBe(200);const html=await r.text(),doc=parseDocument(html),elements=findAll(e=>e.type==='tag'||e.type==='script',doc.children),title=elements.find(e=>e.name==='title');expect(textContent(title!)).toBe(item.title);
   const canonical=elements.find(e=>e.name==='link'&&e.attribs.rel==='canonical');expect(canonical?.attribs.href).toBe('https://arena.maths4u.sbs'+item.path);
   const scripts=elements.filter(e=>e.name==='script'&&e.attribs.type==='application/ld+json'),data=scripts.flatMap(e=>JSON.parse(textContent(e)));expect(data.some(d=>d['@type']==='BreadcrumbList')).toBe(true);const resource=data.find(d=>Array.isArray(d['@type'])&&d['@type'].includes('LearningResource'));expect(resource.url).toBe('https://arena.maths4u.sbs'+item.path);expect(resource.dateModified).toBe(item.modified);expect(resource.isAccessibleForFree).toBe(true);
   for(const hidden of ['original_uid','archiveTaskId','teacherNote'])expect(html).not.toContain(hidden);results.push({path:item.path,title:item.title,status:200});
  }
  const xml=await(await api.get('/sitemap.xml')).text(),again=await(await api.get('/sitemap.xml')).text();expect(xml).toBe(again);
  for(const item of pages){expect(xml).toContain('https://arena.maths4u.sbs'+item.path);expect(xml).toContain(item.modified);}
  expect(xml).toContain('/courses/maths4u-9709-p1');expect(xml).toContain('/courses/olymp-number-theory2');expect(xml).not.toContain('/admin/');const mapping=JSON.parse(await fs.readFile('docs/ARENA-ONE-TREE-MAPPING-20261107.json','utf8'));for(const l of mapping.result.lessons)expect(xml).not.toContain(l.sourceLessonId);
  const filtered=await api.get('/courses/maths4u-9231-mechanics/topics/fm_hooke_models?mode=SHORT');expect(filtered.status()).toBe(200);expect(await filtered.text()).toContain('href="https://arena.maths4u.sbs/courses/maths4u-9231-mechanics/topics/fm_hooke_models"');
  await fs.mkdir(dir,{recursive:true});await fs.writeFile(dir+'/metadata.json',JSON.stringify({pages:results,sitemapStable:true,protectedCoursesPresent:true},null,2));
 }finally{await api.dispose();}
});
test('Further-first home, chapter links and lessons fit mobile and desktop in both themes',async({browser})=>{
 const ctx=await browser.newContext({baseURL:base}),page=await ctx.newPage(),errors:string[]=[],matrix=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const [name,path] of [['home','/'],['chapter','/courses/maths4u-9231-mechanics/chapters/hookes-law'],['lesson','/courses/maths4u-9231-mechanics/topics/fm_hooke_models']])for(const width of [360,390,768,1280])for(const theme of ['light','dark'] as const){
   await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});expect((await page.goto(path))?.status()).toBe(200);await expect(page.locator('.katex-error')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   if(name==='home'){await expect(page.locator('#further-courses .discovery-course')).toHaveCount(4);await expect(page.getByRole('heading',{level:1})).toContainText('Further Mathematics');}
   if(name==='chapter')await expect(page.getByRole('heading',{level:1,exact:true,name:"Hooke's law"})).toBeVisible();
   if([390,1280].includes(width))await page.screenshot({path:dir+'/'+name+'-'+width+'-'+theme+'.png',fullPage:name!=='lesson'});matrix.push({name,width,theme});
  }
  expect(errors).toEqual([]);await fs.writeFile(dir+'/responsive.json',JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();}
});
