import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-mechanics-variable",root="test-results/c5-mechanics-variable-20261107";
let fixture:{password:string};
const sessionStates=new Map<string,Awaited<ReturnType<APIRequestContext["storageState"]>>>();
async function session(role:string){
 const state=sessionStates.get(role),api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base},...(state?{storageState:state}:{})});
 if(!state){expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);sessionStates.set(role,await api.storageState());}return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("Mechanics: four complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["time","position","resistance","limits"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/fm_variable_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="time"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Linear motion under a variable force",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});



test("Linear motion under a variable force: complete answers, guest review, written support and responsive catalogue",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 const source=JSON.parse(await fs.readFile("content/original/9231-mechanics/variable-v1.json","utf8"));
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  for(const a of source.assets??[])expect((await guest.get("/api/files/"+a.file_id)).status()).toBe(404);
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const path=(lesson:string,id:string)=>"/courses/maths4u-9231-mechanics/topics/fm_variable_"+lesson+"?item="+id;
  try{
   const first=source.questions.find((q:{id:string})=>q.id==="M4U-9231-MVAR-T11");
   await page.goto(path("time",first.id));for(const f of first.fields)await page.getByRole("textbox",{name:f.label,exact:true}).fill(f.expected);
   await page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true}).fill("8");await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("button",{name:"Review with a fresh variant →",exact:true}).click();await expect(page).toHaveURL(/item=M4U-9231-MVAR-T12/);await expect(page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true})).toHaveValue("");
   await page.goto(path("time",first.id));await expect(page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true})).toHaveValue("8");await page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true}).fill("10/2+3*t-t^2");await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true})).toHaveValue("10/2+3*t-t^2");await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Full velocity polynomial in t",exact:true})).toHaveValue("");
   const cases=[{id:"T21",key:"velocity",wrong:"10;1+t"},{id:"T31",key:"position",wrong:"(1+t)^3"},{id:"P11",key:"velocity2",wrong:"32-2*x^3"},{id:"P21",key:"acceleration",wrong:"8/3"},{id:"P31",key:"velocity",wrong:"2*x-6"},{id:"V11",key:"C",wrong:"1/2"},{id:"V21",key:"later",wrong:"9"},{id:"V21",key:"interval",wrong:"[0,inf)"},{id:"V31",key:"S",wrong:"40"},{id:"L11",key:"D",wrong:"3"},{id:"L21",key:"B",wrong:"-8"},{id:"L31",key:"C",wrong:"1/4"},{id:"L31",key:"power",wrong:"",missing:true}];
   for(const item of cases){
    const q=source.questions.find((q:{id:string})=>q.id==="M4U-9231-MVAR-"+item.id);
    await page.goto(path(q.lesson,q.id));for(const f of q.fields)await page.getByRole("textbox",{name:f.label,exact:true}).fill(Array.isArray(f.expected)?f.expected.join(";"):f.expected);
    const field=q.fields.find((f:{key:string})=>f.key===item.key);await page.getByRole("textbox",{name:field.label,exact:true}).fill(item.wrong);await page.getByRole("button",{name:"Check answer",exact:true}).click();
    if(item.missing)expect(await page.getByRole("textbox",{name:field.label,exact:true}).evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true);
    else await expect(page.getByRole("textbox",{name:field.label,exact:true})).toHaveAttribute("aria-invalid","true");
    await page.getByRole("textbox",{name:field.label,exact:true}).fill(Array.isArray(field.expected)?field.expected.join(";"):field.expected);await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   }
   const firstWritten=source.questions.find((q:{collection:string;lesson:string})=>q.collection==="exam"&&q.lesson==="time");
   await page.goto(path("time",firstWritten.id));await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
   await page.getByRole("button",{name:"I’ve finished on paper",exact:true}).click();await page.getByRole("button",{name:"Worked solution",exact:true}).click();await expect(page.locator(".support-solution")).toBeVisible();
   await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-table tfoot")).toContainText(String(firstWritten.marks));await page.locator(".marking-self input[type=checkbox]").first().check();
   await page.reload();await page.getByRole("button",{name:"Marking guidance",exact:true}).click();await expect(page.locator(".marking-self input[type=checkbox]").first()).toBeChecked();await page.getByRole("button",{name:"Worked solution",exact:true}).click();
   for(const theme of ["light","dark"] as const)for(const width of [390,1280]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await expect(page.locator(".katex-error")).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await page.screenshot({path:root+"/solution-"+width+"-"+theme+".png",fullPage:true});}
   let written=0,solutionImages=0;
   for(const q of source.questions.filter((q:{collection:string})=>q.collection==="exam")){
    const lesson=source.lessons.find((l:{key:string})=>l.key===q.lesson);
    for(const kind of ["hint","solution","guidance"]){
     const res=await guest.post("/api/learning/packages/"+lesson.id+"/help",{data:{uid:q.id,version:source.version,kind,access:"paper"}});expect(res.status()).toBe(200);const payload=await res.json(),raw=JSON.stringify(payload);
     for(const hidden of ["katex-error","source_exam","source_uid","archiveTaskId"])expect(raw).not.toContain(hidden);
     if(kind==="solution")for(const url of [...payload.html.matchAll(/src="([^"]+)"/g)].map((m:RegExpMatchArray)=>m[1].replaceAll("&amp;","&"))){expect((await guest.get(url)).status()).toBe(200);expect((await teacher.get(url)).status()).toBe(404);solutionImages++;}
    }written++;
   }
   expect(written).toBe(33);expect((await guest.get("/content/original/9231-mechanics/variable-v1.json")).status()).toBe(404);
   expect(solutionImages).toBe(4);
   for(const a of source.assets??[]){expect((await guest.get("/api/files/"+a.file_id)).status()).toBe(a.role==="STATEMENT"?200:404);expect((await guest.get("/"+a.path)).status()).toBe(404);}
   for(const l of source.lessons)for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await page.goto("/courses/"+source.course.slug+"/topics/"+l.id+"?mode=WRITTEN");await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
    const card=page.locator(".catalog-task").first();await card.scrollIntoViewIfNeeded();await expect(card.locator(".task-body")).toBeVisible();await expect(card.locator("ol[type=a]").first()).toHaveCSS("list-style-type","lower-alpha");
    expect(await card.evaluate(el=>{const body=el.querySelector(".task-body")!.getBoundingClientRect(),outer=el.querySelector(".task-summary")!.getBoundingClientRect();return Math.abs(body.right-outer.right);})).toBeLessThanOrEqual(1);
    const firstQuestion=source.questions.find((q:{lesson:string;collection:string})=>q.lesson===l.key&&q.collection==="exam");await expect(card.locator(".task-body img")).toHaveCount([...firstQuestion.prompt_html.matchAll(/<img\b/g)].length);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(page.locator(".katex-error")).toHaveCount(0);if([390,1280].includes(width))await page.screenshot({path:root+"/catalogue-"+l.key+"-"+width+"-"+theme+".png"});
   }
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(2857);expect(errors).toEqual([]);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({fullTrajectories:true,rationalEquivalence:true,initialConstants:true,signedVelocity:true,firstStopDomain:true,noSquaredRestart:true,allExponentialTemplateParameters:true,constantPower:true,exactFractions:true,drafts:true,reviewVariant:true,freshVariant:true,manualMarksSaved:true,solutions:written,solutionImages,statementImages:4,solutionImagesHiddenFromPrompts:true,catalogueStates:32,pageErrors:errors},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  for(const a of source.assets??[])expect((await guest.get("/api/files/"+a.file_id)).status()).toBe(404);
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(2792);const packages=await(await admin.get("/api/admin/content-packages")).json();for(const old of ["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation","9231-fp1-matrices1","9231-fp1-polar","9231-fp1-vectors","9231-fp1-induction","9231-stats-crv","9231-stats-inference","9231-stats-chi2","9231-stats-nonparam","9231-stats-pgf","9231-fp2-hyperbolic","9231-fp2-matrices2","9231-fp2-differentiation","9231-fp2-integration","9231-fp2-complex","9231-fp2-ode","9231-mechanics-projectiles","9231-mechanics-equilibrium","9231-mechanics-circular","9231-mechanics-hooke"])expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});

test("Linear motion under a variable force: shared pages and role dashboards",async({browser})=>{
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
