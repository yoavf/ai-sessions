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
      // Determine if this is a rate limit exceeded or infrastructure error
      const statusCode = rateLimitResult.error ? 503 : 429;
      const errorMessage = rateLimitResult.error
        ? rateLimitResult.error
        : "Rate limit exceeded";
      const userMessage = rateLimitResult.error
        ? "Rate limit service is temporarily unavailable. Please try again later."
        : "You can perform up to 5 account operations per hour. Please try again later.";

      return NextResponse.json(
        {
          error: errorMessage,
          message: userMessage,
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        {
          status: statusCode,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit || 5),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // Update the user's cliTokensRevokedBefore to now
    // This will invalidate all tokens issued before this moment
    let updateResult: { cliTokensRevokedBefore: Date | null };
    try {
      updateResult = await prisma.user.update({
        where: { id: session.user.id },
        data: { cliTokensRevokedBefore: new Date() },
      });
    } catch (dbError) {
      console.error("Failed to revoke CLI tokens (database error):", dbError, {
        userId: session.user.id,
        errorType:
          dbError instanceof Error ? dbError.constructor.name : "Unknown",
      });

      return NextResponse.json(
        {
          error: "Failed to revoke tokens",
          message:
            "Unable to revoke tokens due to a system error. Your tokens are still active. Please try again or contact support if the issue persists.",
        },
        { status: 500 },
      );
    }

    // Verify the update was successful
    if (!updateResult || !updateResult.cliTokensRevokedBefore) {
      console.error("Token revocation succeeded but verification failed", {
        userId: session.user.id,
        updateResult,
      });

      return NextResponse.json(
        {
          error: "Revocation status unclear",
          message:
            "Token revocation may not have completed successfully. Please check your token status and try again if needed.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "All CLI tokens have been revoked successfully",
        revokedAt: updateResult.cliTokensRevokedBefore.toISOString(),
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit || 5),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining || 0),
        },
      },
    );
  } catch (error) {
    // This catch block should now only catch unexpected errors
    console.error("Unexpected error in token revocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
