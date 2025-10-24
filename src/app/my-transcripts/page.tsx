"use client";

import { Check, Copy, Loader2, Plus, Terminal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCsrfToken, useCsrfToken } from "@/hooks/useCsrfToken";

interface Transcript {
  id: string;
  secretToken: string;
  title: string;
  createdAt: string;
  messageCount: number;
  fileSize: number;
  source: string;
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

function formatSource(source: string): string {
  const sourceMap: Record<string, string> = {
    "claude-code": "Claude Code",
    "gemini-cli": "Gemini CLI",
    codex: "Codex",
    cli: "CLI",
  };
  return sourceMap[source] || source;
}

// Security: Auto-clear CLI token from client-side state after this timeout
// Rationale: Reduces exposure window if user leaves browser open unattended
// 2 minutes provides balance between security and usability for copying the token
const CLI_TOKEN_AUTO_CLEAR_MS = 120000; // 2 minutes

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
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const editFormRef = useRef<HTMLDivElement>(null);

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

  // Auto-clear CLI token from state after timeout for security
  useEffect(() => {
    if (cliToken) {
      const timer = setTimeout(() => {
        setCliToken(null);
      }, CLI_TOKEN_AUTO_CLEAR_MS);
      return () => clearTimeout(timer);
    }
  }, [cliToken]);

  // Scroll to hash anchor after data loads
  useEffect(() => {
    if (!loading && window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [loading]);

  const handleCancelEdit = useCallback(() => {
    setEditingToken(null);
    setEditedTitle("");
  }, []);

  // Close edit form when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        editingToken &&
        editFormRef.current &&
        !editFormRef.current.contains(event.target as Node)
      ) {
        handleCancelEdit();
      }
    }

    if (editingToken) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [editingToken, handleCancelEdit]);

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

  function handleStartEdit(transcript: Transcript) {
    setEditingToken(transcript.secretToken);
    setEditedTitle(transcript.title);
  }

  async function handleSaveTitle(secretToken: string) {
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    const trimmedTitle = editedTitle.trim();
    if (!trimmedTitle) {
      alert("Title cannot be empty");
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch(
        `/api/transcripts/${secretToken}`,
        addCsrfToken(csrfToken, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: trimmedTitle }),
        }),
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update title");
      }

      // Update local state
      setTranscripts((prev) =>
        prev.map((t) =>
          t.secretToken === secretToken ? { ...t, title: trimmedTitle } : t,
        ),
      );

      // Exit edit mode
      setEditingToken(null);
      setEditedTitle("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update title");
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8 flex-1">
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
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h1 className="text-5xl font-bold tracking-tight font-mono mb-4">
                    my_transcripts
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Manage your uploaded sessions
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
                <div className="border rounded-lg p-12 text-center">
                  <p className="text-muted-foreground mb-6">
                    You haven't uploaded any transcripts yet.
                  </p>
                  <Button asChild>
                    <Link href="/">Go to Home to Upload</Link>
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {transcripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className="p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingToken === transcript.secretToken ? (
                            <div
                              ref={editFormRef}
                              className="flex items-center gap-2"
                            >
                              <Input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveTitle(transcript.secretToken);
                                  } else if (e.key === "Escape") {
                                    handleCancelEdit();
                                  }
                                }}
                                disabled={savingTitle}
                                className="flex-1"
                                autoFocus
                                aria-label="Edit transcript title"
                              />
                              <Button
                                type="button"
                                onClick={() =>
                                  handleSaveTitle(transcript.secretToken)
                                }
                                disabled={savingTitle}
                                size="sm"
                                variant="default"
                                aria-label="Save title"
                              >
                                {savingTitle ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={savingTitle}
                                size="sm"
                                variant="ghost"
                                aria-label="Cancel editing"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/title">
                              <h3 className="text-lg font-semibold truncate">
                                <Link
                                  href={`/t/${transcript.secretToken}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {transcript.title}
                                </Link>
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(transcript)}
                                className="text-sm text-muted-foreground hover:text-primary opacity-0 group-hover/title:opacity-100 group-focus-within/title:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                                aria-label={`Edit title: ${transcript.title}`}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{formatDate(transcript.createdAt)}</span>
                            <span>•</span>
                            <span className="text-primary font-medium">
                              {formatSource(transcript.source)}
                            </span>
                            <span>•</span>
                            <span>{transcript.messageCount} messages</span>
                            <span>•</span>
                            <span>{formatBytes(transcript.fileSize)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          data-testid={`delete-transcript-${transcript.secretToken}`}
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
              )}

              {!loading && !error && (
                // biome-ignore lint/correctness/useUniqueElementIds: Static ID needed for anchor link from help page
                <div className="mt-12 border rounded-lg p-6" id="cli-access">
                  <div className="flex items-center gap-2 mb-4">
                    <Terminal className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">CLI Access</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate an authentication token to upload transcripts from
                    the command line. Tokens are valid for 90 days.
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
                            Make sure to copy your token now. You won't be able
                            to see it again!
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <code
                              data-testid="cli-token"
                              className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all"
                            >
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
                </div>
              )}

              {!loading && !error && (
                // biome-ignore lint/correctness/useUniqueElementIds: Static ID needed for anchor link from help page
                <div
                  className="mt-12 border-2 border-destructive/20 rounded-lg p-6"
                  id="delete-account"
                >
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
