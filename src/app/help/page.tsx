import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Help - AI Sessions",
  description:
    "Help and FAQ for AI Sessions - Learn how to upload, manage, and share AI coding sessions.",
};

export default async function HelpPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-bold tracking-tight font-mono mb-6">
              help
            </h1>
            <nav className="flex flex-wrap gap-3 text-sm">
              <Link
                href="#getting-started"
                className="text-primary hover:underline"
              >
                Getting Started
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="#managing-transcripts"
                className="text-primary hover:underline"
              >
                Managing Transcripts
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="#cli-upload" className="text-primary hover:underline">
                CLI Upload
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="#account-management"
                className="text-primary hover:underline"
              >
                Account Management
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="#privacy-security"
                className="text-primary hover:underline"
              >
                Privacy & Security
              </Link>
            </nav>
          </div>

          <div className="space-y-6">
            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <section className="border rounded-lg p-6" id="getting-started">
              <h2 className="text-2xl font-semibold mb-6">Getting Started</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I upload a transcript?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Sign in with your GitHub account and drag a JSON or JSONL
                    file onto the{" "}
                    <Link href="/" className="text-primary hover:underline">
                      homepage
                    </Link>{" "}
                    or any existing transcript page. After uploading you'll be
                    able to edit the title.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Where do I find my transcripts?
                  </h3>
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="claude-code"
                    className="w-full"
                  >
                    <AccordionItem value="claude-code">
                      <AccordionTrigger className="text-sm font-medium">
                        Claude Code
                      </AccordionTrigger>
                      <AccordionContent>
                        <code className="block bg-muted p-3 rounded font-mono text-xs border">
                          ~/.claude/projects/&lt;project-name&gt;/&lt;session-id&gt;.jsonl
                        </code>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="codex">
                      <AccordionTrigger className="text-sm font-medium">
                        Codex
                      </AccordionTrigger>
                      <AccordionContent>
                        <code className="block bg-muted p-3 rounded font-mono text-xs border">
                          ~/.codex/sessions/&lt;year&gt;/&lt;month&gt;/&lt;day&gt;/&lt;session-id&gt;.jsonl
                        </code>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="gemini">
                      <AccordionTrigger className="text-sm font-medium">
                        Gemini CLI
                      </AccordionTrigger>
                      <AccordionContent>
                        <code className="block bg-muted p-3 rounded font-mono text-xs border">
                          ~/.gemini/tmp/&lt;project-hash&gt;/chats/session-&lt;timestamp&gt;.json
                        </code>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="mistral-vibe">
                      <AccordionTrigger className="text-sm font-medium">
                        Mistral Vibe
                      </AccordionTrigger>
                      <AccordionContent>
                        <code className="block bg-muted p-3 rounded font-mono text-xs border">
                          ~/.vibe/logs/session/session_&lt;timestamp&gt;_&lt;session-id&gt;.json
                        </code>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </section>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <section
              className="border rounded-lg p-6"
              id="managing-transcripts"
            >
              <h2 className="text-2xl font-semibold mb-6">
                Managing Transcripts
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I delete a transcript?
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    On{" "}
                    <Link
                      href="/my-transcripts"
                      className="text-primary hover:underline"
                    >
                      My Transcripts
                    </Link>
                    , click the "Delete" button next to the transcript you want
                    to remove.
                  </p>
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      Deletion is permanent. The transcript and its URL cannot
                      be recovered.
                    </AlertDescription>
                  </Alert>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Can I edit a transcript after uploading?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    No. Delete and re-upload if you need to make changes.
                  </p>
                </div>
              </div>
            </section>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <section className="border rounded-lg p-6" id="cli-upload">
              <h2 className="text-2xl font-semibold mb-6">CLI Upload</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I install the CLI?
                  </h3>
                  <div className="text-muted-foreground text-sm space-y-2">
                    <p>Quick install (macOS/Linux/Windows):</p>
                    <code className="block bg-muted px-3 py-2 rounded font-mono text-xs border">
                      curl -fsSL https://aisessions.dev/install.sh | bash
                    </code>
                    <p className="text-xs pt-1">
                      <a
                        href="https://github.com/yoavf/ai-sessions-mcp/blob/main/install.sh"
                        target="_blank"
                        className="text-primary hover:underline"
                        rel="noopener noreferrer"
                      >
                        View source
                      </a>{" "}
                      · Supports macOS, Linux, and Windows (x64/ARM64)
                    </p>
                    <p className="text-xs">
                      Windows users: Run in Git Bash or WSL
                    </p>
                    <p className="pt-2">Custom install directory:</p>
                    <code className="block bg-muted px-3 py-2 rounded font-mono text-xs border">
                      INSTALL_DIR=$HOME/bin curl -fsSL
                      https://aisessions.dev/install.sh | bash
                    </code>
                    <p className="pt-2">Manual download:</p>
                    <p className="text-xs">
                      Download pre-built binaries from{" "}
                      <a
                        href="https://github.com/yoavf/ai-sessions-mcp/releases"
                        target="_blank"
                        className="text-primary hover:underline"
                        rel="noopener noreferrer"
                      >
                        GitHub Releases
                      </a>
                      .
                    </p>
                    <p className="text-xs pt-2">
                      The{" "}
                      <a
                        href="https://github.com/yoavf/ai-sessions-mcp"
                        target="_blank"
                        className="text-primary hover:underline"
                        rel="noopener"
                      >
                        ai-sessions-mcp
                      </a>{" "}
                      tool also works as an MCP server for accessing transcripts
                      across coding agents.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I upload transcripts?
                  </h3>
                  <div className="text-muted-foreground text-sm space-y-2">
                    <p>Authenticate:</p>
                    <code className="block bg-muted px-3 py-2 rounded font-mono text-xs border">
                      aisessions login
                    </code>
                    <p>Upload interactively:</p>
                    <code className="block bg-muted px-3 py-2 rounded font-mono text-xs border">
                      aisessions upload
                    </code>
                    <p>Or specify a file:</p>
                    <code className="block bg-muted px-3 py-2 rounded font-mono text-xs border">
                      aisessions upload /path/to/session.jsonl --title "Custom
                      Title"
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I revoke CLI tokens?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Click "Revoke All Tokens" in the CLI Access section on{" "}
                    <Link
                      href="/my-transcripts#cli-access"
                      className="text-primary hover:underline"
                    >
                      My Transcripts
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </section>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <section className="border rounded-lg p-6" id="account-management">
              <h2 className="text-2xl font-semibold mb-6">
                Account Management
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I delete my account?
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Use the "Delete Account" section on{" "}
                    <Link
                      href="/my-transcripts#delete-account"
                      className="text-primary hover:underline"
                    >
                      My Transcripts
                    </Link>
                    .
                  </p>
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-semibold text-sm">
                        This permanently deletes all your transcripts, profile
                        data, and CLI tokens.
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Can I recover my account after deletion?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    No. Deletion is immediate and permanent.
                  </p>
                </div>
              </div>
            </section>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <section className="border rounded-lg p-6" id="privacy-security">
              <h2 className="text-2xl font-semibold mb-6">
                Privacy & Security
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Who can view my transcripts?
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Anyone with the secret URL. Treat them as public links.
                  </p>
                  <Alert>
                    <AlertDescription className="text-sm">
                      Don't upload transcripts containing sensitive information,
                      credentials, or proprietary code.
                    </AlertDescription>
                  </Alert>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Why do I see [REDACTED] in my transcripts?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    AI Sessions use Google Cloud DLP to scan for API keys,
                    passwords, and PII. Detected items are replaced with
                    [REDACTED] to protect your privacy. There are likely false
                    positives, but better be safe than sorry.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Can we self-host an internal version of AI Sessions?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Yes! The source code is available on{" "}
                    <a
                      href="https://github.com/yoavf/ai-sessions"
                      target="_blank"
                      className="text-primary hover:underline"
                      rel="noopener"
                    >
                      GitHub
                    </a>
                    , licensed under the MIT License.
                  </p>
                </div>
              </div>
            </section>

            <section className="border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Need More Help?</h2>
              <p className="text-muted-foreground text-sm">
                Check our{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                , or open an issue on{" "}
                <a
                  href="https://github.com/yoavf/ai-sessions/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
