import { expect, test } from "@playwright/test";

test.describe("customer buy flow", () => {
  test("buy → category tab → product card → image-led detail with sticky CTA", async ({ page }) => {
    await page.goto("/buy");
    // 4 category chips + "All"
    await expect(page.getByRole("button", { name: "Parts" })).toBeVisible();
    await page.getByRole("button", { name: "Parts" }).click();

    // Wait for grid
    await page.waitForResponse(
      (r) => r.url().includes("/api/products?category=parts") && r.status() === 200,
    );
    await expect(page.getByText(/EGP/).first()).toBeVisible();

    // Tap first product card
    const firstCard = page.locator("a[href^='/buy/']").first();
    await firstCard.click();

    // Detail page: name, price prominent, "Buy now" sticky CTA
    await expect(page.getByText(/EGP/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Buy now|Reserve now/ })).toBeVisible();
  });

  test("placing an order navigates to /profile", async ({ page }) => {
    await page.goto("/buy");
    await page.getByRole("button", { name: "Parts" }).click();
    await page.waitForResponse((r) => r.url().includes("/api/products?category=parts"));
    await page.locator("a[href^='/buy/']").first().click();
    await page.getByRole("button", { name: /Buy now|Reserve now/ }).click();
    await page.waitForURL(/\/profile/);
  });
});
