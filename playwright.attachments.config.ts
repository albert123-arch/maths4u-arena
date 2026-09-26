import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/attachment-browser", workers: 1, timeout: 60000,
  expect: { timeout: 15000 }, reporter: "list", outputDir: "test-results/attachments",
  use: { baseURL: "http://127.0.0.1:3107", trace: "off", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "android", use: { ...devices["Pixel 7"], channel: "msedge" } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  // Every API request is intercepted by the test. No database or real accounts.
  webServer: { command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3107", url: "http://127.0.0.1:3107/login", reuseExistingServer: false, timeout: 120000 },
});
