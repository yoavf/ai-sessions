import type { ParsedTranscript, TranscriptMetadata } from "@/types/transcript";
import {
  calculateModelStats as calculateModelStatsFromProvider,
  calculateTokenCounts as calculateTokenCountsFromProvider,
  parseTranscript as parseTranscriptWithProvider,
} from "./providers";

/**
 * Generate a default title when no custom title is provided
 * Format: "[Source] - [Date]" (e.g., "Claude Code - October 16, 2025")
 */
export function generateDefaultTitle(source: string, createdAt: Date): string {
  const sourceDisplayNames: Record<string, string> = {
    "claude-code": "Claude Code",
    codex: "Codex",
    "gemini-cli": "Gemini CLI",
  };

  const sourceName = sourceDisplayNames[source] || source;
  const date = createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${sourceName} - ${date}`;
}

/**
 * Check if a title is likely a UUID, session ID, or auto-generated filename that should be replaced
 */
export function isUuidOrSessionId(title: string | null | undefined): boolean {
  if (!title) return true;

  // Check for UUID pattern (8-4-4-4-12 hex digits)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(title)) return true;

  // Check for titles containing UUIDs (e.g., "rollout-2025-10-11T10-35-38-0199d232-56ac-7051-a042-8b140c0d4aed")
  // This matches any string containing a UUID-like pattern
  const containsUuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (containsUuidPattern.test(title)) return true;

  // Check for timestamp-heavy filenames (e.g., "2025-10-11T10-35-38" or similar)
  // Also matches Gemini CLI format: "session-2025-10-18T14-56-f86f5318"
  // These are typically auto-generated and not meaningful
  const timestampPattern = /\d{4}-\d{2}-\d{2}[T_-]\d{2}[:-]\d{2}/;
  if (timestampPattern.test(title)) return true;

  return false;
}

/**
 * Calculate model usage statistics from parsed transcript
 * @param transcript Parsed transcript
 * @param source Optional source provider name for model formatting
 */
export function calculateModelStats(
  transcript: ParsedTranscript,
  source?: string,
): {
  model: string;
  count: number;
  percentage: number;
}[] {
  return calculateModelStatsFromProvider(transcript, source);
}

/**
 * Parse JSONL transcript content
 * Automatically detects the provider format and uses appropriate parser
 * @param content Raw JSONL content
 * @param sourceHint Optional hint about which provider to use (from database)
 */
export function parseJSONL(
  content: string,
  sourceHint?: string,
): ParsedTranscript {
  return parseTranscriptWithProvider(content, sourceHint);
}

/**
 * Calculate all metadata statistics for a transcript
 * This should be called on upload and the results stored in the database
 * @param transcript Parsed transcript
 * @param rawContent Raw JSONL/JSON content (needed for token extraction)
 * @param source Source provider name (for model formatting and token extraction)
 * @returns Metadata object ready to be stored in database
 */
export function calculateTranscriptMetadata(
  transcript: ParsedTranscript,
  rawContent: string,
  source?: string,
): TranscriptMetadata {
  // Count messages by role
  const userMessageCount = transcript.messages.filter(
    (line) => line.message?.role === "user",
  ).length;
  const assistantMessageCount = transcript.messages.filter(
    (line) => line.message?.role === "assistant",
  ).length;

  // Count tool calls from assistant messages
  const toolCallCount = transcript.messages.reduce((count, line) => {
    if (line.message?.role !== "assistant") return count;
    const content = line.message.content;
    if (!Array.isArray(content)) return count;

    // Count tool_use blocks in this message
    const toolUseBlocks = content.filter((block) => block.type === "tool_use");
    return count + toolUseBlocks.length;
  }, 0);

  // Calculate model usage statistics
  const modelStats = calculateModelStatsFromProvider(transcript, source);

  // Calculate token counts from raw content (provider-specific)
  const tokenCounts = source
    ? calculateTokenCountsFromProvider(rawContent, source)
    : null;

  return {
    cwd: transcript.cwd,
    userMessageCount,
    assistantMessageCount,
    toolCallCount,
    modelStats,
    tokenCounts: tokenCounts || undefined,
  };
}
