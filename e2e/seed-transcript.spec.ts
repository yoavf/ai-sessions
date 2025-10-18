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
const comprehensiveTranscriptJSONL = `{"role":"user","content":[{"type":"text","text":"Create a simple hello world program in Python"}]}
{"role":"assistant","content":[{"type":"thinking","thinking":"The user wants a simple Python hello world program. I'll use the Write tool to create a hello.py file with a basic print statement."},{"type":"tool_use","id":"toolu_01ABC123","name":"Write","input":{"file_path":"/tmp/hello.py","content":"print('Hello, World!')"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01ABC123","content":"File written successfully"}]}
{"role":"assistant","content":[{"type":"text","text":"I've created a simple Python hello world program in /tmp/hello.py. The file contains:\\n\\n\`\`\`python\\nprint('Hello, World!')\\n\`\`\`"}]}
{"role":"user","content":[{"type":"text","text":"Now run it and show me the output"}]}
{"role":"assistant","content":[{"type":"thinking","thinking":"I'll execute the Python file using the Bash tool to run it and show the output."},{"type":"tool_use","id":"toolu_02DEF456","name":"Bash","input":{"command":"python /tmp/hello.py"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_02DEF456","content":"Hello, World!","metadata":{"duration_seconds":0.5}}]}
{"role":"assistant","content":[{"type":"text","text":"The program ran successfully and printed **'Hello, World!'** to the console."}]}
{"role":"user","content":[{"type":"text","text":"Add error handling to the program"}]}
{"role":"assistant","content":[{"type":"thinking","thinking":"I should add a try-except block to handle potential errors gracefully. This is good practice for any Python program."},{"type":"tool_use","id":"toolu_03GHI789","name":"Write","input":{"file_path":"/tmp/hello.py","content":"try:\\n    print('Hello, World!')\\nexcept Exception as e:\\n    print(f'Error: {e}')"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_03GHI789","content":"File written successfully"}]}
{"role":"assistant","content":[{"type":"text","text":"I've updated the program with error handling using a try-except block. The new code is:\\n\\n\`\`\`python\\ntry:\\n    print('Hello, World!')\\nexcept Exception as e:\\n    print(f'Error: {e}')\\n\`\`\`\\n\\nThis will catch any exceptions and print them instead of crashing."}]}
{"role":"user","content":"[Request interrupted by user]"}
{"role":"user","content":[{"type":"text","text":"Can you search for all Python files in the project?"}]}
{"role":"assistant","content":[{"type":"tool_use","id":"toolu_04JKL012","name":"Glob","input":{"pattern":"**/*.py"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_04JKL012","content":"/tmp/hello.py\\n/src/main.py\\n/tests/test_main.py"}]}
{"role":"assistant","content":[{"type":"text","text":"I found 3 Python files in the project:\\n\\n1. /tmp/hello.py (our test file)\\n2. /src/main.py (main source)\\n3. /tests/test_main.py (test file)"}]}
{"role":"user","content":"<ide_opened_file>/tmp/hello.py</ide_opened_file>"}
{"role":"user","content":[{"type":"text","text":"Read the main.py file"}]}
{"role":"assistant","content":[{"type":"tool_use","id":"toolu_05MNO345","name":"Read","input":{"file_path":"/src/main.py"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_05MNO345","content":"def main():\\n    print('Main application')\\n\\nif __name__ == '__main__':\\n    main()","is_error":false}]}
{"role":"assistant","content":[{"type":"text","text":"The main.py file contains a simple main function:\\n\\n\`\`\`python\\ndef main():\\n    print('Main application')\\n\\nif __name__ == '__main__':\\n    main()\\n\`\`\`"}]}`;

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
        messageCount: 20,
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
