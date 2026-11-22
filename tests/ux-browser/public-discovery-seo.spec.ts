import { expect, test } from "@playwright/test";

const lesson = "/courses/maths4u-9709-p1/topics/orig_quadratics_completing_square";
const legacyId = "pilot_f2da4f4d6de9a3f01df74fffaacdbcf3792b3e29";
const legacyTopic = `/courses/olymp-number-theory2/topics/${legacyId}`;
const canonicalOrigin = "https://arena.maths4u.sbs";

test("public route aliases preserve query state and unsupported paths respond with 404", async ({ request }) => {
  const query = "?mode=MC&tag=a&tag=b";
  const wrongCourse = await request.get(`/courses/maths4u-9709-p1/topics/${legacyId}${query}`, { maxRedirects: 0 });
  expect(wrongCourse.status()).toBe(308);
  expect(wrongCourse.headers().location).toBe(legacyTopic + query);
  expect((await request.get(legacyTopic)).status()).toBe(200);
  for (const path of [legacyTopic + "/unknown", "/library/unknown", "/for-teachers/unknown", "/courses/unknown"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

for (const width of [390, 1280]) {
  test(`course code search and lesson sharing metadata at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const search = page.locator("#discovery-q");
    const query = width === 390 ? "normal distribution" : "9709";
    expect((await page.goto("/search?q=" + encodeURIComponent(query), { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
    await expect(search).toHaveValue(query);
    const results = page.locator(".discovery-results li a");
    if (width === 390) {
      await expect(results.first()).toContainText(/normal distribution/i);
    } else {
      for (const [index, paper] of ["p1", "p3", "m1", "s1"].entries()) {
        await expect(results.nth(index)).toHaveAttribute("href", `/courses/maths4u-9709-${paper}`);
        await expect(results.nth(index).locator("small")).toHaveCount(0);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);

    expect((await page.goto(lesson + "?view=revision", { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalOrigin + lesson);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", canonicalOrigin + "/share/maths4u-arena.png");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    expect((await request.get("/share/maths4u-arena.png")).headers()["content-type"]).toContain("image/png");
  });
}
