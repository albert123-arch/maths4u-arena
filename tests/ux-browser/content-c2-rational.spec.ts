import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-fp1-rational",root="test-results/c2-rational-20261106";
let fixture:{password:string};
async function session(role:string){
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("C2 five lesson previews remain responsive and source metadata stays private",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["asymptotes","ranges","parameters","modulus","relationships"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    await page.goto("/admin/content-packages/"+key+"/preview/fp1_rational_"+lesson);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.getByText("Unpublished · administrator preview",{exact:true})).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="asymptotes"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Rational functions",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});
test("C2 guest complete answers, every protected diagram and manual guidance",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 try{
  for(const lesson of pack.lessons){expect((await guest.get(lesson.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+lesson.id)).status()).toBe(404);}
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage();
  try{
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_rational_asymptotes?item=M4U-9231-RF-A11");
   for(const [name,value] of [["Excluded input h","999"],["Oblique gradient m","1"],["Oblique intercept c","2"]])await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"Excluded input h",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("textbox",{name:"Excluded input h",exact:true}).fill("1");await page.getByRole("button",{name:"Check answer",exact:true}).click();
   await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Excluded input h",exact:true})).toHaveValue("1");
   await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Excluded input h",exact:true})).toHaveValue("");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_rational_relationships?item=M4U-9231-RF-R11");
   await page.getByRole("textbox",{name:"Numerator; denominator of g",exact:true}).fill("x+2 ; x-1");
   await page.getByRole("textbox",{name:"All excluded inputs",exact:true}).fill("{-2,1}");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.goto("/courses/maths4u-9231-fp1/topics/fp1_rational_asymptotes?item=m4u_9231_fp1_rf_6265_v1");
   await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   await expect(page.locator(".support-solution img")).toHaveCount(1);
   await expect.poll(()=>page.locator(".support-solution img").evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(1600);
   await page.getByRole("button",{name:"Marking guidance",exact:true}).click();
   await expect(page.locator(".marking-table tfoot")).toContainText("14");
   await page.locator(".marking-self select").first().selectOption("1");
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self select").first()).toHaveValue("1");
   await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await expect(page.locator(".katex-error")).toHaveCount(0);await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});
   }
   const source=JSON.parse(await fs.readFile("content/original/9231-fp1/rational-v1.json","utf8"));let images=0;
   for(const question of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===question.lesson);
    const support=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:question.id,version:source.version,kind:"solution",access:"paper"}});
    expect(support.status()).toBe(200);const data=await support.json();expect(data.html).not.toContain("katex-error");expect(data.html).not.toContain("source_exam");
    const urls=[...data.html.matchAll(/src="([^"]+)"/g)].map((r:RegExpMatchArray)=>r[1].replaceAll("&amp;","&"));
    for(const url of urls){const response=await guest.get(url);expect(response.status()).toBe(200);expect(response.headers()["content-type"]).toContain("image/png");images++;}
   }
   expect(images).toBe(81);
   for(const asset of source.assets){expect((await guest.get("/api/files/"+asset.file_id)).status()).toBe(404);}
   expect((await guest.get("/content/original/9231-fp1/rational-v1.json")).status()).toBe(404);
   expect((await guest.get("/"+source.assets[0].path)).status()).toBe(404);
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(875);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({completeAnswers:true,drafts:true,freshVariant:true,ratioAndExclusions:true,manualMarksSaved:true,protectedImages:images,rawImagesDenied:81,sourceFilesDenied:true},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(782);
  const packages=await(await admin.get("/api/admin/content-packages")).json();
  expect(packages.find((p:{key:string})=>p.key==="9231-fp1-roots").state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});
test("C2 shared pages and role dashboards retain responsive layout",async({browser})=>{
 const matrix=[];
 for(const role of ["guest","student","teacher","admin"]){
  const api=role==="guest"?null:await session(role),ctx=await browser.newContext({baseURL:base,...(api?{storageState:await api.storageState()}:{})}),page=await ctx.newPage(),errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
   const paths=role==="guest"?["/","/courses","/library","/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square"]:["/"+role];
   for(const path of paths)for(const theme of ["light","dark"] as const)for(const width of [390,1280,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});
    expect((await page.goto(path))?.status()).toBe(200);await expect(page.locator(".loading,.catalog-skeleton")).toHaveCount(0);
    await expect(page.locator(".brand")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    matrix.push({role,path,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/shared-"+role+"-"+paths.indexOf(path)+"-"+width+"-"+theme+".png",fullPage:true});
   }
   expect(errors).toEqual([]);
  }finally{await ctx.close();await api?.dispose();}
 }
 await fs.writeFile(root+"/shared-pages.json",JSON.stringify(matrix,null,2));
});
