import { jwtVerify, SignJWT } from "jose";
import { nanoid } from "nanoid";
import { log } from "./logger";
import { prisma } from "./prisma";

const ISSUER = "aisessions";
const AUDIENCE = "cli";
const SCOPES = ["upload:create"];
const EXPIRATION = "90d"; // 90 days

interface CliTokenPayload {
  iss: string;
  aud: string;
  sub: string; // userId
  scope: string[];
  jti: string; // unique token identifier
  iat: number;
  exp: number;
}

/**
 * Signs a CLI token for the given user ID
 * Returns a JWT that expires in 90 days
 */
export async function signCliToken(userId: string): Promise<string> {
  if (!process.env.NEXTAUTH_SECRET) {
    log.error("NEXTAUTH_SECRET is not configured");
    throw new Error("Authentication system is not configured");
  }

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const jti = nanoid(16);

  try {
    const token = await new SignJWT({
      scope: SCOPES,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(userId)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(EXPIRATION)
      .sign(secret);

    return token;
  } catch (error) {
    log.error("JWT signing error", {
      userId,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to generate authentication token");
  }
}

/**
 * Verifies a CLI token and returns the payload
 * Checks signature, expiration, audience, scope, and revocation status
 */
export async function verifyCliToken(
  token: string,
): Promise<{ userId: string; jti: string; iat: number }> {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

  try {
    // Verify signature and standard claims
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    // Type assertion after verification
    const typedPayload = payload as unknown as CliTokenPayload;

    // Verify scope
    if (
      !typedPayload.scope ||
      !Array.isArray(typedPayload.scope) ||
      !typedPayload.scope.includes("upload:create")
    ) {
      throw new Error("Invalid token scope");
    }

    // Check if token has been revoked (with explicit database error handling)
    let user: { cliTokensRevokedBefore: Date | null } | null;
    try {
      user = await prisma.user.findUnique({
        where: { id: typedPayload.sub },
        select: { cliTokensRevokedBefore: true },
      });
    } catch (dbError) {
      // Database error - FAIL CLOSED for security
      // Cannot verify token revocation status, must reject
      log.error("Database error during token verification", {
        userId: typedPayload.sub,
        jti: typedPayload.jti,
        errorMessage:
          dbError instanceof Error ? dbError.message : String(dbError),
      });
      throw new Error("System error: unable to verify token status");
    }

    if (!user) {
      // User definitely doesn't exist (not a DB error)
      throw new Error("User not found");
    }

    // Check token revocation with constant-time behavior to mitigate timing attacks
    // Always perform the comparison, even if cliTokensRevokedBefore is null
    const tokenIssuedAt = new Date(typedPayload.iat * 1000);
    const revokedBefore = user.cliTokensRevokedBefore || new Date(0);

    // Both branches should take similar time
    // Use < instead of <= to avoid race conditions with tokens issued at exact same millisecond
    if (tokenIssuedAt < revokedBefore) {
      throw new Error("Token has been revoked");
    }

    return {
      userId: typedPayload.sub,
      jti: typedPayload.jti,
      iat: typedPayload.iat,
    };
  } catch (error) {
    // Propagate known user errors as-is, sanitize system errors
    if (error instanceof Error) {
      // These are expected user-facing errors - propagate as-is
      if (
        error.message.includes("User not found") ||
        error.message.includes("Token has been revoked") ||
        error.message.includes("Invalid token scope") ||
        error.message.includes("System error")
      ) {
        throw error;
      }
      // JWT verification errors - log details but return generic message
      log.error("Token verification error", {
        errorMessage: error.message,
        errorType: error.constructor.name,
      });
    } else {
      log.error("Unknown token verification error", {
        errorMessage: String(error),
      });
    }
    throw new Error("Token verification failed");
  }
}
