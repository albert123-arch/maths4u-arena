import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function fixture() { return JSON.parse(await readFile(".local/learning-preview/fixture.json", "utf8")) as { classId: string; lessonId: string; taskIds: string[]; courseSlug: string }; }
async function login(page: Page, role: "student" | "teacher" | "admin") {
  const sessions = JSON.parse(await readFile(".local/learning-preview/test-sessions.json", "utf8"));
  await page.context().addCookies([{ name: "maths4u_session", value: sessions[role], url: "http://127.0.0.1:3108", httpOnly: true, sameSite: "Lax" }]);
  const response = await page.request.get("/api/auth/me"); expect(response.status()).toBe(200);
  expect((await response.json()).user.username).toBe("preview_" + role);
}

test("course-first English guest navigation keeps role dashboards private", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mathematics courses", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /dashboard/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Practice preview: MC & Short Answer →", exact: true }).click();
  await expect(page.getByRole("button", { name: "Algebra 10", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Notes & examples", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await page.getByRole("button", { name: "Multiple Choice 4", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in to practise", exact: true })).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Check answer", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("inline MC and short answers save real attempts, grade and filter by latest progress", async ({ page }) => {
  const d = await fixture(); await login(page, "student");
  await page.goto(`/courses/${d.courseSlug}/topics/${d.lessonId}?mode=MC`);
  const question = page.locator(`#question-${d.taskIds[2]}`);
  await question.getByRole("radio", { name: "5", exact: true }).check();
  await question.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(question.locator(".quick-result")).toContainText("Correct · 1 / 1");
  await expect(question.locator(".quick-result")).toBeVisible();
  await page.getByRole("heading", { name: "Linear and quadratic equations", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.resolve(`.local/learning-preview/practice-${test.info().project.name}.png`) });
  await question.getByRole("button", { name: "Show solution", exact: true }).click();
  await expect(question.locator(".quick-result")).toContainText("The answer is 5.");
  await question.getByRole("button", { name: "Try again", exact: true }).click();
  await question.getByRole("radio", { name: "4", exact: true }).check();
  await question.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(question.locator(".quick-result")).toContainText("Have another go · 0 / 1");
  await page.getByRole("button", { name: "Solved", exact: true }).click();
  await expect(question).toHaveCount(0);
  await page.getByRole("button", { name: "Short Answer 5", exact: true }).click();
  // Each answer type remembers its own filters. MC Solved must not hide new short answers.
  await expect(page.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  const short = page.locator(`#question-${d.taskIds[6]}`);
  await short.getByLabel("Short answer", { exact: true }).fill("6");
  await short.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(short.locator(".quick-result")).toContainText("Correct · 1 / 1");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My progress", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attempts & answers", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "My answer & result →", exact: true }).first()).toBeVisible();
  await page.screenshot({ path: path.resolve(`.local/learning-preview/progress-${test.info().project.name}.png`), fullPage: true });
});

test("the five imported courses keep their written practice, images and teacher selection", async ({ page }) => {
  await login(page, "student");
  type Course = { slug: string; title: string; chapters: { topics: { id: string; title: string; count: number }[] }[] };
  const response = await page.request.get("/api/catalog/courses?lang=en"); expect(response.status()).toBe(200);
  const courses = (await response.json() as Course[]).filter(c => c.slug.startsWith("maths4u-")); expect(courses).toHaveLength(5);
  const samples = JSON.parse(await readFile(".local/content-bank/browser-fixture.json", "utf8")) as { slug: string; lessonId: string; title: string }[];
  let imagesChecked = 0;
  for (const course of courses) {
    const sample = samples.find(s => s.slug === course.slug)!;
    const topic = course.chapters.flatMap(ch => ch.topics).find(t => t.id === sample.lessonId)!;
    await page.goto(`/courses/${course.slug}/topics/${topic.id}?mode=WRITTEN&q=${encodeURIComponent(sample.title)}`);
    await expect(page.getByRole("heading", { name: topic.title, exact: true })).toBeVisible();
    await expect(page.locator(".catalog-task")).toHaveCount(1);
    const images = page.locator(".catalog-task img");
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true); imagesChecked++;
    }
    await expect(page.locator(".katex-error")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Solution, MS & self-check", exact: true }).first()).toBeVisible();
  }
  expect(imagesChecked).toBeGreaterThanOrEqual(2);
  await login(page, "teacher");
  const d = await fixture(); await page.goto(`/courses/${d.courseSlug}/topics/${d.lessonId}?mode=MC`);
  const question = page.locator(`#question-${d.taskIds[3]}`);
  const select = question.getByRole("checkbox", { name: "Select: MC 4: Solve a linear equation", exact: true });
  await select.check(); await expect(select).toBeChecked(); await page.reload(); await expect(select).toBeChecked();
  await select.uncheck(); await expect(select).not.toBeChecked();
});

test("teacher sees class overview and submitted independent answers; admin stays admin-only", async ({ page }) => {
  await login(page, "teacher"); await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: "Teacher dashboard", exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Student dashboard", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Year 10 · Preview class", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Year 10 · Preview class · Progress", exact: true })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Alex Chen" });
  await expect(row.getByRole("link", { name: "Topics & answers →", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Show", exact: true }).selectOption("NOT_STARTED");
  await expect(page.getByRole("row").filter({ hasText: "Sam Wilson" })).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole("combobox", { name: "Show", exact: true }).selectOption("ALL");
  await page.screenshot({ path: path.resolve(`.local/learning-preview/class-${test.info().project.name}.png`), fullPage: true });
  await row.getByRole("link", { name: "Topics & answers →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alex Chen", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Answers & review →", exact: true }).first().click();
  await expect(page).toHaveURL(/\/students\/[^/]+\/attempts\//);
  await expect(page.getByRole("heading", { name: "Student answer", exact: true })).toBeVisible();
  await page.goto("/admin"); await expect(page.getByText("This section is not available to your account.", { exact: true })).toBeVisible();
  await login(page, "admin"); await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Admin", exact: true })).toBeVisible();
});


test("bookmarks, personal home courses and paper self-assessment persist on mobile", async ({ page }) => {
  const d = await fixture(); await login(page, "student");
  const courses = await (await page.request.get("/api/catalog/courses?lang=en")).json();
  const course = courses.find((c: { slug: string }) => c.slug === d.courseSlug);
  const post = (url: string, data: unknown) => page.request.post("/api/" + url, { headers: { origin: "http://127.0.0.1:3108" }, data });
  for (const c of courses) expect((await post("learning/courses/" + c.id, { selected: false })).status()).toBe(200);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My courses", exact: true })).toBeVisible();
  await expect(page.locator(".compact-course")).toHaveCount(0);
  await page.getByRole("link", { name: "Choose courses", exact: true }).click();
  const card = page.locator(".compact-course").filter({ has: page.getByRole("link", { name: "Practice preview: MC & Short Answer →", exact: true }) });
  await card.getByRole("button", { name: "Add to my courses", exact: true }).click();
  await expect(card.getByRole("button", { name: "Remove from my courses", exact: true })).toBeVisible();
  await page.goto("/"); await expect(page.locator(".compact-course")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Practice preview: MC & Short Answer →", exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator(".compact-course")).toHaveCount(1);
  await post("learning/bookmarks/" + d.taskIds[9], { selected: false });
  await page.goto(`/courses/${d.courseSlug}/topics/${d.lessonId}?mode=WRITTEN`);
  const question = page.locator(`#question-${d.taskIds[9]}`);
  await question.getByRole("button", { name: "☆ Bookmark", exact: true }).click();
  await expect(question.getByRole("button", { name: "★ Remove bookmark", exact: true })).toBeVisible();
  await page.goto("/bookmarks?q=" + encodeURIComponent("Written 1: Explain both roots"));
  await expect(page.locator(`#question-${d.taskIds[9]}`)).toHaveCount(1);
  await page.locator(`#question-${d.taskIds[9]}`).locator("summary").click();
  await page.getByRole("button", { name: "Solution, MS & self-check", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit work", exact: true })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^Detailed solution(?: ✓)?$/ }).click();
  await expect(page.getByRole("heading", { name: "Solution", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^MS \/ criteria(?: ✓)?$/ }).click();
  await expect(page.getByRole("heading", { name: "MS", exact: true })).toBeVisible();
  await page.getByRole("spinbutton", { name: "My points", exact: true }).fill("2");
  await page.getByRole("button", { name: "Save self-awarded points", exact: true }).click();
  await expect(page.getByText(/You marked:.*Self-assessed/)).toContainText("2 /");
  await page.reload(); await expect(page.getByRole("spinbutton", { name: "My points", exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Solved", exact: true }).click();
  await expect(page.getByText(/You marked: solved/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: path.resolve(`.local/learning-preview/self-study-${test.info().project.name}.png`), fullPage: true });
  await page.goto("/bookmarks?q=" + encodeURIComponent("Written 1: Explain both roots"));
  await page.locator(`#question-${d.taskIds[9]}`).getByRole("button", { name: "★ Remove bookmark", exact: true }).click();
  await expect(page.locator(`#question-${d.taskIds[9]}`)).toHaveCount(0);
  await page.goto("/"); await page.locator(".compact-course").getByRole("button", { name: "Remove from my courses", exact: true }).click();
  await expect(page.locator(".compact-course")).toHaveCount(0);
  expect(course).toBeTruthy();
});
