// e2e/seed-auth.spec.ts
import { test } from "./fixtures/auth";

test("seed authenticated", async ({ authenticatedPage: page }) => {
  await page.goto("http://localhost:3000");
});
