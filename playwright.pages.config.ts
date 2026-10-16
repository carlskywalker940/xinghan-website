import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/deployment",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.PAGES_RESULTS_FILE || "reports/deployment/results.json",
      },
    ],
  ],
  use: {
    headless: process.platform !== "darwin",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--window-position=0,0",
      ],
    },
    trace: "retain-on-failure",
  },
});
