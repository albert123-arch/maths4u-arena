import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test("student saves reasoning and attachments, reveals help, self-checks and resumes topic on mobile", async ({ page }) => {
  const f = JSON.parse(await fs.readFile(".local/content-pilot-correction/preview.json","utf8")), study = JSON.parse(await fs.readFile(".local/content-pilot-correction/study-preview.json","utf8"));
  const errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/login"); await page.locator('input[name="username"]').fill(f.student); await page.locator('input[name="password"]').fill(f.password); await page.locator('form button[type="submit"]').click();
  await expect(page.locator('input[name="username"]')).toHaveCount(0);
  await page.getByRole("button",{name:"RU",exact:true}).click();
  const topicUrl = `/courses/${study.courseSlug}/topics/${study.lessonId}`;
  await page.goto(topicUrl); await expect(page.locator(".catalog-task")).toHaveCount(20);
  const task = page.locator(".catalog-task").nth(3); await task.locator("summary").click(); await task.getByRole("button",{name:/^(Решать|Продолжить)$/}).click();
  await expect(page.locator(".study-actions")).toBeVisible();
  const attemptUrl = page.url();
  await page.locator("textarea").first().fill("Моё решение: НОД и тождество Безу.");
  const attachments = page.locator(".answer-attachments").first();
  async function upload(file:string, expected:number) {
    await attachments.locator('input[type="file"]').setInputFiles(`.local/content-pilot-correction/fixtures/${file}`);
    await expect(attachments.getByRole("heading",{name:"Перед отправкой",exact:true})).toBeVisible();
    const response=page.waitForResponse(r=>r.url().endsWith("/api/files")&&r.request().method()==="POST");
    await attachments.getByRole("button",{name:"Отправить файл",exact:true}).click(); expect((await response).status()).toBe(201);
    await expect(attachments.locator(".upload-limits strong")).toHaveText(`${expected} / 5`);
  }
  await upload("scan.png",1); await upload("scan.png",2); await upload("two-pages.pdf",3);
  await attachments.getByRole("button",{name:"Заменить",exact:true}).first().click(); await upload("scan.png",3);
  await attachments.getByRole("button",{name:"Удалить",exact:true}).nth(1).click(); await expect(attachments.locator(".upload-limits strong")).toHaveText("2 / 5");
  await upload("scan.png",3);
  await page.reload(); await expect(page.locator("textarea").first()).toHaveValue("Моё решение: НОД и тождество Безу.");
  await expect(attachments.locator(".upload-limits strong")).toHaveText("3 / 5");
  await page.getByRole("button",{name:"Подсказка",exact:true}).click();
  await expect(page.locator(".study-actions").getByText("Использование помощи отмечено в истории.",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:"EN",exact:true}).click(); await expect(page.locator("textarea").first()).toHaveValue("Моё решение: НОД и тождество Безу.");
  await page.screenshot({path:".local/content-pilot-correction/study-desktop.png",fullPage:true});
  await page.getByRole("button",{name:"Submit work",exact:true}).click(); await expect(page.getByRole("button",{name:"Self-check complete",exact:true})).toBeVisible();
  await expect(page.locator(".metric")).toContainText("Ungraded"); await expect(attachments.locator('input[type="file"]')).toHaveCount(0);
  await page.getByRole("button",{name:"Detailed solution",exact:true}).click(); await page.getByRole("button",{name:"Self-check complete",exact:true}).click();
  await expect(page.locator(".study-actions .study-status")).toContainText("Self-checked");
  await page.setViewportSize({width:390,height:844}); await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:".local/content-pilot-correction/study-mobile.png",fullPage:true});
  await page.getByRole("button",{name:"Topic & history",exact:true}).click(); await expect(page).toHaveURL(new RegExp(topicUrl+"$"));
  await expect(page.locator(".catalog-task").nth(3).locator(".study-status")).toContainText("Self-checked");
  await page.locator(".study-history summary").click(); await expect(page.locator(`.study-history a[href="${new URL(attemptUrl).pathname}"]`)).toBeVisible();
  await page.goto(attemptUrl); await page.getByRole("button",{name:"Next task →",exact:true}).click(); await expect(page).not.toHaveURL(attemptUrl);
  const continuingUrl=page.url(); await page.locator("textarea").first().fill("Saved immediately before returning to the topic");
  await page.getByRole("button",{name:"Topic & history",exact:true}).click(); await expect(page.locator(".study-panel").getByRole("link",{name:"Continue →",exact:true})).toBeVisible();
  await page.goto(continuingUrl); await expect(page.locator("textarea").first()).toHaveValue("Saved immediately before returning to the topic");
  expect(errors).toEqual([]);
});
