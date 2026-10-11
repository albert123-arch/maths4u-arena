import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/learning-browser", workers: 1, timeout: 90000,
  expect: { timeout: 20000 }, reporter: "list", outputDir: ".local/learning-preview/browser-results",
  use: { baseURL: "http://127.0.0.1:3108", trace: "off", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
});
