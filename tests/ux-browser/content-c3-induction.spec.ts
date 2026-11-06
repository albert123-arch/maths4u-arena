import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-fp1-induction",root="test-results/c3-induction-20261106";
let fixture:{password:string};
async function session(role:string){
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("Induction: five complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["sums","derivatives","recurrences","matrices","divisibility"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/fp1_induction_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="sums"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Proof by induction",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});


test("Induction: complete bridges, genuine review, manual proofs and full-width questions",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 const oldKeys=["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation","9231-fp1-matrices1","9231-fp1-polar","9231-fp1-vectors"];
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage(),pageErrors:string[]=[];
  page.on("pageerror",e=>pageErrors.push(e.message));
  const path=(lesson:string,uid:string)=>"/courses/maths4u-9231-fp1/topics/fp1_induction_"+lesson+"?item=M4U-9231-IN-"+uid;
  try{
   await page.goto(path("sums","Q-S11"));
   const term=page.getByRole("textbox",{name:"New term",exact:true}),target=page.getByRole("textbox",{name:"Next right side",exact:true});
   await term.fill("5k-2");await target.fill("(5k^2+11k+6)/2");await page.getByRole("button",{name:"Check answer",exact:true}).click();
   await expect(term).toHaveAttribute("aria-invalid","true");
   await page.getByRole("button",{name:"Review with a fresh variant →",exact:true}).click();await expect(term).toHaveValue("");
   await expect(page).toHaveURL(/item=M4U-9231-IN-Q-S12/);
   await page.goto(path("sums","Q-S11"));await expect(term).toHaveValue("5k-2");
   await term.fill("3+5k");await target.fill("(k+1)*(5k+6)/2");await page.getByRole("button",{name:"Check answer",exact:true}).click();
   await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(term).toHaveValue("3+5k");
   await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(term).toHaveValue("");
   await page.goto(path("derivatives","Q-D11"));
   for(const [name,value] of [["Coefficient A","3"],["Coefficient B","6/4"],["Constant C","6"]])await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto(path("derivatives","Q-D41"));await page.getByRole("radio",{name:"Differentiate twice.",exact:true}).check();
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto(path("matrices","Q-M11"));
   for(const [name,value] of [["Entry 1,1","1+3k"],["Entry 1,2","-3k"],["Entry 2,1","3k"],["Entry 2,2","1+3k"]])await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"Entry 2,2",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("textbox",{name:"Entry 2,2",exact:true}).fill("1-3k");await page.getByRole("button",{name:"Check answer",exact:true}).click();
   await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto(path("divisibility","Q-V31"));
   await page.getByRole("textbox",{name:"Least positive index",exact:true}).fill("3");await page.getByRole("textbox",{name:"Integer quotient",exact:true}).fill("7");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto(path("sums","E-S01"));await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   await expect(page.locator(".support-solution")).toContainText("Assume");
   await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-table tfoot")).toContainText("7");
   await page.locator(".marking-self input[type=checkbox]").first().check();
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self input[type=checkbox]").first()).toBeChecked();
   await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    await expect(page.locator(".katex-error")).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});
   }
   const source=JSON.parse(await fs.readFile("content/original/9231-fp1/induction-v1.json","utf8"));let written=0;
   for(const question of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===question.lesson);
    for(const kind of ["hint","solution","guidance"]){
     const response=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:question.id,version:source.version,kind,access:"paper"}});
     expect(response.status()).toBe(200);const raw=JSON.stringify(await response.json());
     for(const hidden of ["katex-error","original_exam","original_uid","archiveTaskId"])expect(raw).not.toContain(hidden);
    }
    written++;
   }
   expect(written).toBe(30);expect((await guest.get("/content/original/9231-fp1/induction-v1.json")).status()).toBe(404);
   for(const lesson of source.lessons)for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    await page.goto("/courses/"+source.course.slug+"/topics/"+lesson.id+"?mode=WRITTEN");
    await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
    const card=page.locator(".catalog-task").first();await card.scrollIntoViewIfNeeded();await expect(card.locator(".task-body")).toBeVisible();
    await expect(card.locator("ol[type=a]").first()).toHaveCSS("list-style-type","lower-alpha");
    expect(await card.evaluate(el=>{const body=el.querySelector(".task-body")!.getBoundingClientRect(),outer=el.querySelector(".task-summary")!.getBoundingClientRect();return Math.abs(body.right-outer.right);})).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(page.locator(".katex-error")).toHaveCount(0);
    if([390,1280].includes(width))await page.screenshot({path:root+"/catalogue-"+lesson.key+"-"+width+"-"+theme+".png"});
   }
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(1372);expect(pageErrors).toEqual([]);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({completeBridge:true,actualReviewVariant:true,exactFractions:true,derivativeOrder:true,fullMatrix:true,residue:true,drafts:true,freshVariant:true,manualProofs:true,manualMarksSaved:true,writtenGuidance:written,catalogueStates:40,pageErrors},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(1302);
  const packages=await(await admin.get("/api/admin/content-packages")).json();
  for(const old of oldKeys)expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});

test("Induction: shared pages and role dashboards",async({browser})=>{
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
