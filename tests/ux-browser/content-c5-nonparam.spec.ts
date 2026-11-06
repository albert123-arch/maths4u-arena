import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-stats-nonparam",root="test-results/c5-nonparam-20261106";
let fixture:{password:string};
const sessionStates=new Map<string,Awaited<ReturnType<APIRequestContext["storageState"]>>>();
async function session(role:string){
 const state=sessionStates.get(role),api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base},...(state?{storageState:state}:{})});
 if(!state){expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);sessionStates.set(role,await api.storageState());}return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("Further Statistics: four complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["sign","signed","paired","rank_sum"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/stats_nonparam_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="sign"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Non-parametric tests",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});



test("Non-parametric: complete answers, guest review, written support and responsive catalogue",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 const source=JSON.parse(await fs.readFile("content/original/9231-statistics/nonparam-v1.json","utf8"));
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const path=(lesson:string,id:string)=>"/courses/maths4u-9231-statistics/topics/stats_nonparam_"+lesson+"?item="+id;
  try{
   await page.goto(path("sign","M4U-9231-NP-S11"));
   for(const [name,value] of Object.entries({"Usable sample size":"10","Positive signs":"1","Negative signs":"9","Two-sided p-value":"11/1024"}))await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"Two-sided p-value",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("button",{name:"Review with a fresh variant →",exact:true}).click();await expect(page).toHaveURL(/item=M4U-9231-NP-S12/);await expect(page.getByRole("textbox",{name:"Positive signs",exact:true})).toHaveValue("");
   await page.goto(path("sign","M4U-9231-NP-S11"));await expect(page.getByRole("textbox",{name:"Two-sided p-value",exact:true})).toHaveValue("11/1024");
   await page.getByRole("textbox",{name:"Two-sided p-value",exact:true}).fill("22/1024");await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Negative signs",exact:true})).toHaveValue("9");await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Two-sided p-value",exact:true})).toHaveValue("");
   const cases=[
    {lesson:"signed",id:"W11",values:{"Rank of deviation 1":"1","Rank of deviation 2":"4","Rank of deviation 3":"2","Rank of deviation 4":"3","Positive rank sum":"6","Negative rank sum":"4","Two-sided minimum":"4"},wrong:"Two-sided minimum",correct:"4",missing:true},
    {lesson:"paired",id:"P11",values:{"Adjusted deviation 1":"-2/5","Adjusted deviation 2":"6/5","Adjusted deviation 3":"-9/10","Adjusted deviation 4":"5/2","Positive rank sum":"7","Negative rank sum":"4"},wrong:"Negative rank sum",correct:"3"},
    {lesson:"rank_sum",id:"R11",values:{"Ascending A rank sum":"14","Ascending B rank sum":"14","Reflected A rank sum":"10","MF19 statistic":"14"},wrong:"MF19 statistic",correct:"10"},
    {lesson:"rank_sum",id:"R31",values:{"Null rank-sum mean":"168","Null rank-sum variance":"420","Corrected numerator":"103/2","Standard deviation":"sqrt(420)","Continuity adjustment":"1/2"},wrong:"Continuity adjustment",correct:"-1/2"}
   ];
   for(const item of cases){
    await page.goto(path(item.lesson,"M4U-9231-NP-"+item.id));for(const [name,value] of Object.entries(item.values))await page.getByRole("textbox",{name,exact:true}).fill(value);
    if(item.missing)await page.getByRole("textbox",{name:item.wrong,exact:true}).fill("");
    await page.getByRole("button",{name:"Check answer",exact:true}).click();
    if(item.missing)expect(await page.getByRole("textbox",{name:item.wrong,exact:true}).evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true);
    else await expect(page.getByRole("textbox",{name:item.wrong,exact:true})).toHaveAttribute("aria-invalid","true");
    await page.getByRole("textbox",{name:item.wrong,exact:true}).fill(item.correct);await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   }
   const firstWritten=source.questions.find((q:{collection:string;lesson:string})=>q.collection==="exam"&&q.lesson==="sign");
   await page.goto(path("sign",firstWritten.id));await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();await expect(page.locator(".support-solution")).toBeVisible();
   await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-table tfoot")).toContainText(String(firstWritten.marks));await page.locator(".marking-self input[type=checkbox]").first().check();
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self input[type=checkbox]").first()).toBeChecked();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await expect(page.locator(".katex-error")).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});}
   let written=0;
   for(const q of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===q.lesson);
    for(const kind of ["hint","solution","guidance"]){const res=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:q.id,version:source.version,kind,access:"paper"}});expect(res.status()).toBe(200);const raw=JSON.stringify(await res.json());for(const hidden of ["katex-error","original_exam","original_uid","archiveTaskId"])expect(raw).not.toContain(hidden);}
    written++;
   }expect(written).toBe(27);expect((await guest.get("/content/original/9231-statistics/nonparam-v1.json")).status()).toBe(404);
   for(const l of source.lessons)for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await page.goto("/courses/"+source.course.slug+"/topics/"+l.id+"?mode=WRITTEN");await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
    const card=page.locator(".catalog-task").first();await card.scrollIntoViewIfNeeded();await expect(card.locator(".task-body")).toBeVisible();await expect(card.locator("ol[type=a]").first()).toHaveCSS("list-style-type","lower-alpha");
    expect(await card.evaluate(el=>{const body=el.querySelector(".task-body")!.getBoundingClientRect(),outer=el.querySelector(".task-summary")!.getBoundingClientRect();return Math.abs(body.right-outer.right);})).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(page.locator(".katex-error")).toHaveCount(0);if([390,1280].includes(width))await page.screenshot({path:root+"/catalogue-"+l.key+"-"+width+"-"+theme+".png"});
   }
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(1691);expect(errors).toEqual([]);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({completeSignProbability:true,allMagnitudeRanks:true,pairedNullThreshold:true,MF19Reflection:true,directionalContinuity:true,exactRadical:true,exactFractions:true,drafts:true,reviewVariant:true,freshVariant:true,manualMarksSaved:true,solutions:written,catalogueStates:32,pageErrors:errors},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(1632);const packages=await(await admin.get("/api/admin/content-packages")).json();for(const old of ["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation","9231-fp1-matrices1","9231-fp1-polar","9231-fp1-vectors","9231-fp1-induction","9231-stats-crv","9231-stats-inference","9231-stats-chi2"])expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});

test("Non-parametric: shared pages and role dashboards",async({browser})=>{
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
