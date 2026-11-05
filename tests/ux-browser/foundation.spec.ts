import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

const phase = process.env.FOUNDATION_PHASE === "before" ? "before" : "after";
const folder = `test-results/foundation-20261105/${phase}`;
const lesson = "/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square";
const routes = [["home", "/"], ["courses", "/courses"], ["library", "/library"], ["square", lesson]];
test.setTimeout(300000);

test("foundation: public pages, both themes and responsive widths", async ({ page }) => {
  await fs.mkdir(folder, { recursive: true });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const measurements = [];
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [390, 1280, 360, 768]) {
      await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
      for (const [name, url] of routes) {
        await page.goto(url); await expect(page.locator(".brand")).toBeVisible();
        await expect(page.locator(".skeleton")).toHaveCount(0);
        await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
        if (phase === "after") await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const metrics = await page.evaluate(() => {
          const rect = (selector: string) => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { x: r.x, y: r.y, w: r.width, display: c.display, grid: c.gridTemplateColumns, flexDirection: c.flexDirection }; };
          const small = [...document.querySelectorAll("body *")].filter(e => {
            const r = e.getBoundingClientRect(), c = getComputedStyle(e);
            return r.width && r.height && c.visibility !== "hidden" && c.display !== "none" && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim()) && !e.closest(".katex,svg,script,style") && parseFloat(c.fontSize) < 13;
          }).map(e => ({ tag: e.tagName, class: e.className, size: getComputedStyle(e).fontSize }));
          return { overflow: document.documentElement.scrollWidth - innerWidth, small, layout: Object.fromEntries([".discovery-hero", ".discovery-directions", ".course-catalog", ".catalog-with-basket", ".square-nav", ".quadratics-topics", ".square-answer-grid"].map(s => [s, rect(s)])) };
        });
        if (phase === "after") expect(metrics.small).toEqual([]);
        measurements.push({ name, url, theme, width, ...metrics });
        if ([390, 1280].includes(width)) await page.screenshot({ path: `${folder}/${name}-${width}-${theme}.png`, fullPage: true });
      }
    }
  }
  await fs.writeFile(`${folder}/responsive.json`, JSON.stringify(measurements, null, 2));
  expect(errors).toEqual([]);
});

test("foundation: existing student, teacher, administrator and access boundaries", async ({ browser }) => {
  const fixture = JSON.parse(await fs.readFile(".local/content-bank/preview.json", "utf8"));
  const results = [];
  for (const role of ["student", "teacher", "admin"]) {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:3102" });
    const login = await context.request.post("/api/auth/login", { headers: { Origin: "http://127.0.0.1:3102" }, data: { username: fixture.users[role], password: fixture.password } });
    expect(login.ok(), `Local ${role} login`).toBe(true);
    const me = await (await context.request.get("/api/auth/me")).json();
    expect(me.user.roles.some((r: {role: string}) => r.role === role.toUpperCase())).toBe(true);
    const page = await context.newPage();
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [390, 1280, 360, 768]) {
        await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
        await page.goto(`/${role}`); await expect(page.locator(".skeleton")).toHaveCount(0);
        await expect(page.locator('input[name="username"]')).toHaveCount(0);
        await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
        if (phase === "after") expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if ([390, 1280].includes(width)) await page.screenshot({ path: `${folder}/${role}-${width}-${theme}.png`, fullPage: true });
      }
    }
    const adminStatus = (await context.request.get("/api/admin/users")).status();
    expect(adminStatus).toBe(role === "admin" ? 200 : 403);
    results.push({ role, adminStatus }); await context.close();
  }
  await fs.writeFile(`${folder}/roles.json`, JSON.stringify(results, null, 2));
});

test("foundation: public language follows the URL and private language is an account setting", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3102" });
  await context.addCookies([{ name: "maths4u_locale", value: "ru", url: "http://127.0.0.1:3102" }]);
  expect(await (await context.request.get("/")).text()).toMatch(/<html[^>]*lang="en"/);
  const page = await context.newPage(); await page.goto("/"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.locale')).toHaveCount(0);
  await page.goto('/login'); await expect(page.locator('html')).toHaveAttribute('lang','ru');
  await page.locator('.discovery-account summary').click(); await page.getByRole('radio',{name:'English',exact:true}).check();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang','en');
  await context.close();
});
test("foundation: explicit themes override the system and local fonts stay local", async ({ browser }) => {
  test.skip(phase === "before", "New stage-1 behavior");
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3102", colorScheme: "dark" });
  await context.addCookies([{ name: "maths4u_theme", value: "light", url: "http://127.0.0.1:3102" }]);
  const page = await context.newPage(), remoteFonts: string[] = [];
  page.on("request", r => { if (r.resourceType() === "font" && new URL(r.url()).hostname !== "127.0.0.1") remoteFonts.push(r.url()); });
  await page.goto("/"); await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  const light = await page.locator("body").evaluate(e => getComputedStyle(e).backgroundColor);
  await context.addCookies([{ name: "maths4u_theme", value: "dark", url: "http://127.0.0.1:3102" }]);
  await page.emulateMedia({ colorScheme: "light" }); await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  expect(await page.locator("body").evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(light);
  expect(await page.locator("body").evaluate(e => getComputedStyle(e).fontFamily)).toContain("Inter");
  expect(remoteFonts).toEqual([]);
  await context.close();
});
