import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client - will use UPSTASH_REDIS_KV_REST_API_URL and UPSTASH_REDIS_KV_REST_API_TOKEN from env
let redis: Redis | null = null;
let uploadRateLimit: Ratelimit | null = null;
let viewRateLimit: Ratelimit | null = null;
let accountRateLimit: Ratelimit | null = null;

// Only initialize if Upstash credentials are available
if (
  process.env.UPSTASH_REDIS_KV_REST_API_URL &&
  process.env.UPSTASH_REDIS_KV_REST_API_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_KV_REST_API_TOKEN,
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
} else {
  console.warn(
    "Rate limiting disabled: UPSTASH_REDIS_KV_REST_API_URL and UPSTASH_REDIS_KV_REST_API_TOKEN not configured",
  );
}

export async function checkUploadRateLimit(
  userId: string,
): Promise<{ success: boolean; limit?: number; remaining?: number }> {
  if (!uploadRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  const { success, limit, remaining } = await uploadRateLimit.limit(
    `upload:${userId}`,
  );
  return { success, limit, remaining };
}

export async function checkViewRateLimit(
  identifier: string,
): Promise<{ success: boolean; limit?: number; remaining?: number }> {
  if (!viewRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  const { success, limit, remaining } = await viewRateLimit.limit(
    `view:${identifier}`,
  );
  return { success, limit, remaining };
}

export async function checkAccountRateLimit(
  userId: string,
): Promise<{ success: boolean; limit?: number; remaining?: number }> {
  if (!accountRateLimit) {
    // Rate limiting not configured - allow request
    return { success: true };
  }

  const { success, limit, remaining } = await accountRateLimit.limit(
    `account:${userId}`,
  );
  return { success, limit, remaining };
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
