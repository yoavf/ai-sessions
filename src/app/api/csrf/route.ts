import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

/**
 * GET endpoint to generate and return a CSRF token
 * The token is set in a cookie and also returned in the response
 */
export async function GET() {
  try {
    const token = await generateCsrfToken();

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
    console.error("Error generating CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 },
    );
  }
}
