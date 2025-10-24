import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_TOKEN_LENGTH } from "@/lib/csrf";

const CSRF_TOKEN_COOKIE = "csrf-token";

/**
 * Middleware to ensure CSRF token cookie exists before page renders
 * This runs on every request and ensures a consistent token is available
 * for both server-side reading and client-side usage
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Check if CSRF token cookie already exists
  const existingToken = request.cookies.get(CSRF_TOKEN_COOKIE);

  if (!existingToken) {
    // Generate new token if none exists
    const newToken = nanoid(CSRF_TOKEN_LENGTH);

    // Set cookie with same options as in csrf.ts
    response.cookies.set(CSRF_TOKEN_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
  }

  return response;
}

// Run middleware on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: API routes are included to ensure CSRF tokens are available
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
