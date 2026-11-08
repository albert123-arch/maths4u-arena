// Mocked transport only: the actual React views and compiled styles render here.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.ARENA_UX_BASE_URL ?? "http://127.0.0.1:3110";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw Error("LOCAL_MOCKED_TEACHER_PREVIEW_ONLY");
const out = "test-results/teacher-task-preview-20261108";
const actor = { id: "preview-teacher", username: "preview_teacher", displayName: "Preview Teacher", status: "ACTIVE", roles: [{ role: "TEACHER" }], profile: { locale: "ru" }, teacherAccount: null };
const options = ["−3", "3", "9", "0"].map((text, i) => ({ id: `choice-${i}`, text: `<p>${text}</p>` }));
const statement = '<p>Shared stem for the teacher preview.</p><img src="/api/files/preview-stem" alt="Stem figure" width="200" height="100">';
const version = {
  id: "version-choice", unavailable: false, taskId: "task-choice", title: "Complete choice question", locale: "en", statement, separatePartPrompts: true,
  assets: [{ id: "preview-stem", caption: "Stem figure", role: "STATEMENT", mimeType: "image/svg+xml", partPosition: null }, { id: "preview-part", caption: "Part figure", role: "STATEMENT", mimeType: "image/svg+xml", partPosition: 0 }, { id: "preview-part", caption: "Part figure", role: "STATEMENT", mimeType: "image/svg+xml", partPosition: 0 }],
  parts: [{ id: "part-choice", kind: "CHOICE", maxPoints: 2, prompt: "<p>Choose the positive root of x² = 9.</p>", options }, { id: "part-written", kind: "WRITTEN", maxPoints: 3, prompt: "<p>Explain why the other root is negative.</p>", options: [] }],
};
const legacyOptions = ["Legacy alpha", "Legacy beta", "Legacy gamma", "Legacy delta"];
const legacyVersion = { ...version, id: "version-legacy", taskId: "task-legacy", title: "Complete legacy question", separatePartPrompts: false, assets: [],
  statement: `<p>Legacy shared stem.</p><ol type="a"><li><p>Legacy part prompt.</p><span class="marks">[2]</span></li></ol><ol type="A">${legacyOptions.map(text => `<li><p>${text}</p></li>`).join("")}</ol>`,
  parts: [{ id: "part-legacy", kind: "CHOICE", maxPoints: 2, prompt: "<p>Legacy part prompt.</p>", options: legacyOptions.map((text, i) => ({ id: `legacy-${i}`, text: `<p>${text}</p>` })) }],
};
const items = [version, legacyVersion].map((v, i) => ({ id: v.taskId, version: v, number: i + 1, points: i ? 2 : 5, mode: "MC", category: "TRAINING", bookmarked: false, editable: false, examArchivedAt: null, progress: null }));
const catalog = { items, total: 2, page: 1, pages: 1, pageSize: 25, facets: { categories: ["TRAINING"], years: [], sessions: [], papers: [], difficulties: [], languages: ["en"] } };

async function transport(page: Page) {
  const writes: string[] = [], errors: string[] = [], previewRequests: string[] = [], sheets: string[] = [];
  let order = items.map(item => item.id), revision = 0;
  const basket = () => ({ revision, taskIds: order, items: order.map(id => { const item = items.find(q => q.id === id)!; return { id, available: true, public: true, title: item.version.title, points: item.points, version: item.version }; }) });
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.request().resourceType() === "stylesheet" && response.ok()) sheets.push(response.url()); });
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (request.method() === "POST" && path === "/api/basket") { const input = request.postDataJSON(); order = input.taskIds; revision++; return route.fulfill({ json: basket() }); }
    if (request.method() !== "GET") { writes.push(request.method() + " " + path); return route.fulfill({ status: 403, json: { error: "MOCKED_READ_ONLY_PREVIEW" } }); }
    if (path === "/api/auth/me") return route.fulfill({ json: { user: actor, lens: null } });
    if (path === "/api/basket") return route.fulfill({ json: basket() });
    if (path === "/api/dashboard/teacher/counts") return route.fulfill({ json: { pendingCount: 0 } });
    if (path === "/api/catalog") return route.fulfill({ json: catalog });
    if (path === "/api/catalog/courses" || path === "/api/courses") return route.fulfill({ json: [] });
    if (path === "/api/classes") return route.fulfill({ json: [{ id: "preview-class", title: "Preview class", archivedAt: null, students: [] }] });
    const match = path.match(/^\/api\/teacher\/tasks\/([^/]+)\/preview$/);
    if (match) {
      previewRequests.push(request.url());
      const question = match[1] === version.taskId ? version : legacyVersion;
      if (url.searchParams.get("versionId") !== question.id) return route.fulfill({ status: 409, json: { error: "QUESTION_CHANGED" } });
      return route.fulfill({ json: { taskId: question.taskId, versionId: question.id, question,
        answers: { html: "<p>Answer key: B — 3.</p>", assets: [] },
        solution: { html: "<p>Worked solution: squaring 3 gives 9.</p>", assets: [] },
        guidance: { html: "", rows: [{ id: "mark-method", part: "a", code: "M1", marks: 1, html: "<p>Find both roots.</p>", guidance: "<p>Use the positive root.</p>" }], total: 1, assets: [] },
      } });
    }
    // A public page can preload its server-rendered diagrams before hydration.
    // Fulfil those file reads locally too; no source attachment is downloaded.
    if (path.startsWith("/api/files/")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path d="M10 90H190M10 90V10M10 90L170 20" fill="none" stroke="#2457d6"/></svg>' });
    writes.push("UNEXPECTED GET " + path); return route.fulfill({ status: 404, json: { error: "UNEXPECTED_MOCKED_REQUEST" } });
  });
  return { writes, errors, previewRequests, sheets, order: () => order };
}

async function noOverflow(page: Page, width: number) { await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1); }
async function completeQuestion(preview: ReturnType<Page["locator"]>) {
  await expect(preview.getByText("Shared stem for the teacher preview.", { exact: true })).toHaveCount(1);
  await expect(preview.getByText("Choose the positive root of x² = 9.", { exact: true })).toHaveCount(1);
  await expect(preview.getByText("Explain why the other root is negative.", { exact: true })).toBeVisible();
  await expect(preview.locator(".full-question-options > li")).toHaveCount(4);
  for (const option of ["−3", "3", "9", "0"]) await expect(preview.locator(".full-question-options").getByText(option, { exact: true })).toBeVisible();
  await expect(preview.locator('img[src="/api/files/preview-stem"]')).toHaveCount(1);
  await expect(preview.locator('img[src="/api/files/preview-part"]')).toHaveCount(1);
  await expect(preview.getByText("2 marks", { exact: true })).toBeVisible();
  await expect(preview.getByText("3 marks", { exact: true })).toBeVisible();
  await expect(preview.locator("input,select,textarea")).toHaveCount(0);
}

for (const theme of ["light", "dark"] as const) for (const width of [1280, 390]) {
  test(`teacher gets full read-only questions and immediate resources at ${width}px in ${theme}`, async ({ page }) => {
    await fs.mkdir(out, { recursive: true }); await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme: theme });
    await page.context().addCookies([{ name: "maths4u_theme", value: theme, url: base }]);
    const api = await transport(page);
    await page.goto(base + "/library");
    const choice = page.locator("#question-task-choice"), preview = choice.locator(".teacher-task-preview");
    await expect(choice.locator("details.task-content")).toHaveAttribute("open", ""); await completeQuestion(preview);
    await expect(page.locator(".question-support,.quick-practice")).toHaveCount(0);
    for (const name of ["I’m stuck", "I’ve finished on paper", "Check answer", "Your marks"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
    await expect(preview.getByRole("tab", { name: "Question", exact: true })).toHaveAttribute("aria-selected", "true");
    await preview.getByRole("tab", { name: "Answers", exact: true }).click(); await expect(preview.getByText("Answer key: B — 3.", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight"); await expect(preview.getByRole("tab", { name: "Worked solution", exact: true })).toBeFocused(); await expect(preview.getByText("Worked solution: squaring 3 gives 9.", { exact: true })).toBeVisible();
    await page.keyboard.press("End"); await expect(preview.getByRole("tab", { name: "Marking guidance", exact: true })).toBeFocused(); await expect(preview.getByRole("table")).toBeVisible(); await expect(preview.getByText("Find both roots.", { exact: true })).toBeVisible();
    await page.keyboard.press("Home"); await expect(preview.getByRole("tab", { name: "Question", exact: true })).toBeFocused(); await completeQuestion(preview);
    expect(api.previewRequests.filter(url => url.includes("/task-choice/"))).toHaveLength(1);
    const legacy = page.locator("#question-task-legacy .teacher-task-preview");
    await expect(legacy.getByText("Legacy part prompt.", { exact: true })).toHaveCount(1); for (const option of legacyOptions) await expect(legacy.getByText(option, { exact: true })).toHaveCount(1);
    await expect(legacy.locator(".full-question-part-heading")).toHaveCount(0); await expect(legacy.locator(".full-question-embedded-options")).toHaveCSS("list-style-type", "upper-alpha");
    await expect(page.locator("html")).toHaveAttribute("lang", "en"); await noOverflow(page, width); expect(api.sheets.length).toBeGreaterThan(0);
    await page.screenshot({ path: `${out}/catalog-${width}-${theme}.png`, fullPage: true });

    await page.goto(base + "/teacher/works/new?topic=preview-topic");
    await expect(page.getByRole("heading", { name: "Assignment from a topic", exact: true })).toBeVisible();
    const topic = page.locator(".topic-question-choice").first(); await completeQuestion(topic.locator(".teacher-task-preview"));
    await topic.locator('input[type="checkbox"]').check(); await page.getByLabel("Work title", { exact: true }).fill("Preserved assignment draft");
    await topic.getByRole("tab", { name: "Marking guidance", exact: true }).click(); await expect(topic.getByText("Find both roots.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Work title", { exact: true })).toHaveValue("Preserved assignment draft"); await expect(topic.locator('input[type="checkbox"]')).toBeChecked();
    await expect(topic.locator("label button,label a,label select,label textarea")).toHaveCount(0);
    await noOverflow(page, width); await page.screenshot({ path: `${out}/topic-picker-${width}-${theme}.png`, fullPage: true });

    await page.goto(base + "/teacher/works/new");
    const basket = page.getByRole("region", { name: "Task set", exact: true });
    await completeQuestion(basket.locator(".teacher-task-preview").first());
    await basket.getByRole("button", { name: "Move down: Complete choice question", exact: true }).click();
    await expect(basket.locator(".basket-list > li").first()).toContainText("Complete legacy question"); expect(api.order()).toEqual(["task-legacy", "task-choice"]);
    await noOverflow(page, width); await page.screenshot({ path: `${out}/basket-${width}-${theme}.png`, fullPage: true });
    expect(api.writes).toEqual([]); expect(api.errors).toEqual([]);
  });
}

test("admin archive preserves its existing statement and support flow without the teacher preview route", async ({ page }) => {
  await fs.mkdir(out, { recursive: true }); await page.setViewportSize({ width: 390, height: 900 });
  await page.context().addCookies([{ name: "maths4u_theme", value: "light", url: base }]);
  const api = await transport(page), legacySupportRequests: string[] = [];
  const archived = { ...items[1], id: "task-archived", mode: "WRITTEN", category: "EXAM", examArchivedAt: "2026-11-06T12:00:00.000Z", version: { ...legacyVersion, id: "version-archived", taskId: "task-archived", title: "Preserved archived question", statement: "<p>Preserved Cambridge archive statement.</p>", parts: [], assets: [] } };
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { ...actor, roles: [{ role: "ADMIN" }] }, lens: null } });
    if (path === "/api/admin/overview") return route.fulfill({ json: { decisions: [], content: { draftPackages: 0, cambridgeArchive: 1, presentations: 0 }, users: { total: 1 } } });
    if (path === "/api/admin/course-tree/catalog") return route.fulfill({ json: [] });
    if (path === "/api/admin/course-tree/presentations") return route.fulfill({ json: { lessons: [], total: 0 } });
    if (path === "/api/catalog") return route.fulfill({ json: { ...catalog, items: [archived], total: 1, facets: { ...catalog.facets, categories: ["EXAM"] } } });
    if (path === "/api/catalog/tasks/task-archived/support" && request.method() === "POST") {
      legacySupportRequests.push(request.postDataJSON().kind);
      return route.fulfill({ json: { html: "<p>Preserved archive hint.</p>", assets: [] } });
    }
    return route.fallback();
  });
  await page.goto(base + "/admin/archive-bank");
  await expect(page.getByRole("heading", { name: "Cambridge question archive", exact: true })).toBeVisible();
  const question = page.locator("#question-task-archived");
  await expect(question.getByText("Preserved Cambridge archive statement.", { exact: true })).toBeVisible();
  await expect(question.locator(".question-support")).toBeVisible();
  await expect(question.locator(".teacher-task-preview")).toHaveCount(0);
  await expect(question.getByRole("checkbox", { name: "Select: Preserved archived question", exact: true })).toBeDisabled();
  await question.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(question.getByText("Preserved archive hint.", { exact: true })).toBeVisible();
  expect(legacySupportRequests).toEqual(["hint"]); expect(api.previewRequests).toEqual([]); expect(api.writes).toEqual([]); expect(api.errors).toEqual([]);
  await noOverflow(page, 390); await page.screenshot({ path: `${out}/admin-archive-390-light.png`, fullPage: true });
});
