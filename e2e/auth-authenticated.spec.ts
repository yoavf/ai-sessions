// spec: authenticated user experience tests
// seed: e2e/seed-auth.spec.ts

import { expect, test } from "./fixtures/auth";

test.describe("Authenticated User Experience", () => {
  test("Homepage Display - Authenticated State", async ({
    authenticatedPage: page,
  }) => {
    // 1. Start on homepage (fixture already navigates there)
    // Already on homepage from fixture

    // 2. Verify page title contains "AI Sessions"
    await expect(page).toHaveTitle(/AI Sessions/);

    // 3. Verify authentication overlay is NOT visible (no "Sign in to upload" text)
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).not.toBeVisible();

    // 4. Verify "Sign in with GitHub" button is NOT visible
    await expect(
      page.getByRole("button", { name: "Sign in with GitHub" }),
    ).not.toBeVisible();

    // 5. Verify upload dropzone is visible and accessible
    await expect(
      page.getByText("Drop your Claude Code transcript"),
    ).toBeVisible();

    // 6. Verify dropzone text "Drop your Claude Code transcript" is visible
    await expect(
      page.getByText("Drop your Claude Code transcript"),
    ).toBeVisible();
  });

  test("Authenticated Header Elements", async ({ authenticatedPage: page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Verify header shows "AI Sessions" branding
    await expect(
      page.getByRole("banner").getByRole("link", { name: "AI Sessions" }),
    ).toBeVisible();

    // 3. Verify "My Transcripts" link IS visible in header (authenticated only)
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();

    // 4. Verify Help link is visible
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Help" }),
    ).toBeVisible();

    // 5. Verify "Sign out" button IS visible in header (authenticated only)
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).toBeVisible();
  });

  test("Upload Dropzone Interaction", async ({ authenticatedPage: page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Verify dropzone is visible
    const dropzone = page.getByText("Drop your Claude Code transcript");
    await expect(dropzone).toBeVisible();

    // 3. Hover over the dropzone area
    await dropzone.hover();

    // 4. Verify no overlay is blocking interaction
    const overlay = page.locator(".absolute.inset-0");
    await expect(overlay).not.toBeVisible();

    // 5. Verify dropzone is interactive (not blocked by overlay)
    // Check that the authentication overlay text is not present
    await expect(page.getByText("Sign in to upload")).not.toBeVisible();
  });

  test("Session Persistence - Page Refresh", async ({
    authenticatedPage: page,
  }) => {
    // 1. Start on homepage
    await page.goto("http://localhost:3000");

    // 2. Verify authenticated state (no "Sign in to upload" overlay)
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).not.toBeVisible();

    // 3. Verify "My Transcripts" link is visible in header
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();

    // 4. Refresh the page
    await page.reload();

    // 5. Verify still authenticated after refresh (no overlay, "My Transcripts" still visible)
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();
  });

  test("Navigate to My Transcripts Page", async ({
    authenticatedPage: page,
  }) => {
    // 1. Start on homepage
    await page.goto("http://localhost:3000");

    // 2. Click "My Transcripts" link in header
    await page
      .getByRole("banner")
      .getByRole("link", { name: "My Transcripts" })
      .click();

    // 3. Verify navigation to /my-transcripts page
    await expect(page).toHaveURL(/\/my-transcripts/);

    // 4. Verify header still shows authenticated state (Sign out button visible)
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).toBeVisible();
  });

  test("Session Maintenance Across Pages", async ({
    authenticatedPage: page,
  }) => {
    // 1. Start on homepage
    await page.goto("http://localhost:3000");

    // 2. Click Help link to navigate to /help
    await page.getByRole("link", { name: "Help" }).first().click();

    // 3. Verify still authenticated on Help page ("My Transcripts" link visible in header)
    await expect(page).toHaveURL(/\/help/);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();

    // 4. Click "AI Sessions" logo to return to homepage
    await page.getByRole("link", { name: "AI Sessions" }).click();

    // 5. Verify still authenticated on homepage (no overlay)
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).not.toBeVisible();
  });

  test("Multi-tab Session Synchronization", async ({
    authenticatedPage: page,
    context,
  }) => {
    // 1. Verify authenticated in current tab ("My Transcripts" visible in header)
    await page.goto("http://localhost:3000");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();

    // 2. Open a new tab in the same browser context
    const newTab = await context.newPage();

    // 3. Navigate to homepage in new tab
    await newTab.goto("http://localhost:3000");

    // 4. Verify new tab is also authenticated (session shared)
    await expect(
      newTab.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).toBeVisible();
    await expect(
      newTab.getByRole("heading", { name: "Sign in to upload" }),
    ).not.toBeVisible();

    // 5. Close the new tab
    await newTab.close();
  });
});
