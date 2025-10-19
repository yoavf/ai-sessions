import { test } from "@playwright/test";

test("seed transcript", async ({ page }) => {
  // Navigate to an existing transcript or homepage
  await page.goto("http://localhost:3000");
});
