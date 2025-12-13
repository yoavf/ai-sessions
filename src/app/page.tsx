import Link from "next/link";
import { ExamplesLinks } from "@/components/ExamplesLinks";
import { SiteHeader } from "@/components/site-header";
import UploadDropzoneWithAuth from "@/components/UploadDropzoneWithAuth";
import { auth } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";

export default async function Home() {
  const session = await auth();

  // CSRF token is guaranteed to exist because middleware ensures it
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("CSRF token missing - middleware may not be running");
  }

  return (
    <div className="flex-1 bg-background flex flex-col">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 flex-1 flex items-center">
        <div className="max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-4 tracking-tight font-mono">
              ai_sessions
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              <ExamplesLinks />
            </p>
          </div>

          {/* Main content grid */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            {/* Left: Web Upload */}
            <div>
              <UploadDropzoneWithAuth
                isAuthenticated={!!session}
                csrfToken={csrfToken}
              />
            </div>

            {/* Center: OR divider */}
            <div className="hidden md:flex flex-col items-center text-muted-foreground/50">
              <div className="h-full w-px bg-border" />
              <span className="text-sm font-medium py-4">or</span>
              <div className="h-full w-px bg-border" />
            </div>

            {/* Right: CLI Upload */}
            <div className="flex flex-col justify-center">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Install:</p>
                  <code className="block bg-muted px-4 py-3 rounded-md font-mono text-xs border">
                    curl -fsSL https://aisessions.dev/install.sh | bash
                  </code>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Then run:
                  </p>
                  <div className="space-y-2">
                    <code className="block bg-muted px-4 py-2 rounded-md font-mono text-xs border">
                      aisessions login
                    </code>
                    <code className="block bg-muted px-4 py-2 rounded-md font-mono text-xs border">
                      aisessions upload
                    </code>
                  </div>
                </div>

                <div className="flex gap-4 text-xs pt-2">
                  <a
                    href="https://github.com/yoavf/ai-sessions-mcp/blob/main/install.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground underline"
                  >
                    View source
                  </a>
                  <Link
                    href="/help#cli-upload"
                    className="text-muted-foreground hover:text-foreground underline"
                  >
                    Full guide
                  </Link>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-8 pt-6 border-t">
                Also works as an{" "}
                <a
                  href="https://github.com/yoavf/ai-sessions-mcp#setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  MCP server
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
