/**
 * Codex transcript provider
 * Parses JSONL files exported from Codex/Pair CLI sessions
 */

import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";
import type { TranscriptProvider } from "./types";

/**
 * Codex event types (newer format with event wrapper)
 */
interface CodexEvent {
  timestamp: string;
  type: string;
  payload?: Record<string, unknown>;
}

/**
 * Codex direct types (older/simpler format without event wrapper)
 */
interface CodexDirectEntry {
  type?: string;
  record_type?: string;
  role?: "user" | "assistant";
  content?: Array<{ type: string; text?: string }>;
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: string;
  id?: string;
  timestamp?: string;
  summary?: Array<{ type: string; text?: string }>;
  // Session metadata fields (first line)
  instructions?: unknown;
  git?: {
    commit_hash?: string;
    branch?: string;
    repository_url?: string;
  };
}

interface SessionMetaPayload {
  id: string;
  timestamp: string;
  cwd?: string;
  originator?: string;
  cli_version?: string;
  git?: {
    commit_hash?: string;
    branch?: string;
    repository_url?: string;
  };
}

interface ResponseItemPayload {
  type: "message" | "function_call" | "function_call_output" | "reasoning";
  role?: "user" | "assistant";
  content?: Array<{ type: string; text?: string }>;
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: string;
  summary?: Array<{ type: string; text?: string }>;
}

interface TurnContextPayload {
  model?: string;
  cwd?: string;
}

/**
 * Type guard for SessionMetaPayload
 */
function isSessionMetaPayload(payload: unknown): payload is SessionMetaPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof (payload as SessionMetaPayload).id === "string"
  );
}

/**
 * Type guard for TurnContextPayload
 */
function _isTurnContextPayload(
  payload: unknown,
): payload is TurnContextPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const p = payload as Partial<TurnContextPayload>;
  return (
    (p.model === undefined || typeof p.model === "string") &&
    (p.cwd === undefined || typeof p.cwd === "string")
  );
}

/**
 * Type guard for ResponseItemPayload
 */
function isResponseItemPayload(
  payload: unknown,
): payload is ResponseItemPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    typeof (payload as ResponseItemPayload).type === "string"
  );
}

/**
 * Parse Codex tool result output
 * Normalizes Codex format {output: "...", metadata: {...}} to string content with optional metadata
 */
function parseCodexToolResult(output: unknown): {
  content: string;
  metadata?: { exit_code?: number; duration_seconds?: number };
} {
  try {
    const parsed = output ? JSON.parse(output as string) : output || "";

    // Check if this is Codex format: {output: "...", metadata: {...}}
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "output" in parsed &&
      typeof parsed.output === "string"
    ) {
      // Codex format - extract output and metadata
      const metadata =
        parsed.metadata && typeof parsed.metadata === "object"
          ? {
              exit_code: parsed.metadata.exit_code,
              duration_seconds: parsed.metadata.duration_seconds,
            }
          : undefined;
      return { content: parsed.output, metadata };
    }
    if (typeof parsed === "string") {
      return { content: parsed };
    }
    // Some other object format - stringify it
    return { content: JSON.stringify(parsed, null, 2) };
  } catch {
    // If not JSON, use as string
    return { content: (output as string) || "" };
  }
}

/**
 * Parse text that may contain <user_instructions> tags
 * Returns array of content blocks with proper splitting around tags
 */
function parseUserInstructions(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Check if text contains <user_instructions> tags
  const userInstructionsMatch = text.match(
    /<user_instructions>([\s\S]*?)<\/user_instructions>/,
  );

  if (userInstructionsMatch) {
    // Extract the instructions content
    const instructionsText = userInstructionsMatch[1].trim();

    // Get any text before the tag
    const beforeTag = text.substring(0, userInstructionsMatch.index).trim();
    if (beforeTag) {
      blocks.push({
        type: "text",
        text: beforeTag,
      });
    }

    // Add user instructions as special content block
    blocks.push({
      type: "user-instructions",
      text: instructionsText,
    });

    // Get any text after the tag
    const afterTag = text
      .substring(userInstructionsMatch.index! + userInstructionsMatch[0].length)
      .trim();
    if (afterTag) {
      blocks.push({
        type: "text",
        text: afterTag,
      });
    }
  } else {
    // No user_instructions tag, add as normal text
    blocks.push({
      type: "text",
      text,
    });
  }

  return blocks;
}

/**
 * Format OpenAI and other model names
 */
function formatCodexModelName(modelId: string): string | null {
  if (!modelId) return null;

  // Handle GPT models
  if (modelId.startsWith("gpt-")) {
    // gpt-4-turbo-2024-04-09 → GPT-4 Turbo
    // gpt-3.5-turbo → GPT-3.5 Turbo
    // gpt-4o → GPT-4o
    const parts = modelId.split("-");
    if (parts.length >= 2) {
      const version = parts[1]; // "4", "3.5"
      const variant = parts.slice(2).join("-"); // "turbo", "o", etc.

      if (variant.startsWith("turbo")) {
        return `GPT-${version.toUpperCase()} Turbo`;
      }
      if (variant === "o") {
        return `GPT-${version.toUpperCase()}o`;
      }
      return `GPT-${version.toUpperCase()}`;
    }
  }

  // Handle Claude models via OpenRouter
  if (modelId.includes("claude")) {
    // Extract claude model name (might be nested in openrouter path)
    const claudeMatch = modelId.match(/claude-([^/]+)/);
    if (claudeMatch) {
      const modelPart = claudeMatch[1];
      // claude-3-5-sonnet → Claude Sonnet 3.5
      const parts = modelPart.split("-");
      if (parts.length >= 3) {
        const family = parts[parts.length - 1]; // sonnet, opus, haiku
        const version = parts.slice(0, parts.length - 1).join(".");
        const familyCapitalized =
          family.charAt(0).toUpperCase() + family.slice(1);
        return `Claude ${familyCapitalized} ${version}`;
      }
    }
  }

  // Handle Gemini models
  if (modelId.includes("gemini")) {
    // gemini-2.5-flash → Gemini 2.5 Flash
    const geminiMatch = modelId.match(/gemini-([^/]+)/);
    if (geminiMatch) {
      const parts = geminiMatch[1].split("-");
      return `Gemini ${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")}`;
    }
  }

  // Return original if no pattern matches
  return modelId;
}

/**
 * Codex provider implementation
 */
export class CodexProvider implements TranscriptProvider {
  readonly name = "codex";
  readonly displayName = "Codex";

  /**
   * Detect if content is a Codex transcript
   * Handles both newer event-based format and older direct format
   */
  detect(content: string): boolean {
    try {
      const lines = content.trim().split("\n").slice(0, 10);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as CodexEvent & CodexDirectEntry;

          // Newer format: Check for session_meta event
          if (
            parsed.type === "session_meta" &&
            parsed.payload &&
            isSessionMetaPayload(parsed.payload)
          ) {
            if (parsed.payload.originator === "codex_exec") {
              return true;
            }
          }

          // Newer format: Check for turn_context event
          if (parsed.type === "turn_context") {
            return true;
          }

          // Newer format: Check for response_item structure
          if (
            parsed.type === "response_item" &&
            parsed.payload &&
            "type" in parsed.payload
          ) {
            return true;
          }

          // Older/direct format: Check for record_type field
          if (parsed.record_type === "state") {
            return true;
          }

          // Older/direct format: Check for git metadata in first line
          if (parsed.git && parsed.timestamp && parsed.id) {
            return true;
          }

          // Older/direct format: Check for reasoning with encrypted_content
          if (parsed.type === "reasoning" && "encrypted_content" in parsed) {
            return true;
          }
        } catch {
          // Skip invalid lines
        }
      }
    } catch {
      return false;
    }

    return false;
  }

  /**
   * Parse Codex JSONL transcript
   * Handles both newer event-based format and older direct format
   */
  parse(content: string): ParsedTranscript {
    const lines = content.trim().split("\n");
    const messages: TranscriptLine[] = [];
    let sessionId = "";
    let firstTimestamp = "";
    let lastTimestamp = "";
    let cwd = "";
    let gitBranch = "";
    let currentModel = "";

    // Temporary storage for building messages
    const currentMessage: {
      role?: "user" | "assistant";
      content: ContentBlock[];
    } = {
      content: [],
    };
    let messageTimestamp = "";
    let hasContent = false;

    const flushMessage = () => {
      if (hasContent && currentMessage.role) {
        const transcriptLine: TranscriptLine = {
          type: currentMessage.role,
          message: {
            role: currentMessage.role,
            content: currentMessage.content,
            model:
              currentMessage.role === "assistant" ? currentModel : undefined,
          },
          uuid: crypto.randomUUID(),
          timestamp: messageTimestamp,
          parentUuid: null,
          cwd,
          gitBranch: gitBranch || undefined,
          sessionId,
        };
        messages.push(transcriptLine);

        // Reset for next message
        currentMessage.content = [];
        currentMessage.role = undefined;
        hasContent = false;
      }
    };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as CodexEvent & CodexDirectEntry;

        // Skip record_type markers
        if (entry.record_type === "state") {
          continue;
        }

        // Handle session metadata (first line in older format)
        if (entry.id && entry.timestamp && entry.git && !entry.type) {
          sessionId = entry.id;
          if (!firstTimestamp) {
            firstTimestamp = entry.timestamp;
          }
          gitBranch = entry.git.branch || "";
          continue;
        }

        // Update timestamps
        if (entry.timestamp) {
          if (!firstTimestamp) {
            firstTimestamp = entry.timestamp;
          }
          lastTimestamp = entry.timestamp;
        }

        // Handle newer event-based format
        if (
          entry.type === "session_meta" &&
          entry.payload &&
          isSessionMetaPayload(entry.payload)
        ) {
          sessionId = entry.payload.id || "";
          cwd = entry.payload.cwd || "";
          gitBranch = entry.payload.git?.branch || "";
          continue;
        }

        if (entry.type === "turn_context" && entry.payload) {
          const payload = entry.payload as TurnContextPayload;
          if (payload.model) {
            currentModel = payload.model;
          }
          if (payload.cwd && !cwd) {
            cwd = payload.cwd;
          }
          continue;
        }

        if (
          entry.type === "response_item" &&
          entry.payload &&
          isResponseItemPayload(entry.payload)
        ) {
          const payload = entry.payload;

          if (payload.type === "message") {
            // Flush previous message if starting a new one with different role
            if (currentMessage.role && currentMessage.role !== payload.role) {
              flushMessage();
            }

            // Set or update role
            if (!currentMessage.role) {
              currentMessage.role = payload.role;
              messageTimestamp = entry.timestamp || lastTimestamp;
            }

            // Add text content
            if (payload.content && Array.isArray(payload.content)) {
              for (const item of payload.content) {
                if (item.type === "input_text" && item.text) {
                  // Skip environment_context entirely
                  if (item.text.trim().startsWith("<environment_context>")) {
                    continue;
                  }

                  // Parse user instructions and add resulting blocks
                  const blocks = parseUserInstructions(item.text);
                  currentMessage.content.push(...blocks);
                  hasContent = true;
                } else if (item.type === "text" && item.text) {
                  currentMessage.content.push({
                    type: "text",
                    text: item.text,
                  });
                  hasContent = true;
                }
              }
            }

            // For Codex, user messages are typically followed by assistant responses
            // So if we see a user message, we should flush and start a new message
            if (
              payload.role === "user" &&
              currentMessage.role === "user" &&
              hasContent
            ) {
              // Only flush if we have significant content
              if (currentMessage.content.length > 1) {
                const lastBlock =
                  currentMessage.content[currentMessage.content.length - 2];
                const currentBlock =
                  currentMessage.content[currentMessage.content.length - 1];

                // If we have text followed by more text from a new message, flush
                if (lastBlock.type === "text" && currentBlock.type === "text") {
                  // Remove the last block temporarily
                  const newMessageContent = currentMessage.content.pop()!;
                  flushMessage();
                  // Start new message with the removed block
                  currentMessage.role = payload.role;
                  currentMessage.content = [newMessageContent];
                  messageTimestamp = entry.timestamp || lastTimestamp;
                  hasContent = true;
                }
              }
            }
          } else if (payload.type === "function_call") {
            // Function calls are always from assistant - flush if we were building a user message
            if (currentMessage.role === "user") {
              flushMessage();
            }

            // Ensure we're in assistant context
            if (!currentMessage.role) {
              currentMessage.role = "assistant";
              messageTimestamp = entry.timestamp || lastTimestamp;
            }

            // Add tool use block
            if (payload.name && payload.call_id) {
              try {
                const args = payload.arguments
                  ? JSON.parse(payload.arguments)
                  : {};
                currentMessage.content.push({
                  type: "tool_use",
                  id: payload.call_id,
                  name: payload.name,
                  input: args,
                });
                hasContent = true;
              } catch (err) {
                console.error(
                  `Failed to parse function call arguments for ${payload.name}:`,
                  err,
                );
                // Skip invalid function calls
              }
            }
          } else if (payload.type === "function_call_output") {
            // Tool results are part of assistant messages (they follow tool_use)
            // Don't flush here - these should stay with the tool_use

            // Add tool result block - normalize Codex format to string
            if (payload.call_id) {
              const { content, metadata } = parseCodexToolResult(
                payload.output,
              );
              currentMessage.content.push({
                type: "tool_result",
                tool_use_id: payload.call_id,
                content,
                metadata,
              });
              hasContent = true;
            }
          } else if (payload.type === "reasoning") {
            // Reasoning is always from assistant - flush if we were building a user message
            if (currentMessage.role === "user") {
              flushMessage();
            }

            // Ensure we're in assistant context
            if (!currentMessage.role) {
              currentMessage.role = "assistant";
              messageTimestamp = entry.timestamp || lastTimestamp;
            }

            // Add reasoning block (use summary text, skip encrypted content)
            if (payload.summary && Array.isArray(payload.summary)) {
              const summaryText = payload.summary
                .filter((item) => item.type === "summary_text" && item.text)
                .map((item) => item.text)
                .join("\n");

              if (summaryText) {
                currentMessage.content.push({
                  type: "thinking",
                  thinking: summaryText,
                });
                hasContent = true;
              }
            }
          }
        }

        // Handle older/direct format (messages, function calls, etc. at top level)
        if (entry.type === "message" && entry.role) {
          // Flush previous message if role changes
          if (currentMessage.role && currentMessage.role !== entry.role) {
            flushMessage();
          }

          if (!currentMessage.role) {
            currentMessage.role = entry.role;
            messageTimestamp = entry.timestamp || lastTimestamp;
          }

          // Add content
          if (entry.content && Array.isArray(entry.content)) {
            for (const item of entry.content) {
              if (
                (item.type === "input_text" || item.type === "output_text") &&
                item.text
              ) {
                // Skip environment_context entirely (older format)
                if (item.text.trim().startsWith("<environment_context>")) {
                  continue;
                }

                // Parse user instructions and add resulting blocks
                const blocks = parseUserInstructions(item.text);
                currentMessage.content.push(...blocks);
                hasContent = true;
              }
            }
          }
        } else if (
          entry.type === "function_call" &&
          entry.name &&
          entry.call_id
        ) {
          // Tool use in direct format
          try {
            const args = entry.arguments ? JSON.parse(entry.arguments) : {};
            currentMessage.content.push({
              type: "tool_use",
              id: entry.call_id,
              name: entry.name,
              input: args,
            });
            hasContent = true;
          } catch (err) {
            console.error(
              `Failed to parse function call arguments for ${entry.name}:`,
              err,
            );
            // Skip invalid function calls
          }
        } else if (entry.type === "function_call_output" && entry.call_id) {
          // Tool result in direct format - normalize Codex format to string
          const { content, metadata } = parseCodexToolResult(entry.output);
          currentMessage.content.push({
            type: "tool_result",
            tool_use_id: entry.call_id,
            content,
            metadata,
          });
          hasContent = true;
        } else if (entry.type === "reasoning") {
          // Reasoning in direct format (show summary if available, skip encrypted)
          if (
            entry.summary &&
            Array.isArray(entry.summary) &&
            entry.summary.length > 0
          ) {
            const summaryText = entry.summary
              .filter((item) => item.type === "summary_text" && item.text)
              .map((item) => item.text)
              .join("\n");

            if (summaryText) {
              currentMessage.content.push({
                type: "thinking",
                thinking: summaryText,
              });
              hasContent = true;
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse Codex event:", err);
        // Skip invalid lines
      }
    }

    // Flush any remaining message
    flushMessage();

    return {
      messages,
      sessionId,
      metadata: {
        firstTimestamp,
        lastTimestamp,
        messageCount: messages.length,
        cwd,
      },
    };
  }

  /**
   * Format model names for Codex (handles OpenAI, Claude via OpenRouter, Gemini)
   */
  formatModelName(modelId: string): string | null {
    return formatCodexModelName(modelId);
  }
}
