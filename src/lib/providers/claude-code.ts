/**
 * Claude Code transcript provider
 * Parses JSONL files exported from Claude Code sessions
 */

import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";
import type { TranscriptProvider } from "./types";

function parseSlashCommandString(content: string): ContentBlock[] | null {
  // Only parse if the content starts with a command tag
  const startsWithCommand = content
    .trim()
    .match(/^<command-(name|message|args)>/);
  if (!startsWithCommand) {
    return null;
  }

  const commandNameMatch = content.match(
    /<command-name>([^<]+)<\/command-name>/,
  );
  const commandMessageMatch = content.match(
    /<command-message>([^<]+)<\/command-message>/,
  );
  const commandArgsMatch = content.match(
    /<command-args>([^<]*)<\/command-args>/,
  );

  const blocks: ContentBlock[] = [];

  if (commandNameMatch) {
    blocks.push({ type: "command-name", text: commandNameMatch[1] });
  }

  if (commandMessageMatch) {
    blocks.push({ type: "command-message", text: commandMessageMatch[1] });
  }

  if (commandArgsMatch) {
    blocks.push({ type: "command-args", text: commandArgsMatch[1] });
  }

  return blocks.length > 0 ? blocks : null;
}

function parseBashString(content: string): ContentBlock[] | null {
  // Only parse if the content starts with a bash tag
  const startsWithBash = content.trim().match(/^<bash-(input|stdout|stderr)>/);
  if (!startsWithBash) {
    return null;
  }

  const bashInputMatch = content.match(/<bash-input>([^<]+)<\/bash-input>/);
  const bashStdoutMatch = content.match(
    /<bash-stdout>([\s\S]*?)<\/bash-stdout>/,
  );
  const bashStderrMatch = content.match(
    /<bash-stderr>([\s\S]*?)<\/bash-stderr>/,
  );

  const blocks: ContentBlock[] = [];

  if (bashInputMatch) {
    blocks.push({ type: "bash-input", text: bashInputMatch[1] });
  }

  if (bashStdoutMatch) {
    blocks.push({ type: "bash-stdout", text: bashStdoutMatch[1] });
  }

  if (bashStderrMatch?.[1].trim()) {
    // Only add stderr if it's not empty
    blocks.push({ type: "bash-stderr", text: bashStderrMatch[1] });
  }

  return blocks.length > 0 ? blocks : null;
}

/**
 * Map raw model IDs to friendly display names
 * Returns null for synthetic/invalid models
 *
 * Examples:
 * - "claude-opus-4-20250514" → "Claude Opus 4"
 * - "claude-sonnet-4-5-20250929" → "Claude Sonnet 4.5"
 * - "claude-3-5-sonnet-20241022" → "Claude Sonnet 3.5"
 */
function formatClaudeModelName(modelId: string): string | null {
  // Ignore synthetic model entries
  if (modelId === "<synthetic>" || modelId.includes("synthetic")) {
    return null;
  }

  // Extract model family and version from ID
  // Pattern: claude-{family}-{version}-{date} or claude-{version}-{family}-{date}
  const patterns = [
    // Pattern: claude-opus-4-20250514 → Claude Opus 4
    /^claude-(opus|sonnet|haiku)-(\d+(?:-\d+)?)-\d{8}$/,
    // Pattern: claude-3-5-sonnet-20241022 → Claude Sonnet 3.5
    /^claude-(\d+)-(\d+)-(opus|sonnet|haiku)-\d{8}$/,
  ];

  for (const pattern of patterns) {
    const match = modelId.match(pattern);
    if (match) {
      if (pattern === patterns[0]) {
        // claude-{family}-{version}-{date}
        const [, family, version] = match;
        const familyCapitalized =
          family.charAt(0).toUpperCase() + family.slice(1);
        const versionFormatted = version.replace("-", ".");
        return `Claude ${familyCapitalized} ${versionFormatted}`;
      }
      if (pattern === patterns[1]) {
        // claude-{major}-{minor}-{family}-{date}
        const [, major, minor, family] = match;
        const familyCapitalized =
          family.charAt(0).toUpperCase() + family.slice(1);
        return `Claude ${familyCapitalized} ${major}.${minor}`;
      }
    }
  }

  // Fallback: return the original ID if no pattern matches
  return modelId;
}

/**
 * Claude Code provider implementation
 */
export class ClaudeCodeProvider implements TranscriptProvider {
  readonly name = "claude-code";
  readonly displayName = "Claude Code";

  /**
   * Detect if content is a Claude Code transcript
   * Checks for Claude-specific format indicators
   */
  detect(content: string): boolean {
    try {
      const lines = content.trim().split("\n").slice(0, 10);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as TranscriptLine;

          // Check for Claude Code-specific fields
          if (parsed.type === "file-history-snapshot") {
            return true;
          }

          // Check for thinking blocks in content
          if (
            parsed.message &&
            Array.isArray(parsed.message.content) &&
            parsed.message.content.some((block) => block.type === "thinking")
          ) {
            return true;
          }

          // Check for parentUuid field (Claude Code relationship tracking)
          if (parsed.parentUuid !== undefined) {
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
   * Parse Claude Code JSONL transcript
   */
  parse(content: string): ParsedTranscript {
    const lines = content.trim().split("\n");
    const messages: TranscriptLine[] = [];
    let sessionId = "";
    let firstTimestamp = "";
    let lastTimestamp = "";
    let cwd = "";

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as TranscriptLine;

        // Skip file history snapshots
        if (parsed.type === "file-history-snapshot") {
          continue;
        }

        // Parse slash commands and bash blocks if message content is a string starting with special tags
        if (parsed.message && typeof parsed.message.content === "string") {
          const commandBlocks = parseSlashCommandString(parsed.message.content);
          if (commandBlocks) {
            parsed.message.content = commandBlocks;
          } else {
            const bashBlocks = parseBashString(parsed.message.content);
            if (bashBlocks) {
              parsed.message.content = bashBlocks;
            }
          }
        }
        // Also parse if content is an array with a single text block containing XML tags
        else if (
          parsed.message &&
          Array.isArray(parsed.message.content) &&
          parsed.message.content.length === 1 &&
          parsed.message.content[0].type === "text"
        ) {
          const textContent = parsed.message.content[0].text;
          const commandBlocks = parseSlashCommandString(textContent);
          if (commandBlocks) {
            parsed.message.content = commandBlocks;
          } else {
            const bashBlocks = parseBashString(textContent);
            if (bashBlocks) {
              parsed.message.content = bashBlocks;
            }
          }
        }

        messages.push(parsed);

        // Extract metadata
        if (parsed.sessionId && !sessionId) {
          sessionId = parsed.sessionId;
        }
        if (parsed.timestamp) {
          if (!firstTimestamp) {
            firstTimestamp = parsed.timestamp;
          }
          lastTimestamp = parsed.timestamp;
        }
        if (parsed.cwd && !cwd) {
          cwd = parsed.cwd;
        }
      } catch (err) {
        console.error("Failed to parse line:", err);
        // Skip invalid lines
      }
    }

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
   * Format Claude model names
   */
  formatModelName(modelId: string): string | null {
    return formatClaudeModelName(modelId);
  }
}
