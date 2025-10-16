import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { checkAccountRateLimit } from "@/lib/rate-limit";

export async function DELETE(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit account operations (5 per hour per user)
    const rateLimitResult = await checkAccountRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many account operations. Please try again later.",
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

    // Delete user account (cascade will delete all related records)
    // This includes: transcripts, sessions, and accounts
    await prisma.user.delete({
      where: {
        id: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
