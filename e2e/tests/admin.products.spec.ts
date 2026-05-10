import { expect, test } from "@playwright/test";

test.describe("admin TRACK AA surfaces", () => {
  for (const path of ["/products", "/orders", "/trade-ins", "/transport"]) {
    test(`${path} loads without error`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto(path);
      // Heading should render
      await expect(page.locator("h1")).toBeVisible();
      // No JS errors in the console
      expect(errors.filter((e) => !e.includes("favicon")).join("\n")).toBe("");
    });
  }
});
