import { expect, test } from "@playwright/test";

const course = "/courses/maths4u-9709-p1";
const chapter = course + "/chapters/functions";
const lesson = course + "/topics/orig_functions_inverse";
const following = course + "/topics/orig_functions_composite";

for (const width of [390, 1280]) {
  test("find a lesson, recover a mistake and continue at " + width + "px", async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.print = () => { document.body.dataset.printRequested = "true"; };
    });

    await page.goto("/");
    for (const path of ["/learn/a-level", course, chapter, lesson]) {
      if (path === chapter && width === 390) await page.locator("details.chapter-mobile summary:visible").first().click();
      await page.locator('main a[href="' + path + '"]:visible').first().click();
      await expect(page).toHaveURL(new RegExp(path + "$"), { timeout: 90000 });
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Functions, domain, range and inverses");
    const check = page.locator('[data-study-check="root-and-denominator-domain"]');
    await check.getByRole("textbox").fill("[-5,2]");
    await check.getByRole("button", { name: "Check", exact: true }).click();
    await expect(check.locator('[data-status="retry"]')).toContainText("denominator is zero");
    const review = page.locator("#review");
    const retry = review.locator('a[href="#study-check-root-and-denominator-domain"]');
    await retry.click();
    await expect(page).toHaveURL(/#study-check-root-and-denominator-domain$/);
    await check.getByRole("textbox").fill("−5 ≤ x ≤ 2 and x ≠ −3");
    await check.getByRole("button", { name: "Check", exact: true }).click();
    await expect(check.locator('[data-status="correct"]')).toBeVisible();
    await expect(retry).toHaveCount(0);
    await expect(page.locator(".katex-error")).toHaveCount(0);

    await review.getByRole("link", { name: "Quick revision sheet (A4)" }).click();
    await expect(page).toHaveURL(/\?view=revision$/);
    await page.getByRole("button", { name: "Print / Save as PDF" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-print-requested", "true");
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("link", { name: "Back to the lesson" }).click();
    await expect(page).toHaveURL(/#review$/);
    await page.getByRole("navigation", { name: "Continue this chapter" }).getByRole("link", { name: /^Next lesson/ }).click();
    await expect(page).toHaveURL(new RegExp(following + "$"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Composite functions and their domains");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}
