"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Bot,
  Check,
  Hammer,
  Pencil,
  Share2,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { addCsrfToken, useCsrfToken } from "@/hooks/useCsrfToken";
import {
  getAssistantIconPath,
  getShortAssistantName,
} from "@/lib/source-utils";
import type { ParsedTranscript, TranscriptMetadata } from "@/types/transcript";
import FloatingTOC from "./FloatingTOC";
import MessageRenderer from "./MessageRenderer";

// System XML tags to hide (IDE notifications, hooks, etc.)
const SYSTEM_XML_TAGS = [
  "ide_opened_file",
  "ide_selection",
  "ide_diagnostics",
  "post-tool-use-hook",
  "system-reminder",
  "user-prompt-submit-hook",
  "local-command-stdout",
  "environment_context",
] as const;

// Helper functions for message type checking
function isToolResultMessage(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((block) => block.type === "tool_result")
  );
}

function isBashOutputMessage(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every(
      (block) => block.type === "bash-stdout" || block.type === "bash-stderr",
    )
  );
}

function isSystemMessageToHide(content: unknown): boolean {
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("Caveat:")) return true;
    for (const tag of SYSTEM_XML_TAGS) {
      if (trimmed.startsWith(`<${tag}>`)) return true;
    }
    return false;
  }

  if (Array.isArray(content) && content.length === 1) {
    const block = content[0];
    if (block.type === "text") {
      const trimmed = block.text.trim();
      if (trimmed.startsWith("Caveat:")) return true;
      for (const tag of SYSTEM_XML_TAGS) {
        if (trimmed.startsWith(`<${tag}>`)) return true;
      }
    }
  }

  return false;
}

function isBracketSystemMessage(content: unknown): {
  isSystemMessage: boolean;
  text: string;
} {
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return { isSystemMessage: true, text: trimmed };
    }
  }

  if (Array.isArray(content) && content.length === 1) {
    const block = content[0];
    if (block.type === "text") {
      const trimmed = block.text.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        return { isSystemMessage: true, text: trimmed };
      }
    }
  }

  return { isSystemMessage: false, text: "" };
}

interface TranscriptViewerProps {
  transcript: ParsedTranscript;
  title: string;
  source: string;
  createdAt: string;
  userImage?: string;
  githubUsername?: string;
  isOwner: boolean;
  transcriptId: string;
  secretToken: string;
  cachedMetadata?: TranscriptMetadata;
}

// Format source display names
function formatSource(source: string): string {
  const sourceMap: Record<string, string> = {
    "claude-code": "Claude Code",
    "gemini-cli": "Gemini CLI",
    codex: "Codex",
    cli: "CLI",
  };
  return sourceMap[source] || source;
}

export default function TranscriptViewer({
  transcript,
  title: initialTitle,
  source,
  createdAt,
  userImage,
  githubUsername,
  isOwner,
  secretToken,
  cachedMetadata = {},
}: TranscriptViewerProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const csrfToken = useCsrfToken();

  const handleTitleSave = async () => {
    if (!editedTitle.trim() || editedTitle === title) {
      setIsEditingTitle(false);
      setEditedTitle(title);
      return;
    }

    // Ensure we have a CSRF token before proceeding
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/transcripts/${secretToken}`,
        addCsrfToken(csrfToken, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: editedTitle }),
        }),
      );

      if (!response.ok) throw new Error("Failed to update title");

      setTitle(editedTitle);
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
      alert("Failed to update title");
      setEditedTitle(title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareClick = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transcript? This action cannot be undone.",
    );

    if (!confirmed) return;

    // Ensure we have a CSRF token before proceeding
    if (!csrfToken) {
      alert(
        "Security token not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/transcripts/${secretToken}`,
        addCsrfToken(csrfToken, {
          method: "DELETE",
        }),
      );

      if (!response.ok) throw new Error("Failed to delete transcript");

      // Redirect to home after successful deletion
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete transcript:", error);
      alert("Failed to delete transcript");
      setIsDeleting(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    .replace("about ", "")
    .replace("less than a minute ago", "just now")
    .replace(/(\d+) seconds? ago/, "$1s ago")
    .replace(/(\d+) minutes? ago/, "$1m ago")
    .replace(/(\d+) hours? ago/, "$1h ago")
    .replace(/(\d+) days? ago/, "$1d ago")
    .replace(/(\d+) weeks? ago/, "$1w ago")
    .replace(/(\d+) months? ago/, "$1mo ago")
    .replace(/(\d+) years? ago/, "$1y ago");

  // Use pre-calculated metadata from database
  // If metadata is missing, we just don't show those stats
  const userMessageCount = cachedMetadata.userMessageCount;
  const assistantMessageCount = cachedMetadata.assistantMessageCount;
  const toolCallCount = cachedMetadata.toolCallCount;
  const modelStats = cachedMetadata.modelStats || [];
  const tokenCounts = cachedMetadata.tokenCounts;

  // Extract user messages for TOC (only real user messages, excluding system messages and tool results)
  const tocItems = useMemo(() => {
    return transcript.messages
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => {
        if (!line.message || line.message.role !== "user") return false;

        // Check if this is a tool result or bash output message
        if (
          isToolResultMessage(line.message.content) ||
          isBashOutputMessage(line.message.content)
        ) {
          return false;
        }

        // Check if this is a system message to hide
        if (isSystemMessageToHide(line.message.content)) return false;

        // Check if this is a bracket system message like "[Request interrupted by user]"
        if (isBracketSystemMessage(line.message.content).isSystemMessage) {
          return false;
        }

        return true;
      })
      .map(({ line, index }) => {
        // Extract text preview from message content
        let text = "";
        if (typeof line.message?.content === "string") {
          text = line.message.content;
        } else if (Array.isArray(line.message?.content)) {
          const textBlocks = line.message.content.filter(
            (block) => block.type === "text",
          );
          if (textBlocks.length > 0) {
            text = textBlocks.map((block) => block.text).join(" ");
          }
        }

        // Remove leading XML tags from the preview
        // Pattern matches: <tagname>content</tagname> at the start, potentially multiple times
        text = text.trim().replace(/^(?:<[^>]+>.*?<\/[^>]+>\s*)+/, "");

        // Truncate to ~100 characters for preview
        text = text.trim().slice(0, 100);
        if (text.length === 100) {
          text += "...";
        }

        return {
          uuid: line.uuid,
          text: text || "User message",
          index,
        };
      });
  }, [transcript.messages]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSave();
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditedTitle(title);
                      }
                    }}
                    className="text-xl sm:text-2xl font-bold h-auto"
                    disabled={isSaving}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTitleSave}
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditingTitle(false);
                        setEditedTitle(title);
                      }}
                      disabled={isSaving}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : isOwner ? (
                <div
                  className="group relative inline-block cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit title"
                >
                  <h1 className="text-xl sm:text-2xl font-bold group-hover:text-muted-foreground break-words">
                    {title}
                  </h1>
                  <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -right-6 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block" />
                </div>
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold break-words">
                  {title}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-muted-foreground">
                {githubUsername && (
                  <>
                    <a
                      href={`https://github.com/${githubUsername}`}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                      {userImage && (
                        <img
                          src={userImage}
                          alt={githubUsername}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="hover:underline">{githubUsername}</span>
                    </a>
                    <span className="hidden sm:inline">•</span>
                  </>
                )}
                <span>{timeAgo}</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-muted-foreground">
                  {formatSource(source)}
                </span>
                {(userMessageCount !== undefined ||
                  assistantMessageCount !== undefined ||
                  toolCallCount !== undefined ||
                  modelStats.length > 0 ||
                  tokenCounts) && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 hover:bg-muted"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span className="ml-1">Stats</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm">
                            Session Statistics
                          </h4>

                          {/* Message counts */}
                          {(userMessageCount !== undefined ||
                            assistantMessageCount !== undefined ||
                            toolCallCount !== undefined) && (
                            <div
                              className="space-y-2"
                              data-testid="stats-messages-section"
                            >
                              <div className="text-xs font-medium text-muted-foreground">
                                Messages
                              </div>
                              <div className="space-y-1.5 text-sm">
                                {userMessageCount !== undefined && (
                                  <div
                                    className="flex items-center justify-between"
                                    data-testid="stats-user-count"
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-muted-foreground" />
                                      <span>User</span>
                                    </div>
                                    <span className="font-mono">
                                      {userMessageCount}
                                    </span>
                                  </div>
                                )}
                                {assistantMessageCount !== undefined && (
                                  <div
                                    className="flex items-center justify-between"
                                    data-testid="stats-assistant-count"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Bot className="w-4 h-4 text-muted-foreground" />
                                      <span>Assistant</span>
                                    </div>
                                    <span className="font-mono">
                                      {assistantMessageCount}
                                    </span>
                                  </div>
                                )}
                                {toolCallCount !== undefined && (
                                  <div
                                    className="flex items-center justify-between"
                                    data-testid="stats-tool-count"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Hammer className="w-4 h-4 text-muted-foreground" />
                                      <span>Tool calls</span>
                                    </div>
                                    <span className="font-mono">
                                      {toolCallCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Model stats */}
                          {modelStats.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">
                                Models
                              </div>
                              <div className="space-y-1.5 text-sm">
                                {modelStats.map((stat) => (
                                  <div
                                    key={stat.model}
                                    className="flex items-center justify-between"
                                  >
                                    <span>{stat.model}</span>
                                    <span className="font-mono text-muted-foreground">
                                      {stat.count} ({stat.percentage}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Token counts */}
                          {tokenCounts && (
                            <div
                              className="space-y-2"
                              data-testid="stats-tokens-section"
                            >
                              <div className="text-xs font-medium text-muted-foreground">
                                Tokens
                              </div>
                              <div className="space-y-1.5 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>Input</span>
                                  <span className="font-mono">
                                    {tokenCounts.inputTokens.toLocaleString()}
                                    {tokenCounts.cacheReadTokens !==
                                      undefined &&
                                      tokenCounts.cacheReadTokens > 0 && (
                                        <span className="text-green-600 dark:text-green-400 ml-1">
                                          (
                                          {tokenCounts.cacheReadTokens.toLocaleString()}{" "}
                                          cached)
                                        </span>
                                      )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Output</span>
                                  <span className="font-mono">
                                    {tokenCounts.outputTokens.toLocaleString()}
                                    {tokenCounts.thinkingTokens !== undefined &&
                                      tokenCounts.thinkingTokens > 0 && (
                                        <span className="text-purple-600 dark:text-purple-400 ml-1">
                                          (
                                          {tokenCounts.thinkingTokens.toLocaleString()}{" "}
                                          thinking)
                                        </span>
                                      )}
                                  </span>
                                </div>
                                {tokenCounts.cacheWriteTokens !== undefined &&
                                  tokenCounts.cacheWriteTokens > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        Cache write
                                      </span>
                                      <span className="font-mono text-muted-foreground">
                                        {tokenCounts.cacheWriteTokens.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                {tokenCounts.toolTokens !== undefined &&
                                  tokenCounts.toolTokens > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        Tool
                                      </span>
                                      <span className="font-mono text-muted-foreground">
                                        {tokenCounts.toolTokens.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                <div className="flex items-center justify-between border-t pt-1.5 mt-1.5 font-medium">
                                  <span>Total</span>
                                  <span className="font-mono">
                                    {tokenCounts.totalTokens.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleShareClick}
                variant={copied ? "default" : "default"}
                className={copied ? "bg-green-600 hover:bg-green-700" : ""}
                size="sm"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Copied!" : "Share"}
                </span>
              </Button>
              {isOwner && (
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {isDeleting ? "Deleting..." : "Delete"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout on large screens */}
      <div className="lg:flex lg:gap-0 w-full">
        {/* Main content area */}
        <div className="flex-1 lg:max-w-none min-w-0">
          <div className="container mx-auto px-4 py-8 max-w-4xl lg:pr-8">
            <div className="space-y-6">
              {transcript.messages.map((line, idx) => {
                if (!line.message) return null;

                const isUser = line.message.role === "user";

                // Check if this message is a tool result or bash output (should be grouped with parent)
                const shouldGroupWithParent =
                  isUser &&
                  (isToolResultMessage(line.message.content) ||
                    isBashOutputMessage(line.message.content));

                // Skip rendering tool results and bash outputs separately - they'll be rendered with their parent
                if (shouldGroupWithParent) {
                  return null;
                }

                // Find child messages that should be grouped with this message
                const childMessages = transcript.messages.filter((msg) => {
                  if (!msg.message || msg.parentUuid !== line.uuid)
                    return false;

                  const isChildUser = msg.message.role === "user";
                  return (
                    isChildUser &&
                    (isToolResultMessage(msg.message.content) ||
                      isBashOutputMessage(msg.message.content))
                  );
                });

                // Check if this is a system message to hide (Caveat or IDE notifications)
                if (isUser && isSystemMessageToHide(line.message.content)) {
                  return null;
                }

                // Check if this is a system-injected message like "[Request interrupted by user]"
                const bracketMessage = isUser
                  ? isBracketSystemMessage(line.message.content)
                  : { isSystemMessage: false, text: "" };

                // For system messages, render with special styling
                if (bracketMessage.isSystemMessage) {
                  return (
                    <div key={line.uuid || idx} className="flex justify-center">
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 italic flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-yellow-600 dark:text-yellow-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        {bracketMessage.text}
                        {line.timestamp && (
                          <span className="text-xs opacity-70 ml-2">
                            {format(new Date(line.timestamp), "HH:mm:ss")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <Message
                    key={line.uuid || idx}
                    id={`message-${line.uuid}`}
                    className="scroll-mt-24"
                    from={isUser ? "user" : "assistant"}
                  >
                    <MessageContent
                      variant="flat"
                      className={
                        isUser ? "!bg-accent !text-accent-foreground" : ""
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isUser ? (
                          <>
                            {userImage && (
                              <MessageAvatar
                                src={userImage}
                                name={githubUsername || "User"}
                                className="size-6"
                              />
                            )}
                            <span className="text-xs font-medium opacity-70">
                              {githubUsername || "User"}
                            </span>
                          </>
                        ) : (
                          <>
                            <MessageAvatar
                              src={getAssistantIconPath(source)}
                              name={getShortAssistantName(source)}
                              className="size-6"
                            />
                            <span className="text-xs font-medium opacity-70">
                              {getShortAssistantName(source)}
                            </span>
                          </>
                        )}
                        {line.timestamp && (
                          <span className="text-xs opacity-50">
                            {format(new Date(line.timestamp), "HH:mm:ss")}
                          </span>
                        )}
                      </div>
                      <MessageRenderer
                        message={line.message}
                        isUser={isUser}
                        childMessages={childMessages}
                        cwd={transcript.cwd}
                      />
                    </MessageContent>
                  </Message>
                );
              })}
            </div>
          </div>
        </div>

        {/* TOC Sidebar - sticky on large screens */}
        <aside className="lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:self-start lg:z-10">
          <FloatingTOC items={tocItems} />
        </aside>
      </div>
    </div>
  );
}
