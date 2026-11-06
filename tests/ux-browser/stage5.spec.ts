import { test, expect, request, type APIRequestContext, type BrowserContext } from "@playwright/test";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";

const base = "http://127.0.0.1:3102", root = process.env.UX_REPORT_ROOT ? process.env.UX_REPORT_ROOT + '/stage5' : "test-results/stage5-20261105";
const square = "/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square";
const headers = { Origin: base };
type Fixture = { password: string; users: Record<string, { id: string; username: string }>; numeric: { id: string; part: { id: string; numericAnswer: number } }; manual: { id: string; part: { id: string } }; work?: string; otherWork?: string; attempt?: string; expiredAttempt?: string; otherAttempt?:string; otherFile?:string; seeded?:boolean; topicWork?:string };
let fixture: Fixture;
type LensAPI = APIRequestContext & { setExtraHTTPHeaders: (headers: Record<string,string>) => Promise<void> };
function lensClient(api: APIRequestContext): LensAPI {
  let extra: Record<string,string> = {};
  return new Proxy(api, { get(target, key) {
    if(key === "setExtraHTTPHeaders") return async (headers:Record<string,string>) => { extra = headers; };
    const value = Reflect.get(target,key);
    if(["get","post","patch","delete","put","fetch","head"].includes(String(key))) return (url:string, options:Record<string,unknown>={}) => value.call(target,url,{...options,headers:{...extra,...(options.headers as object ?? {})}});
    return typeof value === "function" ? value.bind(target) : value;
  } }) as LensAPI;
}
async function connection() {
  const runtime = JSON.parse(await fs.readFile(".local/content-bank/runtime.json", "utf8")), url = new URL(runtime.MATHS4U_DATABASE_URL);
  if (runtime.MATHS4U_ENV !== "test" || url.hostname !== "127.0.0.1" || !url.pathname.startsWith("/maths4u_test_bank_")) throw Error("LOCAL_ONLY");
  return mysql.createConnection(url.href);
}
async function session(role: string) {
  const file = `.local/stage5-20261105/${role}-session.json`;
  const api = await request.newContext({ baseURL: base, ...await fs.access(file).then(() => ({ storageState: file })).catch(() => ({})) });
  const current = await (await api.get("/api/auth/me")).json();
  if (current.lens) await api.post("/api/view/exit", { headers, data: {} });
  if (!current.user) {
    const response = await api.post("/api/auth/login", { headers, data: { username: fixture.users[role].username, password: fixture.password } });
    expect(response.status()).toBe(200); await api.storageState({ path: file });
  }
  return lensClient(api);
}
async function enter(api: LensAPI, mode: string, role: string, targetId?: string) {
  const response = await api.post("/api/view/enter", { headers, data: { mode, role, ...(targetId ? { targetId } : {}) } });
  expect(response.status()).toBe(200);
  const me = await (await api.get("/api/auth/me")).json(); expect(me.lens.mode).toBe(mode);
  await api.setExtraHTTPHeaders({ "X-Arena-View": me.lens.nonce }); return me;
}
async function exit(api: LensAPI) { expect((await api.post("/api/view/exit", { headers, data: {} })).status()).toBe(200); await api.setExtraHTTPHeaders({}); }
async function progressHashes(c: mysql.Connection) {
  const [tables] = await c.query<mysql.RowDataPacket[]>("SHOW TABLES"), hashes: Record<string, string[]> = {};
  for (const row of tables) {
    const name = String(Object.values(row)[0]); if (["session", "auditevent", "ratelimit", "_prisma_migrations"].includes(name.toLowerCase())) continue;
    if (!/^\w+$/.test(name)) throw Error("TABLE_NAME");
    const [rows] = await c.query<mysql.RowDataPacket[]>("SELECT * FROM `" + name + "`");
    hashes[name] = rows.map(r => createHash("sha256").update(JSON.stringify(r)).digest("hex")).sort();
  }
  return hashes;
}
async function unchanged(c:mysql.Connection,before:Record<string,string[]>) {
 const after=await progressHashes(c);
 const changed=Object.keys(before).filter(t=>JSON.stringify(before[t])!==JSON.stringify(after[t])).map(t=>({table:t,before:before[t].length,after:after[t].length}));
 expect(changed).toEqual([]);
}
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  fixture = JSON.parse(await fs.readFile(".local/stage5-20261105/fixtures.json", "utf8")); await fs.mkdir(root, { recursive: true });
  const teacher = await session("teacher"), other = await session("otherteacher"), student = await session("student");
  const work = (title: string, classId: string) => ({ title, classId, kind: "HOMEWORK", taskIds: [fixture.numeric.id, fixture.manual.id], opensAt: new Date(Date.now() - 3600000).toISOString(), dueAt: new Date(Date.now() + 86400000).toISOString(), timeLimitSeconds: 2400, attemptsAllowed: 2, resultPolicy: "AFTER_SUBMIT", revealSolutions: true });
  if (!fixture.work) { const r = await teacher.post("/api/works", { headers, data: work("Quadratics · Thursday practice", "qa_stage5_class") }); expect(r.status()).toBe(201); fixture.work = (await r.json()).id; }
  if (!fixture.otherWork) { const r = await other.post("/api/works", { headers, data: work("Private work from another teacher", "qa_stage5_sharedstudent") }); expect(r.status()).toBe(201); fixture.otherWork = (await r.json()).id; }
  if (!fixture.attempt) {
    const started = await student.post(`/api/works/${fixture.work}/start`, { headers, data: {} }); expect(started.status()).toBe(200); fixture.attempt = (await started.json()).id;
    const a = await (await student.get("/api/attempts/" + fixture.attempt)).json();
    const r = await student.post(`/api/attempts/${fixture.attempt}/submit`, { headers, data: { revision: a.revision, answers: [{ partId: fixture.numeric.part.id, response: { value: String(fixture.numeric.part.numericAnswer) } }, { partId: fixture.manual.part.id, response: { value: "My written working for teacher review." } }] } }); expect(r.status()).toBe(200);
  }
  if (!fixture.otherAttempt) {
    const started=await student.post(`/api/works/${fixture.otherWork}/start`,{headers,data:{}});expect(started.status()).toBe(200);fixture.otherAttempt=(await started.json()).id;
    const uploaded=await student.post('/api/files',{headers,multipart:{attemptId:fixture.otherAttempt!,partId:fixture.manual.part.id,file:{name:'stage5-private-answer.png',mimeType:'image/png',buffer:await sharp({create:{width:4,height:4,channels:3,background:'white'}}).png().toBuffer()}}});expect(uploaded.status()).toBe(201);fixture.otherFile=(await uploaded.json()).id;
  }
  if(!fixture.seeded){
    expect((await student.post('/api/learning/square/check',{headers,data:{version:'2026-11-05.1',uid:'M4U-9709-Q26-S-CS01',eventKey:randomUUID(),helpUsed:false,at:Date.now(),answers:{a:'0',h:'0',k:'0'}}})).status()).toBe(200);
    expect((await student.post('/api/lessons/orig_quadratics_completing_square/progress',{headers,data:{completed:true}})).status()).toBe(200);
    expect((await student.post('/api/learning/bookmarks/'+fixture.manual.id,{headers,data:{selected:true}})).status()).toBe(200);
    fixture.seeded=true;
  }
  await fs.writeFile(".local/stage5-20261105/fixtures.json", JSON.stringify(fixture)); await Promise.all([teacher.dispose(), other.dispose(), student.dispose()]);
});

test("stage5: role and user lens matrix, server denial, no stored preview results", async () => {
  const c = await connection(), student = await session("student"), teacher = await session("teacher"), admin = await session("admin");
  const results: Record<string, unknown> = {};
  try {
    for (const [mode, role, targetId] of [["ROLE", "STUDENT", undefined], ["ROLE", "TEACHER", undefined], ["USER", "STUDENT", fixture.users.otherstudent.id]]) expect((await student.post("/api/view/enter", { headers, data: { mode, role, ...(targetId ? { targetId } : {}) } })).status()).toBe(403);
    expect((await teacher.post("/api/view/enter", { headers, data: { mode: "ROLE", role: "TEACHER" } })).status()).toBe(403);
    expect((await teacher.post("/api/view/enter", { headers, data: { mode: "ROLE", role: "ADMIN" } })).status()).toBe(400);
    expect((await teacher.post("/api/view/enter", { headers, data: { mode: "USER", role: "STUDENT", targetId: fixture.users.otherstudent.id } })).status()).toBe(403);
    const pendingBefore = await (await teacher.get("/api/dashboard/teacher")).json(); expect(pendingBefore.pending.some((p: {id:string}) => p.id === fixture.attempt)).toBe(true);
    const before = await progressHashes(c);
    const preview = await enter(teacher, "ROLE", "STUDENT"); expect(preview.user.id).toBe(fixture.users.teacher.id); expect(preview.user.roles.map((r: {role:string}) => r.role)).toEqual(["STUDENT"]);
    expect((await teacher.get("/api/admin/users")).status()).toBe(403); expect((await teacher.get("/api/dashboard/teacher")).status()).toBe(403);
    const checked = await teacher.post("/api/learning/square/check", { headers, data: { version: "2026-11-05.1", uid: "M4U-9709-Q26-S-CS01", eventKey: randomUUID(), helpUsed: false, at: Date.now(), answers: { a: "1", h: "7", k: "-9" } } }); expect(checked.status()).toBe(200); expect((await checked.json()).correct).toBe(true);
    expect((await teacher.post("/api/learning/square/open", { headers, data: {} })).status()).toBe(200);
    expect((await teacher.post("/api/catalog/tasks/" + fixture.manual.id + "/support", { headers, data: { kind: "guidance", access: "paper" } })).status()).toBe(200);
    const frozen = await (await teacher.get(`/api/view/preview/works/${fixture.work}`)).json(); expect(frozen.questions).toHaveLength(2); expect(frozen.questions[0].parts[0].answer).toBeUndefined();
    const grade = await teacher.post(`/api/view/preview/works/${fixture.work}/check`, { headers, data: { answers: [{ partId: fixture.numeric.part.id, response: { value: String(fixture.numeric.part.numericAnswer) } }] } }); expect(grade.status()).toBe(200); const g = await grade.json(); expect(g.saved).toBe(false); expect(g.results.find((r:{partId:string})=>r.partId===fixture.numeric.part.id).points).toBeGreaterThan(0); expect(g.results.find((r:{partId:string})=>r.partId===fixture.manual.part.id).points).toBe(null);
    expect((await teacher.get(`/api/view/preview/works/${fixture.otherWork}`)).status()).toBe(404);
    for (const [route, method] of [["study/start", "post"], ["learning/square/import", "post"], ["profile", "patch"], ["basket", "post"], [`works/${fixture.work}/start`, "post"], ["classes", "post"], ["learning/bookmarks/" + fixture.manual.id, "post"]]) expect((await teacher.fetch("/api/" + route, { method: method.toUpperCase(), headers, data: {} })).status()).toBe(403);
    await unchanged(c,before);
    const staleNonce = preview.lens.nonce; await exit(teacher);
    expect((await teacher.patch("/api/profile", { headers: { ...headers, "X-Arena-View": staleNonce }, data: { locale: "ru" } })).status()).toBe(409);
    const viewed = await enter(teacher, "USER", "STUDENT", fixture.users.student.id); expect(viewed.user.id).toBe(fixture.users.student.id);
    const learner=await teacher.get("/api/dashboard/student");expect(learner.status()).toBe(200);const dashboard=await learner.json();
    expect(dashboard.topics.find((p:{id:string})=>p.id==='orig_quadratics_completing_square').state).toBe('DUE');expect(dashboard.bookmarks.some((b:{id:string})=>b.id===fixture.manual.id)).toBe(true);
    expect((await teacher.get("/api/attempts/" + fixture.attempt)).status()).toBe(200);
    const visibleWorks = await (await teacher.get("/api/works")).json(); expect(visibleWorks.some((w:{id:string})=>w.id===fixture.otherWork)).toBe(false);
    expect((await teacher.get("/api/works/" + fixture.otherWork)).status()).toBe(404);
    expect((await teacher.get("/api/attempts/" + fixture.otherAttempt)).status()).toBe(404);
    expect((await teacher.get("/api/files/" + fixture.otherFile)).status()).toBe(404);
    for (const [route, method] of [["learning/square/check", "POST"], [`attempts/${fixture.attempt}/submit`, "POST"], [`attempts/${fixture.attempt}/review`, "POST"], ["profile", "PATCH"], ["learning/bookmarks/" + fixture.manual.id, "POST"], ["files", "DELETE"], ["view/enter", "POST"]]) expect((await teacher.fetch("/api/" + route, { method, headers, data: {} })).status()).toBe(403);
    expect((await teacher.patch("/api/profile", { headers: { ...headers, "X-Arena-View": "" }, data: { locale: "ru" } })).status()).toBe(409);
    await unchanged(c,before); await exit(teacher);
    for (const role of ["STUDENT", "TEACHER"]) {
      await enter(admin, "ROLE", role); expect((await admin.get(role === "TEACHER" ? "/api/dashboard/teacher" : "/api/dashboard/student")).status()).toBe(200); expect((await admin.get("/api/admin/users")).status()).toBe(403); await exit(admin);
      await enter(admin, "USER", role, fixture.users[role === "TEACHER" ? "teacher" : "student"].id);
      expect((await admin.get(role === "TEACHER" ? "/api/dashboard/teacher" : "/api/dashboard/student")).status()).toBe(200); expect((await admin.post("/api/classes", { headers, data: { title: "Forbidden" } })).status()).toBe(403); await exit(admin);
    }
    await unchanged(c,before);
    const afterPending = await (await teacher.get("/api/dashboard/teacher")).json(); expect(afterPending.pendingCount).toBe(pendingBefore.pendingCount);
    const [audit] = await c.query<mysql.RowDataPacket[]>("SELECT action, targetId FROM AuditEvent WHERE actorId IN (?,?) AND action LIKE 'VIEW_%'", [fixture.users.teacher.id, fixture.users.admin.id]); expect(audit.some(e=>e.action==='VIEW_ENTER'&&e.targetId==='USER:STUDENT:'+fixture.users.student.id)).toBe(true); expect(audit.some(e=>e.action==='VIEW_EXIT')).toBe(true);
    results.tablesUnchanged = Object.keys(before).length; results.roleMatrix = "student / teacher / admin; ROLE / USER; read / write"; results.queueUnchanged = true; results.auditEntries = audit.length;
    await fs.writeFile(root + "/security-and-preservation.json", JSON.stringify(results, null, 2));
  } finally { await Promise.all([student.dispose(), teacher.dispose(), admin.dispose()]); await c.end(); }
});

test("stage5: inactivity, membership revocation, logout and expired attempts remain read only", async () => {
  const c = await connection(), teacher = await session("teacher");
  let previousExpiry: string | undefined;
  try {
    const me = await enter(teacher, "USER", "STUDENT", fixture.users.student.id);
    const state = await teacher.storageState(), token = state.cookies.find(c=>c.name==='maths4u_session')!.value, hash = createHash('sha256').update(token).digest('hex');
    await c.query("UPDATE Session SET lensTouchedAt=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 31 MINUTE) WHERE tokenHash=? AND userId=?", [hash,fixture.users.teacher.id]);
    expect((await teacher.patch('/api/profile',{headers,data:{locale:'ru'}})).status()).toBe(409);
    const expired=await(await teacher.get('/api/auth/me')).json();expect(expired.lens).toBe(null);expect(expired.user.id).toBe(fixture.users.teacher.id);await teacher.setExtraHTTPHeaders({});
    await enter(teacher,'USER','STUDENT',fixture.users.student.id);
    if(!fixture.expiredAttempt){
      const student=await session('student');const started=await student.post(`/api/works/${fixture.work}/start`,{headers,data:{newAttempt:true}});expect(started.status()).toBe(200);fixture.expiredAttempt=(await started.json()).id;await student.dispose();await fs.writeFile('.local/stage5-20261105/fixtures.json',JSON.stringify(fixture));
    }
    const [[originalExpiry]]=await c.query<mysql.RowDataPacket[]>("SELECT DATE_FORMAT(expiresAt,'%Y-%m-%d %H:%i:%s.%f') stamp FROM Attempt WHERE id=?",[fixture.expiredAttempt]);previousExpiry=originalExpiry.stamp;
    await c.query('UPDATE Attempt SET expiresAt=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 MINUTE) WHERE id=? AND userId=?',[fixture.expiredAttempt,fixture.users.student.id]);
    const [beforeRows]=await c.query('SELECT * FROM Attempt WHERE id=?',[fixture.expiredAttempt]);
    expect((await teacher.get('/api/attempts/'+fixture.expiredAttempt)).status()).toBe(200);
    const [afterRows]=await c.query('SELECT * FROM Attempt WHERE id=?',[fixture.expiredAttempt]);expect(afterRows).toEqual(beforeRows);
    await c.query('UPDATE ClassMembership SET removedAt=NOW() WHERE classId=? AND userId=?',['qa_stage5_class',fixture.users.student.id]);
    expect((await teacher.get('/api/dashboard/student')).status()).toBe(409);expect((await(await teacher.get('/api/auth/me')).json()).lens).toBe(null);
    await c.query('UPDATE ClassMembership SET removedAt=NULL WHERE classId=? AND userId=?',['qa_stage5_class',fixture.users.student.id]);await teacher.setExtraHTTPHeaders({});
    await enter(teacher,'ROLE','STUDENT');
    expect((await teacher.post('/api/auth/logout',{headers,data:{}})).status()).toBe(200);expect((await(await teacher.get('/api/auth/me')).json()).user).toBe(null);
    const [[sessionRow]]=await c.query<mysql.RowDataPacket[]>('SELECT userId,lensMode,revokedAt FROM Session WHERE tokenHash=?',[hash]);expect(sessionRow.userId).toBe(fixture.users.teacher.id);expect(sessionRow.lensMode).toBe(null);expect(sessionRow.revokedAt).not.toBe(null);
    expect(me.lens.targetId).toBe(fixture.users.student.id);
    await fs.writeFile(root+'/expiry-logout.json',JSON.stringify({idleMinutes:30,staleWriteDenied:true,membershipRevocationClearsLens:true,logoutClearsLens:true,sameRealSessionUser:true},null,2));
  } finally { if(previousExpiry)await c.query('UPDATE Attempt SET expiresAt=? WHERE id=?',[previousExpiry,fixture.expiredAttempt]);await c.query('UPDATE ClassMembership SET removedAt=NULL WHERE classId=? AND userId=?',['qa_stage5_class',fixture.users.student.id]);await c.end();await teacher.dispose(); }
});

test("stage5: preview UI, full-answer checks, private work preview and user read-only controls", async ({ browser }) => {
  const teacher = await session('teacher');const state=await teacher.storageState();await teacher.dispose();
  const ctx = await browser.newContext({baseURL:base,storageState:state}),page=await ctx.newPage(); page.setDefaultNavigationTimeout(15000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto('/teacher');await page.getByRole('button',{name:'Preview as student',exact:true}).click({noWaitAfter:true});await expect(page.getByTestId('view-banner')).toContainText('role preview');
    await page.goto(square+'?item=M4U-9709-Q26-S-CS01#practice');const form=page.locator('.square-question');await expect(form.getByRole('button',{name:'Check answer',exact:true})).toBeEnabled();
    const storageBefore=await page.evaluate(()=>JSON.stringify({...localStorage}));
    await form.locator('input[name=a]').fill('1');await form.locator('input[name=h]').fill('7');await form.locator('input[name=k]').fill('-9');await form.getByRole('button',{name:'Check answer',exact:true}).click();await expect(form.locator('.square-result')).toContainText('All final answers are correct');
    expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(storageBefore);
    await page.goto('/preview/works/'+fixture.work);await expect(page.locator('.material-preview')).toContainText('No attempt, mark or progress is saved');await page.getByRole('button',{name:'Check preview answers'}).click();await expect(page.locator('.material-preview')).toContainText('Written reasoning requires');
    await page.getByRole('button',{name:'Exit',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(base+'/teacher');
    await page.locator('details').filter({hasText:'Student dashboards — read only'}).first().locator('summary').click();await page.getByRole('button',{name:'View student',exact:true}).first().click({noWaitAfter:true});await expect(page.getByTestId('view-banner')).toContainText('read only');
    await expect(page.getByRole('button',{name:'Change courses'})).toBeDisabled();await page.goto('/attempts/'+fixture.attempt);await expect(page.getByTestId('view-banner')).toBeVisible();await expect(page.getByRole('button',{name:'Submit work',exact:true})).toHaveCount(0);
    await page.goto(square+'?item=M4U-9709-Q26-S-CS01#practice');await expect(page.locator('.square-question').getByRole('button',{name:'Check answer',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Exit',exact:true}).click({noWaitAfter:true});
    await expect(page).toHaveURL(base+'/teacher');await expect(page.getByRole('heading',{name:'Teacher dashboard',exact:true})).toBeVisible();await expect(page.getByTestId('view-banner')).toHaveCount(0);
    const ownPreference=await page.evaluate(()=>({locale:localStorage.getItem('maths4u_locale'),cookie:document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('maths4u_locale='))}));
    const c=await connection();const [[profile]]=await c.query<mysql.RowDataPacket[]>('SELECT locale FROM Profile WHERE userId=?',[fixture.users.student.id]);
    try{
      await c.query('UPDATE Profile SET locale=? WHERE userId=?',['ru',fixture.users.student.id]);expect((await ctx.request.post('/api/view/enter',{headers,data:{mode:'USER',role:'STUDENT',targetId:fixture.users.student.id}})).status()).toBe(200);
      await page.goto('/student');await expect(page.getByTestId('view-banner')).toContainText('read only');await expect(page.locator('html')).toHaveAttribute('lang','ru');
      expect(await page.evaluate(()=>({locale:localStorage.getItem('maths4u_locale'),cookie:document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('maths4u_locale='))}))).toEqual(ownPreference);
      await page.getByRole('button',{name:'Exit',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(base+'/teacher');await expect(page.getByRole('heading',{name:'Teacher dashboard',exact:true})).toBeVisible();
    }finally{await c.query('UPDATE Profile SET locale=? WHERE userId=?',[profile.locale,fixture.users.student.id]);await c.end();}
    expect(errors).toEqual([]);
  }finally{await page.close();await ctx.close();}
});

test("stage5: create an assignment from a topic without replacing the saved basket", async ({browser}) => {
  const teacher=await session('teacher'),state=await teacher.storageState(),before=await(await teacher.get('/api/basket')).json();await teacher.dispose();
  const ctx=await browser.newContext({baseURL:base,storageState:state}),page=await ctx.newPage();
  try{
    await page.goto(square);await page.getByRole('link',{name:'Assign from this topic',exact:false}).click();await expect(page.getByRole('heading',{name:'Assignment from a topic',exact:true})).toBeVisible();
    const options=page.locator('.dashboard-topic-list input[type=checkbox]');await expect(options.first()).toBeVisible();await options.nth(0).check();await options.nth(1).check();
    await page.getByLabel('Work title',{exact:true}).fill('Topic assignment · Stage 5 QA');await page.locator('select[name=classId]').selectOption('qa_stage5_class');
    if(!fixture.topicWork){
      await page.getByRole('button',{name:'Assign to class',exact:true}).click();await expect(page).toHaveURL(/\/works\/[^/]+\/results$/);fixture.topicWork=new URL(page.url()).pathname.split('/')[2];await fs.writeFile('.local/stage5-20261105/fixtures.json',JSON.stringify(fixture));
    }
    const after=await(await ctx.request.get('/api/basket')).json();expect(after.taskIds).toEqual(before.taskIds);expect(after.revision).toBe(before.revision);
  }finally{await page.close();await ctx.close();}
});

test("stage5: dashboards and lenses, responsive widths and both themes", async ({ browser }) => {
  const measurements=[];
  for(const role of ['student','teacher','admin']) {
    const api=await session(role),state=await api.storageState();await api.dispose();
    const ctx:BrowserContext=await browser.newContext({baseURL:base,storageState:state}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){
        await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:width<800?844:900});await page.goto('/'+role);await expect(page.locator('.skeleton')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);expect(overflow).toBeLessThanOrEqual(0);
        measurements.push({role,theme,width,overflow});if([390,1280].includes(width))await page.screenshot({path:`${root}/after/${role}-${width}-${theme}.png`,fullPage:true});
      }
      if(role==='admin'){
        for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto('/admin/audit');await expect(page.locator('.dashboard-audit .item').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const overflow=await page.locator('.dashboard-audit').evaluate(e=>e.scrollWidth-e.clientWidth);expect(overflow).toBeLessThanOrEqual(0);measurements.push({role:'admin-audit',theme,width,overflow});if([390,1280].includes(width))await page.screenshot({path:`${root}/after/audit-${width}-${theme}.png`,fullPage:true});}
      }
      if(role==='teacher'){
        await page.getByRole('button',{name:'Preview as student',exact:true}).click({noWaitAfter:true});await expect(page.getByTestId('view-banner')).toBeVisible();
        for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto(square);await expect(page.getByTestId('view-banner')).toContainText('role preview');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);measurements.push({role:'preview-student',theme,width,overflow:0});if([390,1280].includes(width))await page.screenshot({path:`${root}/after/preview-square-${width}-${theme}.png`,fullPage:true});}
        await page.getByRole('button',{name:'Exit',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(base+'/teacher');await expect(page.getByRole('heading',{name:'Teacher dashboard',exact:true})).toBeVisible();
        expect((await ctx.request.post('/api/view/enter',{headers,data:{mode:'USER',role:'STUDENT',targetId:fixture.users.student.id}})).status()).toBe(200);
        for(const theme of ['light','dark'] as const)for(const width of [390,1280,360,768]){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:844});await page.goto('/student');await expect(page.getByTestId('view-banner')).toContainText('read only');await expect(page.locator('.skeleton')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);measurements.push({role:'read-only-student',theme,width,overflow:0});if([390,1280].includes(width))await page.screenshot({path:`${root}/after/read-only-student-${width}-${theme}.png`,fullPage:true});}
        await page.getByRole('button',{name:'Exit',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(base+'/teacher');await expect(page.getByRole('heading',{name:'Teacher dashboard',exact:true})).toBeVisible();
      }
      expect(errors).toEqual([]);
    }finally{await page.close();await ctx.close();}
  }
  await fs.writeFile(root+'/responsive.json',JSON.stringify(measurements,null,2));
});
