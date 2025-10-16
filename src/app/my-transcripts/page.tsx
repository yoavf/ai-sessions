"use client";

import { Check, Copy, Loader2, Plus, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addCsrfToken, useCsrfToken } from "@/hooks/useCsrfToken";

interface Transcript {
  id: string;
  secretToken: string;
  title: string;
  createdAt: string;
  messageCount: number;
  fileSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / k ** i)} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MyTranscriptsPage() {
  const { data: session } = useSession();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [cliToken, setCliToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [revokingTokens, setRevokingTokens] = useState(false);
  const router = useRouter();
  const csrfToken = useCsrfToken();

  const fetchTranscripts = useCallback(async () => {
    try {
      const response = await fetch("/api/transcripts");
      if (response.status === 401) {
        router.push("/auth/signin");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch transcripts");
      }
      const data = await response.json();
      setTranscripts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);

  async function handleDelete(secretToken: string) {
    if (!confirm("Are you sure you want to delete this transcript?")) {
      return;
    }

    // Ensure we have a CSRF token before proceeding
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setDeleting(secretToken);
    try {
      const response = await fetch(
        `/api/transcripts/${secretToken}`,
        addCsrfToken(csrfToken, {
          method: "DELETE",
        }),
      );

      if (!response.ok) {
        throw new Error("Failed to delete transcript");
      }

      // Remove from local state
      setTranscripts((prev) =>
        prev.filter((t) => t.secretToken !== secretToken),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete transcript");
    } finally {
      setDeleting(null);
    }
  }

  async function handleGenerateToken() {
    // Ensure we have a CSRF token before proceeding
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setGeneratingToken(true);
    try {
      const response = await fetch(
        "/api/cli/token",
        addCsrfToken(csrfToken, {
          method: "POST",
        }),
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to generate token");
      }
      const data = await response.json();
      setCliToken(data.token);
      setTokenCopied(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate token");
    } finally {
      setGeneratingToken(false);
    }
  }

  async function handleCopyToken() {
    if (!cliToken) return;
    try {
      await navigator.clipboard.writeText(cliToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch (_err) {
      alert("Failed to copy to clipboard");
    }
  }

  async function handleRevokeTokens() {
    const confirmed = confirm(
      "Are you sure you want to revoke all CLI tokens? This will invalidate all existing CLI authentication tokens. You'll need to generate a new token to use the CLI again.",
    );

    if (!confirmed) return;

    // Ensure we have a CSRF token before proceeding
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setRevokingTokens(true);
    try {
      const response = await fetch(
        "/api/account/revoke-cli-tokens",
        addCsrfToken(csrfToken, {
          method: "POST",
        }),
      );

      if (!response.ok) {
        throw new Error("Failed to revoke tokens");
      }

      alert("All CLI tokens have been revoked successfully.");
      setCliToken(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke tokens");
    } finally {
      setRevokingTokens(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = confirm(
      "Are you sure you want to delete your account? This will permanently delete:\n\n" +
        "• All your transcripts\n" +
        "• Your profile information (name, email, GitHub username)\n" +
        "• All session data\n\n" +
        "This action cannot be undone.",
    );

    if (!confirmed) return;

    const doubleConfirm = prompt(
      'To confirm, please type "DELETE" in all caps:',
    );

    if (doubleConfirm !== "DELETE") {
      alert("Account deletion cancelled.");
      return;
    }

    // Ensure we have a CSRF token before proceeding
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await fetch(
        "/api/account",
        addCsrfToken(csrfToken, {
          method: "DELETE",
        }),
      );

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Redirect to home after successful deletion
      alert(
        "Your account has been successfully deleted. You will now be signed out.",
      );
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete account");
      setDeletingAccount(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold">My Transcripts</h1>
                  <p className="text-muted-foreground mt-2">
                    Manage your uploaded Claude Code sessions
                  </p>
                </div>
                <Button asChild>
                  <Link href="/">
                    <Plus />
                    Upload New
                  </Link>
                </Button>
              </div>

              {transcripts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      You haven't uploaded any transcripts yet.
                    </p>
                    <Button asChild>
                      <Link href="/">Go to Home to Upload</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <div className="divide-y">
                    {transcripts.map((transcript) => (
                      <div
                        key={transcript.id}
                        className="p-6 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/t/${transcript.secretToken}`}
                              className="block group"
                            >
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                                {transcript.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{formatDate(transcript.createdAt)}</span>
                              <span>•</span>
                              <span>{transcript.messageCount} messages</span>
                              <span>•</span>
                              <span>{formatBytes(transcript.fileSize)}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleDelete(transcript.secretToken)}
                            disabled={deleting === transcript.secretToken}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deleting === transcript.secretToken
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {!loading && !error && (
                <Card className="mt-12">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Terminal className="w-5 h-5" />
                      <h2 className="text-lg font-semibold">CLI Access</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate an authentication token to upload transcripts
                      from the command line. Tokens are valid for 90 days.
                    </p>

                    {!cliToken ? (
                      <div className="space-y-4">
                        <Button
                          type="button"
                          onClick={handleGenerateToken}
                          disabled={generatingToken}
                        >
                          {generatingToken
                            ? "Generating..."
                            : "Generate CLI Token"}
                        </Button>

                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h3 className="text-sm font-semibold mb-2">
                            Usage Instructions
                          </h3>
                          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                            <li>Generate a token using the button above</li>
                            <li>
                              Copy the token and configure it in your CLI tool
                            </li>
                            <li>
                              Upload transcripts:{" "}
                              <code className="bg-muted px-1 py-0.5 rounded">
                                aisessions upload session.jsonl
                              </code>
                            </li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Alert>
                          <AlertDescription className="space-y-2">
                            <p className="font-semibold">
                              Make sure to copy your token now. You won't be
                              able to see it again!
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">
                                {cliToken}
                              </code>
                              <Button
                                type="button"
                                onClick={handleCopyToken}
                                variant="outline"
                                size="sm"
                                className="min-w-[90px]"
                              >
                                {tokenCopied ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>

                        <Button
                          type="button"
                          onClick={() => setCliToken(null)}
                          variant="outline"
                          size="sm"
                        >
                          Close
                        </Button>
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-sm font-semibold mb-2">
                        Revoke All CLI Tokens
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        If you believe a token has been compromised, you can
                        revoke all existing CLI tokens.
                      </p>
                      <Button
                        type="button"
                        onClick={handleRevokeTokens}
                        disabled={revokingTokens}
                        variant="outline"
                        size="sm"
                      >
                        {revokingTokens ? "Revoking..." : "Revoke All Tokens"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!loading && !error && (
                <Card className="mt-12 border-2 border-destructive/20">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-destructive mb-2">
                      Delete Account
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <Button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      variant="destructive"
                    >
                      {deletingAccount
                        ? "Deleting Account..."
                        : "Delete My Account"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
