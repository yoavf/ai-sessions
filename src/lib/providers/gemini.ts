/**
 * Gemini CLI transcript provider
 * Parses JSON files exported from Gemini CLI sessions
 */

import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";
import type { TranscriptProvider } from "./types";

/**
 * Gemini session structure (single JSON object, not JSONL)
 */
interface GeminiSession {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiMessage[];
}

/**
 * Gemini message structure
 */
interface GeminiMessage {
  id: string;
  timestamp: string;
  type: "user" | "gemini";
  content: string;
  toolCalls?: GeminiToolCall[];
  thoughts?: GeminiThought[];
  model?: string;
  tokens?: {
    input: number;
    output: number;
    cached: number;
    thoughts: number;
    tool: number;
    total: number;
  };
}

/**
 * Gemini tool call structure
 */
interface GeminiToolCall {
  id: string;
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: Tool arguments can be any JSON structure
  args: Record<string, any>;
  result: Array<
    | {
        functionResponse: {
          id: string;
          name: string;
          response: {
            output: string;
          };
        };
      }
    | {
        text: string;
      }
  >;
  status: string;
  timestamp: string;
  resultDisplay?: string;
  displayName?: string;
  description?: string;
  renderOutputAsMarkdown?: boolean;
}

/**
 * Gemini thought structure
 */
interface GeminiThought {
  subject: string;
  description: string;
  timestamp: string;
}

/**
 * Format Gemini model names
 * Examples:
 * - "gemini-2.5-pro" → "Gemini 2.5 Pro"
 * - "gemini-2.0-flash" → "Gemini 2.0 Flash"
 */
function formatGeminiModelName(modelId: string): string | null {
  if (!modelId) return null;

  const match = modelId.match(/^gemini-(.+)$/);
  if (match) {
    const parts = match[1].split("-");
    return `Gemini ${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")}`;
  }

  // Return original if no pattern matches
  return modelId;
}

/**
 * Parse Gemini tool calls into content blocks
 */
function parseToolCalls(toolCalls: GeminiToolCall[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  for (const toolCall of toolCalls) {
    // Add tool_use block
    blocks.push({
      type: "tool_use",
      id: toolCall.id,
      name: toolCall.name,
      input: toolCall.args,
    });

    // Add tool_result blocks
    // Gemini can have multiple result items: functionResponse + text items with actual content
    if (toolCall.result && Array.isArray(toolCall.result)) {
      const contentParts: string[] = [];

      for (const result of toolCall.result) {
        try {
          // Handle functionResponse items (usually just status messages)
          if ("functionResponse" in result && result.functionResponse) {
            const response = result.functionResponse?.response;
            if (!response) {
              console.warn("Tool result missing response field", {
                toolCallId: toolCall.id,
                toolName: toolCall.name,
              });
              continue;
            }

            const output = response.output;
            if (output && typeof output === "string") {
              contentParts.push(output);
            } else if (output) {
              console.warn("Tool result output is not a string", {
                toolCallId: toolCall.id,
                outputType: typeof output,
              });
            }
          }
          // Handle text items (actual content, like file contents from read_many_files)
          else if ("text" in result && typeof result.text === "string") {
            contentParts.push(result.text);
          } else {
            console.warn("Unrecognized tool result format", {
              toolCallId: toolCall.id,
              resultKeys: Object.keys(result),
            });
          }
        } catch (err) {
          console.error("Failed to extract tool result content", {
            error: err instanceof Error ? err.message : String(err),
            toolCallId: toolCall.id,
            toolName: toolCall.name,
          });
        }
      }

      // Create a single tool_result with all content combined
      if (contentParts.length > 0) {
        blocks.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: contentParts.join("\n"),
        });
      } else {
        console.debug("Tool call produced no content parts", {
          toolCallId: toolCall.id,
          resultCount: toolCall.result.length,
        });
      }
    }
  }

  return blocks;
}

/**
 * Parse Gemini thoughts into thinking blocks
 */
function parseThoughts(thoughts: GeminiThought[]): ContentBlock[] {
  return thoughts.map((thought) => ({
    type: "thinking" as const,
    // Replace literal \n sequences with actual newlines
    thinking: `${thought.subject}\n\n${thought.description}`
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t"),
  }));
}

/**
 * Gemini CLI provider implementation
 */
export class GeminiProvider implements TranscriptProvider {
  readonly name = "gemini-cli";
  readonly displayName = "Gemini CLI";

  /**
   * Detect if content is a Gemini CLI transcript
   * Gemini uses a single JSON object (not JSONL)
   */
  detect(content: string): boolean {
    try {
      // Try to parse as JSON (not JSONL)
      const parsed = JSON.parse(content) as Partial<GeminiSession>;

      // Check for Gemini-specific top-level fields
      if (
        parsed.sessionId &&
        parsed.projectHash &&
        parsed.startTime &&
        Array.isArray(parsed.messages)
      ) {
        // Check if messages have Gemini-specific structure
        const hasGeminiMessage = parsed.messages.some(
          (msg) => msg.type === "gemini",
        );
        const hasThoughts = parsed.messages.some((msg) =>
          Array.isArray(msg.thoughts),
        );

        return hasGeminiMessage || hasThoughts;
      }
    } catch {
      // Not valid JSON or wrong structure
      return false;
    }

    return false;
  }

  /**
   * Parse Gemini CLI JSON transcript
   */
  parse(content: string): ParsedTranscript {
    let session: GeminiSession;

    try {
      session = JSON.parse(content) as GeminiSession;
    } catch (error) {
      throw new Error(
        `Failed to parse Gemini session JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const messages: TranscriptLine[] = [];
    let firstTimestamp = session.startTime;
    let lastTimestamp = session.lastUpdated;

    for (const geminiMessage of session.messages) {
      // Skip system-generated user messages that contain tool results
      // These are duplicates - the tool results are already in the toolCalls array
      if (
        geminiMessage.type === "user" &&
        geminiMessage.content &&
        geminiMessage.content.startsWith("[Function Response:")
      ) {
        continue;
      }

      const contentBlocks: ContentBlock[] = [];

      // Map Gemini message type to our role format
      const role: "user" | "assistant" =
        geminiMessage.type === "gemini" ? "assistant" : "user";

      // Add thoughts first (if present)
      if (geminiMessage.thoughts && geminiMessage.thoughts.length > 0) {
        contentBlocks.push(...parseThoughts(geminiMessage.thoughts));
      }

      // Add text content (if present)
      if (geminiMessage.content && geminiMessage.content.trim()) {
        contentBlocks.push({
          type: "text",
          text: geminiMessage.content,
        });
      }

      // Add tool calls (if present)
      if (geminiMessage.toolCalls && geminiMessage.toolCalls.length > 0) {
        contentBlocks.push(...parseToolCalls(geminiMessage.toolCalls));
      }

      // Only create a transcript line if we have content
      if (contentBlocks.length > 0) {
        const transcriptLine: TranscriptLine = {
          type: role,
          message: {
            role,
            content: contentBlocks,
            model: geminiMessage.model,
          },
          uuid: geminiMessage.id,
          timestamp: geminiMessage.timestamp,
          parentUuid: null, // Gemini doesn't track message relationships
          sessionId: session.sessionId,
        };

        messages.push(transcriptLine);

        // Update timestamps
        if (!firstTimestamp || geminiMessage.timestamp < firstTimestamp) {
          firstTimestamp = geminiMessage.timestamp;
        }
        if (!lastTimestamp || geminiMessage.timestamp > lastTimestamp) {
          lastTimestamp = geminiMessage.timestamp;
        }
      }
    }

    return {
      messages,
      sessionId: session.sessionId,
      metadata: {
        firstTimestamp: firstTimestamp || session.startTime,
        lastTimestamp: lastTimestamp || session.lastUpdated,
        messageCount: messages.length,
        // Gemini doesn't provide cwd in the session file
        cwd: undefined,
      },
    };
  }

  /**
   * Format Gemini model names
   */
  formatModelName(modelId: string): string | null {
    return formatGeminiModelName(modelId);
  }
}
