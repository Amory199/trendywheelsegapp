import { type APIRequestContext, type Page, expect } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "https://api.trendywheelseg.com";

export async function loginAsCustomer(page: Page): Promise<void> {
  await loginVia(page, "mohamed@example.com", "Customer@123!");
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginVia(page, "admin@trendywheelseg.com", "Admin@123!");
}

async function loginVia(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator('input[type="email"], input[autocomplete="email"]').first().fill(email);
  await page
    .locator('input[type="password"], input[autocomplete="current-password"]')
    .first()
    .fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 }),
    page.getByRole("button", { name: /sign in|log in/i }).click(),
  ]);
  expect(page.url()).not.toContain("/login");
}

export async function customerToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/api/auth/login`, {
    data: { email: "mohamed@example.com", password: "Customer@123!" },
  });
  expect(res.status()).toBe(200);
  const json = await res.json();
  return json.token as string;
}
