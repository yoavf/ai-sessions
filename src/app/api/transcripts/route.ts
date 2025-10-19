import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { formatDlpFindings, scanForSensitiveData } from "@/lib/dlp";
import {
  generateDefaultTitle,
  isUuidOrSessionId,
  parseJSONL,
} from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { detectProvider } from "@/lib/providers";
import { checkUploadRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use cached metadata fields instead of parsing fileData
    const transcripts = await prisma.transcript.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        secretToken: true,
        title: true,
        createdAt: true,
        messageCount: true,
        fileSizeBytes: true,
        source: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Return cached metadata directly (no parsing needed!)
    const transcriptsWithMetadata = transcripts.map((transcript) => ({
      id: transcript.id,
      secretToken: transcript.secretToken,
      title: transcript.title,
      createdAt: transcript.createdAt,
      messageCount: transcript.messageCount,
      fileSize: transcript.fileSizeBytes,
      source: transcript.source,
    }));

    return NextResponse.json(transcriptsWithMetadata);
  } catch (error) {
    console.error("Fetch transcripts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (10 uploads per hour per user)
    const rateLimitResult = await checkUploadRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      // Determine if this is a rate limit exceeded or infrastructure error
      const statusCode = rateLimitResult.error ? 503 : 429;
      const errorMessage = rateLimitResult.error
        ? rateLimitResult.error
        : "Rate limit exceeded";
      const userMessage = rateLimitResult.error
        ? "Rate limit service is temporarily unavailable. Please try again later."
        : "You can upload up to 10 transcripts per hour. Please try again later.";

      return NextResponse.json(
        {
          error: errorMessage,
          message: userMessage,
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        {
          status: statusCode,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit || 10),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const { fileData: originalFileData, title } = await request.json();

    if (!originalFileData || typeof originalFileData !== "string") {
      return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
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

    // Auto-detect transcript format
    let detectedSource = "claude-code"; // Default fallback
    try {
      const detection = detectProvider(originalFileData);
      detectedSource = detection.provider;

      // Log low-confidence detections
      if (detection.confidence === "low") {
        console.warn("Low confidence provider detection", {
          provider: detection.provider,
          fileSize: fileSizeBytes,
          preview: originalFileData.substring(0, 200),
        });
      }
    } catch (err) {
      console.error("Provider detection failed, falling back to claude-code", {
        error: err instanceof Error ? err.message : String(err),
        fileSize: fileSizeBytes,
        contentPreview: originalFileData.substring(0, 200),
      });
    }

    // Validate JSONL format and extract metadata
    let messageCount = 0;
    try {
      const parsed = parseJSONL(originalFileData, detectedSource);
      messageCount = parsed.metadata.messageCount;
    } catch (err) {
      console.error("Transcript parsing failed", {
        error: err instanceof Error ? err.message : String(err),
        provider: detectedSource,
        fileSize: fileSizeBytes,
        contentPreview: originalFileData.substring(0, 200),
      });

      // Provide specific error message from parser
      const errorMessage =
        err instanceof Error ? err.message : "Unknown parsing error";
      const formatType =
        detectedSource === "gemini-cli"
          ? "Gemini CLI JSON"
          : "transcript JSONL";

      return NextResponse.json(
        {
          error: "Invalid transcript format",
          message: `Failed to parse transcript: ${errorMessage}. Please ensure you're uploading a valid ${formatType} file.`,
        },
        { status: 400 },
      );
    }

    // Attempt to scan for sensitive data using Google Cloud DLP
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
    // Recalculate file size for final data (may have been scrubbed)
    const finalFileSizeBytes = Buffer.byteLength(fileData, "utf8");

    // Generate default title if none provided or if title is a UUID/session ID
    const createdAt = new Date();
    const finalTitle =
      title && !isUuidOrSessionId(title)
        ? title
        : generateDefaultTitle(detectedSource, createdAt);

    const transcript = await prisma.transcript.create({
      data: {
        userId: session.user.id,
        secretToken,
        title: finalTitle,
        source: detectedSource, // Auto-detected provider format
        fileData,
        messageCount,
        fileSizeBytes: finalFileSizeBytes,
        createdAt, // Use same date for consistency
      },
    });

    return NextResponse.json({
      secretToken: transcript.secretToken,
      id: transcript.id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
