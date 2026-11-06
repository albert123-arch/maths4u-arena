import {test,expect,request,type Browser} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",root="test-results/question-layout-20261106";
const chapters=[
 {name:"roots",topic:"fp1_roots_vieta"},
 {name:"rational",topic:"fp1_rational_asymptotes"},
 {name:"summation",topic:"fp1_summation_standard"},
 {name:"matrices1",topic:"fp1_matrices_operations"},
 {name:"polar",topic:"fp1_polar_extrema"},
];
async function context(browser:Browser,role:string){
 if(role==="guest")return browser.newContext({baseURL:base});
 const fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);
 const state=await api.storageState();await api.dispose();return browser.newContext({baseURL:base,storageState:state});
}
test.beforeAll(()=>fs.mkdir(root,{recursive:true}));

test("Written catalogue: full-width prompts, part letters and right-aligned marks in every FP1 package",async({browser})=>{
 const states=[];
 for(const role of ["guest","admin","student","teacher"]){
  const ctx=await context(browser,role),page=await ctx.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  try{
   for(const chapter of chapters){
    const pack=JSON.parse(await fs.readFile("content/original/9231-fp1/"+chapter.name+"-v1.json","utf8"));
    const lesson=chapter.name==="polar"?pack.lessons.find((l:{key:string})=>l.key==="extrema"):pack.lessons[0];
    for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
     await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
     expect((await page.goto("/courses/maths4u-9231-fp1/topics/"+lesson.id+"?mode=WRITTEN"))?.status()).toBe(200);
     await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
     await expect(page.locator(".catalog-task").first()).toBeVisible();
     const card=chapter.name==="polar"?page.locator(".catalog-task").filter({hasText:"A triple-angle petal with an exact horizontal tangent"}):page.locator(".catalog-task").filter({has:page.locator(".task-body ol[type=a]")}).first();
     await expect(card).toBeVisible();
     await card.scrollIntoViewIfNeeded();await expect(card.locator(".task-body")).toBeVisible();
     const metrics=await card.evaluate(el=>{
      const content=el.querySelector(".task-content")!,body=el.querySelector(".task-body")!,summary=el.querySelector(".task-summary")!,list=el.querySelector(".task-body ol[type=a]")!,rect=body.getBoundingClientRect(),grid=summary.getBoundingClientRect();
      return {bodyWidth:rect.width,available:grid.right-rect.left,rightGap:Math.abs(rect.right-grid.right),letters:getComputedStyle(list).listStyleType,parts:[...list.children].map(li=>{
       const mark=li.querySelector(":scope > .marks")!,r=li.getBoundingClientRect(),m=mark.getBoundingClientRect();
       return {mark:mark.textContent,rightGap:Math.abs(m.right-r.right),topGap:Math.abs(m.top-r.top)};
      }),bookmarkBottom:el.querySelector(".task-bookmark")!.getBoundingClientRect().bottom,bodyTop:rect.top,open:content.hasAttribute("open")};
     });
     expect(metrics.open).toBe(true);expect(metrics.rightGap).toBeLessThanOrEqual(1);expect(metrics.bodyWidth).toBeGreaterThan(240);
     expect(metrics.letters).toBe("lower-alpha");expect(metrics.parts.length).toBeGreaterThan(1);
     for(const part of metrics.parts){expect(part.mark).toMatch(/^\[\d+\]$/);expect(part.rightGap).toBeLessThanOrEqual(1);expect(part.topGap).toBeLessThanOrEqual(1);}
     expect(metrics.bodyTop).toBeGreaterThanOrEqual(metrics.bookmarkBottom);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(card.locator(".katex-error")).toHaveCount(0);
     if(chapter.name==="polar"&&["guest","admin"].includes(role)&&[390,1280].includes(width)){
      await card.scrollIntoViewIfNeeded();await page.screenshot({path:root+"/polar-"+role+"-"+width+"-"+theme+".png"});
     }
     await card.locator(".task-content > summary").click();await expect(card.locator(".task-body")).toBeHidden();
     await card.locator(".task-content > summary").click();await expect(card.locator(".task-body")).toBeVisible();
     states.push({role,chapter:chapter.name,theme,width,...metrics});
    }
   }
   expect(errors).toEqual([]);
  }finally{await ctx.close();}
 }
 await fs.writeFile(root+"/catalogue.json",JSON.stringify(states,null,2));
});

test("Lesson mode keeps the same part letters, marks and exact answer checks",async({browser})=>{
 const ctx=await context(browser,"guest"),page=await ctx.newPage();
 try{
  for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
   expect((await page.goto("/courses/maths4u-9231-fp1/topics/fp1_polar_extrema?item=maths4u_9231_fp1_ch05_033_v1"))?.status()).toBe(200);
   await expect(page.locator(".square-question ol[type=a]")).toHaveCSS("list-style-type","lower-alpha");
   await expect(page.locator(".square-question .square-marks")).toHaveCount(4);await expect(page.locator(".katex-error")).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   if([390,1280].includes(width))await page.locator(".square-question").screenshot({path:root+"/lesson-"+width+"-"+theme+".png"});
  }
  await page.goto("/courses/maths4u-9231-fp1/topics/fp1_polar_areas?item=M4U-9231-PC-A31");
  await page.getByRole("textbox",{name:"Exact common area",exact:true}).fill("(π-2)/2");
  await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
 }finally{await ctx.close();}
});

test("Shared pages and role dashboards retain their layout",async({browser})=>{
 const states=[];
 for(const role of ["guest","student","teacher","admin"]){
  const ctx=await context(browser,role),page=await ctx.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  try{
   const paths=role==="guest"?["/","/courses","/library","/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square"]:["/"+role];
   for(const path of paths)for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto(path))?.status()).toBe(200);await expect(page.locator(".brand")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    if([390,1280].includes(width))await page.screenshot({path:root+"/shared-"+role+"-"+paths.indexOf(path)+"-"+width+"-"+theme+".png",fullPage:true});
    states.push({role,path,theme,width,overflow:false});
   }
   expect(errors).toEqual([]);
  }finally{await ctx.close();}
 }
 await fs.writeFile(root+"/shared.json",JSON.stringify(states,null,2));
});
