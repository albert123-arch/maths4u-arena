// Mocked API transport; real React components, compiled CSS and browser layout.
// This regression simulates cosmetic ad filters, not authentication or database QA.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { overviewActivity, overviewCourseContent, overviewStorageCapacity, overviewWindow, type AdminOverviewDto } from "../../src/lib/admin-overview-model";
import type { TaskReportDetailDto, TaskReportListDto } from "../../src/lib/task-report-model";

const base = process.env.ARENA_UX_BASE_URL ?? "http://127.0.0.1:3110";
if (!/^http:\/\/127\.0\.0\.1:(?:3109|3110)$/.test(base)) throw Error("LOCAL_MOCKED_ADMIN_COSMETIC_FILTER_QA_ONLY");
const out = "test-results/admin-cosmetic-filter-20261107";
const now = "2026-11-07T12:00:00.000Z";
const actor = { id: "mock-admin", username: "mock_admin", displayName: "Local Administrator", status: "ACTIVE", roles: [{ role: "ADMIN" }], profile: { locale: "en" }, teacherAccount: null };
const window = overviewWindow(Date.parse(now), "UTC");
const content = overviewCourseContent([{ id: "mock-course", slug: "mock-course", title: "Mocked Further Pure 1", published: true, archived: false, free: true, chapters: [{ id: "mock-chapter", taskIds: ["mock-task"] }] }], []);
const overview: AdminOverviewDto = {
  generatedAt: now, timeZone: "UTC", window,
  health: { database: { status: "ok", latencyMs: 12, checkedAt: now }, build: { status: "available", sha: "mocked-local-layout-fixture" }, backup: null, monitoring: null, errors24h: null, siteSpeed: null, google: null },
  storage: { ...overviewStorageCapacity(null, false), originalBytes: 0, derivativeBytes: 0, recordedBytes: 0 },
  summary: { publicQuestions: 1, totalTaskVersions: 1, publishedCourses: 1, activeLearners7d: 0, newRegistrations7d: 0, activeSubscriptions: 0, revenue: null, guestVisitors: null },
  content: { ...content, publicQuestions: 1, privateQuestions: 0, cambridgeArchive: 0, unknownQuestions: 0, demoArchive: 0, totalTasks: 1, totalTaskVersions: 1, presentations: 0 },
  users: { total: 1, active: 1, students: 0, teachers: 0, administrators: 1, blocked: 0, archived: 0, activeSubscriptions: 0, subscribers: 0, expiringSubscriptions7d: 0, classes: 0 },
  activity: overviewActivity(window, [], []),
  decisions: [{ id: "task-reports", label: "Mocked question report", count: 1, href: "/admin/task-reports", status: "available" }],
  audit: [], limitations: ["Mocked API data for local browser layout testing only."],
};
const report: TaskReportDetailDto = {
  id: "mock-report", taskId: "mock-task", taskVersionId: "mock-version", versionNumber: 1,
  taskTitle: "Mocked saved question", sourceUid: null, category: "FORMATTING", message: "Mocked report: inspect this saved diagram.", status: "OPEN", revision: 0, resolution: "",
  createdAt: now, updatedAt: now, reviewedAt: null, reporter: { id: "mock-student", username: "mock_student", displayName: "Local Student" }, reviewer: null,
  context: { statementHtml: "<p>Mocked saved question statement.</p>", parts: [], answerHtml: "<p>Mocked saved answer.</p>", solutionHtml: "<p>Mocked saved solution.</p>", assets: [{ id: "mock-diagram", caption: "Mocked question diagram", mimeType: "image/svg+xml", role: "STATEMENT", partPosition: null }] },
};
const reports: TaskReportListDto = { items: [report], total: 1, page: 1, pages: 1, pageSize: 25, counts: { OPEN: 1, IN_REVIEW: 0, RESOLVED: 0, DISMISSED: 0 } };

async function mockedTransport(page: Page) {
  const unexpected: string[] = [], errors: string[] = [], stylesheets: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.request().resourceType() === "stylesheet" && response.ok()) stylesheets.push(response.url()); });
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== "GET") { unexpected.push(request.method() + " " + path); return route.fulfill({ status: 403, json: { error: "MOCKED_READ_ONLY_TEST" } }); }
    if (path === "/api/auth/me") return route.fulfill({ json: { user: actor, lens: null } });
    if (path === "/api/basket") return route.fulfill({ json: { revision: 0, taskIds: [], items: [] } });
    if (path === "/api/admin/overview") return route.fulfill({ json: overview });
    if (path === "/api/admin/users") return route.fulfill({ json: [actor] });
    if (path === "/api/admin/task-reports") return route.fulfill({ json: reports });
    if (path === "/api/admin/task-reports/mock-report") return route.fulfill({ json: report });
    if (path === "/api/admin/teacher-submissions") return route.fulfill({ json: { items: [], total: 0, page: 1, pages: 1, pageSize: 25, counts: { SUBMITTED: 0, CHANGES_REQUESTED: 0, REJECTED: 0, APPROVED: 0, WITHDRAWN: 0 } } });
    if (path === "/api/files/mock-diagram") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120"><path d="M20 100H220M20 100V20M20 100L200 30" stroke="#2457d6" fill="none"/></svg>' });
    unexpected.push(request.method() + " " + path);
    return route.fulfill({ status: 404, json: { error: "UNEXPECTED_MOCKED_API_REQUEST" } });
  });
  // Install before hydration, just as an extension's cosmetic stylesheet can be.
  await page.addInitScript(() => {
    function installFilter() {
      const filter = document.createElement("style");
      filter.id = "mocked-cosmetic-filter";
      filter.textContent = '.ad-main,.ad-sidebar,.ad-content,.ad-layout,.ad-card,[class^="ad-"],[class*=" ad-"]{display:none!important}';
      document.documentElement.append(filter);
      const sentinel = document.createElement("div");
      sentinel.id = "cosmetic-filter-positive-control";
      sentinel.className = "ad-main";
      sentinel.textContent = "This old advertising-like class must be hidden.";
      document.body.append(sentinel);
    }
    document.addEventListener("DOMContentLoaded", installFilter, { once: true });
  });
  return { unexpected, errors, stylesheets };
}

async function assertWorkspaceLayout(page: Page, width: number, theme: "light" | "dark") {
  await expect(page.locator("#cosmetic-filter-positive-control")).toHaveCSS("display", "none");
  const layout = page.locator(".arena-admin-layout"), main = page.locator(".arena-admin-main");
  await expect(layout).toHaveCSS("display", width === 1280 ? "grid" : "block");
  await expect(main).toBeVisible();
  expect((await main.boundingBox())!.width).toBeGreaterThan(width === 390 ? 300 : 750);
  expect((await main.boundingBox())!.height).toBeGreaterThan(150);
  if (width === 1280) {
    await expect(page.locator(".arena-admin-sidebar")).toBeVisible();
    expect((await page.locator(".arena-admin-sidebar").boundingBox())!.width).toBe(220);
    await expect(page.getByRole("combobox", { name: "Admin section", exact: true })).toBeHidden();
  } else {
    await expect(page.locator(".arena-admin-sidebar")).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Admin section", exact: true })).toBeVisible();
  }
  const css = await page.evaluate(() => {
    const rules = Array.from(document.styleSheets).filter(sheet => sheet.href && new URL(sheet.href).origin === location.origin).flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join("\n");
    const workspace = document.querySelector(".admin-workspace")!;
    return { compiledNamespace: rules.includes(".arena-admin-layout"), legacyNamespace: rules.includes(".ad-layout"), legacyClasses: Array.from(workspace.querySelectorAll("[class],[id]")).flatMap(element => [...element.classList, element.id]).filter(value => /^ad-/.test(value)), colorScheme: getComputedStyle(document.documentElement).colorScheme, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(css.compiledNamespace).toBe(true);
  expect(css.legacyNamespace).toBe(false);
  expect(css.legacyClasses).toEqual([]);
  expect(css.colorScheme).toBe(theme);
  expect(css.scrollWidth).toBeLessThanOrEqual(width + 1);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

for (const theme of ["light", "dark"] as const) for (const width of [1280, 390]) {
  test(`mocked API: admin survives advertising cosmetic selectors at ${width}px in ${theme}`, async ({ page }) => {
    await fs.mkdir(out, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    const transport = await mockedTransport(page);
    const sections = [
      ["/admin", "Platform administration"], ["/admin/decisions", "Needs your decision"],
      ["/admin/users", "Users & roles"], ["/admin/task-reports", "Question reports"],
      ["/admin/teacher-submissions", "Teacher submissions"], ["/admin/materials", "Content tools"],
    ];
    for (const [path, title] of sections) {
      await page.goto(base + path);
      await expect(page.getByRole("heading", { name: title, exact: true, level: 1 })).toBeVisible();
      await assertWorkspaceLayout(page, width, theme);
      if (path === "/admin") {
        for (const heading of ["Platform status", "Content", "Users & access", "Audit log"]) await expect(page.locator(".arena-admin-main").getByRole("heading", { name: heading, exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Mocked Further Pure 1", exact: true })).toBeVisible();
        await page.screenshot({ path: `${out}/overview-${width}-${theme}.png`, fullPage: true });
      }
      if (path === "/admin/users") {
        await expect(page.getByRole("textbox", { name: "Search by name or login", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Local Administrator", exact: true })).toBeVisible();
      }
      if (path === "/admin/teacher-submissions") {
        await expect(page.getByRole("searchbox", { name: "Search submissions", exact: true })).toBeVisible();
        await expect(page.locator(".tsq-result-count")).toHaveText("0 submissions");
      }
      if (path === "/admin/task-reports") {
        await expect(page.getByRole("searchbox", { name: "Search reports", exact: true })).toBeVisible();
        const open = page.getByRole("button", { name: "Open report for Mocked saved question", exact: true });
        await open.click();
        const dialog = page.getByRole("dialog", { name: "Mocked saved question", exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveCSS("display", "block");
        await expect(dialog.getByRole("textbox", { name: "Resolution note", exact: true })).toBeVisible();
        const diagram = dialog.getByRole("img", { name: "Mocked question diagram", exact: true });
        await expect(diagram).toBeVisible();
        expect(await diagram.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        await page.screenshot({ path: `${out}/report-${width}-${theme}.png`, fullPage: true });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(open).toBeFocused();
      }
    }
    expect(transport.stylesheets.length).toBeGreaterThan(0);
    expect(transport.unexpected).toEqual([]);
    expect(transport.errors).toEqual([]);
  });
}
