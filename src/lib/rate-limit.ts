import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { log } from "./logger";

// Create Redis client - will use KV_REST_API_URL and KV_REST_API_TOKEN from Vercel KV
let redis: Redis | null = null;
let uploadRateLimit: Ratelimit | null = null;
let viewRateLimit: Ratelimit | null = null;
let accountRateLimit: Ratelimit | null = null;
let editRateLimit: Ratelimit | null = null;

// Only initialize if Vercel KV credentials are available
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  // Rate limit for uploads: 10 uploads per hour per user
  uploadRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:upload",
  });

  // Rate limit for viewing transcripts: 100 views per 5 minutes per IP
  viewRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "5 m"),
    analytics: true,
    prefix: "ratelimit:view",
  });

  // Rate limit for account operations: 5 requests per hour per user
  accountRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "ratelimit:account",
  });

  // Rate limit for edit operations: 50 edits per hour per user
  editRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 h"),
    analytics: true,
    prefix: "ratelimit:edit",
  });
} else {
  log.warn(
    "Rate limiting disabled: KV_REST_API_URL and KV_REST_API_TOKEN not configured",
  );
}

export async function checkUploadRateLimit(userId: string): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  error?: string;
}> {
  if (!uploadRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  try {
    const { success, limit, remaining } = await uploadRateLimit.limit(
      `upload:${userId}`,
    );
    return { success, limit, remaining };
  } catch (error) {
    // Redis/Upstash error - FAIL CLOSED for security
    log.error("Upload rate limit check failed (Redis error)", {
      userId,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Rate limit service unavailable",
    };
  }
}

export async function checkViewRateLimit(identifier: string): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  error?: string;
}> {
  if (!viewRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  try {
    const { success, limit, remaining } = await viewRateLimit.limit(
      `view:${identifier}`,
    );
    return { success, limit, remaining };
  } catch (error) {
    // Redis/Upstash error - FAIL CLOSED for security
    log.error("View rate limit check failed (Redis error)", {
      identifier,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Rate limit service unavailable",
    };
  }
}

export async function checkAccountRateLimit(userId: string): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  error?: string;
}> {
  if (!accountRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  try {
    const { success, limit, remaining } = await accountRateLimit.limit(
      `account:${userId}`,
    );
    return { success, limit, remaining };
  } catch (error) {
    // Redis/Upstash error - FAIL CLOSED for security
    log.error("Account rate limit check failed (Redis error)", {
      userId,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Rate limit service unavailable",
    };
  }
}

export async function checkEditRateLimit(userId: string): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  error?: string;
}> {
  if (!editRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  try {
    const { success, limit, remaining } = await editRateLimit.limit(
      `edit:${userId}`,
    );
    return { success, limit, remaining };
  } catch (error) {
    // Redis/Upstash error - FAIL CLOSED for security
    log.error("Edit rate limit check failed (Redis error)", {
      userId,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Rate limit service unavailable",
    };
  }
}

/**
 * Helper to get client IP from request headers
 * Handles various proxy headers (X-Forwarded-For, X-Real-IP, etc.)
 */
export function getClientIp(request: Request): string {
  // Try various headers in order of preference
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a generic identifier if no IP found
  return "unknown";
}
