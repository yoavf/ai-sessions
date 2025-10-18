// e2e/fixtures/auth.ts

import { randomBytes } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

// Helper to generate random ID (similar to nanoid)
const generateId = (length: number = 8): string => {
  return randomBytes(length).toString("base64url").slice(0, length);
};

// Create Prisma client with pg adapter (same as production)
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

// Extend the test fixtures with an authenticated page
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page, context }, use) => {
    const prisma = createPrismaClient();

    try {
      // Create a unique test user
      const userId = `test-user-${generateId(8)}`;
      const testUser = await prisma.user.create({
        data: {
          id: userId,
          email: `test-${generateId(8)}@example.com`,
          name: "Test User",
          githubUsername: "testuser",
          emailVerified: new Date(),
        },
      });

      // Create a session for the test user (valid for 30 days)
      const sessionToken = generateId(32);
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          sessionToken,
          userId: testUser.id,
          expires,
        },
      });

      // Set the NextAuth session cookie in the browser context
      // NextAuth.js v5 uses 'authjs.session-token' as the default cookie name
      // When using 'url', Playwright automatically infers domain and path
      await context.addCookies([
        {
          name: "authjs.session-token",
          value: sessionToken,
          url: "http://localhost:3000",
          httpOnly: true,
          sameSite: "Lax",
          expires: Math.floor(expires.getTime() / 1000),
        },
      ]);

      // Navigate to homepage with authenticated session
      await page.goto("http://localhost:3000", { waitUntil: "load" });

      // Wait for authentication to be recognized by checking for authenticated UI elements
      // In authenticated state, "My Transcripts" link should be visible
      await page.waitForSelector("text=My Transcripts", { timeout: 10000 });

      // Use the authenticated page in the test
      await use(page);

      // Cleanup: Delete the test user and related data after the test
      // This ensures test isolation and prevents database pollution
      await prisma.session.deleteMany({
        where: { userId: testUser.id },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    } finally {
      await prisma.$disconnect();
    }
  },
});

export { expect };
