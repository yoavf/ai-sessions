import { NextResponse } from "next/server";

const INSTALL_SCRIPT_URL =
  "https://raw.githubusercontent.com/yoavf/ai-sessions-mcp/main/install.sh";

export async function GET() {
  try {
    const response = await fetch(INSTALL_SCRIPT_URL, {
      // Always fetch a fresh copy from origin (bypass Next.js cache),
      // but allow downstream clients (CDN/browser) to cache for 5 minutes via Cache-Control header
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch install script: ${response.status} ${response.statusText}`,
      );
      return new NextResponse("Install script temporarily unavailable", {
        status: 503,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    const script = await response.text();

    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "text/x-shellscript",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        "Access-Control-Allow-Origin": "*", // Allow CORS for curl
      },
    });
  } catch (error) {
    console.error("Error fetching install script:", error);
    return new NextResponse("Failed to fetch install script", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
