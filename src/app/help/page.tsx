import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Help - AI Sessions",
  description:
    "Help and FAQ for AI Sessions - Learn how to upload, manage, and share Claude Code transcripts.",
};

export default async function HelpPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Help</h1>
            <p className="text-muted-foreground mt-2">
              <s>Frequently</s>Future-ly asked questions about AI Sessions
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
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
                <Link
                  href="#cli-upload"
                  className="text-primary hover:underline"
                >
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
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <Card id="getting-started">
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How do I upload a transcript?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Sign in with your GitHub account and drag a .jsonl file onto
                    the{" "}
                    <Link href="/" className="text-primary hover:underline">
                      homepage
                    </Link>{" "}
                    or any existing transcript page. After uploading you'll be
                    able to edit the title.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Where do I find my Claude Code transcripts?
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Claude Code saves transcripts to:
                  </p>
                  <code className="block bg-muted p-3 rounded font-mono text-xs border">
                    ~/.claude/projects/
                  </code>
                </div>
              </CardContent>
            </Card>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <Card id="managing-transcripts">
              <CardHeader>
                <CardTitle>Managing Transcripts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <Card id="cli-upload">
              <CardHeader>
                <CardTitle>CLI Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Can I upload from the command line?
                  </h3>
                  <div className="text-muted-foreground text-sm space-y-2">
                    <p>
                      Yes! The{" "}
                      <a
                        href="https://github.com/yoavf/ai-sessions-mcp"
                        target="_blank"
                        className="text-primary hover:underline"
                        rel="noopener"
                      >
                        ai-sessions-mcp
                      </a>{" "}
                      executable also serves as an uploader for AI Sessions.{" "}
                      <br />
                      Download the pre-built binary or build from source. See
                      the{" "}
                      <a
                        href="https://github.com/yoavf/ai-sessions-mcp?tab=readme-ov-file#installation"
                        target="_blank"
                        className="text-primary hover:underline"
                        rel="noopener"
                      >
                        installation guide
                      </a>
                      .
                    </p>
                    <p className="text-xs pt-1">
                      (The tool also works as an MCP server for accessing
                      transcripts across coding agents)
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
              </CardContent>
            </Card>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <Card id="account-management">
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>

            {/* biome-ignore lint/correctness/useUniqueElementIds: Static IDs needed for anchor links in TOC */}
            <Card id="privacy-security">
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need More Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Check our{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
