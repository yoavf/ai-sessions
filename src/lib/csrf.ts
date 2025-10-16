import { nanoid } from "nanoid";
import { cookies } from "next/headers";

const CSRF_TOKEN_COOKIE = "csrf-token";
const CSRF_TOKEN_HEADER = "x-csrf-token";

/**
 * Generate a CSRF token and set it in a cookie
 * Call this in server components or API routes that render forms
 */
export async function generateCsrfToken(): Promise<string> {
  const token = nanoid(32);
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return token;
}

/**
 * Get the current CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
}

/**
 * Verify CSRF token from request
 * Returns true if valid, false if invalid
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  // Get token from cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;

  // Get token from header
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}

/**
 * Middleware-style CSRF check for API routes
 * Returns null if valid, or a Response object with 403 error if invalid
 */
export async function checkCsrf(request: Request): Promise<Response | null> {
  // Only check non-GET requests
  if (request.method === "GET" || request.method === "HEAD") {
    return null;
  }

  const isValid = await verifyCsrfToken(request);

  if (!isValid) {
    return new Response(
      JSON.stringify({
        error: "Invalid CSRF token",
        message: "CSRF token validation failed. Please refresh and try again.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  return null;
}
