import { exec } from "node:child_process";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const execAsync = promisify(exec);

async function globalSetup() {
  console.log("🔧 Setting up test database...");

  // Ensure we're using the test database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!databaseUrl.includes("test")) {
    throw new Error(
      `DATABASE_URL does not appear to be a test database: ${databaseUrl}\n` +
        'Expected URL to contain "test" in the database name',
    );
  }

  console.log(`📊 Using database: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

  try {
    // Run Prisma migrations
    console.log("🔄 Applying Prisma migrations...");
    const { stdout, stderr } = await execAsync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    // Clean up existing test data
    console.log("🧹 Cleaning existing test data...");
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
      // Delete in correct order due to foreign key constraints
      await prisma.$transaction([
        prisma.session.deleteMany({}),
        prisma.account.deleteMany({}),
        prisma.transcript.deleteMany({}),
        prisma.user.deleteMany({}),
        prisma.verificationToken.deleteMany({}),
      ]);

      console.log("✅ Test database is ready!");
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  } catch (error) {
    console.error("❌ Failed to set up test database:", error);
    throw error;
  }
}

export default globalSetup;
