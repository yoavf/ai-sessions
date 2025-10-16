import { jwtVerify, SignJWT } from "jose";
import { nanoid } from "nanoid";
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
    console.error("NEXTAUTH_SECRET is not configured");
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
    console.error("JWT signing error:", error, {
      userId,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
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
      console.error("Database error during token verification:", dbError, {
        userId: typedPayload.sub,
        jti: typedPayload.jti,
      });
      throw new Error("System error: unable to verify token status");
    }

    if (!user) {
      // User definitely doesn't exist (not a DB error)
      throw new Error("User not found");
    }

    // If user has set cliTokensRevokedBefore, check if this token was issued before that
    if (user.cliTokensRevokedBefore) {
      const tokenIssuedAt = new Date(typedPayload.iat * 1000);
      if (tokenIssuedAt <= user.cliTokensRevokedBefore) {
        throw new Error("Token has been revoked");
      }
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
      console.error("Token verification error:", error.message, {
        errorType: error.constructor.name,
      });
    } else {
      console.error("Unknown token verification error:", error);
    }
    throw new Error("Token verification failed");
  }
}
