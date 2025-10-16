import { ImageResponse } from "next/og";
import {
  generateDefaultTitle,
  isUuidOrSessionId,
  parseJSONL,
} from "@/lib/parser";
import { prisma } from "@/lib/prisma";

export const alt = "AI Session Transcript";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

interface Props {
  params: Promise<{ token: string }>;
}

// Map source values to display names
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "gemini-cli": "Gemini CLI",
};

export default async function Image({ params }: Props) {
  const { token } = await params;

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { secretToken: token },
      select: {
        title: true,
        source: true,
        createdAt: true,
        fileData: true,
        user: {
          select: {
            githubUsername: true,
          },
        },
      },
    });

    if (!transcript) {
      return new ImageResponse(
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0a",
          }}
        >
          <h1 style={{ fontSize: "48px", color: "#999" }}>
            Transcript Not Found
          </h1>
        </div>,
        { ...size },
      );
    }

    const parsed = parseJSONL(transcript.fileData);

    // Determine if we have a custom title or need to generate one
    const hasCustomTitle =
      transcript.title && !isUuidOrSessionId(transcript.title);
    const title = hasCustomTitle
      ? transcript.title
      : generateDefaultTitle(transcript.source, transcript.createdAt);

    const username = transcript.user?.githubUsername || "Anonymous";
    const messageCount = parsed.metadata.messageCount;
    const source = SOURCE_DISPLAY_NAMES[transcript.source] || transcript.source;
    const date = new Date(transcript.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)",
          backgroundSize: "100px 100px",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "60px",
          }}
        >
          <h2
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#fff",
              margin: 0,
            }}
          >
            AI Sessions
          </h2>
          {hasCustomTitle && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 20px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                fontSize: "18px",
                color: "#999",
              }}
            >
              {source}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {/* Title */}
          <h1
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#fff",
              margin: 0,
              marginBottom: "40px",
              lineHeight: 1.2,
              maxWidth: "1000px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title}
          </h1>

          {/* Metadata */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "28px",
                color: "#999",
              }}
            >
              <span style={{ marginRight: "12px" }}>👤</span>
              <span>{username}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "28px",
                color: "#999",
              }}
            >
              <span style={{ marginRight: "12px" }}>💬</span>
              <span>{messageCount} messages</span>
            </div>
            {hasCustomTitle && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "28px",
                  color: "#999",
                }}
              >
                <span style={{ marginRight: "12px" }}>📅</span>
                <span>{date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 24px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              fontSize: "20px",
              color: "#999",
            }}
          >
            aisessions.dev
          </div>
        </div>
      </div>,
      {
        ...size,
      },
    );
  } catch (error) {
    console.error("Failed to generate OG image:", error);
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <h1 style={{ fontSize: "48px", color: "#999" }}>Error Loading Image</h1>
      </div>,
      { ...size },
    );
  }
}
