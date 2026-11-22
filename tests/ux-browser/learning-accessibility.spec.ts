import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test("lesson Review and support controls resolve at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));

    await page.goto("/courses/maths4u-0862-stage-9/topics/lower-0862-s9-compare-and-question#review");
    await expect(page.locator("#review")).toHaveCount(1);
    await expect(page.locator("#review").getByRole("heading", { name: "Come back to what needs practice" })).toBeVisible();
    await expect(page.locator("#plan-next-investigation").getByRole("heading", { name: "Use results to plan the next investigation" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("[id]"), node => node.id);
      return ids.length === new Set(ids).size;
    })).toBe(true);

    await page.goto("/courses/maths4u-0606/topics/addmaths-0606-int-area-axis?item=0606-int-area-axis-W001-0#practice");
    const support = page.locator("#practice .question-support");
    const paper = support.getByRole("button", { name: "I’ve finished on paper", exact: true });
    await expect(paper).toBeEnabled();
    const panels = [];
    for (const name of ["Hint", "Worked solution", "Marking guidance"]) {
      const button = support.getByRole("button", { name, exact: true });
      const target = await button.getAttribute("aria-controls");
      expect(target).toBeTruthy();
      const panel = page.locator("[id=" + JSON.stringify(target) + "]");
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeHidden();
      await expect(panel).toBeEmpty();
      panels.push({ button, panel });
    }

    await paper.click();
    for (const { button, panel } of panels) {
      await expect(button).toBeEnabled();
      await button.focus();
      await button.press("Enter");
      await expect(panel).toBeVisible();
      await expect(panel.locator(".math-content").first()).not.toBeEmpty();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(button).toBeFocused();
      await button.press("Enter");
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeHidden();
      await expect(panel).toBeEmpty();
    }
    expect(await page.locator(".katex-error").count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}
