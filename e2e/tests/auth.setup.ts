import { test as setup, expect } from "@playwright/test";

const CUSTOMER_BASE = process.env.E2E_BASE_URL ?? "https://app.trendywheelseg.com";
const ADMIN_BASE = process.env.E2E_ADMIN_URL ?? "https://admin.trendywheelseg.com";

setup("authenticate as customer", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: CUSTOMER_BASE });
  const page = await context.newPage();
  await page.goto("/login");
  await page
    .locator('input[type="email"], input[autocomplete="email"]')
    .first()
    .fill("mohamed@example.com");
  await page
    .locator('input[type="password"], input[autocomplete="current-password"]')
    .first()
    .fill("Customer@123!");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 }),
    page.getByRole("button", { name: /sign in|log in/i }).click(),
  ]);
  expect(page.url()).not.toContain("/login");
  await context.storageState({ path: ".auth/customer.json" });
  await context.close();
});

setup("authenticate as admin", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: ADMIN_BASE });
  const page = await context.newPage();
  await page.goto("/login");
  await page
    .locator('input[type="email"], input[autocomplete="email"]')
    .first()
    .fill("admin@trendywheelseg.com");
  await page
    .locator('input[type="password"], input[autocomplete="current-password"]')
    .first()
    .fill("Admin@123!");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 }),
    page.getByRole("button", { name: /sign in|log in/i }).click(),
  ]);
  expect(page.url()).not.toContain("/login");
  await context.storageState({ path: ".auth/admin.json" });
  await context.close();
});
