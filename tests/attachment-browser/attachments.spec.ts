import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { createServer, type Server } from "node:http";

const receivers: Server[] = [];
test.afterEach(async () => {
  for (const server of receivers.splice(0)) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

async function fixture(page: Page, mode: "open" | "disabled" | "submitted" | "full" = "open") {
  const png = await sharp({ create: { width: 600, height: 800, channels: 3, background: "white" } }).png().toBuffer();
  const files: { id: string; originalName: string; mimeType: string }[] = mode === "full"
    ? Array.from({ length: 5 }, (_, i) => ({ id: "existing-" + i, originalName: `answer-${i}.png`, mimeType: "image/png" })) : [];
  const uploads: File[] = [];
  const attempt = { id: "mobile-fixture", title: "Phone attachment test", number: 1, revision: 0,
    workId: "fixture-work", userId: "fixture-student", kind: "HOMEWORK", status: mode === "submitted" ? "SUBMITTED" : "IN_PROGRESS",
    allowFiles: mode !== "disabled", serverTime: new Date(), expiresAt: new Date(Date.now() + 3600000),
    resultVisible: false, sourcesHidden: true, study: null, questions: [{ id: "question", title: "Problem 1", statement: "<p>Solve 2x = 6.</p>", assets: [],
      parts: [{ id: "part", kind: "MANUAL", maxPoints: 2, prompt: "<p>Attach a photo of your working.</p>", options: [] }] }],
    answers: [{ id: "answer", partId: "part", response: { value: "" }, files }],
  };
  // Inspect real HTTP bytes: WebKit's interception payload omits file contents.
  const receiveErrors: unknown[] = [];
  const receiver = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3107");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
    try {
      const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const form = await new Request("http://127.0.0.1/upload", { method: "POST", headers: { "Content-Type": request.headers["content-type"]! }, body: new Uint8Array(Buffer.concat(chunks)) }).formData();
      expect(form.get("attemptId")).toBe("mobile-fixture"); expect(form.get("partId")).toBe("part");
      const file = form.get("file"); expect(file).toBeInstanceOf(File); uploads.push(file as File);
      expect(Buffer.from(await (file as File).arrayBuffer()).length).toBeGreaterThan(0);
      const replace = form.get("replaceId");
      if (replace) { const index = files.findIndex(f => f.id === replace); expect(index).toBeGreaterThanOrEqual(0); files.splice(index, 1); }
      const saved = { id: "uploaded-" + uploads.length, originalName: (file as File).name, mimeType: (file as File).type };
      files.push(saved); attempt.revision++; response.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify(saved));
    } catch (error) { receiveErrors.push(error); response.writeHead(400).end(); }
  });
  await new Promise<void>(resolve => receiver.listen(0, "127.0.0.1", resolve)); receivers.push(receiver);
  const address = receiver.address(); if (!address || typeof address === "string") throw Error("TEST_RECEIVER_ADDRESS");
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { id: "fixture-student", displayName: "Test student", roles: [{ role: "STUDENT" }], profile: { locale: "en" } } } });
    if (path === "/api/attempts/mobile-fixture") return route.fulfill({ json: attempt });
    if (path === "/api/files") return route.continue({ url: `http://127.0.0.1:${address.port}/upload` });
    if (path.startsWith("/api/files/")) return route.fulfill({ contentType: "image/png", body: png });
    return route.fulfill({ status: 500, json: { error: "UNEXPECTED_FIXTURE_REQUEST" } });
  });
  await page.goto("/attempts/mobile-fixture");
  await expect(page.getByRole("heading", { name: "Solution photos or PDF" })).toBeVisible();
  return { png, uploads, receiveErrors };
}

test("photo picker, camera and PDF upload are reachable by touch and retain multipart fields", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const { png, uploads, receiveErrors } = await fixture(page);
  const attach = page.getByLabel("Attach photo / PDF", { exact: true });
  const camera = page.getByLabel("Take a photo", { exact: true });
  await expect(attach).toBeEnabled(); await expect(camera).toHaveAttribute("capture", "environment");
  await expect(attach).toHaveAttribute("accept", /image\/jpeg.*application\/pdf/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (isMobile) {
    await attach.evaluate(el => el.scrollIntoView({ block: "start" }));
    expect(await attach.evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; })).toBe(true);
  }
  const photo = { name: "phone.jpg", mimeType: "image/jpeg", buffer: await sharp(png).jpeg().toBuffer() };
  const pdf = { name: "working.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") };
  for (const [i, [label, file]] of [["Attach photo / PDF", photo], ["Take a photo", photo], ["Attach photo / PDF", pdf]].entries()) {
    const control = page.locator(".attachment-picker").filter({ hasText: label as string });
    const chooserPromise = page.waitForEvent("filechooser");
    if (isMobile) await control.tap(); else await control.click();
    await (await chooserPromise).setFiles(file as typeof photo);
    await expect(page.getByRole("heading", { name: "Before uploading" })).toBeVisible();
    await page.getByRole("button", { name: "Upload file", exact: true }).click();
    await expect(page.locator(".upload-limits strong")).toHaveText(`${i + 1} / 5`);
  }
  expect(uploads.map(f => f.type)).toEqual(["image/jpeg", "image/jpeg", "application/pdf"]);
  expect(receiveErrors).toEqual([]);
  await page.reload(); await expect(page.locator(".upload-limits strong")).toHaveText("3 / 5");
  await page.locator(".answer-attachments").screenshot({ path: testInfo.outputPath("attachments.png") });
  expect(errors).toEqual([]);
});

test("closed and file-disabled attempts explain why attaching is unavailable", async ({ page }) => {
  await fixture(page, "disabled");
  await expect(page.getByText("Attachments are disabled for this work. Enter your answer above.")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.unrouteAll(); await fixture(page, "submitted");
  await expect(page.getByText("This work has been submitted. You cannot add files to this attempt.")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("attachment limit explains disabled pickers and replacement remains possible", async ({ page }) => {
  const { png, uploads } = await fixture(page, "full");
  const input = page.getByLabel("Attach photo / PDF", { exact: true });
  await expect(input).toBeDisabled(); await expect(page.getByLabel("Take a photo", { exact: true })).toBeDisabled();
  await expect(page.getByText("Five files are attached. Replace or remove an attachment to add another.")).toBeVisible();
  await page.getByRole("button", { name: "Replace", exact: true }).first().click(); await expect(input).toBeEnabled();
  await input.setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Before uploading" })).toHaveCount(0);
  await expect(page.locator(".upload-limits strong")).toHaveText("5 / 5"); expect(uploads).toHaveLength(1);
});
