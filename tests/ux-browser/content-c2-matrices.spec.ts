import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-fp1-matrices1",root="test-results/c2-matrices-20261106";
let fixture:{password:string};
async function session(role:string){
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("Matrices: five complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["operations","inverses","determinants","plane_maps","invariants"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/fp1_matrices_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="operations"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Matrices 1",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});
test("Matrices: guest complete matrices, radicals, spatial coordinates and all written guidance",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage();
  try{
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_matrices_operations?item=M4U-9231-M1-O11");
   for(const [name,value] of [["Entry (1,1)","4"],["Entry (1,2)","-1"],["Entry (2,1)","3"],["Entry (2,2)","999"]])await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();
   await expect(page.getByRole("textbox",{name:"Entry (2,2)",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("textbox",{name:"Entry (2,2)",exact:true}).fill("3");
   await page.getByRole("textbox",{name:"Entry (1,1)",exact:true}).fill("8/2");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Entry (1,1)",exact:true})).toHaveValue("8/2");
   await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Entry (1,1)",exact:true})).toHaveValue("");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_matrices_determinants?item=M4U-9231-M1-D31");
   await page.getByRole("textbox",{name:"All real k-values",exact:true}).fill("{-2,2}");
   await page.getByRole("textbox",{name:"Inverse area multiplier",exact:true}).fill("1");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"All real k-values",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("textbox",{name:"All real k-values",exact:true}).fill("{-2,2,-sqrt(2),sqrt(2)}");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_matrices_plane_maps?item=M4U-9231-M1-P31");
   await page.getByRole("textbox",{name:"Equation of the image (u,v)",exact:true}).fill("-6u+8v+2=0");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_matrices_invariants?item=M4U-9231-M1-F31");
   for(const [name,value] of [["Image x-coordinate","-2"],["Image y-coordinate","1"],["Image z-coordinate","1"],["Volume multiplier","1"]])await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_matrices_operations?item=maths4u_9231_fp1_ch04_002_v1");
   await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   await expect(page.locator(".support-solution")).toBeVisible();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();
   await expect(page.locator(".marking-table tfoot")).toContainText("10");await page.locator(".marking-self select").first().selectOption("1");
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self select").first()).toHaveValue("1");
   await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await expect(page.locator(".katex-error")).toHaveCount(0);await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});
   }
   const source=JSON.parse(await fs.readFile("content/original/9231-fp1/matrices1-v1.json","utf8"));let written=0;
   for(const question of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===question.lesson);
    for(const kind of ["hint","solution","guidance"]){
     const support=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:question.id,version:source.version,kind,access:"paper"}});
     expect(support.status()).toBe(200);const raw=JSON.stringify(await support.json());
     expect(raw).not.toContain("katex-error");expect(raw).not.toContain("original_exam");expect(raw).not.toContain("original_uid");
    }
    written++;
   }
   expect(written).toBe(60);expect((await guest.get("/content/original/9231-fp1/matrices1-v1.json")).status()).toBe(404);
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(1075);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({completeMatrix:true,allParameterRoots:true,equivalentLine:true,threeCoordinates:true,drafts:true,freshVariant:true,manualMarksSaved:true,writtenGuidance:written,sourceFilesDenied:true},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(975);
  const packages=await(await admin.get("/api/admin/content-packages")).json();
  for(const old of ["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation"])expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});
test("Matrices: shared pages and role dashboards",async({browser})=>{
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
