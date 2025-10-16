import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { formatDlpFindings, scanForSensitiveData } from "@/lib/dlp";
import { verifyCliToken } from "@/lib/jwt";
import { parseJSONL } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { checkUploadRateLimit } from "@/lib/rate-limit";

/**
 * CLI upload endpoint
 * Requires Bearer token authentication
 * Accepts JSON with fileData and optional title
 */
export async function POST(request: Request) {
  try {
    // Extract and verify Bearer token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    let userId: string;
    try {
      const verified = await verifyCliToken(token);
      userId = verified.userId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Token verification failed";
      return NextResponse.json(
        {
          error: "Invalid or expired token",
          message: errorMessage,
        },
        { status: 401 },
      );
    }

    // Validate Content-Type
    const contentType = request.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json(
        {
          error: "Invalid Content-Type",
          message: "Content-Type must be application/json",
        },
        { status: 415 },
      );
    }

    // Rate limit: 10 uploads per hour per user (same as web)
    const rateLimitResult = await checkUploadRateLimit(userId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message:
            "You can upload up to 10 transcripts per hour. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit || 10),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // Parse request body
    const { fileData: originalFileData, title } = await request.json();

    if (!originalFileData || typeof originalFileData !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request body",
          message: "Request must include 'fileData' as a string",
        },
        { status: 400 },
      );
    }

    // Check file size limit (5MB)
    const fileSizeBytes = Buffer.byteLength(originalFileData, "utf8");
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (fileSizeBytes > maxSizeBytes) {
      return NextResponse.json(
        {
          error: "File too large",
          message: `File size ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB exceeds the 5MB limit.`,
        },
        { status: 400 },
      );
    }

    // Validate JSONL format
    try {
      parseJSONL(originalFileData);
    } catch (_err) {
      return NextResponse.json(
        {
          error: "Invalid file format",
          message:
            "File must be in JSONL format (newline-delimited JSON). Each line should be a valid JSON object.",
        },
        { status: 400 },
      );
    }

    // Scan for sensitive data using Google Cloud DLP
    const dlpResult = await scanForSensitiveData(originalFileData);

    // Determine final file data (original or scrubbed)
    let fileData = originalFileData;

    // Handle DLP results
    if (dlpResult.scrubbedContent) {
      // Content was modified (scrubbed or truncated)
      fileData = dlpResult.scrubbedContent;
    } else if (dlpResult.hasSensitiveData) {
      // Sensitive data found but no scrubbing - must block
      const message = formatDlpFindings(dlpResult);

      return NextResponse.json(
        {
          error: "Sensitive data detected",
          message: `Your transcript contains sensitive information that should not be uploaded publicly. ${message}`,
          findings: dlpResult.findings.map((f) => ({
            type: f.infoType,
            likelihood: f.likelihood,
          })),
        },
        { status: 400 },
      );
    }

    // Create transcript with unique secret token
    const secretToken = nanoid(16);

    const transcript = await prisma.transcript.create({
      data: {
        userId,
        secretToken,
        title: title || "Untitled Transcript",
        fileData,
      },
    });

    // Return success with secret URL info
    return NextResponse.json(
      {
        id: transcript.id,
        secretToken: transcript.secretToken,
        url: `${process.env.NEXTAUTH_URL || "https://aisessions.dev"}/t/${transcript.secretToken}`,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit || 10),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining || 0),
        },
      },
    );
  } catch (error) {
    console.error("CLI upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
