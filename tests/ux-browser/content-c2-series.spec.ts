import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-fp1-summation",root="test-results/c2-series-20261106";
let fixture:{password:string};
async function session(role:string){
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("Series: four complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["power_sums","finite_sums","differences","convergence"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/fp1_series_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="power_sums"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Summation of series",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});
test("Series: guest full expressions, parity, ratio, drafts, fresh variants and all written guidance",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage();
  try{
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_series_power_sums?item=M4U-9231-SS-P11");
   await page.getByRole("textbox",{name:"Complete formula for the sum",exact:true}).fill("n*n/2");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();
   await expect(page.getByRole("textbox",{name:"Complete formula for the sum",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("textbox",{name:"Complete formula for the sum",exact:true}).fill("(n^2+n)/2");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Complete formula for the sum",exact:true})).toHaveValue("(n^2+n)/2");
   await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Complete formula for the sum",exact:true})).toHaveValue("");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_series_finite_sums?item=M4U-9231-SS-F31");
   await page.getByRole("textbox",{name:"Even partial sum",exact:true}).fill("-n*(2*n+3)");
   await page.getByRole("textbox",{name:"Odd partial sum",exact:true}).fill("2*n*n+5*n+4");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_series_differences?item=M4U-9231-SS-D11");
   await page.getByRole("textbox",{name:"Numerator; denominator of partial sum",exact:true}).fill("n ; n+2");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_series_differences?item=m4u_9231_fp1_ss_4107_v1");
   await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   await expect(page.locator(".support-solution")).toBeVisible();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();
   await expect(page.locator(".marking-table tfoot")).toContainText("8");await page.locator(".marking-self input[type=checkbox]").first().check();
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self input[type=checkbox]").first()).toBeChecked();
   await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await expect(page.locator(".katex-error")).toHaveCount(0);await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});
   }
   const source=JSON.parse(await fs.readFile("content/original/9231-fp1/summation-v1.json","utf8"));let written=0;
   for(const question of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===question.lesson);
    for(const kind of ["hint","solution","guidance"]){
     const support=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:question.id,version:source.version,kind,access:"paper"}});
     expect(support.status()).toBe(200);const data=await support.json();const raw=JSON.stringify(data);
     expect(raw).not.toContain("katex-error");expect(raw).not.toContain("original_exam");expect(raw).not.toContain("original_uid");
    }
    written++;
   }
   expect(written).toBe(68);expect((await guest.get("/content/original/9231-fp1/summation-v1.json")).status()).toBe(404);
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(975);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({completeFormula:true,bothParityTotals:true,ratio:true,drafts:true,freshVariant:true,manualMarksSaved:true,writtenGuidance:written,sourceFilesDenied:true},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(875);
  const packages=await(await admin.get("/api/admin/content-packages")).json();
  for(const old of ["9231-fp1-roots","9231-fp1-rational"])expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});
test("Series: shared pages and role dashboards",async({browser})=>{
 const matrix=[];
 for(const role of ["guest","student","teacher","admin"]){
  const api=role==="guest"?null:await session(role),ctx=await browser.newContext({baseURL:base,...(api?{storageState:await api.storageState()}:{})}),page=await ctx.newPage(),errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
   const paths=role==="guest"?["/","/courses","/library","/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square"]:["/"+role];
   for(const path of paths)for(const theme of ["light","dark"] as const)for(const width of [390,1280,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});
    expect((await page.goto(path))?.status()).toBe(200);await expect(page.locator(".loading,.catalog-skeleton")).toHaveCount(0);await expect(page.locator(".brand")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);matrix.push({role,path,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/shared-"+role+"-"+paths.indexOf(path)+"-"+width+"-"+theme+".png",fullPage:true});
   }
   expect(errors).toEqual([]);
  }finally{await ctx.close();await api?.dispose();}
 }
 await fs.writeFile(root+"/shared-pages.json",JSON.stringify(matrix,null,2));
});
