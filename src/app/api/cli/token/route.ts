import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { signCliToken } from "@/lib/jwt";
import { checkAccountRateLimit } from "@/lib/rate-limit";

/**
 * Generate a CLI authentication token
 * Rate limited to 5 requests per hour per user
 * Protected with CSRF token
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

    // Rate limit: 5 token generations per hour per user
    const rateLimitResult = await checkAccountRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      // Determine if this is a rate limit exceeded or infrastructure error
      const statusCode = rateLimitResult.error ? 503 : 429;
      const errorMessage = rateLimitResult.error
        ? rateLimitResult.error
        : "Rate limit exceeded";
      const userMessage = rateLimitResult.error
        ? "Rate limit service is temporarily unavailable. Please try again later."
        : "You can generate up to 5 CLI tokens per hour. Please try again later.";

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

    // Generate JWT token
    const token = await signCliToken(session.user.id);

    // Calculate expiration date (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    return NextResponse.json(
      {
        token,
        expiresAt: expiresAt.toISOString(),
        message:
          "Make sure to copy your token now. You won't be able to see it again!",
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit || 5),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining || 0),
        },
      },
    );
  } catch (error) {
    console.error("CLI token generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
