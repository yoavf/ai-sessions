export interface ToolUse {
  type: "tool_use";
  id: string;
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: Tool input can be any JSON structure
  input: Record<string, any>;
}

export interface ToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: string; // Normalized to string by parsers
  is_error?: boolean;
  // Optional metadata (extracted during parsing)
  metadata?: {
    exit_code?: number;
    duration_seconds?: number;
  };
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export interface CommandContent {
  type: "command-name" | "command-message" | "command-args";
  text: string;
}

export interface BashContent {
  type: "bash-input" | "bash-stdout" | "bash-stderr";
  text: string;
}

export interface UserInstructionsContent {
  type: "user-instructions";
  text: string;
}

export type ContentBlock =
  | ToolUse
  | ToolResult
  | TextContent
  | ThinkingContent
  | CommandContent
  | BashContent
  | UserInstructionsContent;

export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
  model?: string; // AI model used for this message (e.g., "claude-sonnet-4-20250514")
}

export interface TranscriptLine {
  type: "user" | "assistant" | "file-history-snapshot";
  message?: Message;
  uuid: string;
  timestamp: string;
  parentUuid: string | null;
  cwd?: string;
  gitBranch?: string;
  sessionId?: string;
  // biome-ignore lint/suspicious/noExplicitAny: Tool result can be any JSON structure
  toolUseResult?: string | Record<string, any>;
}

/**
 * Model statistics - shows which AI models were used and how often
 */
export interface ModelStats {
  model: string;
  count: number;
  percentage: number;
}

/**
 * Pre-calculated statistics stored in database metadata column
 * These are calculated once on upload to avoid recomputing on every view
 */
export interface TranscriptMetadata {
  cwd?: string; // Project working directory for converting absolute paths to relative
  userMessageCount?: number; // Count of user messages
  assistantMessageCount?: number; // Count of assistant messages
  toolCallCount?: number; // Count of tool_use blocks across all assistant messages
  modelStats?: ModelStats[]; // Model usage statistics
  // Index signature for Prisma JSON compatibility
  [key: string]: unknown;
}

export interface ParsedTranscript {
  messages: TranscriptLine[];
  sessionId: string;
  cwd?: string; // Project working directory for converting absolute paths to relative
  metadata: {
    firstTimestamp: string;
    lastTimestamp: string;
    messageCount: number;
  };
}
