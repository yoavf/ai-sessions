// Seed file for transcript page test planning
// This creates a comprehensive test transcript with various content types

import { randomBytes } from "node:crypto";
import { test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

// Helper to generate random ID
const generateId = (length: number = 8): string => {
  return randomBytes(length).toString("base64url").slice(0, length);
};

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

// Comprehensive sample transcript with various content types
// Note: This is in Claude Messages API format (not the full Claude Code session format)
// The upload handler will still detect it as claude-code source based on content patterns
const comprehensiveTranscriptJSONL = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Create a simple hello world program in Python"}]},"uuid":"msg-001","timestamp":"2024-01-01T10:00:00.000Z","sessionId":"test-session","cwd":"/test/path"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"The user wants a simple Python hello world program. I'll use the Write tool to create a hello.py file with a basic print statement."},{"type":"tool_use","id":"toolu_01ABC123","name":"Write","input":{"file_path":"/tmp/hello.py","content":"print('Hello, World!')"}}],"usage":{"input_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":100,"output_tokens":150}},"uuid":"msg-002","timestamp":"2024-01-01T10:00:01.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01ABC123","content":"File written successfully"}]},"uuid":"msg-003","timestamp":"2024-01-01T10:00:02.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I've created a simple Python hello world program in /tmp/hello.py. The file contains:\\n\\n\`\`\`python\\nprint('Hello, World!')\\n\`\`\`"}],"usage":{"input_tokens":800,"cache_creation_input_tokens":0,"cache_read_input_tokens":200,"output_tokens":50}},"uuid":"msg-004","timestamp":"2024-01-01T10:00:03.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Now run it and show me the output"}]},"uuid":"msg-005","timestamp":"2024-01-01T10:00:04.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"I'll execute the Python file using the Bash tool to run it and show the output."},{"type":"tool_use","id":"toolu_02DEF456","name":"Bash","input":{"command":"python /tmp/hello.py"}}],"usage":{"input_tokens":900,"cache_creation_input_tokens":0,"cache_read_input_tokens":300,"output_tokens":100}},"uuid":"msg-006","timestamp":"2024-01-01T10:00:05.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_02DEF456","content":"Hello, World!","metadata":{"duration_seconds":0.5}}]},"uuid":"msg-007","timestamp":"2024-01-01T10:00:06.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"The program ran successfully and printed **'Hello, World!'** to the console."}],"usage":{"input_tokens":1000,"cache_creation_input_tokens":0,"cache_read_input_tokens":400,"output_tokens":30}},"uuid":"msg-008","timestamp":"2024-01-01T10:00:07.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Add error handling to the program"}]},"uuid":"msg-009","timestamp":"2024-01-01T10:00:08.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"I should add a try-except block to handle potential errors gracefully. This is good practice for any Python program."},{"type":"tool_use","id":"toolu_03GHI789","name":"Write","input":{"file_path":"/tmp/hello.py","content":"try:\\n    print('Hello, World!')\\nexcept Exception as e:\\n    print(f'Error: {e}')"}}],"usage":{"input_tokens":1100,"cache_creation_input_tokens":0,"cache_read_input_tokens":500,"output_tokens":120}},"uuid":"msg-010","timestamp":"2024-01-01T10:00:09.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_03GHI789","content":"File written successfully"}]},"uuid":"msg-011","timestamp":"2024-01-01T10:00:10.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I've updated the program with error handling using a try-except block. The new code is:\\n\\n\`\`\`python\\ntry:\\n    print('Hello, World!')\\nexcept Exception as e:\\n    print(f'Error: {e}')\\n\`\`\`\\n\\nThis will catch any exceptions and print them instead of crashing."}],"usage":{"input_tokens":1300,"cache_creation_input_tokens":0,"cache_read_input_tokens":600,"output_tokens":80}},"uuid":"msg-012","timestamp":"2024-01-01T10:00:11.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":"[Request interrupted by user]"},"uuid":"msg-013","timestamp":"2024-01-01T10:00:12.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Can you search for all Python files in the project?"}]},"uuid":"msg-014","timestamp":"2024-01-01T10:00:13.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_04JKL012","name":"Glob","input":{"pattern":"**/*.py"}}],"usage":{"input_tokens":1400,"cache_creation_input_tokens":0,"cache_read_input_tokens":700,"output_tokens":40}},"uuid":"msg-015","timestamp":"2024-01-01T10:00:14.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_04JKL012","content":"/tmp/hello.py\\n/src/main.py\\n/tests/test_main.py"}]},"uuid":"msg-016","timestamp":"2024-01-01T10:00:15.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I found 3 Python files in the project:\\n\\n1. /tmp/hello.py (our test file)\\n2. /src/main.py (main source)\\n3. /tests/test_main.py (test file)"}],"usage":{"input_tokens":1500,"cache_creation_input_tokens":0,"cache_read_input_tokens":800,"output_tokens":60}},"uuid":"msg-017","timestamp":"2024-01-01T10:00:16.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":"<ide_opened_file>/tmp/hello.py</ide_opened_file>"},"uuid":"msg-018","timestamp":"2024-01-01T10:00:17.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Read the main.py file"}]},"uuid":"msg-019","timestamp":"2024-01-01T10:00:18.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_05MNO345","name":"Read","input":{"file_path":"/src/main.py"}}],"usage":{"input_tokens":1600,"cache_creation_input_tokens":0,"cache_read_input_tokens":900,"output_tokens":35}},"uuid":"msg-020","timestamp":"2024-01-01T10:00:19.000Z","sessionId":"test-session"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_05MNO345","content":"def main():\\n    print('Main application')\\n\\nif __name__ == '__main__':\\n    main()","is_error":false}]},"uuid":"msg-021","timestamp":"2024-01-01T10:00:20.000Z","sessionId":"test-session"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"The main.py file contains a simple main function:\\n\\n\`\`\`python\\ndef main():\\n    print('Main application')\\n\\nif __name__ == '__main__':\\n    main()\\n\`\`\`"}],"usage":{"input_tokens":1800,"cache_creation_input_tokens":0,"cache_read_input_tokens":1000,"output_tokens":50}},"uuid":"msg-022","timestamp":"2024-01-01T10:00:21.000Z","sessionId":"test-session"}`;

test("seed transcript page", async ({ page }) => {
  const { prisma, pool } = createPrismaClient();

  try {
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

    // Create the comprehensive test transcript
    const transcript = await prisma.transcript.create({
      data: {
        userId: testUser.id,
        title: "Python Hello World Tutorial",
        fileData: comprehensiveTranscriptJSONL,
        messageCount: comprehensiveTranscriptJSONL.split("\n").length,
        fileSizeBytes: Buffer.byteLength(comprehensiveTranscriptJSONL, "utf8"),
        source: "claude-code",
      },
    });

    console.log(
      `✅ Test transcript created with token: ${transcript.secretToken}`,
    );
    console.log(`📍 URL: http://localhost:3000/t/${transcript.secretToken}`);

    // Navigate to the transcript page
    await page.goto(`http://localhost:3000/t/${transcript.secretToken}`);
    await page.waitForLoadState("load");

    // Keep the page open for manual exploration if needed
    // Comment out in CI/CD
    // await page.waitForTimeout(300000); // 5 minutes
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
});
