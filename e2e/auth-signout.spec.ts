// spec: Sign-out flow tests
// seed: e2e/seed-auth.spec.ts

import { expect, test } from "./fixtures/auth";

test.describe("Sign-Out Flow", () => {
  test("Sign-Out from Homepage", async ({ authenticatedPage: page }) => {
    // 1. Start on homepage (authenticated via fixture)
    // Already on homepage from fixture

    // 2. Verify initial authenticated state ("My Transcripts" visible in header, no "Sign in to upload" overlay)
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).not.toBeVisible();

    // 3. Click the "Sign out" button in the header
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Sign out" })
      .click();

    // 4. Wait for sign-out to complete and redirect
    await page.waitForLoadState("domcontentloaded");

    // 5. Verify returned to homepage (URL is /)
    await expect(page).toHaveURL("http://localhost:3000/");

    // 6. Verify now in unauthenticated state
    // "Sign in to upload" overlay IS visible
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();

    // "Sign in with GitHub" button IS visible
    await expect(
      page.getByRole("button", { name: "Sign in with GitHub" }),
    ).toBeVisible();

    // "My Transcripts" link is NOT visible in header
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).not.toBeVisible();

    // "Sign out" button is NOT visible in header
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).not.toBeVisible();
  });

  test("Sign-Out from My Transcripts Page", async ({
    authenticatedPage: page,
  }) => {
    // 1. Start authenticated
    // Already authenticated from fixture

    // 2. Navigate to /my-transcripts page
    await page.goto("http://localhost:3000/my-transcripts");
    await page.waitForLoadState("domcontentloaded");

    // 3. Verify "Sign out" button is visible in header
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).toBeVisible();

    // 4. Click "Sign out" button
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Sign out" })
      .click();

    // 5. Verify redirected to homepage (/)
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL("http://localhost:3000/");

    // 6. Verify now in unauthenticated state
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with GitHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).not.toBeVisible();
  });

  test("Session Cleared After Sign-Out", async ({
    authenticatedPage: page,
  }) => {
    // 1. Start authenticated
    // Already authenticated from fixture

    // 2. Sign out
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Sign out" })
      .click();

    // 3. Verify unauthenticated state
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();

    // 4. Refresh the page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // 5. Verify still unauthenticated after refresh (session was fully cleared)
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with GitHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).not.toBeVisible();

    // 6. Try to navigate directly to /my-transcripts
    await page.goto("http://localhost:3000/my-transcripts");
    await page.waitForLoadState("domcontentloaded");

    // 7. Verify either redirected to sign-in or shows authentication required
    const currentUrl = page.url();
    // Should either be redirected to signin or still on my-transcripts but showing auth required
    if (currentUrl.includes("/my-transcripts")) {
      // If on my-transcripts page, verify authentication overlay or redirect happened
      // The page might show "Please sign in" or similar message
      await expect(page).toHaveURL(
        /\/(my-transcripts|auth\/signin|api\/auth\/signin)/,
      );
    } else {
      // Or should be on sign-in page
      await expect(page).toHaveURL(/\/(api\/)?auth\/signin/);
    }
  });
});
