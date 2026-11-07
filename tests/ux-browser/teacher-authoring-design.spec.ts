// These are UI checks with explicitly mocked API transport. They exercise the
// real React/MathLive UI, but make no claim about database/API lifecycle checks.
import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs/promises";
import { renderContent } from "../../src/lib/content";
import type { TaskInput } from "../../src/lib/content";
import type { TeacherAuthoredTaskDetailDto } from "../../src/lib/teacher-authoring-model";

const base = process.env.ARENA_UX_BASE_URL ?? "http://127.0.0.1:3110";
if (!/^http:\/\/127\.0\.0\.1:3110$/.test(base)) throw Error("LOCAL_MOCKED_AUTHORING_UI_ONLY");
const out = "test-results/teacher-authoring-mocked-20261107";
const actor = { id: "mock-owner", username: "mock_teacher", displayName: "Local Teacher", status: "ACTIVE", roles: [{ role: "TEACHER" }], profile: { locale: "en" }, teacherAccount: null };
function material(): TaskInput {
  return { visibility: "PRIVATE", featureKey: null, difficulty: 2, difficultyKnown: true, materialCategory: "TRAINING", topicIds: [], assets: [],
    texts: [{ locale: "en", title: "An independently authored task", statement: "<p>Find the area.</p>", answer: "", hint: "", solution: "<p>Integrate the expression and evaluate the bounds.</p>", markScheme: "", markSchemeSource: "", teacherNote: "" }],
    parts: [{ kind: "MANUAL", maxPoints: 3, caseSensitive: false, tolerance: 0, acceptedAnswers: [], options: [], texts: [{ locale: "en", prompt: "", answer: "<p>One square unit.</p>", rubric: "<p>One mark for integration, two for the evaluation.</p>" }] }] };
}
function detail(value = material(), revision = 0): TeacherAuthoredTaskDetailDto {
  const text = value.texts[0];
  return { id: "mock-authored-task", taskId: "mock-private-task", revision, title: text.title, latestVersionId: "mock-version-" + revision, latestVersionNumber: revision + 1,
    status: "DRAFT", courseId: "mock-course", topicId: "mock-chapter", publicTaskId: null, publicVersionId: null, reviewFeedback: "", updatedAt: new Date().toISOString(), declaredOriginal: true, declarationVersion: "teacher-original-v1", declaredAt: new Date().toISOString(), hasUnsubmittedChanges: true,
    material: value, completeness: [], submissions: [], preview: { id: "mock-version-" + revision, unavailable: false, title: text.title, locale: "en", statement: renderContent(text.statement), answer: renderContent(text.answer ?? ""), solution: renderContent(text.solution), hint: renderContent(text.hint), markScheme: "", markSchemeText: "", separatePartPrompts: false, assets: [],
      parts: value.parts.map((part, i) => ({ id: "mock-part-" + i, kind: part.kind, maxPoints: part.maxPoints, prompt: renderContent(part.texts[0].prompt), answer: renderContent(part.texts[0].answer), rubric: renderContent(part.texts[0].rubric), options: part.options.map((option, j) => ({ id: "mock-option-" + j, text: renderContent(option.texts[0].text), correct: option.correct })) })) } };
}
type TransportOptions = { lens?: "USER" | "ROLE"; delaySave?: Promise<void>; conflict?: boolean };
async function mockedTransport(page: Page, options: TransportOptions = {}) {
  let record = detail();
  let basket = { revision: 0, taskIds: [] as string[], items: [] as unknown[] };
  const saves: TaskInput[] = [], writes: string[] = [], previews: string[] = [], external: string[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).origin !== base && /^https?:/.test(request.url())) external.push(request.url()); });
  page.on("dialog", dialog => { void dialog.accept(); });
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    if (path === "/api/auth/me") return json({ user: actor, lens: options.lens ? { mode: options.lens, role: "TEACHER", targetId: actor.id, label: "Local teacher", nonce: "mock-view", expiresAt: new Date(Date.now() + 600000).toISOString() } : null });
    if (path === "/api/basket") {
      if (method === "POST") { const body = request.postDataJSON(); basket = { revision: basket.revision + 1, taskIds: body.taskIds, items: [] }; }
      return json(basket);
    }
    if (path === "/api/dashboard/teacher/counts") return json({ pendingCount: 0 });
    if (path === "/api/teacher/task-editor/mock-authored-task") return json({ kind: "personal", id: "mock-authored-task" });
    if (path === "/api/courses") return json([{ id: "mock-course", title: "Local course", topics: [{ id: "mock-chapter", title: "Local chapter", lessons: [] }] }]);
    if (path === "/api/teacher/authoring/preview") { const body = request.postDataJSON(); previews.push(body.content); return json({ html: renderContent(body.content) }); }
    if (path === "/api/teacher/authoring" && method === "GET") return json({ items: [record] });
    if (path === "/api/teacher/authoring/mock-authored-task" && method === "GET") return json(record);
    if (path === "/api/teacher/authoring" && method === "POST" || path === "/api/teacher/authoring/mock-authored-task" && method === "PUT") {
      const body = request.postDataJSON(); writes.push(method + " " + path); saves.push(structuredClone(body.material));
      await options.delaySave;
      if (options.conflict) return json({ error: "STALE_REVISION" }, 409);
      record = detail(body.material, record.revision + 1); record.courseId = body.courseId; record.topicId = body.topicId;
      return json(record, method === "POST" ? 201 : 200);
    }
    if (path.startsWith("/api/teacher/authoring/") && method !== "GET") { writes.push(method + " " + path); return json(record); }
    return json({ error: "NOT_FOUND" }, 404);
  });
  return { saves, writes, previews, external, errors, current: () => record };
}
const question = (page: Page) => page.locator("#task-question .ae-math-editor").first();

test.beforeAll(async () => { await fs.mkdir(out, { recursive: true }); });

test("mocked transport: visual formula keys, self-hosted fonts and responsive editor", async ({ page }) => {
  const transport = await mockedTransport(page);
  await page.goto(base + "/teacher/tasks/new");
  await expect(page.getByRole("heading", { name: "Create a task", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save private", exact: true })).toBeDisabled();
  const q = question(page);
  await q.getByRole("textbox").fill("A < B & C. Find ");
  await q.getByRole("button", { name: "Insert formula", exact: true }).click();
  await expect(page.locator("math-field")).toBeVisible();
  for (const label of ["Fraction", "Square root", "Power", "Sine", "Integral", "2 by 2 matrix"]) await expect(page.getByRole("button", { name: label, exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Fraction", exact: true }).click();
  await page.keyboard.type("1"); await page.keyboard.press("Tab"); await page.keyboard.type("2");
  const latex = await page.locator("math-field").evaluate(element => (element as HTMLElement & { value: string }).value);
  expect(latex).toContain("\\frac"); expect(latex).toContain("1"); expect(latex).toContain("2");
  await page.locator(".ae-formula-composer").getByRole("button", { name: "Insert formula", exact: true }).click();
  await expect(q.getByRole("textbox")).toHaveValue(/\\\(.*\\frac/);
  await expect(q.locator(".ae-preview .katex")).toBeVisible();
  await expect(q.locator(".ae-preview")).toContainText("A < B & C.");
  for (const theme of ["light", "dark"] as const) for (const width of [390, 1280]) {
    await page.emulateMedia({ colorScheme: theme }); await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `${out}/editor-${width}-${theme}.png` });
  }
  await q.getByRole("button", { name: "Formula 1", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.locator("math-field")).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(q.getByRole("textbox")).toBeFocused();
  expect(transport.external).toEqual([]); expect(transport.errors).toEqual([]); expect(transport.writes).toEqual([]);
});

test("mocked transport: typing during a save retains the unsaved snapshot", async ({ page }) => {
  let release!: () => void; const delaySave = new Promise<void>(resolve => { release = resolve; });
  const transport = await mockedTransport(page, { delaySave });
  await page.goto(base + "/teacher/tasks/mock-authored-task");
  await expect(page.getByRole("heading", { name: "Edit your task", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Autosave after first save", exact: true }).uncheck();
  const textarea = question(page).getByRole("textbox");
  await textarea.fill("The snapshot sent to the server.");
  await page.getByRole("button", { name: "Save private", exact: true }).click();
  await expect.poll(() => transport.saves.length).toBe(1);
  await textarea.fill("Newer typing while the request is in flight."); release();
  await expect(page.locator(".ae-save-state")).toContainText("Unsaved changes");
  await expect(textarea).toHaveValue("Newer typing while the request is in flight.");
  expect(transport.current().material.texts[0].statement).toBe("<p>The snapshot sent to the server.</p>");
  expect(transport.saves).toHaveLength(1); expect(transport.errors).toEqual([]);
  await page.reload(); await expect(page.getByText("A device copy is available", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore device copy", exact: true }).click();
  await expect(question(page).getByRole("textbox")).toHaveValue("Newer typing while the request is in flight.");
});

test("mocked transport: revision conflict preserves text and stops automatic retries", async ({ page }) => {
  const transport = await mockedTransport(page, { conflict: true });
  await page.goto(base + "/teacher/tasks/mock-authored-task");
  const textarea = question(page).getByRole("textbox"); await textarea.fill("Keep this unsaved work after a revision conflict.");
  await expect(page.getByText("This task changed in another tab", { exact: true })).toBeVisible();
  await expect(textarea).toHaveValue("Keep this unsaved work after a revision conflict.");
  const writes = transport.writes.length; await page.waitForTimeout(2300); expect(transport.writes).toHaveLength(writes);
  await expect(page.getByRole("button", { name: "Download my draft", exact: true })).toBeVisible(); expect(transport.errors).toEqual([]);
});

test("mocked transport: My tasks uses returned versions, filters and the existing task set", async ({ page }) => {
  const transport = await mockedTransport(page);
  await page.goto(base + "/teacher/tasks");
  await expect(page.getByRole("heading", { name: "My tasks", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "An independently authored task", exact: true })).toBeVisible();
  await expect(page.locator(".ae-task-row")).toContainText("Private version 1");
  await expect(page.locator(".ae-task-row")).toContainText("Newer private changes");
  await page.getByRole("searchbox", { name: "Find a task", exact: true }).fill("No title matches");
  await expect(page.getByText("No tasks match your filters. Try another title or review status.", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a task", exact: true }).fill("");
  await page.getByRole("button", { name: "Add to task set", exact: true }).click();
  await expect(page.locator(".ae-task-set-strip")).toContainText("1 task selected");
  await expect(page.getByRole("link", { name: "Create homework / test →", exact: true })).toHaveAttribute("href", "/teacher/works/new");
  await page.getByRole("button", { name: "Preview saved task", exact: true }).click();
  await expect(page.locator(".ae-task-saved-preview")).toContainText("Find the area.");
  await page.getByRole("link", { name: "Open editor", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit your task", exact: true })).toBeVisible();
  expect(transport.writes).toEqual([]); expect(transport.errors).toEqual([]);
});

test("mocked transport: USER lens only renders saved content and performs no authoring writes", async ({ page }) => {
  const transport = await mockedTransport(page, { lens: "USER" });
  await page.goto(base + "/teacher/tasks/mock-authored-task");
  await expect(page.getByRole("heading", { name: "Personal task preview", exact: true })).toBeVisible();
  await expect(page.locator(".ae-readonly .math-content").first()).toContainText("Find the area.");
  expect(await page.locator("textarea, math-field").count()).toBe(0);
  expect(transport.writes).toEqual([]); expect(transport.previews).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("arena:personal-task:")))).toBe(false);
  expect(transport.errors).toEqual([]);
});
