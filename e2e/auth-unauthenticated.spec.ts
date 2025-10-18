import { expect, test } from "@playwright/test";

test.describe("Unauthenticated User Experience", () => {
  test("Homepage Load - Unauthenticated State", async ({ page }) => {
    // 1. Navigate to homepage (http://localhost:3000)
    await page.goto("http://localhost:3000");

    // 2. Verify page title contains "AI Sessions"
    await expect(page).toHaveTitle(/AI Sessions/);

    // 3. Verify header displays "AI Sessions" branding
    await expect(
      page.getByRole("banner").getByRole("link", { name: "AI Sessions" }),
    ).toBeVisible();

    // 4. Verify Help icon/link is visible in header
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Help" }),
    ).toBeVisible();

    // 5. Verify "My Transcripts" link is NOT visible in header (requires authentication)
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).not.toBeVisible();

    // 6. Verify logout button is NOT visible in header (requires authentication)
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).not.toBeVisible();

    // 7. Verify main heading "AI Sessions" is visible
    await expect(
      page.getByRole("heading", { name: "AI Sessions", level: 1 }),
    ).toBeVisible();

    // 8. Verify subtitle "Share AI coding sessions" is visible
    await expect(page.getByText("Share AI coding sessions")).toBeVisible();

    // 9. Verify upload dropzone is visible with text about dropping transcripts
    await expect(page.getByText("Drop your transcript")).toBeVisible();
  });

  test("Authentication Overlay Display", async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Verify authentication overlay is visible over the upload area
    // The overlay uses .absolute.inset-0 classes
    const overlay = page.locator(".absolute.inset-0");
    await expect(overlay).toBeVisible();

    // 3. Verify "Sign in to upload" text is visible
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();

    // 4. Verify "Authenticate to share your transcripts" text is visible
    await expect(
      page.getByText("Authenticate to share your transcripts"),
    ).toBeVisible();

    // 5. Verify "Sign in with GitHub" button is visible and enabled
    const signInButton = page.getByRole("button", {
      name: "Sign in with GitHub",
    });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
  });

  test("Upload Attempt While Unauthenticated", async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Verify the authentication overlay blocks the upload dropzone
    const overlay = page.locator(".absolute.inset-0");
    await expect(overlay).toBeVisible();

    // 3. Verify the "Sign in to upload" overlay remains visible
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();

    // 4. Verify clicking on the area shows the sign-in overlay (doesn't open file dialog)
    // The overlay should still be visible after clicking and no file input should be triggered
    await overlay.click();
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();

    // Verify the overlay still blocks access
    const lockIcon = page
      .locator("svg")
      .filter({ has: page.locator("path") })
      .first();
    await expect(lockIcon).toBeVisible();
  });

  test("Help Page Access - Unauthenticated", async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Click the Help link/icon in header
    await page.getByRole("banner").getByRole("link", { name: "Help" }).click();

    // 3. Verify navigation to /help page
    await expect(page).toHaveURL(/\/help/);

    // 4. Verify header still does not show authenticated elements (no "My Transcripts", no logout button)
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).not.toBeVisible();
  });

  test("Session Persistence - Page Refresh", async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Verify unauthenticated state (sign-in overlay visible)
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();

    // 3. Refresh the page
    await page.reload();

    // 4. Verify still in unauthenticated state after refresh
    await expect(
      page.getByRole("heading", { name: "Sign in to upload" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with GitHub" }),
    ).toBeVisible();

    // Additional verification that authenticated elements are still not present in header
    await expect(
      page.getByRole("banner").getByRole("link", { name: "My Transcripts" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out" }),
    ).not.toBeVisible();
  });

  test("GitHub OAuth Redirect", async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3000");

    // 2. Click "Sign in with GitHub" button
    const signInButton = page.getByRole("button", {
      name: "Sign in with GitHub",
    });
    await signInButton.click();

    // 3. Verify navigation to GitHub OAuth page
    // NextAuth.js redirects to github.com/login for OAuth
    await page.waitForURL((url) => url.toString().includes("github.com"), {
      timeout: 10000,
    });

    // 4. Verify we're on GitHub's OAuth/login page
    const currentUrl = page.url();
    expect(currentUrl).toContain("github.com");
    expect(currentUrl).toContain("client_id");
  });
});
