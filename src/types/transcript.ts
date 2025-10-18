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

export interface ParsedTranscript {
  messages: TranscriptLine[];
  sessionId: string;
  metadata: {
    firstTimestamp: string;
    lastTimestamp: string;
    messageCount: number;
    cwd?: string;
  };
}
