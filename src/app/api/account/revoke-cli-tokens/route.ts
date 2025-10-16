import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { checkAccountRateLimit } from "@/lib/rate-limit";

/**
 * Revoke all CLI tokens for the authenticated user
 * Rate limited to 5 requests per hour per user
 */
export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 account operations per hour per user
    const rateLimitResult = await checkAccountRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message:
            "You can perform up to 5 account operations per hour. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit || 5),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // Update the user's cliTokensRevokedBefore to now
    // This will invalidate all tokens issued before this moment
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cliTokensRevokedBefore: new Date() },
    });

    return NextResponse.json(
      {
        success: true,
        message: "All CLI tokens have been revoked successfully",
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit || 5),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining || 0),
        },
      },
    );
  } catch (error) {
    console.error("Revoke CLI tokens error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
