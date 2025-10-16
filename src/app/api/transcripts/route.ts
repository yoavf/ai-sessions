import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { formatDlpFindings, scanForSensitiveData } from "@/lib/dlp";
import { parseJSONL } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { checkUploadRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transcripts = await prisma.transcript.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        secretToken: true,
        title: true,
        createdAt: true,
        fileData: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Parse each transcript to get message count
    const transcriptsWithMetadata = transcripts.map((transcript) => {
      const parsed = parseJSONL(transcript.fileData);
      return {
        id: transcript.id,
        secretToken: transcript.secretToken,
        title: transcript.title,
        createdAt: transcript.createdAt,
        messageCount: parsed.metadata.messageCount,
        fileSize: Buffer.byteLength(transcript.fileData, "utf8"),
      };
    });

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

    // Validate JSONL format
    try {
      parseJSONL(originalFileData);
    } catch (_err) {
      return NextResponse.json(
        { error: "Invalid JSONL format" },
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

    const transcript = await prisma.transcript.create({
      data: {
        userId: session.user.id,
        secretToken,
        title: title || "Untitled Transcript",
        source: "claude-code", // Web uploads are from Claude Code browser extension
        fileData,
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
