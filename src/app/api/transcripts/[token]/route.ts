import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  checkEditRateLimit,
  checkViewRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // Rate limit public transcript views by IP (100 per 5 minutes)
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkViewRateLimit(clientIp);
    if (!rateLimitResult.success) {
      // Determine if this is a rate limit exceeded or infrastructure error
      const statusCode = rateLimitResult.error ? 503 : 429;
      const errorMessage = rateLimitResult.error
        ? rateLimitResult.error
        : "Rate limit exceeded";
      const userMessage = rateLimitResult.error
        ? "Rate limit service is temporarily unavailable. Please try again later."
        : "Too many requests. Please try again later.";

      return NextResponse.json(
        {
          error: errorMessage,
          message: userMessage,
        },
        {
          status: statusCode,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit || 100),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const transcript = await prisma.transcript.findUnique({
      where: {
        secretToken: token,
      },
      select: {
        id: true,
        title: true,
        fileData: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 },
      );
    }

    log.info("Transcript viewed", {
      transcriptId: transcript.id,
    });

    return NextResponse.json(transcript);
  } catch (error) {
    log.error("Fetch transcript error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit title updates (50 per hour per user)
    const rateLimitResult = await checkEditRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      const statusCode = rateLimitResult.error ? 503 : 429;
      const errorMessage = rateLimitResult.error
        ? rateLimitResult.error
        : "Rate limit exceeded";
      const userMessage = rateLimitResult.error
        ? "Rate limit service is temporarily unavailable. Please try again later."
        : "Too many requests. Please try again later.";

      return NextResponse.json(
        {
          error: errorMessage,
          message: userMessage,
        },
        {
          status: statusCode,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit || 50),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const { token } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Find transcript and verify ownership
    const transcript = await prisma.transcript.findUnique({
      where: {
        secretToken: token,
      },
      select: {
        userId: true,
      },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 },
      );
    }

    if (transcript.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the title
    const updated = await prisma.transcript.update({
      where: {
        secretToken: token,
      },
      data: {
        title,
      },
      select: {
        title: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error("Update transcript error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Find transcript and verify ownership
    const transcript = await prisma.transcript.findUnique({
      where: {
        secretToken: token,
      },
      select: {
        userId: true,
      },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 },
      );
    }

    if (transcript.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the transcript
    await prisma.transcript.delete({
      where: {
        secretToken: token,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Delete transcript error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
