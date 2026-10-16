import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/playwright", open: "never" }],
    ["json", { outputFile: "reports/e2e.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: false,
    launchOptions: {
      args: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--window-position=0,0",
      ],
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
    viewport: { width: 1440, height: 900 },
    screenshot: "off",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
