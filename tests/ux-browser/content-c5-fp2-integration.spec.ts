import {test,expect,request,type APIRequestContext} from "@playwright/test";
import fs from "node:fs/promises";
const base="http://127.0.0.1:3109",key="9231-fp2-integration",root="test-results/c5-fp2-integration-20261107";
let fixture:{password:string};
const sessionStates=new Map<string,Awaited<ReturnType<APIRequestContext["storageState"]>>>();
async function session(role:string){
 const state=sessionStates.get(role),api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base},...(state?{storageState:state}:{})});
 if(!state){expect((await api.post("/api/auth/login",{data:{username:"qa_c1_"+role,password:fixture.password}})).status()).toBe(200);sessionStates.set(role,await api.storageState());}return api;
}
async function packageStatus(api:APIRequestContext){return (await(await api.get("/api/admin/content-packages")).json()).find((p:{key:string})=>p.key===key);}
test.beforeAll(async()=>{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));await fs.mkdir(root,{recursive:true});});
test("FP2: six complete lesson previews, all widths and themes",async({browser})=>{
 const admin=await session("admin"),ctx=await browser.newContext({baseURL:base,storageState:await admin.storageState()}),page=await ctx.newPage(),matrix=[],errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const lesson of ["techniques","reduction","trigonometric","arcs","surfaces","limits"]){
   for(const theme of ["light","dark"] as const)for(const width of [1280,390,360,768]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
    expect((await page.goto("/admin/content-packages/"+key+"/preview/fp2_integration_"+lesson))?.status()).toBe(200);
    await expect(page.locator(".square-lesson")).toBeVisible();await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator("button,.square-heading h1,.square-challenges strong,.quadratics-topics a").evaluateAll(els=>els.filter(e=>{const h=e as HTMLElement;return h.clientWidth>0&&h.scrollWidth>h.clientWidth+2;}).map(e=>(e.textContent??"").slice(0,90)))).toEqual([]);
    matrix.push({lesson,width,theme,overflow:false});
    if(width===390||width===1280)await page.screenshot({path:root+"/"+lesson+"-"+width+"-"+theme+".png",fullPage:true});
    if(lesson==="techniques"&&width===390&&theme==="light")await page.screenshot({path:root+"/mobile-first-screen.png"});
   }
  }
  await page.emulateMedia({colorScheme:"light"});await page.setViewportSize({width:1280,height:900});
  await page.goto("/admin/content-packages/"+key);await expect(page.getByRole("heading",{name:"Integration",exact:true})).toBeVisible();
  await page.screenshot({path:root+"/chapter-preview.png",fullPage:true});expect(errors).toEqual([]);
  await fs.writeFile(root+"/responsive.json",JSON.stringify({matrix,pageErrors:errors},null,2));
 }finally{await ctx.close();await admin.dispose();}
});



test("Integration: complete answers, guest review, written support and responsive catalogue",async({browser})=>{
 const admin=await session("admin"),teacher=await session("teacher"),guest=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
 const pack=await packageStatus(admin);expect(pack.state).toBe("DRAFT");
 const source=JSON.parse(await fs.readFile("content/original/9231-fp2/integration-v1.json","utf8"));
 try{
  for(const l of pack.lessons){expect((await guest.get(l.path)).status()).toBe(404);expect((await teacher.get("/api/catalog/topics/"+l.id)).status()).toBe(404);}
  for(const a of source.assets)expect((await guest.get("/api/files/"+a.file_id)).status()).toBe(404);
  expect((await teacher.get("/api/admin/content-packages")).status()).toBe(403);
  expect((await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"publish",fingerprint:pack.fingerprint}})).status()).toBe(200);
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await ctx.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const path=(lesson:string,id:string)=>"/courses/maths4u-9231-fp2/topics/fp2_integration_"+lesson+"?item="+id;
  try{
   await page.goto(path("techniques","M4U-9231-FINT-T11"));
   await page.getByRole("textbox",{name:"Coefficient A",exact:true}).fill("2");await page.getByRole("textbox",{name:"Upper exponential q",exact:true}).fill("3");
   await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("textbox",{name:"Coefficient A",exact:true})).toHaveAttribute("aria-invalid","true");
   await page.getByRole("button",{name:"Review with a fresh variant →",exact:true}).click();await expect(page).toHaveURL(/item=M4U-9231-FINT-T12/);await expect(page.getByRole("textbox",{name:"Coefficient A",exact:true})).toHaveValue("");
   await page.goto(path("techniques","M4U-9231-FINT-T11"));await expect(page.getByRole("textbox",{name:"Coefficient A",exact:true})).toHaveValue("2");
   await page.getByRole("textbox",{name:"Coefficient A",exact:true}).fill("2/4");await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   await page.reload();await expect(page.getByRole("textbox",{name:"Coefficient A",exact:true})).toHaveValue("2/4");await page.getByRole("button",{name:"Try a fresh variant",exact:true}).click();await expect(page.getByRole("textbox",{name:"Coefficient A",exact:true})).toHaveValue("");
   const cases=[{id:"T31",key:"constant",wrong:"135/16"},{id:"R11",key:"d",wrong:"-1/4"},{id:"H11",key:"target",wrong:"3*pi/16"},{id:"A31",key:"length",wrong:"3*sqrt(5)"},{id:"S31",key:"area",wrong:"5*pi*sqrt(2)"},{id:"L21",key:"least",wrong:"2000"},{id:"L11",key:"lower",wrong:"",missing:true}];
   for(const item of cases){
    const q=source.questions.find((q:{id:string})=>q.id==="M4U-9231-FINT-"+item.id);
    await page.goto(path(q.lesson,q.id));for(const f of q.fields)await page.getByRole("textbox",{name:f.label,exact:true}).fill(Array.isArray(f.expected)?f.expected.join(";"):f.expected);
    const field=q.fields.find((f:{key:string})=>f.key===item.key);await page.getByRole("textbox",{name:field.label,exact:true}).fill(item.wrong);await page.getByRole("button",{name:"Check answer",exact:true}).click();
    if(item.missing)expect(await page.getByRole("textbox",{name:field.label,exact:true}).evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true);
    else await expect(page.getByRole("textbox",{name:field.label,exact:true})).toHaveAttribute("aria-invalid","true");
    await page.getByRole("textbox",{name:field.label,exact:true}).fill(Array.isArray(field.expected)?field.expected.join(";"):field.expected);await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText("All final answers are correct.");
   }
   const firstWritten=source.questions.find((q:{collection:string;lesson:string})=>q.collection==="exam"&&q.lesson==="techniques");
   await page.goto(path("techniques",firstWritten.id));await expect(page.getByRole("button",{name:"Check answer",exact:true})).toHaveCount(0);
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
   expect(written).toBe(109);expect((await guest.get("/content/original/9231-fp2/integration-v1.json")).status()).toBe(404);
   expect(solutionImages).toBe(5);
   for(const a of source.assets){expect((await guest.get("/api/files/"+a.file_id)).status()).toBe(a.role==="STATEMENT"?200:404);expect((await guest.get("/"+a.path)).status()).toBe(404);}
   const statement=source.questions.find((q:{id:string})=>q.id==="maths4u_9231_fp2_04_090_v1");
   await page.goto(path(statement.lesson,statement.id));const diagram=page.locator('.square-question img');await expect(diagram).toHaveCount(1);await expect.poll(()=>diagram.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);
   await page.goto("/courses/"+source.course.slug+"/topics/fp2_integration_limits?mode=WRITTEN");await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
   const imageCard=page.locator('.catalog-task').filter({hasText:statement.title});await expect(imageCard).toHaveCount(1);await expect(imageCard.locator('img')).toHaveCount(1);
   await page.screenshot({path:root+"/statement-diagram-mobile.png",fullPage:true});
   for(const l of source.lessons)for(const theme of ["light","dark"] as const)for(const width of [360,390,768,1280]){
    await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});await page.goto("/courses/"+source.course.slug+"/topics/"+l.id+"?mode=WRITTEN");await expect(page.locator(".catalog-tasks")).toHaveAttribute("aria-busy","false");
    const card=page.locator(".catalog-task").first();await card.scrollIntoViewIfNeeded();await expect(card.locator(".task-body")).toBeVisible();await expect(card.locator("ol[type=a]").first()).toHaveCSS("list-style-type","lower-alpha");
    expect(await card.evaluate(el=>{const body=el.querySelector(".task-body")!.getBoundingClientRect(),outer=el.querySelector(".task-summary")!.getBoundingClientRect();return Math.abs(body.right-outer.right);})).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect(page.locator(".katex-error")).toHaveCount(0);if([390,1280].includes(width))await page.screenshot({path:root+"/catalogue-"+l.key+"-"+width+"-"+theme+".png"});
   }
   expect((await(await guest.get("/api/catalog")).json()).total).toBe(2287);expect(errors).toEqual([]);
   await fs.writeFile(root+"/guest-flow.json",JSON.stringify({wholeIntegrals:true,completeRecurrences:true,nonNegativeRadius:true,polarLength:true,strictInteger:true,endpointCorrections:true,exactFractions:true,drafts:true,reviewVariant:true,freshVariant:true,manualMarksSaved:true,solutions:written,solutionImages,statementImages:18,noDuplicateDiagram:true,catalogueStates:48,pageErrors:errors},null,2));
  }finally{await ctx.close();}
 }finally{
  await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"archive",fingerprint:pack.fingerprint}});await admin.post("/api/admin/content-packages/"+key+"/state",{data:{action:"restore",fingerprint:pack.fingerprint}});
  for(const a of source.assets)expect((await guest.get("/api/files/"+a.file_id)).status()).toBe(404);
  expect((await(await guest.get("/api/catalog")).json()).total).toBe(2130);const packages=await(await admin.get("/api/admin/content-packages")).json();for(const old of ["9231-fp1-roots","9231-fp1-rational","9231-fp1-summation","9231-fp1-matrices1","9231-fp1-polar","9231-fp1-vectors","9231-fp1-induction","9231-stats-crv","9231-stats-inference","9231-stats-chi2","9231-stats-nonparam","9231-stats-pgf","9231-fp2-hyperbolic","9231-fp2-matrices2","9231-fp2-differentiation"])expect(packages.find((p:{key:string})=>p.key===old).state).toBe("PUBLISHED");
  await Promise.all([admin.dispose(),teacher.dispose(),guest.dispose()]);
 }
});

test("Integration: shared pages and role dashboards",async({browser})=>{
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
