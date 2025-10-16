import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";

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
 * Check if a title is likely a UUID or session ID that should be replaced
 */
export function isUuidOrSessionId(title: string | null | undefined): boolean {
  if (!title) return true;

  // Check for UUID pattern (8-4-4-4-12 hex digits)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidPattern.test(title);
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
function formatModelName(modelId: string): string | null {
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
 * Calculate model usage statistics from transcript messages
 */
export function calculateModelStats(messages: TranscriptLine[]): {
  model: string;
  count: number;
  percentage: number;
}[] {
  const modelCounts = new Map<string, number>();
  let totalWithModel = 0;

  // Count messages by model (only assistant messages with model metadata)
  for (const line of messages) {
    if (line.message?.role === "assistant" && line.message.model) {
      const friendlyName = formatModelName(line.message.model);
      // Skip synthetic or invalid model names
      if (friendlyName) {
        modelCounts.set(friendlyName, (modelCounts.get(friendlyName) || 0) + 1);
        totalWithModel++;
      }
    }
  }

  // Convert to array and calculate percentages
  const stats = Array.from(modelCounts.entries())
    .map(([model, count]) => ({
      model,
      count,
      percentage: Math.round((count / totalWithModel) * 100),
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return stats;
}

export function parseJSONL(content: string): ParsedTranscript {
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
