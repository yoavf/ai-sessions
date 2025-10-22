/**
 * Codex transcript provider
 * Parses JSONL files exported from Codex/Pair CLI sessions
 */

import { parseUserInstructions } from "@/lib/transcript-utils";
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
  type:
    | "message"
    | "function_call"
    | "function_call_output"
    | "reasoning"
    | "custom_tool_call"
    | "custom_tool_call_output";
  role?: "user" | "assistant";
  content?: Array<{ type: string; text?: string }>;
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: string;
  summary?: Array<{ type: string; text?: string }>;
  // Custom tool call fields (used by apply_patch, etc.)
  input?: string;
  status?: string;
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
 * Model formatting configuration
 * Defines how to format different model identifiers into display names
 */
interface ModelFormatter {
  /** Pattern to match against model ID (can be prefix, substring, or regex) */
  pattern: string | RegExp;
  /** Function to format the matched model ID */
  format: (modelId: string) => string | null;
}

/**
 * Model formatting rules
 * Order matters - earlier rules are tried first
 */
const MODEL_FORMATTERS: ModelFormatter[] = [
  // GPT models: gpt-4-turbo-2024-04-09 → GPT-4 Turbo
  {
    pattern: /^gpt-/,
    format: (modelId: string) => {
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
      return null;
    },
  },
  // Claude models via OpenRouter: claude-3-5-sonnet → Claude Sonnet 3.5
  {
    pattern: /claude/,
    format: (modelId: string) => {
      const claudeMatch = modelId.match(/claude-([^/]+)/);
      if (claudeMatch) {
        const modelPart = claudeMatch[1];
        const parts = modelPart.split("-");
        if (parts.length >= 3) {
          const family = parts[parts.length - 1]; // sonnet, opus, haiku
          const version = parts.slice(0, parts.length - 1).join(".");
          const familyCapitalized =
            family.charAt(0).toUpperCase() + family.slice(1);
          return `Claude ${familyCapitalized} ${version}`;
        }
      }
      return null;
    },
  },
  // Gemini models: gemini-2.5-flash → Gemini 2.5 Flash
  {
    pattern: /gemini/,
    format: (modelId: string) => {
      const geminiMatch = modelId.match(/gemini-([^/]+)/);
      if (geminiMatch) {
        const parts = geminiMatch[1].split("-");
        return `Gemini ${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")}`;
      }
      return null;
    },
  },
];

/**
 * Format OpenAI and other model names using configuration-based approach
 *
 * @param modelId - The model identifier to format
 * @returns Formatted model name, or original model ID if no formatter matches
 */
function formatCodexModelName(modelId: string): string | null {
  if (!modelId) return null;

  // Try each formatter in order
  for (const formatter of MODEL_FORMATTERS) {
    const matches =
      formatter.pattern instanceof RegExp
        ? formatter.pattern.test(modelId)
        : modelId.includes(formatter.pattern);

    if (matches) {
      const formatted = formatter.format(modelId);
      if (formatted) {
        return formatted;
      }
    }
  }

  // Return original if no pattern matches
  return modelId;
}

/**
 * Context for building messages during parsing
 */
interface MessageContext {
  role?: "user" | "assistant";
  content: ContentBlock[];
  timestamp: string;
  hasContent: boolean;
}

/**
 * Session context tracking during parsing
 */
interface SessionContext {
  sessionId: string;
  firstTimestamp: string;
  lastTimestamp: string;
  cwd: string;
  gitBranch: string;
  currentModel: string;
}

/**
 * Process message content blocks (handles user instructions and environment skipping)
 */
function processMessageContent(
  contentArray: Array<{ type: string; text?: string }>,
  messageCtx: MessageContext,
) {
  for (const item of contentArray) {
    if (
      (item.type === "input_text" ||
        item.type === "output_text" ||
        item.type === "text") &&
      item.text
    ) {
      // Skip environment_context entirely
      if (item.text.trim().startsWith("<environment_context>")) {
        continue;
      }

      // Parse user instructions and add resulting blocks
      const blocks = parseUserInstructions(item.text);
      messageCtx.content.push(...blocks);
      messageCtx.hasContent = true;
    }
  }
}

/**
 * Process function call and create tool_use block
 */
function processFunctionCall(
  name: string,
  callId: string,
  args: string | undefined,
  messageCtx: MessageContext,
) {
  try {
    const parsedArgs = args ? JSON.parse(args) : {};
    messageCtx.content.push({
      type: "tool_use",
      id: callId,
      name,
      input: parsedArgs,
    });
    messageCtx.hasContent = true;
  } catch (err) {
    console.error(`Failed to parse function call arguments for ${name}:`, err);
    // Skip invalid function calls
  }
}

/**
 * Process function call output and create tool_result block
 */
function processFunctionCallOutput(
  callId: string,
  output: unknown,
  messageCtx: MessageContext,
) {
  const { content, metadata } = parseCodexToolResult(output);
  messageCtx.content.push({
    type: "tool_result",
    tool_use_id: callId,
    content,
    metadata,
  });
  messageCtx.hasContent = true;
}

/**
 * Process reasoning/thinking block
 */
function processReasoning(
  summary: Array<{ type: string; text?: string }> | undefined,
  messageCtx: MessageContext,
) {
  if (!summary || !Array.isArray(summary) || summary.length === 0) {
    return;
  }

  const summaryText = summary
    .filter((item) => item.type === "summary_text" && item.text)
    .map((item) => item.text)
    .join("\n");

  if (summaryText) {
    messageCtx.content.push({
      type: "thinking",
      thinking: summaryText,
    });
    messageCtx.hasContent = true;
  }
}

/**
 * Handle session_meta event (newer format)
 */
function handleSessionMeta(
  payload: SessionMetaPayload,
  sessionCtx: SessionContext,
) {
  sessionCtx.sessionId = payload.id || "";
  sessionCtx.cwd = payload.cwd || "";
  sessionCtx.gitBranch = payload.git?.branch || "";
}

/**
 * Handle turn_context event (newer format)
 */
function handleTurnContext(
  payload: TurnContextPayload,
  sessionCtx: SessionContext,
) {
  if (payload.model) {
    sessionCtx.currentModel = payload.model;
  }
  if (payload.cwd && !sessionCtx.cwd) {
    sessionCtx.cwd = payload.cwd;
  }
}

/**
 * Handle response_item event (newer format)
 */
function handleResponseItem(
  payload: ResponseItemPayload,
  timestamp: string,
  messageCtx: MessageContext,
  _sessionCtx: SessionContext,
  flushMessage: () => void,
) {
  if (payload.type === "message") {
    // Flush previous message if starting a new one with different role
    if (messageCtx.role && messageCtx.role !== payload.role) {
      flushMessage();
    }

    // Set or update role
    if (!messageCtx.role) {
      messageCtx.role = payload.role;
      messageCtx.timestamp = timestamp;
    }

    // Add text content
    if (payload.content && Array.isArray(payload.content)) {
      processMessageContent(payload.content, messageCtx);
    }

    // For Codex, user messages are typically followed by assistant responses
    // So if we see a user message, we should flush and start a new message
    if (
      payload.role === "user" &&
      messageCtx.role === "user" &&
      messageCtx.hasContent
    ) {
      // Only flush if we have significant content
      if (messageCtx.content.length > 1) {
        const lastBlock = messageCtx.content[messageCtx.content.length - 2];
        const currentBlock = messageCtx.content[messageCtx.content.length - 1];

        // If we have text followed by more text from a new message, flush
        if (lastBlock.type === "text" && currentBlock.type === "text") {
          // Remove the last block temporarily
          const newMessageContent = messageCtx.content.pop()!;
          flushMessage();
          // Start new message with the removed block
          messageCtx.role = payload.role;
          messageCtx.content = [newMessageContent];
          messageCtx.timestamp = timestamp;
          messageCtx.hasContent = true;
        }
      }
    }
  } else if (payload.type === "function_call") {
    // Function calls are always from assistant - flush if we were building a user message
    if (messageCtx.role === "user") {
      flushMessage();
    }

    // Ensure we're in assistant context
    if (!messageCtx.role) {
      messageCtx.role = "assistant";
      messageCtx.timestamp = timestamp;
    }

    // Add tool use block
    if (payload.name && payload.call_id) {
      processFunctionCall(
        payload.name,
        payload.call_id,
        payload.arguments,
        messageCtx,
      );
    }
  } else if (payload.type === "custom_tool_call") {
    // Custom tool calls (like apply_patch) - same handling as function_call
    if (messageCtx.role === "user") {
      flushMessage();
    }

    // Ensure we're in assistant context
    if (!messageCtx.role) {
      messageCtx.role = "assistant";
      messageCtx.timestamp = timestamp;
    }

    // Add tool use block - custom tools use 'input' field instead of 'arguments'
    if (payload.name && payload.call_id) {
      const input = payload.input ? { input: payload.input } : {};
      processFunctionCall(
        payload.name,
        payload.call_id,
        JSON.stringify(input),
        messageCtx,
      );
    }
  } else if (payload.type === "function_call_output") {
    // Tool results are part of assistant messages (they follow tool_use)
    // Don't flush here - these should stay with the tool_use
    if (payload.call_id) {
      processFunctionCallOutput(payload.call_id, payload.output, messageCtx);
    }
  } else if (payload.type === "custom_tool_call_output") {
    // Custom tool call outputs - same handling as function_call_output
    if (payload.call_id) {
      processFunctionCallOutput(payload.call_id, payload.output, messageCtx);
    }
  } else if (payload.type === "reasoning") {
    // Reasoning is always from assistant - flush if we were building a user message
    if (messageCtx.role === "user") {
      flushMessage();
    }

    // Ensure we're in assistant context
    if (!messageCtx.role) {
      messageCtx.role = "assistant";
      messageCtx.timestamp = timestamp;
    }

    // Add reasoning block
    processReasoning(payload.summary, messageCtx);
  }
}

/**
 * Handle older/direct format entries
 */
function handleDirectFormat(
  entry: CodexDirectEntry,
  messageCtx: MessageContext,
  sessionCtx: SessionContext,
  flushMessage: () => void,
) {
  if (entry.type === "message" && entry.role) {
    // Flush previous message if role changes
    if (messageCtx.role && messageCtx.role !== entry.role) {
      flushMessage();
    }

    if (!messageCtx.role) {
      messageCtx.role = entry.role;
      messageCtx.timestamp = entry.timestamp || sessionCtx.lastTimestamp;
    }

    // Add content
    if (entry.content && Array.isArray(entry.content)) {
      processMessageContent(entry.content, messageCtx);
    }
  } else if (entry.type === "function_call" && entry.name && entry.call_id) {
    // Tool use in direct format
    processFunctionCall(entry.name, entry.call_id, entry.arguments, messageCtx);
  } else if (entry.type === "function_call_output" && entry.call_id) {
    // Tool result in direct format
    processFunctionCallOutput(entry.call_id, entry.output, messageCtx);
  } else if (entry.type === "reasoning") {
    // Reasoning in direct format
    processReasoning(entry.summary, messageCtx);
  }
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

    // Session context
    const sessionCtx: SessionContext = {
      sessionId: "",
      firstTimestamp: "",
      lastTimestamp: "",
      cwd: "",
      gitBranch: "",
      currentModel: "",
    };

    // Message building context
    const messageCtx: MessageContext = {
      content: [],
      timestamp: "",
      hasContent: false,
    };

    const flushMessage = () => {
      if (messageCtx.hasContent && messageCtx.role) {
        const transcriptLine: TranscriptLine = {
          type: messageCtx.role,
          message: {
            role: messageCtx.role,
            content: messageCtx.content,
            model:
              messageCtx.role === "assistant"
                ? sessionCtx.currentModel
                : undefined,
          },
          uuid: crypto.randomUUID(),
          timestamp: messageCtx.timestamp,
          parentUuid: null,
          cwd: sessionCtx.cwd,
          gitBranch: sessionCtx.gitBranch || undefined,
          sessionId: sessionCtx.sessionId,
        };
        messages.push(transcriptLine);

        // Reset for next message
        messageCtx.content = [];
        messageCtx.role = undefined;
        messageCtx.hasContent = false;
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
          sessionCtx.sessionId = entry.id;
          if (!sessionCtx.firstTimestamp) {
            sessionCtx.firstTimestamp = entry.timestamp;
          }
          sessionCtx.gitBranch = entry.git.branch || "";
          continue;
        }

        // Update timestamps
        if (entry.timestamp) {
          if (!sessionCtx.firstTimestamp) {
            sessionCtx.firstTimestamp = entry.timestamp;
          }
          sessionCtx.lastTimestamp = entry.timestamp;
        }

        // Handle newer event-based format
        if (
          entry.type === "session_meta" &&
          entry.payload &&
          isSessionMetaPayload(entry.payload)
        ) {
          handleSessionMeta(entry.payload, sessionCtx);
          continue;
        }

        if (entry.type === "turn_context" && entry.payload) {
          const payload = entry.payload as TurnContextPayload;
          handleTurnContext(payload, sessionCtx);
          continue;
        }

        if (
          entry.type === "response_item" &&
          entry.payload &&
          isResponseItemPayload(entry.payload)
        ) {
          handleResponseItem(
            entry.payload,
            entry.timestamp || sessionCtx.lastTimestamp,
            messageCtx,
            sessionCtx,
            flushMessage,
          );
          continue;
        }

        // Handle older/direct format (messages, function calls, etc. at top level)
        handleDirectFormat(entry, messageCtx, sessionCtx, flushMessage);
      } catch (err) {
        console.error("Failed to parse Codex event:", err);
        // Skip invalid lines
      }
    }

    // Flush any remaining message
    flushMessage();

    return {
      messages,
      sessionId: sessionCtx.sessionId,
      metadata: {
        firstTimestamp: sessionCtx.firstTimestamp,
        lastTimestamp: sessionCtx.lastTimestamp,
        messageCount: messages.length,
        cwd: sessionCtx.cwd,
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
