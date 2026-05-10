import { expect, test } from "@playwright/test";

test.describe("customer home", () => {
  test("home shows hero + 4 action chips", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /need today/i })).toBeVisible();
    // The chips are anchors with href + the big "Anton" label inside.
    for (const href of ["/buy", "/rent", "/sell", "/service"]) {
      await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test("nav reflects new IA (Buy / Rent / Sell / Service / Profile)", async ({ page }) => {
    await page.goto("/");
    // Top-nav links live inside <header>
    await expect(page.locator('header a[href="/buy"]')).toBeVisible();
    await expect(page.locator('header a[href="/service"]')).toBeVisible();
    // Old "/repair" + "/bookings" links should be gone from top nav
    expect(await page.locator('header a[href="/repair"]').count()).toBe(0);
    expect(await page.locator('header a[href="/bookings"]').count()).toBe(0);
  });
});
