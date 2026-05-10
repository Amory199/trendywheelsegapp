import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "https://app.trendywheelseg.com";
const ADMIN = process.env.E2E_ADMIN_URL ?? "https://admin.trendywheelseg.com";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "customer",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: BASE,
        storageState: ".auth/customer.json",
      },
      testMatch: /customer\..*\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: ADMIN,
        storageState: ".auth/admin.json",
      },
      testMatch: /admin\..*\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
});
