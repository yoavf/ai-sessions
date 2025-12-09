import { NextResponse } from "next/server";
import { generateCsrfToken, getCsrfToken } from "@/lib/csrf";
import { log } from "@/lib/logger";

/**
 * GET endpoint to return CSRF token
 * Returns existing token from middleware if available, otherwise generates new one
 * The token is set in a cookie and also returned in the response
 */
export async function GET() {
  try {
    // Check if middleware already set a token
    let token = await getCsrfToken();

    // If no token exists (shouldn't happen with middleware), generate one
    if (!token) {
      token = await generateCsrfToken();
    }

    return NextResponse.json(
      { token },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    log.error("Error getting CSRF token", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to get CSRF token" },
      { status: 500 },
    );
  }
}
