import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests/ux-browser", fullyParallel: false, workers: 1, timeout: 120000,
  expect: { timeout: 30000 }, use: { baseURL: "http://127.0.0.1:3102", channel: "msedge", headless: true, actionTimeout: 15000, trace: "off", screenshot: "only-on-failure" },
  outputDir: ".local/ux-browser-results", reporter: [["list"]] });
