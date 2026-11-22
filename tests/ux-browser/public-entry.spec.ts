import { expect, test } from "@playwright/test";

const lesson = "/courses/maths4u-0580/topics/igcse-0580-graphs-functions-straight-lines";

for (const width of [375, 1280]) {
  test(`return to a lesson and find help at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Continue learning" })).toHaveCount(0);
    await page.locator(`main a[href="${lesson}"]`).click();
    await expect(page).toHaveURL(new RegExp(lesson + "$"));
    await page.waitForFunction(path => {
      const stored = localStorage.getItem("maths4u.guest-course.v1");
      return stored !== null && JSON.parse(stored).lessonHref === path;
    }, lesson);
    await page.goto("/");
    const resume = page.getByRole("region", { name: "Continue learning" });
    const continueLink = resume.getByRole("link", { name: "Continue", exact: true });
    await expect(resume).toContainText(/straight.line/i);
    await expect(resume.getByRole("link")).toHaveCount(1);
    await expect(continueLink).toHaveAttribute("href", lesson);
    await expect(continueLink).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await continueLink.click();
    await expect(page).toHaveURL(new RegExp(lesson + "$"));

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("navigation", { name: "Learning levels" }).getByRole("link")).toHaveCount(6);
    await expect(footer.getByRole("link", { name: "About Arena" })).toHaveAttribute("href", "/about");
    await footer.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page).toHaveURL(/\/about#privacy$/);
    await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
    await expect(page.locator("#contact a[href^='mailto:']")).toHaveText("support@maths4u.sbs");
    await expect(page.locator("#privacy a[href='/statistics.html']")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test("sign-in does not enforce the signup-only username hint", async ({ page }) => {
  await page.goto("/login?next=" + encodeURIComponent(lesson));
  const login = page.getByRole("textbox", { name: "Login", exact: true });
  await expect(login).toBeVisible();
  await expect(login).not.toHaveAttribute("pattern");
  await expect(page.locator("#signup-username-help")).toHaveCount(0);
  const register = page.getByRole("link", { name: "Create an account", exact: true });
  await expect(register).toHaveAttribute("href", "/register?next=" + encodeURIComponent(lesson));
  await register.click();
  await expect(page.getByRole("heading", { name: "Welcome to Maths4U" })).toBeVisible();
  await page.getByRole("button", { name: "Choose courses later" }).click();
  const username = page.getByRole("textbox", { name: "Login", exact: true });
  await expect(username).toHaveAttribute("aria-describedby", "signup-username-help");
  await expect(page.locator("#signup-username-help")).toBeVisible();
  for (const [value, valid] of [["ab", false], ["maths-1.abc_def", true]] as const) {
    await username.fill(value);
    expect(await username.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(valid);
  }
});
