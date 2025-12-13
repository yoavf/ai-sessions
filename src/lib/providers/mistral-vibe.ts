/**
 * Mistral Vibe transcript provider
 * Parses JSON files exported from Mistral Vibe CLI sessions
 */

import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";
import type { TranscriptProvider } from "./types";

/**
 * Mistral Vibe session structure (single JSON object, not JSONL)
 */
interface MistralVibeSession {
  metadata: {
    session_id: string;
    start_time: string;
    end_time: string;
    environment: {
      working_directory?: string;
    };
    git_branch?: string;
    stats?: {
      session_prompt_tokens?: number;
      session_completion_tokens?: number;
      session_total_llm_tokens?: number;
    };
    agent_config?: {
      active_model?: string;
      models?: Array<{
        name: string;
        alias?: string;
      }>;
    };
  };
  messages: MistralVibeMessage[];
}

/**
 * Mistral Vibe message structure
 */
interface MistralVibeMessage {
  role: "system" | "user" | "assistant";
  content: string;
  tool_calls?: MistralVibeToolCall[];
  tool_call_results?: MistralVibeToolResult[];
}

/**
 * Mistral Vibe tool call structure
 */
interface MistralVibeToolCall {
  id: string;
  index?: number;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Mistral Vibe tool result structure
 */
interface MistralVibeToolResult {
  tool_call_id: string;
  content: string;
  is_error?: boolean;
  timestamp?: string;
}

/**
 * Format Mistral Vibe model names
 * Examples:
 * - "devstral-2" → "Devstral 2"
 * - "mistral-vibe-cli-latest" → "Mistral Vibe CLI"
 */
function formatMistralVibeModelName(modelId: string): string | null {
  if (!modelId) return null;

  // Handle known model patterns
  const patterns = [
    { pattern: /^devstral-(\d+)$/, format: "Devstral $1" },
    { pattern: /^mistral-vibe-cli-latest$/, format: "Mistral Vibe CLI" },
    { pattern: /^devstral-small-latest$/, format: "Devstral Small" },
    { pattern: /^devstral$/, format: "Devstral" },
  ];

  for (const { pattern, format } of patterns) {
    if (pattern.test(modelId)) {
      return modelId.replace(pattern, format);
    }
  }

  // Return original if no pattern matches
  return modelId;
}

function parseToolCalls(toolCalls: MistralVibeToolCall[]): ContentBlock[] {
  return toolCalls.map((toolCall) => {
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch {
      parsedArgs = { raw: toolCall.function.arguments };
    }

    return {
      type: "tool_use" as const,
      id: toolCall.id,
      name: toolCall.function.name,
      input: parsedArgs,
    };
  });
}

function parseToolResults(
  toolResults: MistralVibeToolResult[],
): ContentBlock[] {
  return toolResults.map((toolResult) => ({
    type: "tool_result" as const,
    tool_use_id: toolResult.tool_call_id,
    content: toolResult.content,
    is_error: toolResult.is_error,
  }));
}

/**
 * Mistral Vibe provider implementation
 */
export class MistralVibeProvider implements TranscriptProvider {
  readonly name = "mistral-vibe";
  readonly displayName = "Mistral Vibe";

  detect(content: string): boolean {
    try {
      const parsed = JSON.parse(content) as Partial<MistralVibeSession>;

      if (
        parsed.metadata?.session_id &&
        parsed.metadata?.start_time &&
        Array.isArray(parsed.messages)
      ) {
        const hasAssistantMessage = parsed.messages.some(
          (msg) => msg.role === "assistant",
        );
        const hasToolCalls = parsed.messages.some(
          (msg) => msg.tool_calls && Array.isArray(msg.tool_calls),
        );

        return hasAssistantMessage || hasToolCalls;
      }
    } catch {
      return false;
    }

    return false;
  }

  parse(content: string): ParsedTranscript {
    let session: MistralVibeSession;

    try {
      session = JSON.parse(content) as MistralVibeSession;
    } catch (error) {
      throw new Error(
        `Failed to parse Mistral Vibe session JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const messages: TranscriptLine[] = [];
    let firstTimestamp = session.metadata.start_time;
    let lastTimestamp =
      session.metadata.end_time || session.metadata.start_time;

    const activeModel = session.metadata.agent_config?.active_model;
    const modelAliases = session.metadata.agent_config?.models || [];

    for (const [index, vibeMessage] of session.messages.entries()) {
      const contentBlocks: ContentBlock[] = [];

      let role: "user" | "assistant" | null = null;
      if (vibeMessage.role === "assistant") {
        role = "assistant";
      } else if (vibeMessage.role === "user") {
        role = "user";
      } else if (vibeMessage.role === "system") {
        continue;
      }

      if (vibeMessage.content && vibeMessage.content.trim()) {
        contentBlocks.push({
          type: "text",
          text: vibeMessage.content,
        });
      }

      if (vibeMessage.tool_calls && vibeMessage.tool_calls.length > 0) {
        contentBlocks.push(...parseToolCalls(vibeMessage.tool_calls));
      }

      if (
        vibeMessage.tool_call_results &&
        vibeMessage.tool_call_results.length > 0
      ) {
        contentBlocks.push(...parseToolResults(vibeMessage.tool_call_results));
      }

      if (contentBlocks.length > 0 && role) {
        let model: string | undefined;
        if (activeModel) {
          const modelConfig = modelAliases.find(
            (m) => m.alias === activeModel || m.name === activeModel,
          );
          model = modelConfig?.alias || modelConfig?.name || activeModel;
        }

        let toolTimestamp: string | undefined;
        if (vibeMessage.tool_calls?.[0]?.function?.arguments) {
          try {
            const args = JSON.parse(
              vibeMessage.tool_calls[0].function.arguments,
            );
            toolTimestamp = args.timestamp;
          } catch {
            // Ignore parse errors
          }
        }

        const transcriptLine: TranscriptLine = {
          type: role,
          message: {
            role,
            content: contentBlocks,
            model,
          },
          uuid: `${session.metadata.session_id}-${index}`,
          timestamp:
            toolTimestamp ||
            vibeMessage.tool_call_results?.[0]?.timestamp ||
            new Date().toISOString(),
          parentUuid: null,
          sessionId: session.metadata.session_id,
          cwd: session.metadata.environment?.working_directory,
          gitBranch: session.metadata.git_branch,
        };

        messages.push(transcriptLine);

        if (toolTimestamp) {
          if (!firstTimestamp || toolTimestamp < firstTimestamp) {
            firstTimestamp = toolTimestamp;
          }
          if (!lastTimestamp || toolTimestamp > lastTimestamp) {
            lastTimestamp = toolTimestamp;
          }
        }
      }
    }

    return {
      messages,
      sessionId: session.metadata.session_id,
      cwd: session.metadata.environment?.working_directory,
      metadata: {
        firstTimestamp,
        lastTimestamp,
        messageCount: messages.length,
      },
    };
  }

  formatModelName(modelId: string): string | null {
    return formatMistralVibeModelName(modelId);
  }
}
