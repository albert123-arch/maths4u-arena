import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", fullyParallel: false, workers: 1, timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:3100", channel: "msedge", headless: true, trace: "off", screenshot: "only-on-failure" },
  outputDir: "test-results/browser",
  reporter: [["list"]],
  webServer: { command: "node scripts/test-server.mjs", url: "http://localhost:3100/api/health", reuseExistingServer: false, timeout: 120000 },
});
