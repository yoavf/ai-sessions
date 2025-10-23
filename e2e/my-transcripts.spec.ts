// spec: e2e/test-plans/my-transcripts-test-plan.md
// Comprehensive test coverage for My Transcripts page

import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { expect as authExpect, test as authTest } from "./fixtures/auth";

// Create Prisma client
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
};

// Helper to create JSONL transcript data
const createTranscriptJSONL = (
  messageCount: number,
  customMessages?: string[],
): string => {
  if (customMessages) {
    return customMessages.join("\n");
  }

  const lines: string[] = [];
  for (let i = 0; i < messageCount; i++) {
    const role = i % 2 === 0 ? "user" : "assistant";
    const text = `Message ${i + 1}`;
    lines.push(
      JSON.stringify({
        role,
        content: [{ type: "text", text }],
      }),
    );
  }
  return lines.join("\n");
};

// Helper to upload transcript via the dropzone
const uploadTranscript = async (
  page: any,
  title: string,
  messageCount: number,
  customJsonl?: string,
): Promise<{ secretToken: string; transcriptId: string }> => {
  // Create transcript data
  const jsonlContent = customJsonl || createTranscriptJSONL(messageCount);

  // Navigate to homepage
  await page.goto("/");
  await page.waitForLoadState("load");

  // Find the hidden file input created by react-dropzone
  const fileInput = page.locator('input[type="file"]');

  // Set the file directly on the input
  await fileInput.setInputFiles({
    name: "transcript.jsonl",
    mimeType: "application/jsonl",
    buffer: Buffer.from(jsonlContent),
  });

  // Wait for navigation to transcript page
  await page.waitForURL(/\/t\/[a-zA-Z0-9_-]+/, { timeout: 25000 });

  // Extract secret token from URL
  const url = page.url();
  const secretToken = url.split("/t/")[1];

  if (!secretToken) {
    throw new Error("Failed to extract secret token from URL");
  }

  // Get transcript from database
  const userId = await getUserId(page);
  const { prisma, pool } = createPrismaClient();
  try {
    const transcript = await prisma.transcript.findFirst({
      where: {
        userId,
        secretToken,
      },
    });

    if (!transcript) {
      throw new Error("Transcript not found after upload");
    }

    // Update title if provided and different
    if (title && title !== transcript.title) {
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { title },
      });
    }

    return {
      secretToken: transcript.secretToken,
      transcriptId: transcript.id,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

// Helper to get user ID from page session
const getUserId = async (page: any): Promise<string> => {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(
    (c: any) => c.name === "authjs.session-token",
  );

  if (!sessionCookie) {
    throw new Error("Session cookie not found");
  }

  const { prisma, pool } = createPrismaClient();
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionCookie.value },
    });

    if (!session) {
      throw new Error("Session not found in database");
    }

    return session.userId;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

// Helper to delete all transcripts for a user
const deleteAllTranscripts = async (userId: string): Promise<void> => {
  const { prisma, pool } = createPrismaClient();
  try {
    await prisma.transcript.deleteMany({
      where: { userId },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

// Helper to create transcript directly in database (faster than uploading via UI)
const createTranscriptInDB = async (
  userId: string,
  title: string,
  messageCount: number,
): Promise<{ secretToken: string; transcriptId: string }> => {
  const { prisma, pool } = createPrismaClient();
  try {
    const jsonlContent = createTranscriptJSONL(messageCount);
    const transcript = await prisma.transcript.create({
      data: {
        userId,
        title,
        fileData: jsonlContent,
        messageCount,
        fileSizeBytes: Buffer.byteLength(jsonlContent, "utf8"),
        source: "claude-code",
      },
    });

    return {
      secretToken: transcript.secretToken,
      transcriptId: transcript.id,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

test.describe("My Transcripts Page - Authentication and Access Control", () => {
  test.describe("1.1 Unauthenticated User Redirected to Sign-in", () => {
    test("should redirect unauthenticated user to sign-in page", async ({
      page,
    }) => {
      // 1. Navigate directly to /my-transcripts
      await page.goto("/my-transcripts");

      // 2. Verify redirect to /api/auth/signin or sign-in page
      // NextAuth redirects to /api/auth/signin which then redirects to the signin page
      await page.waitForURL(
        (url) =>
          url.pathname.includes("/signin") ||
          url.pathname.includes("/api/auth/signin"),
        { timeout: 10000 },
      );

      // Verify we're on a sign-in related page
      const currentUrl = page.url();
      expect(
        currentUrl.includes("/signin") ||
          currentUrl.includes("/api/auth/signin"),
      ).toBeTruthy();

      // 3. Verify no transcript data is exposed
      // Verify that transcript-specific content is not visible
      await expect(page.getByText("My Transcripts")).not.toBeVisible();
      await expect(
        page.getByText("Manage your uploaded AI coding sessions"),
      ).not.toBeVisible();
      await expect(page.getByText("Upload New")).not.toBeVisible();
    });
  });

  authTest.describe("1.2 Authenticated User Can Access Page", () => {
    authTest(
      "should allow authenticated user to access the page",
      async ({ authenticatedPage: page }) => {
        // 1. Sign in via GitHub OAuth (already done by fixture)
        // 2. Navigate to /my-transcripts
        await page.goto("/my-transcripts");

        // 3. Verify page loads successfully
        await page.waitForLoadState("load");

        // 4. Verify URL remains /my-transcripts
        await authExpect(page).toHaveURL("/my-transcripts");

        // Wait for loading to complete (loading spinner disappears)
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // Check if there's an error alert and fail the test with helpful message
        const errorAlert = page
          .locator('[role="alert"]')
          .filter({ hasText: "Failed" });
        const hasError = await errorAlert.isVisible().catch(() => false);
        if (hasError) {
          const errorText = await errorAlert.textContent();
          throw new Error(`Page loaded with error: ${errorText}`);
        }

        // 5. Verify header shows "My Transcripts" title
        await authExpect(
          page.getByRole("heading", { name: "My Transcripts", level: 1 }),
        ).toBeVisible();

        // 6. Verify site header displays logout button
        await authExpect(
          page.getByRole("banner").getByRole("button", { name: "Sign out" }),
        ).toBeVisible();

        // 7. Verify page subtitle "Manage your uploaded AI coding sessions"
        await authExpect(
          page.getByText("Manage your uploaded AI coding sessions"),
        ).toBeVisible();
      },
    );
  });

  authTest.describe("2.1 Display Empty State", () => {
    authTest(
      "should display empty state when user has no transcripts",
      async ({ authenticatedPage: page }) => {
        // 1. Navigate to /my-transcripts as authenticated user with zero transcripts
        await page.goto("/my-transcripts");

        // 2. Wait for loading state to complete
        // The loading spinner should disappear
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 3. Verify empty state card displayed
        // The card should be visible
        await authExpect(
          page.locator("text=You haven't uploaded any transcripts yet."),
        ).toBeVisible();

        // 4. Verify text "You haven't uploaded any transcripts yet."
        await authExpect(
          page.getByText("You haven't uploaded any transcripts yet."),
        ).toBeVisible();

        // 5. Verify "Go to Home to Upload" button visible
        const uploadButton = page.getByRole("link", {
          name: "Go to Home to Upload",
        });
        await authExpect(uploadButton).toBeVisible();

        // 6. Verify button links to /
        await authExpect(uploadButton).toHaveAttribute("href", "/");
      },
    );
  });

  authTest.describe("2.2 Display Single Transcript", () => {
    authTest(
      "should display single transcript with all metadata",
      async ({ authenticatedPage: page }) => {
        // 1. Create one transcript directly in DB
        const userId = await getUserId(page);
        await deleteAllTranscripts(userId); // Ensure clean state

        const { secretToken } = await createTranscriptInDB(
          userId,
          "Test Session 2025",
          10,
        );

        // 2. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 3. Verify single transcript card displayed
        const transcriptCard = page.locator(".divide-y > div").first();
        await authExpect(transcriptCard).toBeVisible();

        // 4. Verify transcript title is clickable link
        const titleLink = page.getByRole("link", { name: "Test Session 2025" });
        await authExpect(titleLink).toBeVisible();
        await authExpect(titleLink).toHaveAttribute(
          "href",
          `/t/${secretToken}`,
        );

        // 5. Verify metadata row shows correct information
        await authExpect(page.getByText("Claude Code")).toBeVisible();
        await authExpect(page.getByText(/10 messages/)).toBeVisible();

        // 6. Verify delete button visible (get first one as there's also "Delete My Account" on page)
        await authExpect(
          page.getByRole("button", { name: "Delete" }).first(),
        ).toBeVisible();
      },
    );
  });

  authTest.describe("2.3 Display Multiple Transcripts", () => {
    authTest(
      "should display multiple transcripts ordered by creation date",
      async ({ authenticatedPage: page }) => {
        // 1. Create multiple transcripts directly in DB with delays
        const userId = await getUserId(page);
        await deleteAllTranscripts(userId);

        // Create 3 transcripts with small delays to ensure different timestamps
        await createTranscriptInDB(userId, "First Upload", 5);
        await page.waitForTimeout(100);
        await createTranscriptInDB(userId, "Second Upload", 10);
        await page.waitForTimeout(100);
        await createTranscriptInDB(userId, "Third Upload", 15);

        // 2. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 3. Verify all transcripts displayed
        await authExpect(
          page.getByRole("link", { name: "First Upload" }),
        ).toBeVisible();
        await authExpect(
          page.getByRole("link", { name: "Second Upload" }),
        ).toBeVisible();
        await authExpect(
          page.getByRole("link", { name: "Third Upload" }),
        ).toBeVisible();

        // 4. Verify ordered by creation date (newest first)
        const titles = await page
          .locator(".divide-y > div h3")
          .allTextContents();
        authExpect(titles[0]).toContain("Third Upload");
        authExpect(titles[1]).toContain("Second Upload");
        authExpect(titles[2]).toContain("First Upload");

        // 5. Verify each transcript has metadata and delete button (including "Delete My Account")
        const deleteButtons = await page
          .getByRole("button", { name: /Delete/ })
          .count();
        authExpect(deleteButtons).toBeGreaterThanOrEqual(3); // At least 3 transcript delete buttons
      },
    );
  });
});

// Section 3: Transcript Actions - View
test.describe("My Transcripts Page - Navigation", () => {
  authTest.describe("3.1 Navigate to Transcript via Title Click", () => {
    authTest(
      "should navigate to transcript viewer when title is clicked",
      async ({ authenticatedPage: page }) => {
        // 1. Create a transcript directly in DB
        const userId = await getUserId(page);
        await deleteAllTranscripts(userId);

        const { secretToken } = await createTranscriptInDB(
          userId,
          "Navigation Test",
          5,
        );

        // 2. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 3. Click on transcript title link and wait for navigation
        const titleLink = page.getByRole("link", { name: "Navigation Test" });
        await Promise.all([
          page.waitForURL(`/t/${secretToken}`, {
            timeout: 15000,
          }),
          titleLink.click(),
        ]);

        // 4. Verify URL
        await authExpect(page).toHaveURL(`/t/${secretToken}`);

        // 5. Verify transcript viewer page loads
        await page.waitForLoadState("load");

        // 6. Verify can return via browser back button
        await page.goBack();
        await authExpect(page).toHaveURL("/my-transcripts");
      },
    );
  });
});

// Section 4: Transcript Actions - Delete
test.describe("My Transcripts Page - Delete Operations", () => {
  authTest.describe("4.1 Delete Single Transcript with Confirmation", () => {
    authTest(
      "should delete transcript after confirmation",
      async ({ authenticatedPage: page }) => {
        // 1. Create a transcript directly in DB
        const userId = await getUserId(page);
        await deleteAllTranscripts(userId);

        await createTranscriptInDB(userId, "Delete Test", 5);

        // 2. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 3. Verify transcript is visible
        await authExpect(
          page.getByRole("link", { name: "Delete Test" }),
        ).toBeVisible();

        // 4. Set up dialog handler to cancel first
        page.once("dialog", (dialog) => {
          authExpect(dialog.message()).toContain("Are you sure");
          dialog.dismiss();
        });

        // 5. Click Delete button (first time - cancel) - testid is delete-transcript-<secretToken>
        await page
          .locator('[data-testid^="delete-transcript-"]')
          .first()
          .click();

        // 6. Verify transcript still visible after cancel (wait a bit for potential updates)
        await authExpect(
          page.getByRole("link", { name: "Delete Test" }),
        ).toBeVisible();

        // 7. Set up dialog handler to accept
        page.once("dialog", (dialog) => {
          authExpect(dialog.message()).toContain("Are you sure");
          dialog.accept();
        });

        // 8. Click Delete button (second time - confirm)
        await page
          .locator('[data-testid^="delete-transcript-"]')
          .first()
          .click();

        // 9. Verify transcript removed from list (wait for disappearance)
        await authExpect(
          page.getByRole("link", { name: "Delete Test" }),
        ).toBeHidden();

        // 11. Verify empty state appears
        await authExpect(
          page.getByText("You haven't uploaded any transcripts yet."),
        ).toBeVisible();
      },
    );
  });

  authTest.describe("4.2 Delete Last Transcript Shows Empty State", () => {
    authTest(
      "should show empty state after deleting last transcript",
      async ({ authenticatedPage: page }) => {
        // 1. Create exactly one transcript directly in DB
        const userId = await getUserId(page);
        await deleteAllTranscripts(userId);

        await createTranscriptInDB(userId, "Last One", 5);

        // 2. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 3. Set up dialog handler to accept deletion
        page.once("dialog", (dialog) => dialog.accept());

        // 4. Click Delete button and confirm (use first() as there's also "Delete My Account" button)
        await page.getByRole("button", { name: "Delete" }).first().click();

        // 5. Verify empty state automatically appears (waits for deletion to complete)
        await authExpect(
          page.getByText("You haven't uploaded any transcripts yet."),
        ).toBeVisible();
        await authExpect(
          page.getByRole("link", { name: "Go to Home to Upload" }),
        ).toBeVisible();
      },
    );
  });
});

// Section 5: CLI Token Management
test.describe("My Transcripts Page - CLI Token Management", () => {
  authTest.describe("5.1 CLI Access Section Visibility", () => {
    authTest(
      "should display CLI access section with all elements",
      async ({ authenticatedPage: page }) => {
        // 1. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 2. Scroll to CLI Access section
        await page.locator("#cli-access").scrollIntoViewIfNeeded();

        // 3. Verify "CLI Access" heading visible
        await authExpect(
          page.getByRole("heading", { name: "CLI Access" }),
        ).toBeVisible();

        // 4. Verify description text
        await authExpect(
          page.getByText(
            /Generate an authentication token to upload transcripts/,
          ),
        ).toBeVisible();
        await authExpect(
          page.getByText(/Tokens are valid for 90 days/),
        ).toBeVisible();

        // 5. Verify "Generate CLI Token" button visible
        await authExpect(
          page.getByRole("button", { name: "Generate CLI Token" }),
        ).toBeVisible();

        // 6. Verify usage instructions section visible
        await authExpect(page.getByText("Usage Instructions")).toBeVisible();

        // 7. Verify "Revoke All CLI Tokens" section visible at bottom
        await authExpect(page.getByText("Revoke All CLI Tokens")).toBeVisible();
        await authExpect(
          page.getByRole("button", { name: "Revoke All Tokens" }),
        ).toBeVisible();
      },
    );
  });

  authTest.describe("5.2 Generate CLI Token Successfully", () => {
    authTest(
      "should generate CLI token and display it",
      async ({ authenticatedPage: page }) => {
        // 1. Navigate to /my-transcripts
        await page.goto("/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        // 2. Scroll to CLI Access section
        await page.locator("#cli-access").scrollIntoViewIfNeeded();

        // 3. Click "Generate CLI Token" button
        const generateButton = page.getByRole("button", {
          name: "Generate CLI Token",
        });
        await generateButton.click();

        // 4. Wait for alert box to appear with token
        await authExpect(
          page.getByText(/Make sure to copy your token now/),
        ).toBeVisible();

        // 6. Verify token is displayed
        const tokenCode = page.getByTestId("cli-token");
        await authExpect(tokenCode).toBeVisible();
        const tokenText = await tokenCode.textContent();
        authExpect(tokenText).toBeTruthy();
        authExpect(tokenText!.length).toBeGreaterThan(20);

        // 7. Verify "Copy" button next to token
        await authExpect(
          page.getByRole("button", { name: "Copy" }),
        ).toBeVisible();

        // 8. Verify "Close" button below
        await authExpect(
          page.getByRole("button", { name: "Close" }),
        ).toBeVisible();

        // 9. Verify usage instructions section hidden
        await authExpect(
          page.getByText("Usage Instructions"),
        ).not.toBeVisible();

        // 10. Verify "Generate CLI Token" button hidden
        await authExpect(generateButton).not.toBeVisible();
      },
    );
  });

  authTest.describe("5.3 Copy CLI Token to Clipboard", () => {
    authTest(
      "should copy token to clipboard when copy button clicked",
      async ({ authenticatedPage: page, context }) => {
        // 1. Generate CLI token first
        await page.goto("http://localhost:3000/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        await page.locator("#cli-access").scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Generate CLI Token" }).click();

        // Wait for token to appear
        await authExpect(
          page.getByText(/Make sure to copy your token now/),
        ).toBeVisible();

        // 2. Get the token text before copying
        const tokenCode = page.getByTestId("cli-token");
        const tokenText = await tokenCode.textContent();

        // 3. Grant clipboard permissions
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);

        // 4. Click "Copy" button
        await page.getByRole("button", { name: "Copy" }).click();

        // 5. Verify button text changes to "Copied" with checkmark
        await authExpect(
          page.getByRole("button", { name: "Copied" }),
        ).toBeVisible();

        // 6. Verify token copied to clipboard
        const clipboardText = await page.evaluate(() =>
          navigator.clipboard.readText(),
        );
        authExpect(clipboardText).toBe(tokenText);

        // 7. Wait for button to return to "Copy" state (timeout is 2 seconds in the component)
        await authExpect(
          page.getByRole("button", { name: "Copy" }),
        ).toBeVisible({ timeout: 3000 });
      },
    );
  });

  authTest.describe("5.4 Close CLI Token Display", () => {
    authTest(
      "should hide token and show generate button when close clicked",
      async ({ authenticatedPage: page }) => {
        // 1. Generate CLI token
        await page.goto("http://localhost:3000/my-transcripts");
        await page.waitForSelector('text="Loading..."', {
          state: "hidden",
          timeout: 10000,
        });

        await page.locator("#cli-access").scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Generate CLI Token" }).click();

        // Wait for token to appear
        await authExpect(
          page.getByText(/Make sure to copy your token now/),
        ).toBeVisible();

        // 2. Click "Close" button
        await page.getByRole("button", { name: "Close" }).click();

        // 3. Verify token alert box disappears
        await authExpect(
          page.getByText(/Make sure to copy your token now/),
        ).not.toBeVisible();

        // 4. Verify "Generate CLI Token" button reappears
        await authExpect(
          page.getByRole("button", { name: "Generate CLI Token" }),
        ).toBeVisible();

        // 5. Verify usage instructions reappear
        await authExpect(page.getByText("Usage Instructions")).toBeVisible();
      },
    );
  });
});
