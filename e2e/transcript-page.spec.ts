// spec: e2e/test-plans/transcript-page-test-plan.md
// Comprehensive test coverage for Transcript Page (/t/[token])

import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { calculateTranscriptMetadata, parseJSONL } from "@/lib/parser";

// Create Prisma client - matches app's setup
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

// Helper to generate random ID
const generateId = (length: number = 8): string => {
  return randomBytes(length).toString("base64url").slice(0, length);
};

// Comprehensive sample transcript with various content types (Claude Code format)
const comprehensiveTranscriptJSONL = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Create a simple hello world program in Python"}]},"uuid":"msg-001","timestamp":"2024-01-01T10:00:00.000Z","parentUuid":null,"sessionId":"test-session-123","cwd":"/test/path"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"The user wants a simple Python hello world program. I'll use the Write tool to create a hello.py file with a basic print statement."},{"type":"tool_use","id":"toolu_01ABC123","name":"Write","input":{"file_path":"/tmp/hello.py","content":"print('Hello, World!')"}}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":100,"output_tokens":150}},"uuid":"msg-002","timestamp":"2024-01-01T10:00:01.000Z","parentUuid":"msg-001","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01ABC123","content":"File written successfully"}]},"uuid":"msg-003","timestamp":"2024-01-01T10:00:02.000Z","parentUuid":"msg-002","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I've created a simple Python hello world program in /tmp/hello.py. The file contains:\\n\\n\`\`\`python\\nprint('Hello, World!')\\n\`\`\`"}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":800,"cache_creation_input_tokens":0,"cache_read_input_tokens":200,"output_tokens":50}},"uuid":"msg-004","timestamp":"2024-01-01T10:00:03.000Z","parentUuid":"msg-003","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Now run it and show me the output"}]},"uuid":"msg-005","timestamp":"2024-01-01T10:00:04.000Z","parentUuid":"msg-004","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"I'll execute the Python file using the Bash tool to run it and show the output."},{"type":"tool_use","id":"toolu_02DEF456","name":"Bash","input":{"command":"python /tmp/hello.py","description":"Run the hello world script"}}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":900,"cache_creation_input_tokens":0,"cache_read_input_tokens":300,"output_tokens":100}},"uuid":"msg-006","timestamp":"2024-01-01T10:00:05.000Z","parentUuid":"msg-005","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_02DEF456","content":"Hello, World!"}]},"uuid":"msg-007","timestamp":"2024-01-01T10:00:06.000Z","parentUuid":"msg-006","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"The program ran successfully and printed **'Hello, World!'** to the console."}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1000,"cache_creation_input_tokens":0,"cache_read_input_tokens":400,"output_tokens":30}},"uuid":"msg-008","timestamp":"2024-01-01T10:00:07.000Z","parentUuid":"msg-007","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Add error handling to the program"}]},"uuid":"msg-009","timestamp":"2024-01-01T10:00:08.000Z","parentUuid":"msg-008","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"I should add a try-except block to handle potential errors gracefully. This is good practice for any Python program."},{"type":"tool_use","id":"toolu_03GHI789","name":"Write","input":{"file_path":"/tmp/hello.py","content":"try:\\n    print('Hello, World!')\\nexcept Exception as e:\\n    print(f'Error: {e}')"}}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1100,"cache_creation_input_tokens":0,"cache_read_input_tokens":500,"output_tokens":120}},"uuid":"msg-010","timestamp":"2024-01-01T10:00:09.000Z","parentUuid":"msg-009","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_03GHI789","content":"File written successfully"}]},"uuid":"msg-011","timestamp":"2024-01-01T10:00:10.000Z","parentUuid":"msg-010","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I've updated the program with error handling using a try-except block."}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1300,"cache_creation_input_tokens":0,"cache_read_input_tokens":600,"output_tokens":25}},"uuid":"msg-012","timestamp":"2024-01-01T10:00:11.000Z","parentUuid":"msg-011","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":"[Request interrupted by user]"},"uuid":"msg-013","timestamp":"2024-01-01T10:00:12.000Z","parentUuid":"msg-012","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Can you search for all Python files in the project?"}]},"uuid":"msg-014","timestamp":"2024-01-01T10:00:13.000Z","parentUuid":"msg-013","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_04JKL012","name":"Glob","input":{"pattern":"**/*.py"}}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1400,"cache_creation_input_tokens":0,"cache_read_input_tokens":700,"output_tokens":40}},"uuid":"msg-015","timestamp":"2024-01-01T10:00:14.000Z","parentUuid":"msg-014","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_04JKL012","content":"/tmp/hello.py\\n/src/main.py\\n/tests/test_main.py"}]},"uuid":"msg-016","timestamp":"2024-01-01T10:00:15.000Z","parentUuid":"msg-015","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I found 3 Python files in the project:\\n\\n1. /tmp/hello.py (our test file)\\n2. /src/main.py (main source)\\n3. /tests/test_main.py (test file)"}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1500,"cache_creation_input_tokens":0,"cache_read_input_tokens":800,"output_tokens":60}},"uuid":"msg-017","timestamp":"2024-01-01T10:00:16.000Z","parentUuid":"msg-016","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":"<ide_opened_file>/tmp/hello.py</ide_opened_file>"},"uuid":"msg-018","timestamp":"2024-01-01T10:00:17.000Z","parentUuid":"msg-017","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Read the main.py file"}]},"uuid":"msg-019","timestamp":"2024-01-01T10:00:18.000Z","parentUuid":"msg-018","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_05MNO345","name":"Read","input":{"file_path":"/src/main.py"}}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1600,"cache_creation_input_tokens":0,"cache_read_input_tokens":900,"output_tokens":35}},"uuid":"msg-020","timestamp":"2024-01-01T10:00:19.000Z","parentUuid":"msg-019","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_05MNO345","content":"def main():\\n    print('Main application')\\n\\nif __name__ == '__main__':\\n    main()","is_error":false}]},"uuid":"msg-021","timestamp":"2024-01-01T10:00:20.000Z","parentUuid":"msg-020","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"The main.py file contains a simple main function."}],"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1800,"cache_creation_input_tokens":0,"cache_read_input_tokens":1000,"output_tokens":20}},"uuid":"msg-022","timestamp":"2024-01-01T10:00:21.000Z","parentUuid":"msg-021","sessionId":"test-session-123"}`;

// Helper to create test transcript
// NOTE: Returns prisma/pool connections that must be closed by the caller after the test
const createTestTranscript = async () => {
  const { prisma, pool } = createPrismaClient();

  // Create a test user with GitHub info
  const userId = `test-user-${generateId(8)}`;
  const testUser = await prisma.user.create({
    data: {
      id: userId,
      email: `test-${generateId(8)}@example.com`,
      name: "Test User",
      githubUsername: "testuser",
      image: "https://avatars.githubusercontent.com/u/1?v=4",
      emailVerified: new Date(),
    },
  });

  // Parse transcript and calculate metadata (like the upload API does)
  const parsed = parseJSONL(comprehensiveTranscriptJSONL, "claude-code");
  const metadata = calculateTranscriptMetadata(
    parsed,
    comprehensiveTranscriptJSONL,
    "claude-code",
  );

  // Create the comprehensive test transcript WITH metadata
  const transcript = await prisma.transcript.create({
    data: {
      userId: testUser.id,
      title: "Python Hello World Tutorial",
      fileData: comprehensiveTranscriptJSONL,
      messageCount: 22,
      fileSizeBytes: Buffer.byteLength(comprehensiveTranscriptJSONL, "utf8"),
      source: "claude-code",
      metadata: metadata as any, // Prisma JsonValue type
    },
  });

  // Verify transcript was created by reading it back
  const verified = await prisma.transcript.findUnique({
    where: { secretToken: transcript.secretToken },
  });

  if (!verified) {
    throw new Error("Transcript was not created successfully");
  }

  // Return connections to be closed after test completes
  return { transcript: verified, user: testUser, prisma, pool };
};

// Cleanup helper
const cleanupTestData = async (userId: string) => {
  const { prisma, pool } = createPrismaClient();
  try {
    await prisma.transcript.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

test.describe("Transcript Page - Page Loading and Basic Rendering", () => {
  test("1.1 Load Valid Transcript Successfully", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("domcontentloaded");

      // Verify site header is visible
      await expect(page.getByRole("banner")).toBeVisible();

      // Verify transcript title is displayed
      await expect(
        page.getByRole("heading", { name: "Python Hello World Tutorial" }),
      ).toBeVisible();

      // Verify user metadata section
      await expect(page.getByText("testuser").first()).toBeVisible();

      // Verify messages are rendered (use first() to avoid TOC duplicate)
      await expect(
        page.getByText("Create a simple hello world program in Python").first(),
      ).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("1.2 Handle Invalid Token (404)", async ({ page }) => {
    await page.goto("http://localhost:3000/t/invalid-token-12345");
    await page.waitForLoadState("load");

    // Should show 404 page
    await expect(
      page.getByRole("heading", { name: /404|Not Found/i }),
    ).toBeVisible();

    // URL should remain unchanged
    expect(page.url()).toContain("/t/invalid-token-12345");

    // No transcript metadata (user info) should be displayed
    // Check for the specific GitHub username link that appears in transcript pages
    await expect(
      page.getByRole("link", { name: /github.com/ }),
    ).not.toBeVisible();
  });

  test("1.3 Handle Malformed Token", async ({ page }) => {
    const malformedTokens = [
      "/t/../../etc/passwd", // Path traversal attempt
      "/t/<script>alert('xss')</script>", // XSS attempt
      "/t/token-with-special-chars-!@#$%", // Special characters
    ];

    for (const malformedToken of malformedTokens) {
      await page.goto(`http://localhost:3000${malformedToken}`);
      await page.waitForLoadState("load");

      // All should result in 404
      await expect(
        page.getByRole("heading", { name: /404|Not Found/i }),
      ).toBeVisible();
    }
  });
});

test.describe("Transcript Page - Metadata Display", () => {
  test("2.1 Display User Information (With GitHub Username)", async ({
    page,
  }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.waitForTimeout(500);
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // GitHub username link
      const usernameLink = page.getByRole("link", { name: "testuser" });
      await expect(usernameLink).toBeVisible();
      await expect(usernameLink).toHaveAttribute(
        "href",
        "https://github.com/testuser",
      );
      await expect(usernameLink).toHaveAttribute(
        "rel",
        "nofollow noopener noreferrer",
      );
      await expect(usernameLink).toHaveAttribute("target", "_blank");

      // GitHub avatar
      const avatar = page.locator('img[alt="testuser"]');
      await expect(avatar).toBeVisible();

      // Check user avatar appears in messages (not just header)
      const userMessageAvatars = page.locator('img[alt="testuser"]');
      await expect(userMessageAvatars.first()).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("2.3 Display Time Information", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Check for relative time format
      const timeText = await page
        .locator("text=/ago|just now/")
        .first()
        .textContent();
      expect(timeText).toMatch(/(ago|just now)/);
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("2.4 Display Message Count Statistics", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find and click the stats popover button
      const statsButton = page.getByRole("button", { name: /stats/i });
      await expect(statsButton).toBeVisible();
      await statsButton.click();

      // Wait for popover to open
      await page.waitForTimeout(300);

      // Verify the popover contains message statistics
      await expect(page.getByTestId("stats-messages-section")).toBeVisible();
      await expect(page.getByTestId("stats-user-count")).toBeVisible();
      await expect(page.getByTestId("stats-assistant-count")).toBeVisible();
      await expect(page.getByTestId("stats-tool-count")).toBeVisible();

      // Verify the "Tokens" section is visible (since we added usage data)
      const tokensSection = page.getByTestId("stats-tokens-section");
      await expect(tokensSection).toBeVisible();

      // Verify specific token fields are displayed
      await expect(
        tokensSection.getByText("Input", { exact: true }),
      ).toBeVisible();
      await expect(
        tokensSection.getByText("Output", { exact: true }),
      ).toBeVisible();
      await expect(
        tokensSection.getByText("Total", { exact: true }),
      ).toBeVisible();

      // Verify cache read tokens are displayed (we added cache_read_input_tokens in the test data)
      await expect(tokensSection.getByText(/cached/)).toBeVisible();

      // Close popover by clicking outside or pressing Escape
      await page.keyboard.press("Escape");
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Title Display", () => {
  test("3.2 Display Custom Title", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Title should be displayed as h1
      const title = page.getByRole("heading", {
        name: "Python Hello World Tutorial",
        level: 1,
      });
      await expect(title).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("3.7 View Title as Non-Owner", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      const title = page.getByRole("heading", {
        name: "Python Hello World Tutorial",
      });
      await expect(title).toBeVisible();

      // Hover over title
      await title.hover();

      // No pencil icon should appear for non-owner
      const pencilIcon = page
        .locator("svg")
        .filter({ hasText: /edit|pencil/i });
      await expect(pencilIcon).not.toBeVisible();

      // Title should not be clickable/editable
      await title.click();
      const inputField = page.locator('input[type="text"]');
      await expect(inputField).not.toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Message Rendering", () => {
  test("4.1 Render Basic Text Message (User)", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find user message (use first() to avoid TOC duplicate)
      const userMessage = page
        .getByText("Create a simple hello world program in Python")
        .first();
      await expect(userMessage).toBeVisible();

      // Verify it's in a user message container
      const messageContainer = userMessage.locator("..");
      await expect(messageContainer).toBeVisible();

      // Verify username is displayed in message header
      await expect(page.getByText("testuser").first()).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("4.2 Render Basic Text Message (Assistant)", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find assistant message
      const assistantMessage = page.getByText(
        "I've created a simple Python hello world program",
      );
      await expect(assistantMessage).toBeVisible();

      // Verify assistant name is displayed
      await expect(page.getByText("claude").first()).toBeVisible();

      // Verify assistant avatar is displayed
      const assistantAvatar = page.locator('img[alt="claude"]');
      await expect(assistantAvatar.first()).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Interactive Elements", () => {
  test("5.1 Display Collapsed Thinking Block (Default)", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find "Thinking" button/trigger
      const thinkingButton = page.getByRole("button", { name: /thinking/i });
      await expect(thinkingButton.first()).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("5.2 Expand Thinking Block", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Click to expand
      const thinkingButton = page.getByRole("button", { name: /thinking/i });
      await thinkingButton.first().click();

      // Verify thinking content is visible
      await expect(
        page.getByText("The user wants a simple Python hello world program"),
      ).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("6.1 Display Collapsed Tool Call (Default)", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find tool call header (Write tool)
      await expect(
        page.getByText("Write: /tmp/hello.py").first(),
      ).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("6.3 Display Bash Tool Call Preview", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find Bash tool call with command preview
      await expect(
        page.getByText(/Bash.*python \/tmp\/hello\.py/i).first(),
      ).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("6.4 Display Glob/Read Tool Call Previews", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Glob tool call
      await expect(page.getByText(/Glob.*\*\*\/\*\.py/i)).toBeVisible();

      // Read tool call
      await expect(page.getByText(/Read.*\/src\/main\.py/i)).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("6.5 Expand Tool Call - View Input Parameters", async ({ page }) => {
    const { transcript, user, prisma, pool } = await createTestTranscript();

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Write tool calls are expanded by default and show diff view
      // Verify the diff view header is visible
      await expect(page.getByText("Edit /tmp/hello.py").first()).toBeVisible();

      // Verify the code content from the diff is visible
      await expect(
        page.getByText("print('Hello, World!')").first(),
      ).toBeVisible();

      // Verify the unified/split view toggle is visible (use .first() for multiple Write tools)
      await expect(
        page.getByRole("button", { name: "Unified" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Split" }).first(),
      ).toBeVisible();
    } finally {
      // Cleanup first, then disconnect
      await cleanupTestData(user.id);
      // Close the connection we opened for this test
      await prisma.$disconnect();
      await pool.end();
    }
  });

  test("7.1 Display Code Block with Syntax Highlighting", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Find code block with Python code
      const codeBlock = page.locator("pre").filter({ hasText: /print/ });
      await expect(codeBlock.first()).toBeVisible();

      // Verify it's in a code block (monospace)
      const computedStyle = await codeBlock.first().evaluate((el) => {
        return window.getComputedStyle(el).fontFamily;
      });
      expect(computedStyle).toMatch(/mono/i);
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Share Functionality", () => {
  test("9.1 Share Button Visibility", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Share button should be visible
      const shareButton = page.getByRole("button", { name: /share/i });
      await expect(shareButton).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("9.2 Share - Copy URL to Clipboard", async ({ page, context }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Grant clipboard permissions
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      // Click share button
      const shareButton = page.getByRole("button", { name: /share/i });
      await shareButton.click();

      // Wait for copy to complete
      await page.waitForTimeout(500);

      // Verify button feedback (should show "Copied!" or checkmark)
      await expect(page.getByText(/copied/i)).toBeVisible();

      // Read clipboard content
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboardText).toContain(`/t/${transcript.secretToken}`);
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Owner Actions", () => {
  test("10.2 Delete Button Hidden for Non-Owner", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Delete button should NOT be visible for non-authenticated users
      const deleteButton = page.getByRole("button", { name: /delete/i });
      await expect(deleteButton).not.toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Responsive Design", () => {
  test("12.1 Mobile Layout (< 640px)", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Verify title is visible
      await expect(
        page.getByRole("heading", { name: "Python Hello World Tutorial" }),
      ).toBeVisible();

      // Verify messages are visible (use first() to avoid TOC)
      await expect(
        page.getByText("Create a simple hello world program in Python").first(),
      ).toBeVisible();

      // Share button should be visible (icon only on mobile, no text)
      // Look for button without text requirement since text is hidden on mobile
      const shareButton = page
        .locator("button")
        .filter({ has: page.locator("svg") })
        .first();
      await expect(shareButton).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("12.3 Desktop Layout (≥ 1024px)", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Verify all content is visible
      await expect(
        page.getByRole("heading", { name: "Python Hello World Tutorial" }),
      ).toBeVisible();
      await expect(page.getByText("testuser").first()).toBeVisible();
      await expect(
        page.getByText("Create a simple hello world program in Python").first(),
      ).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - System Messages", () => {
  test("13.1 Hide IDE Notification Messages", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // IDE notification should be hidden
      await expect(page.getByText("<ide_opened_file>")).not.toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });

  test("13.3 Display Bracket System Messages", async ({ page }) => {
    const { transcript, user } = await createTestTranscript();
    await page.waitForTimeout(500);

    try {
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Bracket message should be visible with special styling
      await expect(
        page.getByText("[Request interrupted by user]"),
      ).toBeVisible();
    } finally {
      await cleanupTestData(user.id);
    }
  });
});

test.describe("Transcript Page - Security", () => {
  test("18.3 XSS Prevention - Content Rendering", async ({ page }) => {
    const { prisma, pool } = createPrismaClient();

    try {
      // Create user
      const userId = `test-user-${generateId(8)}`;
      const testUser = await prisma.user.create({
        data: {
          id: userId,
          email: `test-${generateId(8)}@example.com`,
          name: "Test User",
          githubUsername: "xsstest",
        },
      });

      // Create transcript with XSS payload (using Claude Code format)
      const xssPayload = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Test message with <script>alert('xss')</script> payload"}]},"uuid":"xss-001","timestamp":"2024-01-01T10:00:00.000Z","parentUuid":null,"sessionId":"xss-session","cwd":"/test"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Response with <img src=x onerror=alert('xss2')> payload"}],"model":"claude-sonnet-4-5-20250929"},"uuid":"xss-002","timestamp":"2024-01-01T10:00:01.000Z","parentUuid":"xss-001","sessionId":"xss-session"}`;

      const transcript = await prisma.transcript.create({
        data: {
          userId: testUser.id,
          title: "XSS Test <script>alert('xss3')</script>",
          fileData: xssPayload,
          messageCount: 2,
          fileSizeBytes: Buffer.byteLength(xssPayload, "utf8"),
          source: "claude-code",
        },
      });

      // Listen for any dialog (alert, confirm, prompt) BEFORE navigation
      let dialogAppeared = false;
      page.on("dialog", async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      // Load page
      await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
      await page.waitForLoadState("load");

      // Wait a moment to see if any script tries to execute
      await page.waitForTimeout(1000);

      // Verify no script execution occurred
      expect(dialogAppeared).toBe(false);

      // Verify content is displayed as text (escaped) - use first() to handle TOC duplicates
      await expect(page.getByText(/script/i).first()).toBeVisible();
      await expect(page.getByText(/alert/i).first()).toBeVisible();

      await cleanupTestData(userId);
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  });
});
