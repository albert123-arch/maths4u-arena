import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-fp2-matrices2",root="test-results/c5-fp2-matrices2-20261107";
let fixture:{password:string};
const sessionStates=new Map<string,Awaited<ReturnType<APIRequestContext["storageState"]>>>();
async function session(role:string){
 const state=sessionStates.get(role),api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base},...(state?{storageState:state}:{})});
 if(!state){expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);sessionStates.set(role,await api.storageState());}return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("FP2: seven complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["eigen","algebra","cayley","diagonal","reconstruct","systems","mixed"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/fp2_matrices2_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="eigen"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Matrices 2",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});



test("Matrices 2: complete answers, guest review, written support and responsive catalogue",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 const source=JSON.parse(await fs.readFile("content/original/9231-fp2/matrices2-v1.0.1.json","utf8"));
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const path=(lesson:string,id:string)=>"/courses/maths4u-9231-fp2/topics/fp2_matrices2_"+lesson+"?item="+id;
  try{
   await page.goto(path("eigen","M4U-9231-MAT2-E11"));
   for(const [name,value] of Object.entries({"Smaller eigenvalue":"1","Larger eigenvalue":"4","Smaller-value vector first coordinate":"2","Larger-value vector second coordinate":"0"}))await page.getByRole("textbox",{name,exact:true}).fill(value);
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"Smaller-value vector first coordinate",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("button",{name:"Review with a fresh variant →",exact:true}).click();await expect(page).toHaveURL(/item=M4U-9231-MAT2-E12/);await expect(page.getByRole("textbox",{name:"Smaller eigenvalue",exact:true})).toHaveValue("");
   await page.goto(path("eigen","M4U-9231-MAT2-E11"));await expect(page.getByRole("textbox",{name:"Smaller-value vector first coordinate",exact:true})).toHaveValue("2");
   await page.getByRole("textbox",{name:"Smaller-value vector first coordinate",exact:true}).fill("-4/2");await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Larger eigenvalue",exact:true})).toHaveValue("4");await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Smaller eigenvalue",exact:true})).toHaveValue("");
   const cases=[
    {id:"E21",key:"values",wrong:"{-1,2}"},
    {id:"A21",key:"d2",wrong:"999"},
    {id:"C11",key:"char",wrong:"x^2-7*x-10"},
    {id:"D31",key:"interval",wrong:"[-1/5,1/5]"},
    {id:"R11",key:"a22",wrong:"",missing:true},
    {id:"S21",key:"x",wrong:"1"},
    {id:"S31",key:"z",wrong:"0"},
    {id:"M11",key:"squared",wrong:"999"}
   ];
   for(const item of cases){
    const q=source.questions.find((q:{id:string})=>q.id==="M4U-9231-MAT2-"+item.id);
    await page.goto(path(q.lesson,q.id));for(const f of q.fields)await page.getByRole("textbox",{name:f.label,exact:true}).fill(f.expected);
    const field=q.fields.find((f:{key:string})=>f.key===item.key);await page.getByRole("textbox",{name:field.label,exact:true}).fill(item.wrong);await page.getByRole("button",{name:"Check answer",exact:true}).click();
    if(item.missing)expect(await page.getByRole("textbox",{name:field.label,exact:true}).evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true);
    else await expect(page.getByRole("textbox",{name:field.label,exact:true})).toHaveAttribute("aria-invalid","true");
    await page.getByRole("textbox",{name:field.label,exact:true}).fill(field.expected);await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   }
   const firstWritten=source.questions.find((q:{collection:string;lesson:string})=>q.collection==="exam"&&q.lesson==="eigen");
   await page.goto(path("eigen",firstWritten.id));await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();await expect(page.locator(".support-solution")).toBeVisible();
   await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-table tfoot")).toContainText(String(firstWritten.marks));await page.locator(".marking-self input[type=checkbox]").first().check();
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self input[type=checkbox]").first()).toBeChecked();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await expect(page.locator(".katex-error")).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});}
   let written=0;
   for(const q of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===q.lesson);
    for(const kind of ["hint","solution","guidance"]){
     const res=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:q.id,version:source.version,kind,access:"paper"}});expect(res.status()).toBe(200);const raw=JSON.stringify(await res.json());
     for(const hidden of ["katex-error","source_exam","source_uid","archiveTaskId"])expect(raw).not.toContain(hidden);
    }written++;
   }
   expect(written).toBe(70);expect((await guest.get("/content/original/9231-fp2/matrices2-v1.0.1.json")).status()).toBe(404);
   for(const l of source.lessons)for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await page.goto("/courses/"+source.course.slug+"/topics/"+l.id+"?mode=WRITTEN");await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
    const card=page.locator(".catalog-task").first();await card.scrollIntoViewIfNeeded();await expect(card.locator(".task-body")).toBeVisible();await expect(card.locator("ol[type=a]").first()).toHaveCSS("list-style-type","lower-alpha");
    expect(await card.evaluate(el=>{const body=el.querySelector(".task-body")!.getBoundingClientRect(),outer=el.querySelector(".task-summary")!.getBoundingClientRect();return Math.abs(body.right-outer.right);})).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(page.locator(".katex-error")).toHaveCount(0);if([390,1280].includes(width))await page.screenshot({path:root+"/catalogue-"+l.key+"-"+width+"-"+theme+".png"});
   }
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(2005);expect(errors).toEqual([]);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({completeEigenvalues:true,allMatrixEntries:true,fullPolynomials:true,strictInterval:true,freeParameters:true,nearestPoint:true,exactFractions:true,drafts:true,reviewVariant:true,freshVariant:true,manualMarksSaved:true,solutions:written,catalogueStates:56,pageErrors:errors},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(1879);const packages=await(await admin.get("/api/admin/content-packages")).json();for(const old of ["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation","9231-fp1-matrices1","9231-fp1-polar","9231-fp1-vectors","9231-fp1-induction","9231-stats-crv","9231-stats-inference","9231-stats-chi2","9231-stats-nonparam","9231-stats-pgf","9231-fp2-hyperbolic"])expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});

test("Matrices 2: shared pages and role dashboards",async({browser})=>{
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
